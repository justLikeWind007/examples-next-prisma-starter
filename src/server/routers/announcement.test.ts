import { randomUUID } from 'node:crypto';
import { prisma } from '../prisma';
import { createAuthenticatedTestCaller } from '../test-utils';

test('creates announcements only inside the caller regional scope', async () => {
  const chongqingWriter = await createAuthenticatedTestCaller({
    permissionCodes: ['announcement:read', 'announcement:write'],
    regionNames: ['Chongqing'],
  });
  const beijing = await prisma.region.create({
    data: { name: 'Beijing', code: `beijing-${randomUUID()}` },
  });

  const created = await chongqingWriter.caller.announcement.create({
    title: 'Chongqing notice',
    content: 'Visible in Chongqing.',
    regionId: chongqingWriter.regions[0].id,
  });
  expect(created).toMatchObject({
    title: 'Chongqing notice',
    regionId: chongqingWriter.regions[0].id,
    createdById: chongqingWriter.user.id,
  });

  await expect(
    chongqingWriter.caller.announcement.create({
      title: 'Forbidden Beijing notice',
      content: 'Must not be created.',
      regionId: beijing.id,
    }),
  ).rejects.toMatchObject({
    code: 'FORBIDDEN',
    message: 'REGION_OUT_OF_SCOPE',
  });
  await expect(
    prisma.announcement.findFirst({
      where: { title: 'Forbidden Beijing notice', regionId: beijing.id },
    }),
  ).resolves.toBeNull();
});

test('lists and resolves details only from assigned regions', async () => {
  const chongqingReader = await createAuthenticatedTestCaller({
    permissionCodes: ['announcement:read'],
    regionNames: ['Chongqing'],
  });
  const beijing = await prisma.region.create({
    data: { name: 'Beijing', code: `beijing-${randomUUID()}` },
  });
  const [chongqingNotice, beijingNotice] = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'Scoped Chongqing notice',
        content: 'Visible content',
        regionId: chongqingReader.regions[0].id,
        createdById: chongqingReader.user.id,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Hidden Beijing notice',
        content: 'Hidden content',
        regionId: beijing.id,
        createdById: chongqingReader.user.id,
      },
    }),
  ]);

  const visible = await chongqingReader.caller.announcement.list();
  expect(visible).toEqual([
    expect.objectContaining({
      id: chongqingNotice.id,
      title: chongqingNotice.title,
    }),
  ]);
  expect(JSON.stringify(visible)).not.toContain(beijingNotice.id);
  expect(JSON.stringify(visible)).not.toContain(beijingNotice.title);
  await expect(
    chongqingReader.caller.announcement.byId({ id: beijingNotice.id }),
  ).rejects.toMatchObject({
    code: 'NOT_FOUND',
    message: 'ANNOUNCEMENT_NOT_FOUND',
  });
});

test('requires functional read permission and returns no data for empty scope', async () => {
  const withoutPermission = await createAuthenticatedTestCaller({
    regionNames: ['Chongqing'],
  });
  const withoutRegions = await createAuthenticatedTestCaller({
    permissionCodes: ['announcement:read'],
  });

  await expect(
    withoutPermission.caller.announcement.list(),
  ).rejects.toMatchObject({
    code: 'FORBIDDEN',
    message: 'MISSING_PERMISSION:announcement:read',
  });
  await expect(withoutRegions.caller.announcement.list()).resolves.toEqual([]);
});

test('updates in-scope records and hides cross-region records from deletion', async () => {
  const writer = await createAuthenticatedTestCaller({
    permissionCodes: ['announcement:read', 'announcement:write'],
    regionNames: ['Chongqing'],
  });
  const chongqingId = writer.regions[0].id;
  const beijing = await prisma.region.create({
    data: { name: 'Beijing', code: `beijing-${randomUUID()}` },
  });
  const [localNotice, hiddenNotice] = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'Before update',
        content: 'Before content',
        regionId: chongqingId,
        createdById: writer.user.id,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Protected Beijing notice',
        content: 'Must survive.',
        regionId: beijing.id,
        createdById: writer.user.id,
      },
    }),
  ]);

  await expect(
    writer.caller.announcement.update({
      id: localNotice.id,
      title: 'After update',
      content: 'After content',
      regionId: chongqingId,
    }),
  ).resolves.toMatchObject({ title: 'After update', content: 'After content' });
  await expect(
    writer.caller.announcement.delete({ id: hiddenNotice.id }),
  ).rejects.toMatchObject({
    code: 'NOT_FOUND',
    message: 'ANNOUNCEMENT_NOT_FOUND',
  });
  await expect(
    prisma.announcement.findUnique({ where: { id: hiddenNotice.id } }),
  ).resolves.not.toBeNull();
  await expect(
    writer.caller.announcement.delete({ id: localNotice.id }),
  ).resolves.toEqual({ id: localNotice.id });
});
