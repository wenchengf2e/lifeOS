import { useMemo } from "react";
import type { TelosItemEntry, TelosPriority, TelosSnapshotData } from "../../../shared/types";
import {
  compassCategoryMeta,
  compassCategoryOrder,
  compassDiffCopy,
  compassPriorityMeta,
  compassRiskControlStateMeta,
} from "../../content/compass";
import {
  compassStatusClassName,
  compassStatusLabel,
  diffTelosSnapshots,
  type CompassChangedField,
  type CompassItemChange,
} from "../../lib/compass";

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value.trim() ? value : "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((item) => formatValue(item)).join("、");
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDataValue(key: string, value: unknown): string {
  if (key === "controllability" && typeof value === "string") {
    const labels: Record<string, string> = {
      in: "可控",
      partial: "部分可控",
      out: "不可控",
    };
    return labels[value] ?? value;
  }

  if (
    (key === "prevent" || key === "detect" || key === "respond") &&
    value &&
    typeof value === "object"
  ) {
    const control = value as { state?: string; note?: string };
    const stateMeta =
      control.state && control.state in compassRiskControlStateMeta
        ? compassRiskControlStateMeta[
            control.state as keyof typeof compassRiskControlStateMeta
          ]
        : null;
    const stateLabel = stateMeta?.label ?? control.state ?? "未准备";
    return control.note ? `${stateLabel} · ${control.note}` : stateLabel;
  }

  if (key === "milestones" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((raw) => {
        const milestone = raw as { text?: string; due?: string; done?: boolean };
        const mark = milestone.done ? "✓" : "○";
        const due = milestone.due ? `（${milestone.due}）` : "";
        return `${mark} ${milestone.text || "未命名"}${due}`;
      })
      .join("\n");
  }

  if (key === "metric" && value && typeof value === "object") {
    const metric = value as { name?: string; target?: string; cadence?: string };
    const parts = [metric.name, metric.target, metric.cadence].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  return formatValue(value);
}

function groupByCategory(items: TelosItemEntry[]) {
  return compassCategoryOrder
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

function renderFieldChange(
  change: CompassItemChange,
  field: { field: CompassChangedField; before: string | null; after: string | null },
  beforeTitles: Map<string, string>,
  afterTitles: Map<string, string>,
): string {
  if (field.field === "title") {
    return `${field.before ?? "—"} → ${field.after ?? "—"}`;
  }

  if (field.field === "status") {
    const before = field.before ? compassStatusLabel(change.item.category, field.before) : "—";
    const after = field.after ? compassStatusLabel(change.item.category, field.after) : "—";
    return `${before} → ${after}`;
  }

  if (field.field === "priority") {
    const before = field.before
      ? (compassPriorityMeta[field.before as TelosPriority]?.label ?? field.before)
      : "—";
    const after = field.after
      ? (compassPriorityMeta[field.after as TelosPriority]?.label ?? field.after)
      : "—";
    return `${before} → ${after}`;
  }

  const beforeTitle = field.before
    ? (beforeTitles.get(field.before) ?? "已删除的条目")
    : compassDiffCopy.noParent;
  const afterTitle = field.after
    ? (afterTitles.get(field.after) ?? "已删除的条目")
    : compassDiffCopy.noParent;
  return `${compassDiffCopy.parentMovedPrefix}「${beforeTitle}」${compassDiffCopy.parentMovedMiddle}「${afterTitle}」`;
}

export function SnapshotDiff({
  before,
  after,
}: {
  before: TelosSnapshotData;
  after: TelosSnapshotData;
}) {
  const diff = useMemo(() => diffTelosSnapshots(before, after), [before, after]);
  const beforeTitles = useMemo(
    () => new Map(before.items.map((item) => [item.id, item.title] as const)),
    [before],
  );
  const afterTitles = useMemo(
    () => new Map(after.items.map((item) => [item.id, item.title] as const)),
    [after],
  );

  const itemChangeCount = diff.added.length + diff.removed.length + diff.changed.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <span className="chip">新增 {diff.added.length}</span>
        <span className="chip">删除 {diff.removed.length}</span>
        <span className="chip">变化 {diff.changed.length}</span>
        <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] text-ink-soft">
          {compassDiffCopy.unchangedLabel} {diff.unchangedCount}
        </span>
      </div>

      <section className="card p-5 sm:p-6">
        <h3 className="text-lg text-ink">{compassDiffCopy.profileTitle}</h3>
        {diff.profile.length === 0 ? (
          <p className="mt-2 text-xs text-ink-soft">{compassDiffCopy.profileEmpty}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {diff.profile.map((entry) => (
              <div key={entry.field}>
                <p className="text-[11px] font-medium text-ink-soft">
                  {compassDiffCopy.profileFields[entry.field]}
                </p>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-paper-deep/45 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                      {compassDiffCopy.beforeLabel}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-ink">
                      {entry.before.trim() || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-moss-soft/60 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-moss-dark">
                      {compassDiffCopy.afterLabel}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-ink">
                      {entry.after.trim() || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {itemChangeCount === 0 ? (
        <section className="card p-5 sm:p-6">
          <p className="text-sm text-ink-soft">{compassDiffCopy.noChanges}</p>
        </section>
      ) : (
        <>
          {diff.added.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h3 className="text-lg text-ink">
                {compassDiffCopy.addedTitle} · {diff.added.length}
              </h3>
              <div className="mt-3 space-y-3">
                {groupByCategory(diff.added).map((group) => (
                  <div key={group.category}>
                    <p className="text-[11px] text-ink-soft">
                      {compassCategoryMeta[group.category].icon}{" "}
                      {compassCategoryMeta[group.category].label}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-moss-soft/40 px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 break-words text-sm text-ink">
                            {item.title}
                          </span>
                          <span
                            className={[
                              "rounded-full px-2 py-0.5 text-[11px]",
                              compassStatusClassName(item.category, item.status),
                            ].join(" ")}
                          >
                            {compassStatusLabel(item.category, item.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {diff.removed.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h3 className="text-lg text-ink">
                {compassDiffCopy.removedTitle} · {diff.removed.length}
              </h3>
              <div className="mt-3 space-y-3">
                {groupByCategory(diff.removed).map((group) => (
                  <div key={group.category}>
                    <p className="text-[11px] text-ink-soft">
                      {compassCategoryMeta[group.category].icon}{" "}
                      {compassCategoryMeta[group.category].label}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-clay/10 px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 break-words text-sm text-ink-soft line-through">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-ink-soft">
                            {compassStatusLabel(item.category, item.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {diff.changed.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h3 className="text-lg text-ink">
                {compassDiffCopy.changedTitle} · {diff.changed.length}
              </h3>
              <div className="mt-3 space-y-3">
                {diff.changed.map((change) => (
                  <article
                    key={change.item.id}
                    className="rounded-2xl border border-line/70 bg-white/50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          compassCategoryMeta[change.item.category].className,
                        ].join(" ")}
                      >
                        {compassCategoryMeta[change.item.category].icon}{" "}
                        {compassCategoryMeta[change.item.category].label}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm text-ink">
                        {change.item.title}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px]",
                          compassStatusClassName(change.item.category, change.item.status),
                        ].join(" ")}
                      >
                        {compassStatusLabel(change.item.category, change.item.status)}
                      </span>
                    </div>

                    <dl className="mt-3 space-y-2 text-xs">
                      {change.fields.map((field) => (
                        <div
                          key={field.field}
                          className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)]"
                        >
                          <dt className="text-ink-soft">
                            {compassDiffCopy.itemFields[field.field]}
                          </dt>
                          <dd className="min-w-0 break-words text-ink">
                            {renderFieldChange(change, field, beforeTitles, afterTitles)}
                          </dd>
                        </div>
                      ))}

                      {change.data.map((entry) => (
                        <div
                          key={entry.key}
                          className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)]"
                        >
                          <dt className="text-ink-soft">
                            {compassDiffCopy.dataFieldLabels[entry.key] ?? entry.key}
                          </dt>
                          <dd className="min-w-0">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-xl bg-paper-deep/45 p-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-ink-soft">
                                  {compassDiffCopy.beforeLabel}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-ink">
                                  {formatDataValue(entry.key, entry.before)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-moss-soft/60 p-2.5">
                                <p className="text-[10px] uppercase tracking-wide text-moss-dark">
                                  {compassDiffCopy.afterLabel}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-ink">
                                  {formatDataValue(entry.key, entry.after)}
                                </p>
                              </div>
                            </div>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
