import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prisma } from './prisma';

export const auth = betterAuth({
  appName: 'Permission Control',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 15,
    maxPasswordLength: 64,
  },
  user: {
    additionalFields: {
      enabled: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return;
      const email = (ctx.body as { email?: string } | undefined)?.email;
      if (!email) return;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { enabled: true },
      });
      if (user && !user.enabled) {
        throw new APIError('UNAUTHORIZED', {
          code: 'INVALID_EMAIL_OR_PASSWORD',
          message: 'Invalid email or password',
        });
      }
    }),
  },
});
