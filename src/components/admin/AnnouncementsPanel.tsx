import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { RouterOutput } from '~/utils/trpc';
import { trpc } from '~/utils/trpc';
import {
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

type Announcement = RouterOutput['announcement']['list'][number];

export function AnnouncementsPanel({
  permissions,
  regionIds,
}: {
  permissions: Set<string>;
  regionIds: string[];
}) {
  const query = trpc.announcement.list.useQuery();
  const canWrite = permissions.has('announcement:write');
  const regions = trpc.region.list.useQuery(undefined, {
    enabled: canWrite && permissions.has('region:read'),
  });
  const regionOptions = (regions.data ?? []).filter(({ id }) =>
    regionIds.includes(id),
  );
  const remove = trpc.announcement.delete.useMutation();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [error, setError] = useState('');

  return (
    <section>
      <PageHeader
        title="区域公告"
        count={query.data?.length}
        action={
          canWrite ? (
            <button
              type="button"
              className={buttonPrimary}
              onClick={() => setEditing('new')}
              disabled={!regionOptions.length}
            >
              <Plus size={16} />
              发布公告
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
                <th>公告</th>
                <th>区域</th>
                <th>发布人</th>
                <th>更新时间</th>
                <th className="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((announcement) => (
                <tr key={announcement.id}>
                  <td>
                    <div className="font-medium text-zinc-950">
                      {announcement.title}
                    </div>
                    <div className="max-w-xl truncate text-xs text-zinc-500">
                      {announcement.content}
                    </div>
                  </td>
                  <td>
                    <span className="text-emerald-700">
                      {announcement.region.name}
                    </span>
                  </td>
                  <td>{announcement.createdBy.name}</td>
                  <td className="whitespace-nowrap text-xs text-zinc-500">
                    {new Intl.DateTimeFormat('zh-CN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(announcement.updatedAt)}
                  </td>
                  <td>
                    {canWrite && (
                      <div className="flex">
                        <button
                          type="button"
                          className="icon-button"
                          title="编辑公告"
                          onClick={() => setEditing(announcement)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button text-red-500"
                          title="删除公告"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `删除公告“${announcement.title}”？`,
                              )
                            )
                              return;
                            setError('');
                            try {
                              await remove.mutateAsync({ id: announcement.id });
                              await query.refetch();
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
        <EmptyTable text="当前数据权限范围内没有公告" />
      )}
      {editing && (
        <AnnouncementEditor
          key={editing === 'new' ? 'new' : editing.id}
          announcement={editing === 'new' ? null : editing}
          regions={regionOptions}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await utils.announcement.list.invalidate();
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function AnnouncementEditor({
  announcement,
  regions,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null;
  regions: RouterOutput['region']['list'];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const create = trpc.announcement.create.useMutation();
  const update = trpc.announcement.update.useMutation();
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [regionId, setRegionId] = useState(
    announcement?.regionId ?? regions[0]?.id ?? '',
  );
  const [error, setError] = useState('');
  return (
    <Modal title={announcement ? '编辑公告' : '发布公告'} onClose={onClose}>
      <form
        className="grid gap-5 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            const input = { title, content, regionId };
            if (announcement)
              await update.mutateAsync({ id: announcement.id, ...input });
            else await create.mutateAsync(input);
            await onSaved();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '保存失败');
          }
        }}
      >
        <Field label="标题">
          <input
            className={inputClass}
            value={title}
            required
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="区域">
          <select
            className={inputClass}
            value={regionId}
            required
            onChange={(event) => setRegionId(event.target.value)}
          >
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="正文">
          <textarea
            className={textareaClass}
            value={content}
            required
            maxLength={5000}
            onChange={(event) => setContent(event.target.value)}
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
            disabled={create.isPending || update.isPending || !regionId}
          >
            <Save size={16} />
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
