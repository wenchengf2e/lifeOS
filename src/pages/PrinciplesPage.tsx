import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";

const STEPS = [
  {
    title: "1 · 设定目标",
    desc: "目标不是欲望。欲望想要结果，目标要求你交换。先写清楚挑战度足够高的那个目标。",
  },
  {
    title: "2 · 找到问题",
    desc: "不要从「我该做什么」开始，而是从「什么在阻碍目标」开始。把问题具体到可以诊断。",
  },
  {
    title: "3 · 诊断根源",
    desc: "区分直接原因和根本原因。不要停在「我不够努力」，继续问为什么，直到找到可改变的结构。",
  },
  {
    title: "4 · 规划方案",
    desc: "方案要落到 90 天目标、每周任务、每日动作，并预写「再次逃避时怎么办」。",
  },
  {
    title: "5 · 践行",
    desc: "做一切必要的事。用真实结果验证方案，而不是用「感觉好一点了」验证。",
  },
];

export function PrinciplesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Problem Solving"
        title="五步诊断"
        description="解决「做了但没进展」：目标 → 问题 → 诊断 → 方案 → 践行。五步不是一次性仪式，是每周转动一次的飞轮。"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-6 sm:p-8">
          <div className="space-y-4">
            {STEPS.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-line/70 bg-paper-deep/35 p-5"
              >
                <h2 className="text-lg text-ink">{step.title}</h2>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{step.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-6">
            <span className="chip">下一阶段</span>
            <h2 className="mt-3 text-xl text-ink">交互表单还没迁移</h2>
            <p className="mt-3 text-sm leading-7 text-ink-soft">
              当前版本先跑通「每日仪式」和「人生 OS」。五步诊断的
              <code className="mx-1 rounded bg-white/70 px-1.5 py-0.5 text-xs">documents</code>
              数据模型和 API 已经预留，下一阶段把每个目标卡、自检清单和进度状态补齐。
            </p>
            <Link to="/lifeos" className="btn-secondary mt-5">
              先去写人生 OS
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="text-base text-ink">为什么先不做？</h2>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              五步诊断的字段多、交互重，适合在核心数据链路稳定后再迁移。先把每天都会用的每日仪式跑顺，比一次性堆满页面更重要。
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
