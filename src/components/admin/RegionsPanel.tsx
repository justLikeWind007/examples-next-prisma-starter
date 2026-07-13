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

type Region = RouterOutput['region']['list'][number];

export function RegionsPanel({ permissions }: { permissions: Set<string> }) {
  const query = trpc.region.list.useQuery();
  const canWrite = permissions.has('region:write');
  const canSetUsers =
    permissions.has('user:manage-regions') && permissions.has('user:read');
  const users = trpc.user.list.useQuery(undefined, { enabled: canSetUsers });
  const remove = trpc.region.delete.useMutation();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<Region | 'new' | null>(null);
  const [error, setError] = useState('');

  return (
    <section>
      <PageHeader
        title="区域管理"
        count={query.data?.length}
        action={
          canWrite ? (
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setEditing('new')}
            >
              <Plus size={16} />
              新增区域
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
                <th>区域</th>
                <th>授权用户</th>
                <th>公告数</th>
                <th className="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((region) => (
                <tr key={region.id}>
                  <td>
                    <div className="font-medium text-zinc-950">
                      {region.name}
                    </div>
                    <code className="text-xs text-cyan-800">{region.code}</code>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {region.users.length ? (
                        region.users.map((user) => (
                          <Badge key={user.id}>{user.name}</Badge>
                        ))
                      ) : (
                        <span className="text-zinc-400">未授权</span>
                      )}
                    </div>
                  </td>
                  <td>{region.announcementCount}</td>
                  <td>
                    {(canWrite || canSetUsers) && (
                      <div className="flex">
                        <button
                          type="button"
                          className="icon-button"
                          title="编辑区域"
                          onClick={() => setEditing(region)}
                        >
                          <Pencil size={16} />
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            className="icon-button text-red-500"
                            title="删除区域"
                            onClick={async () => {
                              if (!window.confirm(`删除区域“${region.name}”？`))
                                return;
                              setError('');
                              try {
                                await remove.mutateAsync({ id: region.id });
                                await utils.region.list.invalidate();
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
        <RegionEditor
          key={editing === 'new' ? 'new' : editing.id}
          region={editing === 'new' ? null : editing}
          users={users.data ?? []}
          canWrite={canWrite}
          canSetUsers={canSetUsers}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function RegionEditor({
  region,
  users,
  canWrite,
  canSetUsers,
  onClose,
}: {
  region: Region | null;
  users: RouterOutput['user']['list'];
  canWrite: boolean;
  canSetUsers: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.region.create.useMutation();
  const update = trpc.region.update.useMutation();
  const setUsers = trpc.region.setUsers.useMutation();
  const [name, setName] = useState(region?.name ?? '');
  const [code, setCode] = useState(region?.code ?? '');
  const [description, setDescription] = useState(region?.description ?? '');
  const [userIds, setUserIds] = useState(
    region?.users.map(({ id }) => id) ?? [],
  );
  const [error, setError] = useState('');
  const pending = create.isPending || update.isPending || setUsers.isPending;
  return (
    <Modal title={region ? '编辑区域' : '新增区域'} onClose={onClose}>
      <form
        className="grid gap-5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            let regionId = region?.id;
            if (canWrite) {
              const input = {
                name,
                code,
                description: description || undefined,
              };
              const saved = region
                ? await update.mutateAsync({ id: region.id, ...input })
                : await create.mutateAsync(input);
              regionId = saved.id;
            }
            if (!regionId) throw new Error('需要区域维护权限才能新增区域');
            if (canSetUsers) await setUsers.mutateAsync({ regionId, userIds });
            await Promise.all([
              utils.region.list.invalidate(),
              utils.user.list.invalidate(),
            ]);
            onClose();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '保存失败');
          }
        }}
      >
        <Field label="区域名称">
          <input
            className={inputClass}
            value={name}
            required
            maxLength={80}
            disabled={!canWrite}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="区域编码">
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
            title="授权用户（区域侧）"
            items={users.map((user) => ({
              id: user.id,
              label: user.name,
              detail: user.email,
            }))}
            selected={userIds}
            onChange={setUserIds}
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
