import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '~/server/prisma';
import { rethrowUniqueConflict } from '~/server/router-errors';
import { permissionProcedure, router } from '../trpc';

const regionInput = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9:-]+$/),
  description: z.string().trim().max(240).optional(),
});

export const regionRouter = router({
  list: permissionProcedure('region:read').query(async () => {
    const regions = await prisma.region.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        userRegions: {
          select: {
            user: {
              select: { id: true, name: true, email: true, enabled: true },
            },
          },
          orderBy: { user: { name: 'asc' } },
        },
        _count: { select: { announcements: true } },
      },
      orderBy: { name: 'asc' },
    });
    return regions.map(({ userRegions, _count, ...region }) => ({
      ...region,
      users: userRegions.map(({ user }) => user),
      announcementCount: _count.announcements,
    }));
  }),
  create: permissionProcedure('region:write')
    .input(regionInput)
    .mutation(async ({ input }) => {
      try {
        return await prisma.region.create({
          data: {
            ...input,
            code: input.code.toLowerCase(),
            description: input.description || null,
          },
        });
      } catch (error) {
        rethrowUniqueConflict(error, 'REGION_CODE_EXISTS');
      }
    }),
  update: permissionProcedure('region:write')
    .input(regionInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.region.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'REGION_NOT_FOUND' });
      }
      try {
        return await prisma.region.update({
          where: { id: input.id },
          data: {
            name: input.name,
            code: input.code.toLowerCase(),
            description: input.description || null,
          },
        });
      } catch (error) {
        rethrowUniqueConflict(error, 'REGION_CODE_EXISTS');
      }
    }),
  setUsers: permissionProcedure('user:manage-regions')
    .input(
      z.object({
        regionId: z.string().uuid(),
        userIds: z.array(z.string().min(1)).max(200),
      }),
    )
    .mutation(async ({ input }) => {
      const userIds = [...new Set(input.userIds)];
      const [region, userCount] = await Promise.all([
        prisma.region.findUnique({
          where: { id: input.regionId },
          select: { id: true },
        }),
        prisma.user.count({ where: { id: { in: userIds } } }),
      ]);
      if (!region) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'REGION_NOT_FOUND' });
      }
      if (userCount !== userIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'UNKNOWN_USER_ID',
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.userRegion.deleteMany({ where: { regionId: input.regionId } });
        if (userIds.length) {
          await tx.userRegion.createMany({
            data: userIds.map((userId) => ({
              userId,
              regionId: input.regionId,
            })),
          });
        }
      });
      return { regionId: input.regionId, userIds };
    }),
  delete: permissionProcedure('region:write')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const region = await tx.region.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            _count: { select: { userRegions: true, announcements: true } },
          },
        });
        if (!region) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'REGION_NOT_FOUND',
          });
        }
        if (region._count.userRegions || region._count.announcements) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `RESOURCE_IN_USE:users=${region._count.userRegions},announcements=${region._count.announcements}`,
          });
        }
        return tx.region.delete({ where: { id: input.id } });
      });
    }),
});
