import { PageHeader } from "../components/PageHeader";
import { aboutDocument, type AboutBlock, type AboutSection } from "../content/about";
import { formatDateCN } from "../lib/date";

export function AboutPage() {
  const { title, subtitle, intro, updatedAt, sections } = aboutDocument;

  return (
    <>
      <div id="about-top">
        <PageHeader eyebrow="About" title={title} description={subtitle} />
      </div>

      <section className="mb-6 overflow-hidden rounded-[2rem] border border-line/60 bg-white/60 p-6 shadow-sm sm:p-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-moss">
              Read me first
            </p>
            <p className="mt-4 font-display text-xl leading-9 text-ink sm:text-2xl sm:leading-10">
              {intro}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft">
              <span className="chip">静态内容</span>
              <span className="rounded-full border border-line/70 bg-white/60 px-2.5 py-1">
                最后更新 · {formatDateCN(updatedAt, { withYear: true })}
              </span>
              <span className="rounded-full border border-line/70 bg-white/60 px-2.5 py-1">
                {sections.length} 个章节
              </span>
            </div>
          </div>

          <div className="shrink-0 rounded-3xl border border-moss/15 bg-moss-soft/50 px-5 py-4 lg:max-w-[250px]">
            <p className="text-sm font-medium text-moss-dark">内容不存数据库</p>
            <p className="mt-1 text-xs leading-6 text-moss-dark/70">
              直接写在 JSON 文件里，改完重新构建部署即可。和个人记录分开维护。
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          {sections.map((section, index) => (
            <AboutSectionCard key={section.id} section={section} index={index} />
          ))}
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-28">
          <nav className="card p-5" aria-label="本页目录">
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">On this page</p>
            <ol className="mt-3 space-y-0.5">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-baseline gap-3 rounded-xl px-2 py-2 text-sm text-ink-soft transition hover:bg-paper-deep/40 hover:text-ink"
                  >
                    <span className="text-[10px] tabular-nums text-ink-soft/60">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <section className="card p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Source</p>
            <h2 className="mt-1 text-base text-ink">内容放在哪里</h2>
            <div className="mt-3 space-y-2">
              <code className="block rounded-xl border border-line/70 bg-paper-deep/40 px-3 py-2 text-[11px] text-ink-soft">
                src/content/about.json
              </code>
              <code className="block rounded-xl border border-line/70 bg-paper-deep/40 px-3 py-2 text-[11px] text-ink-soft">
                public/about/
              </code>
            </div>
            <p className="mt-3 text-xs leading-6 text-ink-soft">
              改文字直接编辑 JSON；换图把文件放进 public/about/，再把 src 写成 /about/文件名。
            </p>
          </section>

          <a
            href="#about-top"
            className="btn-ghost w-full justify-center border border-line/70 bg-white/50 text-xs"
          >
            返回顶部 ↑
          </a>
        </aside>
      </div>
    </>
  );
}

function AboutSectionCard({ section, index }: { section: AboutSection; index: number }) {
  return (
    <section id={section.id} className="card scroll-mt-28 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-line/60 pb-5">
        <div>
          {section.eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss">
              {section.eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-2xl text-ink">{section.title}</h2>
          {section.summary ? (
            <p className="mt-2 text-sm leading-7 text-ink-soft">{section.summary}</p>
          ) : null}
        </div>
        <span className="shrink-0 font-display text-2xl text-ink-soft/25">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {section.blocks.map((block, blockIndex) => (
          <AboutBlockView key={blockIndex} block={block} />
        ))}
      </div>
    </section>
  );
}

function AboutBlockView({ block }: { block: AboutBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-[15px] leading-8 text-ink-soft">{block.text}</p>;

    case "subheading":
      return <h3 className="pt-1 text-lg text-ink">{block.text}</h3>;

    case "list":
      if (block.ordered) {
        return (
          <ol className="space-y-3">
            {block.items.map((item, index) => (
              <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-7 text-ink-soft">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss-soft text-[11px] font-medium text-moss-dark">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        );
      }

      return (
        <ul className="space-y-3">
          {block.items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-7 text-ink-soft">
              <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote className="rounded-2xl border-l-2 border-moss bg-moss-soft/35 px-5 py-4">
          <p className="font-display text-lg leading-8 text-ink">「{block.text}」</p>
          {block.attribution ? (
            <footer className="mt-2 text-xs text-ink-soft">— {block.attribution}</footer>
          ) : null}
        </blockquote>
      );

    case "callout": {
      const warning = block.tone === "warning";

      return (
        <div
          className={[
            "rounded-2xl border px-5 py-4",
            warning ? "border-clay/30 bg-clay/5" : "border-moss/25 bg-moss-soft/40",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <span
              className={[
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                warning ? "bg-clay" : "bg-moss",
              ].join(" ")}
            >
              {warning ? "!" : "i"}
            </span>
            <div>
              {block.title ? <p className="text-sm font-medium text-ink">{block.title}</p> : null}
              <p className="mt-1 text-sm leading-7 text-ink-soft">{block.text}</p>
            </div>
          </div>
        </div>
      );
    }

    case "image":
      return (
        <figure className="space-y-2">
          <a href={block.src} target="_blank" rel="noreferrer" title="点击查看原图">
            <img
              src={block.src}
              alt={block.alt}
              loading="lazy"
              decoding="async"
              className={[
                "w-full cursor-zoom-in rounded-2xl border border-line/70 bg-white/70 transition hover:border-moss/30",
                block.display === "photo" ? "max-h-[560px] object-cover" : "object-contain",
              ].join(" ")}
            />
          </a>
          {block.caption ? (
            <figcaption className="text-center text-xs leading-6 text-ink-soft">
              {block.caption}
              <span className="ml-1 text-ink-soft/60">· 点击查看原图</span>
            </figcaption>
          ) : null}
        </figure>
      );
  }
}
