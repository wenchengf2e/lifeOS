import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { TelosItemEntry } from "../../../shared/types";
import { compassCategoryMeta, compassPriorityMeta } from "../../content/compass";
import {
  buildCompassForest,
  compassStatusClassName,
  compassStatusLabel,
  nextCompassCategory,
  type CompassForest,
} from "../../lib/compass";

type CompassTreeProps = {
  items: TelosItemEntry[];
  onCreateChild: (parent: TelosItemEntry) => void;
  onDelete: (item: TelosItemEntry) => void;
};

function CompassTreeNode({
  item,
  forest,
  expanded,
  onToggle,
  onCreateChild,
  onDelete,
}: {
  item: TelosItemEntry;
  forest: CompassForest;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onCreateChild: (parent: TelosItemEntry) => void;
  onDelete: (item: TelosItemEntry) => void;
}) {
  const children = forest.childrenByParent.get(item.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(item.id);
  const nextCategory = nextCompassCategory(item.category);
  const meta = compassCategoryMeta[item.category];

  return (
    <li>
      <div className="rounded-2xl border border-line/70 bg-white/60 p-3 transition hover:border-moss/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              disabled={!hasChildren}
              aria-label={hasChildren ? (isExpanded ? "折叠" : "展开") : "没有下一级"}
              aria-expanded={hasChildren ? isExpanded : undefined}
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs transition",
                hasChildren
                  ? "bg-paper-deep/80 text-ink-soft hover:text-ink"
                  : "cursor-default text-ink-soft/30",
              ].join(" ")}
            >
              {hasChildren ? (isExpanded ? "▾" : "▸") : "·"}
            </button>

            <span
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                meta.className,
              ].join(" ")}
            >
              {meta.icon} {meta.label}
            </span>

            <Link
              to={`/compass/items/${item.id}`}
              className="min-w-0 truncate text-sm text-ink transition hover:text-moss-dark"
            >
              {item.title}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-9 sm:shrink-0 sm:pl-0">
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px]",
                compassPriorityMeta[item.priority].className,
              ].join(" ")}
              title={compassPriorityMeta[item.priority].hint}
            >
              {compassPriorityMeta[item.priority].shortLabel}
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px]",
                compassStatusClassName(item.category, item.status),
              ].join(" ")}
            >
              {compassStatusLabel(item.category, item.status)}
            </span>
            {hasChildren ? (
              <span className="text-[11px] tabular-nums text-ink-soft">{children.length} 项</span>
            ) : null}
            {nextCategory ? (
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-[11px]"
                onClick={() => onCreateChild(item)}
              >
                + {compassCategoryMeta[nextCategory].label}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-[11px] text-ink-soft/70 hover:text-clay"
              onClick={() => onDelete(item)}
            >
              删除
            </button>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <ul className="mt-2 space-y-2 border-l border-line/70 pl-3 sm:pl-4">
          {children.map((child) => (
            <CompassTreeNode
              key={child.id}
              item={child}
              forest={forest}
              expanded={expanded}
              onToggle={onToggle}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CompassTree({ items, onCreateChild, onDelete }: CompassTreeProps) {
  const forest = useMemo(() => buildCompassForest(items), [items]);
  // 默认只展开 problem 层；新出现的问题自动展开，用户手动折叠后不再抢回。
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const seenProblemIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newProblemIds = items
      .filter((item) => item.category === "problem" && !seenProblemIds.current.has(item.id))
      .map((item) => item.id);
    if (newProblemIds.length === 0) return;

    for (const id of newProblemIds) seenProblemIds.current.add(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of newProblemIds) next.add(id);
      return next;
    });
  }, [items]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="space-y-2">
      {forest.problemRoots.map((item) => (
        <CompassTreeNode
          key={item.id}
          item={item}
          forest={forest}
          expanded={expanded}
          onToggle={toggle}
          onCreateChild={onCreateChild}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
