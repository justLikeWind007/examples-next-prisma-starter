import { auth } from '~/server/auth';
import { prisma } from '~/server/prisma';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { z } from 'zod';

const registrationInput = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(15).max(64),
});

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => ({
    ...ctx.user,
    permissionCodes: ctx.permissionCodes,
    regionIds: ctx.regionIds,
  })),
  register: publicProcedure
    .input(registrationInput)
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'EMAIL_ALREADY_REGISTERED',
        });
      }

      const result = await auth.api.signUpEmail({
        body: {
          name: input.name,
          email,
          password: input.password,
        },
      });

      return {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        enabled: result.user.enabled,
      };
    }),
});
