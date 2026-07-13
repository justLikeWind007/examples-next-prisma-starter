import { prisma } from '~/server/prisma';
import { permissionProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const userRouter = router({
  setRegions: permissionProcedure('user:manage-regions')
    .input(
      z.object({
        userId: z.string().min(1),
        regionIds: z.array(z.string().uuid()).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const regionIds = [...new Set(input.regionIds)];
      const [user, regionCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true },
        }),
        prisma.region.count({ where: { id: { in: regionIds } } }),
      ]);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
      }
      if (regionCount !== regionIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'UNKNOWN_REGION_ID',
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.userRegion.deleteMany({ where: { userId: input.userId } });
        if (regionIds.length) {
          await tx.userRegion.createMany({
            data: regionIds.map((regionId) => ({
              userId: input.userId,
              regionId,
            })),
          });
        }
      });
      return { userId: input.userId, regionIds };
    }),
  setRoles: permissionProcedure('user:manage-roles')
    .input(
      z.object({
        userId: z.string().min(1),
        roleIds: z.array(z.string().uuid()).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const roleIds = [...new Set(input.roleIds)];
      const [user, roleCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: input.userId },
          select: { id: true },
        }),
        prisma.role.count({ where: { id: { in: roleIds } } }),
      ]);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
      }
      if (roleCount !== roleIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'UNKNOWN_ROLE_ID',
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: input.userId } });
        if (roleIds.length) {
          await tx.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: input.userId, roleId })),
          });
        }
      });
      return { userId: input.userId, roleIds };
    }),
  setEnabled: permissionProcedure('user:update')
    .input(z.object({ userId: z.string().min(1), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
      }

      return prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: input.userId },
          data: { enabled: input.enabled },
          select: { id: true, name: true, email: true, enabled: true },
        });
        if (!input.enabled) {
          await tx.session.deleteMany({ where: { userId: input.userId } });
        }
        return user;
      });
    }),
  update: permissionProcedure('user:update')
    .input(
      z.object({
        userId: z.string().min(1),
        name: z.string().trim().min(1).max(80),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' });
      }
      return prisma.user.update({
        where: { id: input.userId },
        data: { name: input.name },
        select: { id: true, name: true, email: true, enabled: true },
      });
    }),
  list: permissionProcedure('user:read').query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        enabled: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { role: { name: 'asc' } },
        },
        userRegions: {
          select: {
            region: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { region: { name: 'asc' } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map(({ userRoles, userRegions, ...user }) => ({
      ...user,
      roles: userRoles.map(({ role }) => role),
      regions: userRegions.map(({ region }) => region),
    }));
  }),
});
