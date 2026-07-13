import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between border-b border-zinc-200 pb-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
        {count !== undefined && (
          <span className="text-sm text-zinc-500">{count} 条</span>
        )}
      </div>
      {action}
    </header>
  );
}

export function LoadingTable() {
  return (
    <div className="py-16 text-center text-sm text-zinc-500">加载中...</div>
  );
}

export function EmptyTable({ text = '暂无数据' }: { text?: string }) {
  return <div className="py-16 text-center text-sm text-zinc-500">{text}</div>;
}

export function ErrorNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="my-4 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-48 items-center truncate rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
      {children}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
          <button
            type="button"
            title="关闭"
            aria-label="关闭"
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

export function CheckList({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: { id: string; label: string; detail?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id],
    );
  };
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium text-zinc-700">
        {title}
      </legend>
      <div className="max-h-44 overflow-y-auto rounded border border-zinc-200 p-2">
        {items.length === 0 ? (
          <p className="p-2 text-sm text-zinc-500">无可选项</p>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded px-2 py-2 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-emerald-600"
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span className="min-w-0 text-sm text-zinc-800">
                <span className="block">{item.label}</span>
                {item.detail && (
                  <span className="block truncate text-xs text-zinc-500">
                    {item.detail}
                  </span>
                )}
              </span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}

export const buttonPrimary =
  'inline-flex h-9 items-center justify-center gap-2 rounded bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50';

export const buttonSecondary =
  'inline-flex h-9 items-center justify-center gap-2 rounded border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50';

export const inputClass =
  'h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

export const textareaClass =
  'min-h-28 w-full resize-y rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';
