import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-moss">404</p>
      <h1 className="mt-3 font-display text-3xl text-ink">这一页不存在</h1>
      <p className="mt-3 text-sm leading-7 text-ink-soft">
        可能是链接过期，也可能只是走错了一个入口。回到总览继续就好。
      </p>
      <Link to="/" className="btn-primary mt-7">
        回到总览
      </Link>
    </div>
  );
}
