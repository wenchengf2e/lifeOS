import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CheckinData, CheckinEntry, ReviewControllable, ReviewData } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import {
  MAX_FOCUS_ITEMS,
  abstractStepCopy,
  actStepCopy,
  connectStepCopy,
  focusStepCopy,
  patternFields,
  reviewSteps,
} from "../content/review";
import {
  formatDateCN,
  isoWeekDays,
  isoWeekKeyOf,
  isoWeekNumber,
  todayKey,
  weekRangeLabel,
} from "../lib/date";
import { useBootstrap, useCreateItem, useCreatePattern, useSaveReview } from "../lib/queries";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

const EMPTY_REVIEW: ReviewData = { focus: [] };

const EMPTY_PATTERN = {
  title: "",
  trigger: "",
  reaction: "",
  payoff: "",
  cost: "",
  alternative: "",
};

function previewOf(data: CheckinData) {
  const plan = (data.plan ?? "").trim();
  const firstAnswer = [data.q1, data.q2, data.q3, data.q4, data.q5, data.q6]
    .map((value) => (value ?? "").trim())
    .find((value) => value.length > 0);
  const review = (data.review ?? "").trim();
  return { plan, firstAnswer, review };
}

export function ReviewWizardPage() {
  const params = useParams();
  const navigate = useNavigate();

  const weekKey = useMemo(() => {
    const raw = params.key ?? "";
    return /^\d{4}-W\d{2}$/.test(raw) ? raw : isoWeekKeyOf(todayKey());
  }, [params.key]);

  const { data, isLoading, error } = useBootstrap();
  const saveReview = useSaveReview();
  const createPattern = useCreatePattern();
  const createItem = useCreateItem();

  // 步骤放在 URL 上，刷新或分享链接都能回到同一步
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStep = Number(searchParams.get("step") ?? "1");
  const step = Number.isFinite(rawStep)
    ? Math.min(reviewSteps.length - 1, Math.max(0, rawStep - 1))
    : 0;

  function goStep(next: number) {
    const clamped = Math.min(reviewSteps.length - 1, Math.max(0, next));
    const params = new URLSearchParams(searchParams);
    params.set("step", String(clamped + 1));
    setSearchParams(params, { replace: true });
  }
  const [form, setForm] = useState<ReviewData>(EMPTY_REVIEW);
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });
  const [newPattern, setNewPattern] = useState(EMPTY_PATTERN);
  const [showNewPattern, setShowNewPattern] = useState(false);
  const [writeToList, setWriteToList] = useState(true);

  const existing = data?.reviews.find(
    (item) => item.periodType === "week" && item.periodKey === weekKey,
  );
  const existingUpdatedAt = existing?.updatedAt;

  useEffect(() => {
    setForm(existing ? { ...existing.data, focus: existing.data.focus ?? [] } : EMPTY_REVIEW);
    setStatus({ type: "idle" });
    // 只跟着周期和云端更新时间走，避免每次输入都重置表单
  }, [weekKey, existingUpdatedAt]);

  if (isLoading) return <LoadingPage label="正在读取这一周的记录…" />;
  if (error) return <ErrorState error={error} />;

  const weekDays = isoWeekDays(weekKey);
  const checkins = data?.checkins ?? [];
  const entries = weekDays
    .map((day) => checkins.find((entry) => entry.date === day))
    .filter((entry): entry is CheckinEntry => Boolean(entry));

  const patterns = data?.patterns ?? [];
  const selected = form.focus ?? [];
  const actions = form.actions ?? [];
  const actionRows = actions.length > 0 ? actions : [""];
  const linkedPatternIds = form.patternIds ?? [];

  const currentStep = reviewSteps[step];

  function update<K extends keyof ReviewData>(key: K, value: ReviewData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus({ type: "idle" });
  }

  function toggleFocus(date: string) {
    setStatus({ type: "idle" });
    setForm((prev) => {
      const focus = prev.focus ?? [];
      if (focus.includes(date)) {
        const controllable = { ...(prev.controllable ?? {}) };
        delete controllable[date];
        return { ...prev, focus: focus.filter((item) => item !== date), controllable };
      }
      if (focus.length >= MAX_FOCUS_ITEMS) return prev;
      return { ...prev, focus: [...focus, date] };
    });
  }

  function setControllable(date: string, value: ReviewControllable) {
    setForm((prev) => ({
      ...prev,
      controllable: { ...(prev.controllable ?? {}), [date]: value },
    }));
  }

  function togglePattern(id: string) {
    const next = linkedPatternIds.includes(id)
      ? linkedPatternIds.filter((item) => item !== id)
      : [...linkedPatternIds, id];
    update("patternIds", next);
  }

  function updateAction(index: number, value: string) {
    const next = [...actionRows];
    next[index] = value;
    update("actions", next);
  }

  async function handleCreatePattern() {
    const title = newPattern.title.trim();
    if (!title) {
      setStatus({ type: "error", message: "先给这张模式卡起个名字" });
      return;
    }

    try {
      const result = await createPattern.mutateAsync({
        title,
        trigger: newPattern.trigger.trim(),
        reaction: newPattern.reaction.trim(),
        payoff: newPattern.payoff.trim(),
        cost: newPattern.cost.trim(),
        alternative: newPattern.alternative.trim(),
        evidence: selected,
        status: "watching",
      });
      setForm((prev) => ({
        ...prev,
        patternIds: [...(prev.patternIds ?? []), result.pattern.id],
      }));
      setNewPattern(EMPTY_PATTERN);
      setShowNewPattern(false);
      setStatus({ type: "saved", message: "模式卡已创建，并挂上了本周的证据" });
    } catch (createError) {
      setStatus({
        type: "error",
        message: createError instanceof Error ? createError.message : "创建失败，请重试",
      });
    }
  }

  async function handleSave(final: boolean) {
    try {
      await saveReview.mutateAsync({ periodType: "week", periodKey: weekKey, data: form });

      if (final && writeToList) {
        const list = actionRows.map((item) => item.trim()).filter(Boolean);
        for (const content of list) {
          await createItem.mutateAsync({ module: "review", content, itemDate: null });
        }
      }

      if (final) {
        navigate("/review");
        return;
      }

      setStatus({ type: "saved", message: "草稿已保存" });
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Weekly Review"
        title={`第 ${isoWeekNumber(weekKey)} 周复盘`}
        description={`${weekRangeLabel(weekKey)} · 本周记录了 ${entries.length} 天。四步走完，这一周才算收好。`}
        action={
          <Link to="/review" className="btn-secondary">
            返回复盘
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {reviewSteps.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => goStep(index)}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
              index === step
                ? "bg-ink text-paper shadow-sm"
                : "border border-line bg-white/60 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <span className="text-xs opacity-70">{item.index}</span>
            {item.title}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <article className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip">{currentStep.technique}</span>
              <h2 className="text-2xl text-ink">{currentStep.title}</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-soft">{currentStep.desc}</p>

            {step === 0 ? (
              <div className="mt-7 space-y-7">
                <label className="block">
                  <span className="block text-xs font-medium tracking-wide text-ink-soft">
                    {focusStepCopy.winsLabel}
                  </span>
                  <span className="mt-1 block text-[11px] text-ink-soft/80">
                    {focusStepCopy.winsPrompt}
                  </span>
                  <textarea
                    className="field mt-3 min-h-24 resize-y"
                    rows={3}
                    placeholder={focusStepCopy.winsPlaceholder}
                    value={form.wins ?? ""}
                    onChange={(event) => update("wins", event.target.value)}
                  />
                </label>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base text-ink">{focusStepCopy.listTitle}</h3>
                    <span className="text-xs text-ink-soft">
                      {focusStepCopy.selectedLabel} {selected.length} / {MAX_FOCUS_ITEMS}
                    </span>
                  </div>

                  {entries.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-line bg-paper-deep/30 p-6 text-center">
                      <p className="text-sm text-ink-soft">{focusStepCopy.listEmpty}</p>
                      <Link to="/daily" className="btn-secondary mt-4">
                        去写今天的记录
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {entries.map((entry) => {
                        const isSelected = selected.includes(entry.date);
                        const isFull = !isSelected && selected.length >= MAX_FOCUS_ITEMS;
                        const preview = previewOf(entry.data);
                        const controllable = form.controllable?.[entry.date];

                        return (
                          <div key={entry.date}>
                            <button
                              type="button"
                              onClick={() => toggleFocus(entry.date)}
                              disabled={isFull}
                              className={[
                                "w-full rounded-2xl border px-4 py-3 text-left transition",
                                isSelected
                                  ? "border-moss/50 bg-moss-soft/40"
                                  : "border-line/70 bg-paper-deep/25 hover:border-moss/30 hover:bg-white/70",
                                isFull ? "cursor-not-allowed opacity-40" : "",
                              ].join(" ")}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-ink">
                                  {formatDateCN(entry.date, { withWeekday: true })}
                                </span>
                                <span className="text-[11px] text-ink-soft">
                                  {isSelected ? "已选" : isFull ? "已满三件" : "选它"}
                                </span>
                              </div>
                              {preview.plan ? (
                                <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-ink-soft">
                                  计划：{preview.plan}
                                </p>
                              ) : null}
                              {preview.firstAnswer ? (
                                <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-soft">
                                  {preview.firstAnswer}
                                </p>
                              ) : null}
                              {preview.review ? (
                                <p className="mt-1 line-clamp-1 text-xs leading-6 text-ink-soft/70">
                                  复盘：{preview.review}
                                </p>
                              ) : null}
                            </button>

                            {isSelected ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2 pl-2">
                                <span className="text-[11px] text-ink-soft">
                                  {focusStepCopy.controllableLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setControllable(entry.date, "in")}
                                  className={[
                                    "rounded-full px-3 py-1 text-[11px] transition",
                                    controllable === "in"
                                      ? "bg-moss text-white"
                                      : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                                  ].join(" ")}
                                >
                                  {focusStepCopy.controllableIn}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setControllable(entry.date, "out")}
                                  className={[
                                    "rounded-full px-3 py-1 text-[11px] transition",
                                    controllable === "out"
                                      ? "bg-clay text-white"
                                      : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                                  ].join(" ")}
                                >
                                  {focusStepCopy.controllableOut}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="mt-7">
                {selected.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 p-6 text-center">
                    <p className="text-sm text-ink-soft">{connectStepCopy.empty}</p>
                    <button type="button" className="btn-secondary mt-4" onClick={() => goStep(0)}>
                      回上一步挑三件
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {selected.map((date) => {
                        const entry = checkins.find((item) => item.date === date);
                        const preview = entry ? previewOf(entry.data) : null;
                        const controllable = form.controllable?.[date];

                        return (
                          <div
                            key={date}
                            className="rounded-2xl border border-line/70 bg-paper-deep/30 p-4"
                          >
                            <p className="text-xs font-medium text-ink">
                              {formatDateCN(date, { withWeekday: true })}
                            </p>
                            {controllable ? (
                              <span className="mt-2 inline-block rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-ink-soft">
                                {controllable === "in"
                                  ? focusStepCopy.controllableIn
                                  : focusStepCopy.controllableOut}
                              </span>
                            ) : null}
                            <p className="mt-2 line-clamp-6 text-xs leading-6 text-ink-soft">
                              {preview?.plan || preview?.firstAnswer || preview?.review || "（空记录）"}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-7">
                      <h3 className="text-base text-ink">{connectStepCopy.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-ink-soft">{connectStepCopy.prompt}</p>
                      <textarea
                        className="field mt-3 min-h-32 resize-y"
                        rows={5}
                        placeholder={connectStepCopy.placeholder}
                        value={form.connection ?? ""}
                        onChange={(event) => update("connection", event.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-7 space-y-7">
                <div>
                  <h3 className="text-base text-ink">{abstractStepCopy.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-ink-soft">{abstractStepCopy.prompt}</p>
                  <textarea
                    className="field mt-3 min-h-32 resize-y"
                    rows={5}
                    placeholder={abstractStepCopy.placeholder}
                    value={form.abstraction ?? ""}
                    onChange={(event) => update("abstraction", event.target.value)}
                  />
                </div>

                <div className="rounded-2xl border border-line/70 bg-paper-deep/25 p-5">
                  <h3 className="text-base text-ink">{abstractStepCopy.patternTitle}</h3>
                  <p className="mt-1.5 text-xs leading-6 text-ink-soft">
                    {abstractStepCopy.patternHint}
                  </p>

                  {patterns.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-[11px] tracking-[0.14em] text-ink-soft">
                        {abstractStepCopy.existingLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {patterns.map((pattern) => {
                          const active = linkedPatternIds.includes(pattern.id);
                          return (
                            <button
                              key={pattern.id}
                              type="button"
                              onClick={() => togglePattern(pattern.id)}
                              className={[
                                "max-w-full truncate rounded-full px-3 py-1.5 text-xs transition",
                                active
                                  ? "bg-ink text-paper"
                                  : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                              ].join(" ")}
                            >
                              {pattern.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4">
                    {showNewPattern ? (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="block text-xs font-medium text-ink-soft">模式名称</span>
                          <input
                            type="text"
                            className="field mt-1.5"
                            placeholder="例：没人催就先做别人的事"
                            value={newPattern.title}
                            onChange={(event) =>
                              setNewPattern((prev) => ({ ...prev, title: event.target.value }))
                            }
                          />
                        </label>

                        {patternFields.map((field) => (
                          <label key={field.key} className="block">
                            <span className="block text-xs font-medium text-ink-soft">
                              {field.label}
                              <span className="ml-2 font-normal text-ink-soft/60">{field.hint}</span>
                            </span>
                            <textarea
                              className="field mt-1.5 min-h-16 resize-y"
                              rows={2}
                              placeholder={field.placeholder}
                              value={newPattern[field.key]}
                              onChange={(event) =>
                                setNewPattern((prev) => ({ ...prev, [field.key]: event.target.value }))
                              }
                            />
                          </label>
                        ))}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleCreatePattern}
                            disabled={createPattern.isPending}
                          >
                            {createPattern.isPending ? "创建中…" : "创建并挂上本周证据"}
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setShowNewPattern(false);
                              setNewPattern(EMPTY_PATTERN);
                            }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowNewPattern(true)}
                      >
                        {abstractStepCopy.newLabel}
                      </button>
                    )}
                  </div>

                  {linkedPatternIds.length > 0 ? (
                    <p className="mt-3 text-[11px] text-moss-dark">
                      已挂 {linkedPatternIds.length} 张模式卡，本次选中的 {selected.length} 天会作为证据。
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-7">
                <h3 className="text-base text-ink">{actStepCopy.title}</h3>
                <p className="mt-2 text-xs leading-6 text-ink-soft">{actStepCopy.prompt}</p>

                <div className="mt-4 space-y-2">
                  {actionRows.map((value, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="mt-3 w-4 shrink-0 text-xs text-ink-soft">{index + 1}</span>
                      <input
                        type="text"
                        className="field flex-1"
                        placeholder={actStepCopy.placeholder}
                        value={value}
                        onChange={(event) => updateAction(index, event.target.value)}
                      />
                      {actionRows.length > 1 ? (
                        <button
                          type="button"
                          className="btn-ghost mt-1 shrink-0 text-xs"
                          onClick={() =>
                            update(
                              "actions",
                              actionRows.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          移除
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                {actionRows.length < 3 ? (
                  <button
                    type="button"
                    className="btn-secondary mt-3"
                    onClick={() => update("actions", [...actionRows, ""])}
                  >
                    {actStepCopy.addAction}
                  </button>
                ) : null}

                <label className="mt-6 flex items-start gap-3 rounded-2xl border border-line/70 bg-paper-deep/25 p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[#5d7355]"
                    checked={writeToList}
                    onChange={(event) => setWriteToList(event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm text-ink">{actStepCopy.writeToList}</span>
                    <span className="mt-1 block text-[11px] leading-6 text-ink-soft">
                      {actStepCopy.writeToListHint}
                    </span>
                  </span>
                </label>

                {form.abstraction?.trim() ? (
                  <div className="mt-6 rounded-2xl border border-moss/15 bg-moss-soft/45 p-4 text-sm leading-7 text-moss-dark">
                    <span className="font-medium">这次复盘的结论：</span>
                    {form.abstraction}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-soft">
              {status.type === "error" ? (
                <span className="text-clay">{status.message}</span>
              ) : status.type === "saved" ? (
                <span className="text-moss-dark">{status.message}</span>
              ) : existing?.updatedAt ? (
                <span>
                  上次保存：
                  {new Date(existing.updatedAt).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span>还没有保存过这一周。</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => goStep(step - 1)}
                disabled={step === 0}
              >
                上一步
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleSave(false)}
                disabled={saveReview.isPending}
              >
                保存草稿
              </button>
              {step < reviewSteps.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => goStep(step + 1)}
                >
                  下一步
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSave(true)}
                  disabled={saveReview.isPending || createItem.isPending}
                >
                  {saveReview.isPending || createItem.isPending ? "保存中…" : "完成复盘"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Progress</p>
            <h2 className="mt-1 text-base text-ink">这一周的进度</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">做成了什么</dt>
                <dd className={form.wins?.trim() ? "text-moss-dark" : "text-ink-soft/50"}>
                  {form.wins?.trim() ? "已写" : "未写"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">聚焦</dt>
                <dd className={selected.length > 0 ? "text-moss-dark" : "text-ink-soft/50"}>
                  {selected.length} / {MAX_FOCUS_ITEMS}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">联结</dt>
                <dd className={form.connection?.trim() ? "text-moss-dark" : "text-ink-soft/50"}>
                  {form.connection?.trim() ? "已写" : "未写"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">抽象化</dt>
                <dd className={form.abstraction?.trim() ? "text-moss-dark" : "text-ink-soft/50"}>
                  {form.abstraction?.trim() ? "已写" : "未写"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">动作</dt>
                <dd
                  className={
                    actions.some((item) => item.trim()) ? "text-moss-dark" : "text-ink-soft/50"
                  }
                >
                  {actions.filter((item) => item.trim()).length} 条
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-soft">模式卡</dt>
                <dd className={linkedPatternIds.length > 0 ? "text-moss-dark" : "text-ink-soft/50"}>
                  {linkedPatternIds.length} 张
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-base text-ink">不着急，可以慢慢来</h2>
            <p className="mt-2 text-xs leading-6 text-ink-soft">
              每一步都能单独保存。只做第一步也算数——写下一件做成的事，比因为做不完而放弃有价值。
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
