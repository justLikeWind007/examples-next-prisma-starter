import { Pencil, Save } from 'lucide-react';
import { useState } from 'react';
import type { RouterOutput } from '~/utils/trpc';
import { trpc } from '~/utils/trpc';
import {
  Badge,
  CheckList,
  EmptyTable,
  ErrorNotice,
  Field,
  LoadingTable,
  Modal,
  PageHeader,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from './ui';

type User = RouterOutput['user']['list'][number];

export function UsersPanel({ permissions }: { permissions: Set<string> }) {
  const users = trpc.user.list.useQuery();
  const canUpdate = permissions.has('user:update');
  const canManageRoles = permissions.has('user:manage-roles');
  const canManageRegions = permissions.has('user:manage-regions');
  const roles = trpc.role.list.useQuery(undefined, {
    enabled: canManageRoles && permissions.has('role:read'),
  });
  const regions = trpc.region.list.useQuery(undefined, {
    enabled: canManageRegions && permissions.has('region:read'),
  });
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <section>
      <PageHeader title="用户管理" count={users.data?.length} />
      <ErrorNotice message={users.error?.message} />
      {users.isPending ? (
        <LoadingTable />
      ) : users.data?.length ? (
        <div className="overflow-x-auto border-x border-zinc-200">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>状态</th>
                <th>角色</th>
                <th>数据区域</th>
                <th className="w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="font-medium text-zinc-950">{user.name}</div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </td>
                  <td>
                    <span
                      className={
                        user.enabled ? 'text-emerald-700' : 'text-red-600'
                      }
                    >
                      {user.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length ? (
                        user.roles.map((role) => (
                          <Badge key={role.id}>{role.name}</Badge>
                        ))
                      ) : (
                        <span className="text-zinc-400">未分配</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.regions.length ? (
                        user.regions.map((region) => (
                          <Badge key={region.id}>{region.name}</Badge>
                        ))
                      ) : (
                        <span className="text-zinc-400">空范围</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {(canUpdate || canManageRoles || canManageRegions) && (
                      <button
                        type="button"
                        className="icon-button"
                        title="编辑用户"
                        aria-label={`编辑 ${user.name}`}
                        onClick={() => setEditing(user)}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyTable />
      )}
      {editing && (
        <UserEditor
          key={editing.id}
          user={editing}
          roles={roles.data ?? []}
          regions={regions.data ?? []}
          canUpdate={canUpdate}
          canManageRoles={canManageRoles}
          canManageRegions={canManageRegions}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function UserEditor({
  user,
  roles,
  regions,
  canUpdate,
  canManageRoles,
  canManageRegions,
  onClose,
}: {
  user: User;
  roles: RouterOutput['role']['list'];
  regions: RouterOutput['region']['list'];
  canUpdate: boolean;
  canManageRoles: boolean;
  canManageRegions: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const update = trpc.user.update.useMutation();
  const setEnabled = trpc.user.setEnabled.useMutation();
  const setRoles = trpc.user.setRoles.useMutation();
  const setRegions = trpc.user.setRegions.useMutation();
  const [name, setName] = useState(user.name);
  const [enabled, setEnabledValue] = useState(user.enabled);
  const [roleIds, setRoleIds] = useState(user.roles.map(({ id }) => id));
  const [regionIds, setRegionIds] = useState(user.regions.map(({ id }) => id));
  const [error, setError] = useState('');
  const pending =
    update.isPending ||
    setEnabled.isPending ||
    setRoles.isPending ||
    setRegions.isPending;

  return (
    <Modal title="编辑用户" onClose={onClose}>
      <form
        className="grid gap-5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            if (canUpdate && name !== user.name)
              await update.mutateAsync({ userId: user.id, name });
            if (canManageRoles)
              await setRoles.mutateAsync({ userId: user.id, roleIds });
            if (canManageRegions)
              await setRegions.mutateAsync({ userId: user.id, regionIds });
            if (canUpdate && enabled !== user.enabled)
              await setEnabled.mutateAsync({ userId: user.id, enabled });
            await Promise.all([
              utils.user.list.invalidate(),
              utils.role.list.invalidate(),
              utils.region.list.invalidate(),
            ]);
            onClose();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '保存失败');
          }
        }}
      >
        <Field label="姓名">
          <input
            className={inputClass}
            value={name}
            maxLength={80}
            required
            disabled={!canUpdate}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="账号状态">
          <label className="flex h-10 items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={enabled}
              disabled={!canUpdate}
              onChange={(event) => setEnabledValue(event.target.checked)}
            />
            <span className="text-sm font-normal">
              {enabled ? '启用' : '禁用'}
            </span>
          </label>
        </Field>
        {canManageRoles && (
          <CheckList
            title="角色"
            items={roles.map((role) => ({
              id: role.id,
              label: role.name,
              detail: role.code,
            }))}
            selected={roleIds}
            onChange={setRoleIds}
          />
        )}
        {canManageRegions && (
          <CheckList
            title="数据区域"
            items={regions.map((region) => ({
              id: region.id,
              label: region.name,
              detail: region.code,
            }))}
            selected={regionIds}
            onChange={setRegionIds}
          />
        )}
        <ErrorNotice message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonSecondary} onClick={onClose}>
            取消
          </button>
          <button type="submit" className={buttonPrimary} disabled={pending}>
            <Save size={16} />
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
