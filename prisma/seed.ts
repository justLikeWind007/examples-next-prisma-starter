import { auth } from '../src/server/auth';
import { prisma } from '../src/server/prisma';

const permissions = [
  ['user:read', '查看用户'],
  ['user:update', '更新用户'],
  ['user:manage-roles', '分配用户角色'],
  ['user:manage-regions', '分配用户区域'],
  ['role:read', '查看角色'],
  ['role:write', '维护角色'],
  ['role:manage-permissions', '分配角色权限'],
  ['permission:read', '查看权限点'],
  ['permission:write', '维护权限点'],
  ['region:read', '查看区域'],
  ['region:write', '维护区域'],
  ['announcement:read', '查看公告'],
  ['announcement:write', '维护公告'],
] as const;

async function ensureUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  let user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    const signup = await auth.api.signUpEmail({ body: input });
    user = await prisma.user.findUniqueOrThrow({
      where: { id: signup.user.id },
    });
  }
  return prisma.user.update({
    where: { id: user.id },
    data: { name: input.name, enabled: true },
  });
}

async function replaceUserRelations(
  userId: string,
  roleIds: string[],
  regionIds: string[],
) {
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRegion.deleteMany({ where: { userId } });
    if (roleIds.length) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }
    if (regionIds.length) {
      await tx.userRegion.createMany({
        data: regionIds.map((regionId) => ({ userId, regionId })),
      });
    }
  });
}

async function main() {
  await prisma.post.upsert({
    where: { id: '5c03994c-fc16-47e0-bd02-d218a370a078' },
    create: {
      id: '5c03994c-fc16-47e0-bd02-d218a370a078',
      title: 'First Post',
      text: 'This is an example post generated from `prisma/seed.ts`',
    },
    update: {},
  });

  const permissionRecords = await Promise.all(
    permissions.map(([code, name]) =>
      prisma.permission.upsert({
        where: { code },
        create: { code, name, description: `接口权限：${code}` },
        update: { name, description: `接口权限：${code}` },
      }),
    ),
  );
  const permissionByCode = new Map(
    permissionRecords.map((permission) => [permission.code, permission]),
  );

  const [administratorRole, regionalEditorRole, viewerRole] = await Promise.all(
    [
      prisma.role.upsert({
        where: { code: 'system-administrator' },
        create: {
          code: 'system-administrator',
          name: '系统管理员',
          description: '拥有全部演示权限',
        },
        update: { name: '系统管理员', description: '拥有全部演示权限' },
      }),
      prisma.role.upsert({
        where: { code: 'regional-editor' },
        create: {
          code: 'regional-editor',
          name: '区域公告编辑',
          description: '可查看区域并维护授权区域内公告',
        },
        update: {
          name: '区域公告编辑',
          description: '可查看区域并维护授权区域内公告',
        },
      }),
      prisma.role.upsert({
        where: { code: 'announcement-viewer' },
        create: {
          code: 'announcement-viewer',
          name: '公告只读',
          description: '只能查看授权区域内公告',
        },
        update: { name: '公告只读', description: '只能查看授权区域内公告' },
      }),
    ],
  );

  const rolePermissionCodes = new Map<string, string[]>([
    [administratorRole.id, permissionRecords.map(({ code }) => code)],
    [
      regionalEditorRole.id,
      ['announcement:read', 'announcement:write', 'region:read'],
    ],
    [viewerRole.id, ['announcement:read']],
  ]);
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId: { in: [...rolePermissionCodes.keys()] } },
    });
    await tx.rolePermission.createMany({
      data: [...rolePermissionCodes].flatMap(([roleId, codes]) =>
        codes.map((code) => ({
          roleId,
          permissionId: permissionByCode.get(code)!.id,
        })),
      ),
    });
  });

  const [chongqing, beijing] = await Promise.all([
    prisma.region.upsert({
      where: { code: 'chongqing' },
      create: { code: 'chongqing', name: '重庆', description: '西南区域' },
      update: { name: '重庆', description: '西南区域' },
    }),
    prisma.region.upsert({
      where: { code: 'beijing' },
      create: { code: 'beijing', name: '北京', description: '华北区域' },
      update: { name: '北京', description: '华北区域' },
    }),
  ]);

  const [administrator, editor, viewer, limited] = await Promise.all([
    ensureUser({
      name: '系统管理员',
      email: 'admin@example.com',
      password: 'PermissionAdmin2026!',
    }),
    ensureUser({
      name: '重庆区域编辑',
      email: 'editor@example.com',
      password: 'RegionalEditor2026!',
    }),
    ensureUser({
      name: '北京公告读者',
      email: 'viewer@example.com',
      password: 'AnnouncementViewer2026!',
    }),
    ensureUser({
      name: '无权限用户',
      email: 'limited@example.com',
      password: 'LimitedAccess2026!',
    }),
  ]);

  await Promise.all([
    replaceUserRelations(
      administrator.id,
      [administratorRole.id],
      [chongqing.id, beijing.id],
    ),
    replaceUserRelations(editor.id, [regionalEditorRole.id], [chongqing.id]),
    replaceUserRelations(viewer.id, [viewerRole.id], [beijing.id]),
    replaceUserRelations(limited.id, [], []),
  ]);

  await Promise.all([
    prisma.announcement.upsert({
      where: { id: '11111111-1111-4111-8111-111111111111' },
      create: {
        id: '11111111-1111-4111-8111-111111111111',
        title: '重庆研发培训通知',
        content: '重庆区域学员请于周三 09:00 参加 AI 编程实操。',
        regionId: chongqing.id,
        createdById: administrator.id,
      },
      update: {
        title: '重庆研发培训通知',
        content: '重庆区域学员请于周三 09:00 参加 AI 编程实操。',
        regionId: chongqing.id,
      },
    }),
    prisma.announcement.upsert({
      where: { id: '22222222-2222-4222-8222-222222222222' },
      create: {
        id: '22222222-2222-4222-8222-222222222222',
        title: '北京研发培训通知',
        content: '北京区域学员请于周四 14:00 参加考核说明会。',
        regionId: beijing.id,
        createdById: administrator.id,
      },
      update: {
        title: '北京研发培训通知',
        content: '北京区域学员请于周四 14:00 参加考核说明会。',
        regionId: beijing.id,
      },
    }),
  ]);

  console.log('Seeded permission administration assessment data.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
