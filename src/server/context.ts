import type * as trpcNext from '@trpc/server/adapters/next';
import { auth } from './auth';
import { prisma } from './prisma';

interface CreateContextOptions {
  headers?: Headers;
}

/**
 * Inner function for `createContext` where we create the context.
 * This is useful for testing when we don't want to mock Next.js' request/response
 */
export async function createContextInner(opts: CreateContextOptions) {
  const authSession = opts.headers
    ? await auth.api.getSession({ headers: opts.headers })
    : null;

  if (!authSession) {
    return {
      user: null,
      session: null,
      permissionCodes: [] as string[],
      regionIds: [] as string[],
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: authSession.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      enabled: true,
      userRoles: {
        select: {
          role: {
            select: {
              rolePermissions: {
                select: { permission: { select: { code: true } } },
              },
            },
          },
        },
      },
      userRegions: { select: { regionId: true } },
    },
  });

  if (!user?.enabled) {
    return {
      user: null,
      session: null,
      permissionCodes: [] as string[],
      regionIds: [] as string[],
    };
  }

  const permissionCodes = [
    ...new Set(
      user.userRoles.flatMap(({ role }) =>
        role.rolePermissions.map(({ permission }) => permission.code),
      ),
    ),
  ];

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      enabled: user.enabled,
    },
    session: authSession.session,
    permissionCodes,
    regionIds: user.userRegions.map(({ regionId }) => regionId),
  };
}

export type Context = Awaited<ReturnType<typeof createContextInner>>;

/**
 * Creates context for an incoming request
 * @see https://trpc.io/docs/v11/context
 */
export async function createContext(
  opts: trpcNext.CreateNextContextOptions,
): Promise<Context> {
  // for API-response caching see https://trpc.io/docs/v11/caching

  const headers = new Headers();
  for (const [name, value] of Object.entries(opts.req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return await createContextInner({ headers });
}
