import { randomUUID } from 'node:crypto';
import { auth } from './auth';
import { createContextInner } from './context';
import { prisma } from './prisma';
import { createCaller } from './routers/_app';

interface TestCallerOptions {
  permissionCodes?: string[];
  regionNames?: string[];
  enabled?: boolean;
}

export async function createAuthenticatedTestCaller(
  options: TestCallerOptions = {},
) {
  const suffix = randomUUID();
  const email = `test-${suffix}@example.com`;
  const password = 'a valid automated test password';
  const signup = await auth.api.signUpEmail({
    body: { name: `Test User ${suffix.slice(0, 6)}`, email, password },
  });

  const permissionCodes = options.permissionCodes ?? [];
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        create: { code, name: code },
        update: {},
      }),
    ),
  );
  const role = await prisma.role.create({
    data: {
      name: `Test Role ${suffix.slice(0, 6)}`,
      code: `test-role-${suffix}`,
      rolePermissions: {
        create: permissions.map(({ id }) => ({ permissionId: id })),
      },
      userRoles: { create: { userId: signup.user.id } },
    },
  });

  const regions = await Promise.all(
    (options.regionNames ?? []).map((name, index) =>
      prisma.region.create({
        data: {
          name,
          code: `test-region-${index}-${suffix}`,
          userRegions: { create: { userId: signup.user.id } },
        },
      }),
    ),
  );

  if (options.enabled === false) {
    await prisma.user.update({
      where: { id: signup.user.id },
      data: { enabled: false },
    });
  }

  const login = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const setCookie = login.headers.get('set-cookie');
  if (!setCookie) throw new Error('Test login did not return a session cookie');
  const headers = new Headers({ cookie: setCookie.split(';')[0] });
  const caller = createCaller(await createContextInner({ headers }));

  return {
    caller,
    user: signup.user,
    role,
    permissions,
    regions,
    headers,
    email,
    password,
  };
}
