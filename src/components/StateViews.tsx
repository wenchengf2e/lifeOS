import type { ReactNode } from "react";
import { ApiError } from "../lib/api";

export function LoadingPage({ label = "正在同步…" }: { label?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 text-sm text-ink-soft">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-moss" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const isApiError = error instanceof ApiError;
  const status = isApiError ? error.status : 0;
  const message = error instanceof Error ? error.message : "未知错误";

  return (
    <div className="card mx-auto max-w-2xl p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-clay">连接失败</p>
      <h2 className="mt-2 text-2xl text-ink">暂时读不到云端数据</h2>
      <p className="mt-3 text-sm leading-7 text-ink-soft">{message}</p>
      {status === 401 || status === 403 ? (
        <div className="mt-5 rounded-2xl bg-paper-deep/70 p-4 text-sm leading-7 text-ink-soft">
          这个站点由 Cloudflare Access 保护。请确认你已经通过 Access 登录，并且登录邮箱与
          <code className="mx-1 rounded bg-white/70 px-1.5 py-0.5 text-xs">OWNER_EMAIL</code>
          一致。
        </div>
      ) : (
        <p className="mt-5 text-sm leading-7 text-ink-soft">
          请稍后刷新重试。如果刚刚部署，可能是 D1 迁移还没执行，或者 Access 还没配置完成。
        </p>
      )}
      <button type="button" className="btn-secondary mt-6" onClick={() => window.location.reload()}>
        刷新页面
      </button>
    </div>
  );
}

export function EmptyState({
  icon = "·",
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white/40 px-6 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-moss-soft text-lg text-moss-dark">
        {icon}
      </div>
      <h3 className="mt-4 text-lg text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
