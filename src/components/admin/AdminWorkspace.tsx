import {
  KeyRound,
  LogOut,
  MapPin,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { authClient } from '~/utils/auth-client';
import { trpc } from '~/utils/trpc';
import { AnnouncementsPanel } from './AnnouncementsPanel';
import { PermissionsPanel } from './PermissionsPanel';
import { RegionsPanel } from './RegionsPanel';
import { RolesPanel } from './RolesPanel';
import { UsersPanel } from './UsersPanel';

type TabId = 'users' | 'roles' | 'permissions' | 'regions' | 'announcements';

const navigation = [
  { id: 'users' as const, label: '用户', permission: 'user:read', icon: Users },
  {
    id: 'roles' as const,
    label: '角色',
    permission: 'role:read',
    icon: ShieldCheck,
  },
  {
    id: 'permissions' as const,
    label: '权限点',
    permission: 'permission:read',
    icon: KeyRound,
  },
  {
    id: 'regions' as const,
    label: '区域',
    permission: 'region:read',
    icon: MapPin,
  },
  {
    id: 'announcements' as const,
    label: '公告',
    permission: 'announcement:read',
    icon: Megaphone,
  },
];

export function AdminWorkspace() {
  const router = useRouter();
  const session = authClient.useSession();
  const me = trpc.auth.me.useQuery(undefined, {
    enabled: Boolean(session.data?.user),
  });
  const [active, setActive] = useState<TabId>('users');
  const permissionSet = useMemo(
    () => new Set(me.data?.permissionCodes ?? []),
    [me.data?.permissionCodes],
  );
  const visibleNavigation = navigation.filter(({ permission }) =>
    permissionSet.has(permission),
  );
  const activeTab = visibleNavigation.some(({ id }) => id === active)
    ? active
    : visibleNavigation[0]?.id;

  useEffect(() => {
    if (!session.isPending && !session.data?.user)
      void router.replace('/login');
  }, [router, session.data?.user, session.isPending]);

  if (session.isPending || (session.data?.user && me.isPending)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-zinc-500">
        正在载入权限...
      </div>
    );
  }
  if (!session.data?.user) return null;

  return (
    <div className="min-h-screen bg-zinc-100 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-zinc-800 bg-zinc-950 text-zinc-300 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5 lg:justify-start">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded bg-emerald-500 text-zinc-950">
              <ShieldCheck size={18} />
            </span>
            <span className="font-semibold text-white">权限控制台</span>
          </div>
          <button
            type="button"
            className="icon-button text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
            title="退出登录"
            onClick={async () => {
              await authClient.signOut();
              await router.push('/login');
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:grid lg:pt-3"
          aria-label="管理模块"
        >
          {visibleNavigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex h-10 min-w-max items-center gap-3 rounded px-3 text-sm transition-colors ${activeTab === id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-zinc-800 p-4 lg:absolute lg:bottom-0 lg:block lg:w-[220px]">
          <div className="mb-3 min-w-0">
            <div className="truncate text-sm font-medium text-white">
              {me.data?.name}
            </div>
            <div className="truncate text-xs text-zinc-500">
              {me.data?.email}
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded px-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
            onClick={async () => {
              await authClient.signOut();
              await router.push('/login');
            }}
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>
      <main className="min-w-0 bg-white p-4 sm:p-6 lg:p-8">
        {!activeTab && (
          <div className="grid min-h-[60vh] place-items-center text-sm text-zinc-500">
            当前账号没有可用模块
          </div>
        )}
        {activeTab === 'users' && <UsersPanel permissions={permissionSet} />}
        {activeTab === 'roles' && <RolesPanel permissions={permissionSet} />}
        {activeTab === 'permissions' && (
          <PermissionsPanel permissions={permissionSet} />
        )}
        {activeTab === 'regions' && (
          <RegionsPanel permissions={permissionSet} />
        )}
        {activeTab === 'announcements' && (
          <AnnouncementsPanel
            permissions={permissionSet}
            regionIds={me.data?.regionIds ?? []}
          />
        )}
      </main>
    </div>
  );
}
