import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CheckinData } from "../../shared/types";
import { DaySidebar } from "../components/DaySidebar";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import {
  eveningFields,
  eveningPageCopy,
  eveningReviewField,
  type EveningField,
} from "../content/evening";
import { todayKey } from "../lib/date";
import { useBootstrap, useSaveCheckin } from "../lib/queries";
import { isCountedDone } from "../lib/stats";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

export function EveningPage() {
  const { data, isLoading, error } = useBootstrap();
  const saveCheckin = useSaveCheckin();
  const [searchParams] = useSearchParams();

  // 支持 /evening?date=2026-10-31 直接跳到某一天
  const [date, setDate] = useState(() => {
    const raw = searchParams.get("date") ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayKey();
  });
  const [form, setForm] = useState<CheckinData>({});
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });

  const entry = data?.checkins.find((item) => item.date === date);
  const checkins = useMemo(() => data?.checkins ?? [], [data]);

  useEffect(() => {
    setForm(entry?.data ?? {});
    setStatus({ type: "idle" });
  }, [date, entry?.updatedAt]);

  if (isLoading) return <LoadingPage label="正在读取今天的记录…" />;
  if (error) return <ErrorState error={error} />;

  function updateField(key: keyof CheckinData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus({ type: "idle" });
  }

  async function handleSave() {
    // 以 form 为底，避免把早上的 plan 和隐藏的 q1–q6 覆盖掉
    const payload: CheckinData = { ...form };
    for (const field of eveningFields) {
      payload[field.key] = (form[field.key] ?? "").trim();
    }
    payload.review = (form.review ?? "").trim();

    if (!isCountedDone(payload)) {
      setStatus({ type: "error", message: "至少写一条再保存" });
      return;
    }

    try {
      await saveCheckin.mutateAsync({ date, data: payload });
      setStatus({ type: "saved", message: "已保存到云端" });
      setForm(payload);
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  function renderField(field: EveningField) {
    return (
      <article key={field.key} className="card p-5 sm:p-6">
        <h2 className="text-lg leading-8 text-ink">{field.question}</h2>
        <label className="mt-4 block">
          <span className="sr-only">{field.question}</span>
          <textarea
            className="field min-h-24 resize-y"
            rows={3}
            placeholder={field.placeholder}
            value={form[field.key] ?? ""}
            onChange={(event) => updateField(field.key, event.target.value)}
          />
        </label>
      </article>
    );
  }

  const filled = eveningFields.filter((field) => (form[field.key] ?? "").trim().length > 0).length;

  return (
    <>
      <PageHeader
        eyebrow={eveningPageCopy.eyebrow}
        title={eveningPageCopy.title}
        description={eveningPageCopy.description}
        action={
          <Link to="/diary" className="btn-secondary">
            翻看往期
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <DaySidebar
          date={date}
          onDateChange={setDate}
          hasEntry={Boolean(entry)}
          checkins={checkins}
        />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 px-1">
            <span className="chip">事后</span>
            <p className="text-xs text-ink-soft">如实记，不追问。已写 {filled} / 5</p>
          </div>

          {eveningFields.map(renderField)}

          <article className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg text-ink">{eveningReviewField.question}</h2>
              <span className="chip">{eveningReviewField.hint}</span>
            </div>
            <label className="mt-4 block">
              <span className="sr-only">{eveningReviewField.question}</span>
              <textarea
                className="field min-h-24 resize-y"
                rows={3}
                placeholder={eveningReviewField.placeholder}
                value={form.review ?? ""}
                onChange={(event) => updateField("review", event.target.value)}
              />
            </label>
          </article>

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-soft">
              {status.type === "error" ? (
                <span className="text-clay">{status.message}</span>
              ) : status.type === "saved" ? (
                <span className="text-moss-dark">{status.message}</span>
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
              )}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saveCheckin.isPending}
            >
              {saveCheckin.isPending ? "保存中…" : "保存今天的日记"}
            </button>
          </div>

          <p className="px-2 text-[11px] leading-6 text-ink-soft/80">
            写不完整也没关系，随时可以回来补。周末复盘时会从这里挑三件事。
          </p>
        </section>
      </div>
    </>
  );
}
