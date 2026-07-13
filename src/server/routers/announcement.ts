import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { prisma } from '~/server/prisma';
import { permissionProcedure, router } from '../trpc';

const announcementInput = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  regionId: z.string().uuid(),
});

const announcementSelect = {
  id: true,
  title: true,
  content: true,
  regionId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  region: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export const announcementRouter = router({
  list: permissionProcedure('announcement:read').query(async ({ ctx }) => {
    return prisma.announcement.findMany({
      where: { regionId: { in: ctx.regionIds } },
      select: announcementSelect,
      orderBy: { createdAt: 'desc' },
    });
  }),
  byId: permissionProcedure('announcement:read')
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const announcement = await prisma.announcement.findFirst({
        where: { id: input.id, regionId: { in: ctx.regionIds } },
        select: announcementSelect,
      });
      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ANNOUNCEMENT_NOT_FOUND',
        });
      }
      return announcement;
    }),
  create: permissionProcedure('announcement:write')
    .input(announcementInput)
    .mutation(async ({ ctx, input }) => {
      const region = await prisma.region.findFirst({
        where: {
          id: { equals: input.regionId, in: ctx.regionIds },
        },
        select: { id: true },
      });
      if (!region) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'REGION_OUT_OF_SCOPE',
        });
      }
      return prisma.announcement.create({
        data: {
          title: input.title,
          content: input.content,
          regionId: input.regionId,
          createdById: ctx.user.id,
        },
        select: announcementSelect,
      });
    }),
  update: permissionProcedure('announcement:write')
    .input(announcementInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.$transaction(async (tx) => {
        const existing = await tx.announcement.findFirst({
          where: { id: input.id, regionId: { in: ctx.regionIds } },
          select: { id: true },
        });
        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'ANNOUNCEMENT_NOT_FOUND',
          });
        }
        const targetRegion = await tx.region.findFirst({
          where: { id: { equals: input.regionId, in: ctx.regionIds } },
          select: { id: true },
        });
        if (!targetRegion) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'REGION_OUT_OF_SCOPE',
          });
        }
        return tx.announcement.update({
          where: { id: input.id },
          data: {
            title: input.title,
            content: input.content,
            regionId: input.regionId,
          },
          select: announcementSelect,
        });
      });
    }),
  delete: permissionProcedure('announcement:write')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await prisma.announcement.deleteMany({
        where: { id: input.id, regionId: { in: ctx.regionIds } },
      });
      if (!result.count) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ANNOUNCEMENT_NOT_FOUND',
        });
      }
      return { id: input.id };
    }),
});
