import { prisma } from '~/server/prisma';
import { rethrowUniqueConflict } from '~/server/router-errors';
import { permissionProcedure, router } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const roleInput = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9:-]+$/),
  description: z.string().trim().max(240).optional(),
});

export const roleRouter = router({
  setUsers: permissionProcedure('user:manage-roles')
    .input(
      z.object({
        roleId: z.string().uuid(),
        userIds: z.array(z.string().min(1)).max(200),
      }),
    )
    .mutation(async ({ input }) => {
      const userIds = [...new Set(input.userIds)];
      const [role, userCount] = await Promise.all([
        prisma.role.findUnique({
          where: { id: input.roleId },
          select: { id: true },
        }),
        prisma.user.count({ where: { id: { in: userIds } } }),
      ]);
      if (!role) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ROLE_NOT_FOUND' });
      }
      if (userCount !== userIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'UNKNOWN_USER_ID',
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { roleId: input.roleId } });
        if (userIds.length) {
          await tx.userRole.createMany({
            data: userIds.map((userId) => ({ userId, roleId: input.roleId })),
          });
        }
      });
      return { roleId: input.roleId, userIds };
    }),
  setPermissions: permissionProcedure('role:manage-permissions')
    .input(
      z.object({
        roleId: z.string().uuid(),
        permissionIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .mutation(async ({ input }) => {
      const permissionIds = [...new Set(input.permissionIds)];
      const [role, permissionCount] = await Promise.all([
        prisma.role.findUnique({
          where: { id: input.roleId },
          select: { id: true },
        }),
        prisma.permission.count({ where: { id: { in: permissionIds } } }),
      ]);
      if (!role) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ROLE_NOT_FOUND' });
      }
      if (permissionCount !== permissionIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'UNKNOWN_PERMISSION_ID',
        });
      }
      await prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: input.roleId } });
        if (permissionIds.length) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId: input.roleId,
              permissionId,
            })),
          });
        }
      });
      return { roleId: input.roleId, permissionIds };
    }),
  list: permissionProcedure('role:read').query(async () => {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        userRoles: {
          select: {
            user: {
              select: { id: true, name: true, email: true, enabled: true },
            },
          },
          orderBy: { user: { name: 'asc' } },
        },
        rolePermissions: {
          select: {
            permission: { select: { id: true, name: true, code: true } },
          },
          orderBy: { permission: { code: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    });
    return roles.map(({ userRoles, rolePermissions, ...role }) => ({
      ...role,
      users: userRoles.map(({ user }) => user),
      permissions: rolePermissions.map(({ permission }) => permission),
    }));
  }),
  create: permissionProcedure('role:write')
    .input(roleInput)
    .mutation(async ({ input }) => {
      try {
        return await prisma.role.create({
          data: {
            ...input,
            code: input.code.toLowerCase(),
            description: input.description || null,
          },
        });
      } catch (error) {
        rethrowUniqueConflict(error, 'ROLE_CODE_EXISTS');
      }
    }),
  update: permissionProcedure('role:write')
    .input(roleInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.role.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'ROLE_NOT_FOUND' });
      }
      try {
        return await prisma.role.update({
          where: { id: input.id },
          data: {
            name: input.name,
            code: input.code.toLowerCase(),
            description: input.description || null,
          },
        });
      } catch (error) {
        rethrowUniqueConflict(error, 'ROLE_CODE_EXISTS');
      }
    }),
  delete: permissionProcedure('role:write')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            _count: { select: { userRoles: true, rolePermissions: true } },
          },
        });
        if (!role) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'ROLE_NOT_FOUND' });
        }
        if (role._count.userRoles || role._count.rolePermissions) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `RESOURCE_IN_USE:users=${role._count.userRoles},permissions=${role._count.rolePermissions}`,
          });
        }
        return tx.role.delete({ where: { id: input.id } });
      });
    }),
});
