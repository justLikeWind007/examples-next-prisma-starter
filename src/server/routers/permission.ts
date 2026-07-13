import { prisma } from '~/server/prisma';
import { rethrowUniqueConflict } from '~/server/router-errors';
import { permissionProcedure, router } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const permissionInput = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9:-]+$/),
  description: z.string().trim().max(240).optional(),
});

export const permissionRouter = router({
  list: permissionProcedure('permission:read').query(async () => {
    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        rolePermissions: {
          select: { role: { select: { id: true, name: true, code: true } } },
          orderBy: { role: { name: 'asc' } },
        },
      },
      orderBy: { code: 'asc' },
    });
    return permissions.map(({ rolePermissions, ...permission }) => ({
      ...permission,
      roles: rolePermissions.map(({ role }) => role),
    }));
  }),
  create: permissionProcedure('permission:write')
    .input(permissionInput)
    .mutation(async ({ input }) => {
      try {
        return await prisma.permission.create({
          data: {
            ...input,
            code: input.code.toLowerCase(),
            description: input.description || null,
          },
        });
      } catch (error) {
        rethrowUniqueConflict(error, 'PERMISSION_CODE_EXISTS');
      }
    }),
  update: permissionProcedure('permission:write')
    .input(permissionInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.permission.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'PERMISSION_NOT_FOUND',
        });
      }
      try {
        return await prisma.permission.update({
          where: { id: input.id },
          data: {
            name: input.name,
            code: input.code.toLowerCase(),
            description: input.description || null,
          },
        });
      } catch (error) {
        rethrowUniqueConflict(error, 'PERMISSION_CODE_EXISTS');
      }
    }),
  delete: permissionProcedure('permission:write')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const permission = await tx.permission.findUnique({
          where: { id: input.id },
          select: { id: true, _count: { select: { rolePermissions: true } } },
        });
        if (!permission) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'PERMISSION_NOT_FOUND',
          });
        }
        if (permission._count.rolePermissions) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `RESOURCE_IN_USE:roles=${permission._count.rolePermissions}`,
          });
        }
        return tx.permission.delete({ where: { id: input.id } });
      });
    }),
});
