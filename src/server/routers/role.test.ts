import { randomUUID } from 'node:crypto';
import { createAuthenticatedTestCaller } from '../test-utils';
import { prisma } from '../prisma';

test('creates and lists uniquely coded roles and permissions', async () => {
  const { caller } = await createAuthenticatedTestCaller({
    permissionCodes: [
      'role:read',
      'role:write',
      'permission:read',
      'permission:write',
    ],
  });
  const suffix = randomUUID();

  const permission = await caller.permission.create({
    name: 'Publish announcements',
    code: `announcement:publish-${suffix}`,
    description: 'Allows publishing announcements',
  });
  const role = await caller.role.create({
    name: 'Publisher',
    code: `publisher-${suffix}`,
    description: 'Publishes regional announcements',
  });

  await expect(caller.permission.list()).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: permission.id })]),
  );
  await expect(caller.role.list()).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: role.id })]),
  );
});

test('maintains user-role and role-permission relations from both views', async () => {
  const administrator = await createAuthenticatedTestCaller({
    permissionCodes: [
      'role:read',
      'role:write',
      'role:manage-permissions',
      'permission:read',
      'permission:write',
      'user:read',
      'user:manage-roles',
    ],
  });
  const target = await createAuthenticatedTestCaller();
  const suffix = randomUUID();
  const permission = await administrator.caller.permission.create({
    name: 'Relation permission',
    code: `relation:${suffix}`,
  });
  const role = await administrator.caller.role.create({
    name: 'Relation role',
    code: `relation-role-${suffix}`,
  });

  await administrator.caller.role.setUsers({
    roleId: role.id,
    userIds: [target.user.id],
  });
  await administrator.caller.role.setPermissions({
    roleId: role.id,
    permissionIds: [permission.id],
  });

  const roles = await administrator.caller.role.list();
  expect(roles.find(({ id }) => id === role.id)).toMatchObject({
    users: [expect.objectContaining({ id: target.user.id })],
    permissions: [expect.objectContaining({ id: permission.id })],
  });
  const users = await administrator.caller.user.list();
  expect(users.find(({ id }) => id === target.user.id)?.roles).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: role.id })]),
  );
  const permissions = await administrator.caller.permission.list();
  expect(permissions.find(({ id }) => id === permission.id)?.roles).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: role.id })]),
  );

  await administrator.caller.user.setRoles({
    userId: target.user.id,
    roleIds: [],
  });
  const afterRemoval = await administrator.caller.role.list();
  expect(afterRemoval.find(({ id }) => id === role.id)?.users).toEqual([]);
});

test('updates records and rejects deleting referenced role or permission', async () => {
  const { caller } = await createAuthenticatedTestCaller({
    permissionCodes: [
      'role:read',
      'role:write',
      'role:manage-permissions',
      'permission:read',
      'permission:write',
      'user:manage-roles',
    ],
  });
  const target = await createAuthenticatedTestCaller();
  const suffix = randomUUID();
  const permission = await caller.permission.create({
    name: 'Temporary permission',
    code: `temporary:${suffix}`,
  });
  const role = await caller.role.create({
    name: 'Temporary role',
    code: `temporary-role-${suffix}`,
  });

  await caller.role.update({
    id: role.id,
    name: 'Updated role',
    code: role.code,
    description: 'Updated description',
  });
  await caller.permission.update({
    id: permission.id,
    name: 'Updated permission',
    code: permission.code,
    description: 'Updated description',
  });
  await caller.role.setUsers({ roleId: role.id, userIds: [target.user.id] });
  await caller.role.setPermissions({
    roleId: role.id,
    permissionIds: [permission.id],
  });

  await expect(caller.role.delete({ id: role.id })).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringContaining('RESOURCE_IN_USE'),
  });
  await expect(
    caller.permission.delete({ id: permission.id }),
  ).rejects.toMatchObject({
    code: 'CONFLICT',
    message: expect.stringContaining('RESOURCE_IN_USE'),
  });
  expect(
    await prisma.role.findUnique({ where: { id: role.id } }),
  ).not.toBeNull();
  expect(
    await prisma.permission.findUnique({ where: { id: permission.id } }),
  ).not.toBeNull();

  await caller.role.setUsers({ roleId: role.id, userIds: [] });
  await caller.role.setPermissions({ roleId: role.id, permissionIds: [] });
  await expect(caller.role.delete({ id: role.id })).resolves.toMatchObject({
    id: role.id,
  });
  await expect(
    caller.permission.delete({ id: permission.id }),
  ).resolves.toMatchObject({ id: permission.id });
});

test('rejects role and permission operations without their permission points', async () => {
  const { caller } = await createAuthenticatedTestCaller();
  const suffix = randomUUID();

  await expect(caller.role.list()).rejects.toMatchObject({
    code: 'FORBIDDEN',
    message: 'MISSING_PERMISSION:role:read',
  });
  await expect(
    caller.permission.create({
      name: 'Must not be created',
      code: `must-not-exist:${suffix}`,
    }),
  ).rejects.toMatchObject({
    code: 'FORBIDDEN',
    message: 'MISSING_PERMISSION:permission:write',
  });
  await expect(
    prisma.permission.findUnique({
      where: { code: `must-not-exist:${suffix}` },
    }),
  ).resolves.toBeNull();
});
