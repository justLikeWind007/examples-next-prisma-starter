import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { RouterOutput } from '~/utils/trpc';
import { trpc } from '~/utils/trpc';
import {
  Badge,
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

type Permission = RouterOutput['permission']['list'][number];

export function PermissionsPanel({
  permissions,
}: {
  permissions: Set<string>;
}) {
  const query = trpc.permission.list.useQuery();
  const remove = trpc.permission.delete.useMutation();
  const utils = trpc.useUtils();
  const canWrite = permissions.has('permission:write');
  const [editing, setEditing] = useState<Permission | 'new' | null>(null);
  const [error, setError] = useState('');

  return (
    <section>
      <PageHeader
        title="功能权限"
        count={query.data?.length}
        action={
          canWrite ? (
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setEditing('new')}
            >
              <Plus size={16} />
              新增权限
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
                <th>权限名称</th>
                <th>权限编码</th>
                <th>关联角色</th>
                <th className="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((permission) => (
                <tr key={permission.id}>
                  <td>
                    <div className="font-medium text-zinc-950">
                      {permission.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {permission.description || '无描述'}
                    </div>
                  </td>
                  <td>
                    <code className="text-xs text-cyan-800">
                      {permission.code}
                    </code>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {permission.roles.length ? (
                        permission.roles.map((role) => (
                          <Badge key={role.id}>{role.name}</Badge>
                        ))
                      ) : (
                        <span className="text-zinc-400">未关联</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {canWrite && (
                      <div className="flex">
                        <button
                          type="button"
                          className="icon-button"
                          title="编辑权限"
                          onClick={() => setEditing(permission)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button text-red-500"
                          title="删除权限"
                          onClick={async () => {
                            if (
                              !window.confirm(`删除权限“${permission.name}”？`)
                            )
                              return;
                            setError('');
                            try {
                              await remove.mutateAsync({ id: permission.id });
                              await utils.permission.list.invalidate();
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
        <PermissionEditor
          key={editing === 'new' ? 'new' : editing.id}
          permission={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function PermissionEditor({
  permission,
  onClose,
}: {
  permission: Permission | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.permission.create.useMutation();
  const update = trpc.permission.update.useMutation();
  const [name, setName] = useState(permission?.name ?? '');
  const [code, setCode] = useState(permission?.code ?? '');
  const [description, setDescription] = useState(permission?.description ?? '');
  const [error, setError] = useState('');
  return (
    <Modal title={permission ? '编辑权限' : '新增权限'} onClose={onClose}>
      <form
        className="grid gap-5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            const input = { name, code, description: description || undefined };
            if (permission)
              await update.mutateAsync({ id: permission.id, ...input });
            else await create.mutateAsync(input);
            await utils.permission.list.invalidate();
            onClose();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '保存失败');
          }
        }}
      >
        <Field label="权限名称">
          <input
            className={inputClass}
            value={name}
            required
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="权限编码">
          <input
            className={inputClass}
            value={code}
            required
            minLength={3}
            maxLength={100}
            pattern="[a-z0-9:-]+"
            onChange={(event) => setCode(event.target.value)}
          />
        </Field>
        <Field label="描述">
          <textarea
            className={textareaClass}
            value={description}
            maxLength={240}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <ErrorNotice message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonSecondary} onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className={buttonPrimary}
            disabled={create.isPending || update.isPending}
          >
            <Save size={16} />
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
