import { createAuthenticatedTestCaller } from '../test-utils';
import { createContextInner } from '../context';
import { createCaller } from './_app';

test('lists users with reverse role and region assignments', async () => {
  const { caller, user, role, regions } = await createAuthenticatedTestCaller({
    permissionCodes: ['user:read'],
    regionNames: ['Chongqing'],
  });

  const users = await caller.user.list();
  const currentUser = users.find(({ id }) => id === user.id);

  expect(currentUser).toMatchObject({
    id: user.id,
    enabled: true,
    roles: [{ id: role.id, code: role.code }],
    regions: [{ id: regions[0].id, name: 'Chongqing' }],
  });
});

test('updates a user display name with user:update', async () => {
  const administrator = await createAuthenticatedTestCaller({
    permissionCodes: ['user:update'],
  });
  const target = await createAuthenticatedTestCaller();

  const updated = await administrator.caller.user.update({
    userId: target.user.id,
    name: 'Renamed Operator',
  });

  expect(updated).toMatchObject({
    id: target.user.id,
    name: 'Renamed Operator',
  });
});

test('disables a user and revokes the existing session', async () => {
  const administrator = await createAuthenticatedTestCaller({
    permissionCodes: ['user:update'],
  });
  const target = await createAuthenticatedTestCaller();

  await administrator.caller.user.setEnabled({
    userId: target.user.id,
    enabled: false,
  });

  const nextRequest = createCaller(
    await createContextInner({ headers: target.headers }),
  );
  await expect(nextRequest.auth.me()).rejects.toMatchObject({
    code: 'UNAUTHORIZED',
  });
});
