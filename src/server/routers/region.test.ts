import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma';
import { createAuthenticatedTestCaller } from '../test-utils';

test('creates, updates, assigns, removes, and reverse-lists regions', async () => {
  const administrator = await createAuthenticatedTestCaller({
    permissionCodes: [
      'region:read',
      'region:write',
      'user:read',
      'user:manage-regions',
    ],
  });
  const target = await createAuthenticatedTestCaller();
  const suffix = randomUUID();
  const region = await administrator.caller.region.create({
    name: 'Training region',
    code: `training-${suffix}`,
    description: 'Before update',
  });

  await administrator.caller.region.update({
    id: region.id,
    name: 'Updated training region',
    code: region.code,
    description: 'After update',
  });
  await administrator.caller.user.setRegions({
    userId: target.user.id,
    regionIds: [region.id],
  });

  const regions = await administrator.caller.region.list();
  expect(regions.find(({ id }) => id === region.id)).toMatchObject({
    name: 'Updated training region',
    users: [expect.objectContaining({ id: target.user.id })],
    announcementCount: 0,
  });
  const users = await administrator.caller.user.list();
  expect(users.find(({ id }) => id === target.user.id)?.regions).toEqual([
    expect.objectContaining({ id: region.id }),
  ]);

  await administrator.caller.region.setUsers({
    regionId: region.id,
    userIds: [],
  });
  const afterRemoval = await administrator.caller.user.list();
  expect(afterRemoval.find(({ id }) => id === target.user.id)?.regions).toEqual(
    [],
  );
  await expect(
    administrator.caller.region.delete({ id: region.id }),
  ).resolves.toMatchObject({ id: region.id });
});

test('rejects unknown region assignments atomically', async () => {
  const administrator = await createAuthenticatedTestCaller({
    permissionCodes: ['region:read', 'region:write', 'user:manage-regions'],
  });
  const target = await createAuthenticatedTestCaller({
    regionNames: ['Existing scope'],
  });
  const existingRegionId = target.regions[0].id;

  await expect(
    administrator.caller.user.setRegions({
      userId: target.user.id,
      regionIds: [existingRegionId, randomUUID()],
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: 'UNKNOWN_REGION_ID',
  });

  await expect(
    prisma.userRegion.findMany({
      where: { userId: target.user.id },
      select: { regionId: true },
    }),
  ).resolves.toEqual([{ regionId: existingRegionId }]);
});

test('rejects deletion of a referenced region with reference counts', async () => {
  const administrator = await createAuthenticatedTestCaller({
    permissionCodes: ['region:write', 'user:manage-regions'],
  });
  const target = await createAuthenticatedTestCaller();
  const region = await prisma.region.create({
    data: {
      name: `Referenced ${randomUUID()}`,
      code: `referenced-${randomUUID()}`,
      userRegions: { create: { userId: target.user.id } },
      announcements: {
        create: {
          title: 'Referenced announcement',
          content: 'This keeps the region in use.',
          createdById: administrator.user.id,
        },
      },
    },
  });

  await expect(
    administrator.caller.region.delete({ id: region.id }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringMatching(/RESOURCE_IN_USE.*users=1.*announcements=1/),
  });
  await expect(
    prisma.region.findUnique({ where: { id: region.id } }),
  ).resolves.not.toBeNull();
});

test('protects region interfaces with functional permissions', async () => {
  const { caller } = await createAuthenticatedTestCaller();
  await expect(caller.region.list()).rejects.toMatchObject({
    code: 'FORBIDDEN',
    message: 'MISSING_PERMISSION:region:read',
  });
});
