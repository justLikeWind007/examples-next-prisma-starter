import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
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
  textareaClass,
} from './ui';

type Role = RouterOutput['role']['list'][number];

export function RolesPanel({ permissions }: { permissions: Set<string> }) {
  const query = trpc.role.list.useQuery();
  const canWrite = permissions.has('role:write');
  const canSetUsers =
    permissions.has('user:manage-roles') && permissions.has('user:read');
  const canSetPermissions =
    permissions.has('role:manage-permissions') &&
    permissions.has('permission:read');
  const users = trpc.user.list.useQuery(undefined, { enabled: canSetUsers });
  const permissionOptions = trpc.permission.list.useQuery(undefined, {
    enabled: canSetPermissions,
  });
  const remove = trpc.role.delete.useMutation();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<Role | 'new' | null>(null);
  const [error, setError] = useState('');

  return (
    <section>
      <PageHeader
        title="角色管理"
        count={query.data?.length}
        action={
          canWrite ? (
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setEditing('new')}
            >
              <Plus size={16} />
              新增角色
            </button>
          ) : undefined
        }
      />
      <ErrorNotice message={error || query.error?.message} />
      {query.isPending ? (
        <LoadingTable />
      ) : query.data?.length ? (
        <div className="overflow-x-auto border-x border-zinc-200">
          <table className="data-table">
            <thead>
              <tr>
                <th>角色</th>
                <th>用户</th>
                <th>功能权限</th>
                <th className="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((role) => (
                <tr key={role.id}>
                  <td>
                    <div className="font-medium text-zinc-950">{role.name}</div>
                    <code className="text-xs text-cyan-800">{role.code}</code>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {role.users.length ? (
                        role.users.map((user) => (
                          <Badge key={user.id}>{user.name}</Badge>
                        ))
                      ) : (
                        <span className="text-zinc-400">未关联</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex max-w-lg flex-wrap gap-1">
                      {role.permissions.length ? (
                        role.permissions.map((permission) => (
                          <Badge key={permission.id}>{permission.code}</Badge>
                        ))
                      ) : (
                        <span className="text-zinc-400">未关联</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {(canWrite || canSetUsers || canSetPermissions) && (
                      <div className="flex">
                        <button
                          type="button"
                          className="icon-button"
                          title="编辑角色"
                          onClick={() => setEditing(role)}
                        >
                          <Pencil size={16} />
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            className="icon-button text-red-500"
                            title="删除角色"
                            onClick={async () => {
                              if (!window.confirm(`删除角色“${role.name}”？`))
                                return;
                              setError('');
                              try {
                                await remove.mutateAsync({ id: role.id });
                                await utils.role.list.invalidate();
                              } catch (cause) {
                                setError(
                                  cause instanceof Error
                                    ? cause.message
                                    : '删除失败',
                                );
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
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
        <RoleEditor
          key={editing === 'new' ? 'new' : editing.id}
          role={editing === 'new' ? null : editing}
          users={users.data ?? []}
          permissions={permissionOptions.data ?? []}
          canWrite={canWrite}
          canSetUsers={canSetUsers}
          canSetPermissions={canSetPermissions}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function RoleEditor({
  role,
  users,
  permissions,
  canWrite,
  canSetUsers,
  canSetPermissions,
  onClose,
}: {
  role: Role | null;
  users: RouterOutput['user']['list'];
  permissions: RouterOutput['permission']['list'];
  canWrite: boolean;
  canSetUsers: boolean;
  canSetPermissions: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.role.create.useMutation();
  const update = trpc.role.update.useMutation();
  const setUsers = trpc.role.setUsers.useMutation();
  const setPermissions = trpc.role.setPermissions.useMutation();
  const [name, setName] = useState(role?.name ?? '');
  const [code, setCode] = useState(role?.code ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [userIds, setUserIds] = useState(role?.users.map(({ id }) => id) ?? []);
  const [permissionIds, setPermissionIds] = useState(
    role?.permissions.map(({ id }) => id) ?? [],
  );
  const [error, setError] = useState('');
  const pending =
    create.isPending ||
    update.isPending ||
    setUsers.isPending ||
    setPermissions.isPending;
  return (
    <Modal title={role ? '编辑角色' : '新增角色'} onClose={onClose}>
      <form
        className="grid gap-5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            let roleId = role?.id;
            if (canWrite) {
              const input = {
                name,
                code,
                description: description || undefined,
              };
              const saved = role
                ? await update.mutateAsync({ id: role.id, ...input })
                : await create.mutateAsync(input);
              roleId = saved.id;
            }
            if (!roleId) throw new Error('需要角色维护权限才能新增角色');
            if (canSetUsers) await setUsers.mutateAsync({ roleId, userIds });
            if (canSetPermissions)
              await setPermissions.mutateAsync({ roleId, permissionIds });
            await Promise.all([
              utils.role.list.invalidate(),
              utils.user.list.invalidate(),
              utils.permission.list.invalidate(),
            ]);
            onClose();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '保存失败');
          }
        }}
      >
        <Field label="角色名称">
          <input
            className={inputClass}
            value={name}
            required
            maxLength={80}
            disabled={!canWrite}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="角色编码">
          <input
            className={inputClass}
            value={code}
            required
            minLength={2}
            maxLength={80}
            pattern="[a-z0-9:-]+"
            disabled={!canWrite}
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="描述">
          <textarea
            className={textareaClass}
            value={description}
            maxLength={240}
            disabled={!canWrite}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        {canSetUsers && (
          <CheckList
            title="关联用户（角色侧）"
            items={users.map((user) => ({
              id: user.id,
              label: user.name,
              detail: user.email,
            }))}
            selected={userIds}
            onChange={setUserIds}
          />
        )}
        {canSetPermissions && (
          <CheckList
            title="功能权限"
            items={permissions.map((permission) => ({
              id: permission.id,
              label: permission.name,
              detail: permission.code,
            }))}
            selected={permissionIds}
            onChange={setPermissionIds}
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
