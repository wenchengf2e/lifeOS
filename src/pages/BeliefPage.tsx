import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CheckinData } from "../../shared/types";
import { DaySidebar } from "../components/DaySidebar";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import {
  allDailyFields,
  dailyModules,
  dailyPageCopy,
  type DailyField,
  type DailyModule,
} from "../content/daily";
import { todayKey } from "../lib/date";
import { useBootstrap, useSaveCheckin } from "../lib/queries";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

function filledIn(module: DailyModule, form: CheckinData) {
  const fields = module.tail ? [...module.fields, module.tail] : module.fields;
  return fields.filter((field) => (form[field.key] ?? "").trim().length > 0).length;
}

export function BeliefPage() {
  const { data, isLoading, error } = useBootstrap();
  const saveCheckin = useSaveCheckin();
  const [searchParams] = useSearchParams();

  // 支持 /belief?date=2026-10-31，日记页的「补写」直接跳过来
  const [date, setDate] = useState(() => {
    const raw = searchParams.get("date") ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayKey();
  });
  const [form, setForm] = useState<CheckinData>({});
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });
  const [dirty, setDirty] = useState(false);

  const entry = data?.checkins.find((item) => item.date === date);
  const checkins = useMemo(() => data?.checkins ?? [], [data]);

  useEffect(() => {
    setForm(entry?.data ?? {});
    setStatus({ type: "idle" });
    setDirty(false);
  }, [date, entry?.updatedAt]);

  if (isLoading) return <LoadingPage label="正在读取今天的记录…" />;
  if (error) return <ErrorState error={error} />;

  function updateField(key: keyof CheckinData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus({ type: "idle" });
    setDirty(true);
  }

  async function handleSave() {
    // PUT 是整体替换，所以要以 form 为底，把页面上的所有字段都带上
    const payload: CheckinData = { ...form };
    for (const field of allDailyFields) {
      payload[field.key] = (form[field.key] ?? "").trim();
    }

    if (!allDailyFields.some((field) => (payload[field.key] ?? "").length > 0)) {
      setStatus({ type: "error", message: "先写一条再保存" });
      return;
    }

    try {
      await saveCheckin.mutateAsync({ date, data: payload });
      setStatus({ type: "saved", message: "已保存到云端" });
      setForm(payload);
      setDirty(false);
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  function renderField(field: DailyField, extra = "") {
    return (
      <div key={field.key} className={`px-5 py-5 sm:px-6 ${extra}`}>
        {field.title ? (
          <h3 className="text-base leading-7 text-ink">{field.title}</h3>
        ) : null}

        {field.tag ? (
          <p className="mt-1 text-[11px] leading-5 text-ink-soft/70">{field.tag}</p>
        ) : null}

        {field.prompt ? (
          <p className="mt-2 whitespace-pre-line text-xs leading-6 text-ink-soft">{field.prompt}</p>
        ) : null}

        {field.detail ? (
          <details className="group mt-2">
            <summary className="cursor-pointer text-[11px] text-moss/90 transition hover:text-moss">
              展开追问
            </summary>
            <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-ink-soft/90">
              {field.detail}
            </p>
          </details>
        ) : null}

        <label className="mt-3 block">
          <span className="sr-only">{field.title ?? "今天的内容"}</span>
          <textarea
            className="field min-h-20 resize-y"
            rows={field.rows ?? 3}
            placeholder={field.placeholder}
            value={form[field.key] ?? ""}
            onChange={(event) => updateField(field.key, event.target.value)}
          />
        </label>
      </div>
    );
  }

  function renderModule(module: DailyModule) {
    const filled = filledIn(module, form);
    const total = module.fields.length + (module.tail ? 1 : 0);

    return (
      <section key={module.id} id={module.id} className="card overflow-hidden">
        <header className="border-b border-line/60 bg-paper-deep/40 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] tracking-[0.14em] text-moss">{module.kicker}</span>
            <span className="text-[11px] text-ink-soft/70">
              {total > 1 ? `${filled} / ${total}` : filled > 0 ? "已填写" : ""}
            </span>
          </div>
          <h2 className="mt-1.5 font-display text-xl text-ink">{module.title}</h2>
          <p className="mt-1.5 text-xs leading-6 text-ink-soft">{module.description}</p>
        </header>

        <div className="divide-y divide-line/50">
          {module.fields.map((field) => renderField(field))}
          {module.tail ? renderField(module.tail, "bg-paper-deep/25") : null}
        </div>
      </section>
    );
  }

  const statusText =
    status.type === "error" ? (
      <span className="text-clay">{status.message}</span>
    ) : status.type === "saved" ? (
      <span className="text-moss-dark">{status.message}</span>
    ) : dirty ? (
      <span className="text-ink">有改动还没保存</span>
    ) : entry?.updatedAt ? (
      <span>
        上次保存：
        {new Date(entry.updatedAt).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ) : (
      <span>今天还没有写。</span>
    );

  return (
    <>
      <PageHeader
        eyebrow={dailyPageCopy.eyebrow}
        title={dailyPageCopy.title}
        description={dailyPageCopy.description}
        action={
          <div className="flex items-center gap-2">
            <Link to="/diary" className="btn-secondary">
              翻看日记
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saveCheckin.isPending}
            >
              {saveCheckin.isPending ? "保存中…" : "保存"}
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <DaySidebar
          date={date}
          onDateChange={setDate}
          hasEntry={Boolean(entry)}
          checkins={checkins}
        />

        <div className="space-y-5">
          {dailyModules.map(renderModule)}

          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-xs text-ink-soft">{statusText}</div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saveCheckin.isPending}
            >
              {saveCheckin.isPending ? "保存中…" : "保存今天的记录"}
            </button>
          </div>

          <p className="px-2 text-[11px] leading-6 text-ink-soft/80">
            数据保存到 Cloudflare D1，换设备登录同一账号后会自动同步。周末复盘时会从这里的记录里挑三件事。
          </p>
        </div>
      </div>
    </>
  );
}
