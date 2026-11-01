import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "总览", end: true },
  { to: "/belief", label: "信念重写" },
  { to: "/lifeos", label: "人生 OS" },
  { to: "/diary", label: "日记" },
  { to: "/review", label: "复盘" },
  { to: "/lists", label: "清单" },
  { to: "/principles", label: "五步诊断" },
  { to: "/about", label: "关于" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="group flex items-baseline gap-3">
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              LifeOS
            </span>
            <span className="text-xs tracking-wide text-ink-soft transition group-hover:text-moss">
              个人心理工作台
            </span>
          </Link>

          <nav className="-mx-1 flex flex-wrap items-center gap-1 lg:mx-0 lg:flex-nowrap">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "shrink-0 rounded-full px-3.5 py-2 text-sm transition",
                    isActive
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-soft hover:bg-white/70 hover:text-ink",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col gap-2 border-t border-line/60 pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>LifeOS · 数据存储于 Cloudflare D1，仅你可见。</p>
          <p>React + Hono · Cloudflare Workers</p>
        </div>
      </footer>
    </div>
  );
}
