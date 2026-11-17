import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEmptyEnergySessionData, type EnergyToolKey } from "../../shared/types";
import { EnergySessionCard } from "../components/EnergySessionCard";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { energyPageCopy, energyTools } from "../content/energy";
import {
  filterEnergySessions,
  sortEnergySessions,
  energyToolCounts,
  type EnergyToolFilter,
} from "../lib/energy";
import { useBootstrap, useCreateEnergySession, useDeleteEnergySession } from "../lib/queries";

export function EnergyPage() {
  const { data, isLoading, error } = useBootstrap();
  const createEnergySession = useCreateEnergySession();
  const deleteEnergySession = useDeleteEnergySession();
  const navigate = useNavigate();

  const [toolFilter, setToolFilter] = useState<EnergyToolFilter>("all");
  const [creatingTool, setCreatingTool] = useState<EnergyToolKey | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sessions = useMemo(
    () => sortEnergySessions(data?.energySessions ?? []),
    [data?.energySessions],
  );
  const counts = useMemo(() => energyToolCounts(sessions), [sessions]);
  const shownSessions = useMemo(
    () => filterEnergySessions(sessions, toolFilter),
    [sessions, toolFilter],
  );

  if (isLoading) return <LoadingPage label="正在打开能量充电屋…" />;
  if (error) return <ErrorState error={error} />;

  async function handleStart(tool: EnergyToolKey) {
    if (creatingTool) return;
    setCreatingTool(tool);
    setCreateError(null);
    try {
      const result = await createEnergySession.mutateAsync({
        tool,
        data: createEmptyEnergySessionData(),
      });
      navigate(`/energy/${result.session.id}?mode=write&step=1`);
    } catch (startError) {
      setCreatingTool(null);
      setCreateError(startError instanceof Error ? startError.message : energyPageCopy.createFailed);
    }
  }

  async function handleDelete(sessionId: string) {
    if (deletingId) return;
    if (!window.confirm(energyPageCopy.listDeleteConfirm)) return;
    setDeletingId(sessionId);
    setDeleteError(null);
    try {
      await deleteEnergySession.mutateAsync(sessionId);
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure.message : energyPageCopy.listDeleteFailed,
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={energyPageCopy.eyebrow}
        title={energyPageCopy.title}
        description={energyPageCopy.description}
      />

      <section>
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Charging pods</p>
          <h2 className="mt-1 text-xl text-ink">{energyPageCopy.toolsTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
            {energyPageCopy.toolsDesc}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {energyTools.map((tool) => {
            const creating = creatingTool === tool.key;
            return (
              <article key={tool.key} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-soft text-xl">
                    {tool.icon}
                  </span>
                  <span className="rounded-full bg-paper-deep/70 px-2.5 py-1 text-[11px] text-ink-soft">
                    {tool.badge}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-lg leading-snug text-ink">{tool.title}</h3>
                <p className="mt-1 text-xs text-moss">{tool.subtitle}</p>
                <p className="mt-2 flex-1 text-xs leading-6 text-ink-soft">{tool.description}</p>

                <p className="mt-3 border-t border-line/60 pt-3 text-[11px] text-ink-soft">
                  {tool.questions.length} {energyPageCopy.questionUnit} · 已练习 {counts[tool.key]}{" "}
                  {energyPageCopy.sessionUnit}
                </p>

                <button
                  type="button"
                  className="btn-primary mt-3 w-full text-xs"
                  onClick={() => void handleStart(tool.key)}
                  disabled={creatingTool !== null}
                >
                  {creating ? energyPageCopy.creating : energyPageCopy.start}
                </button>
              </article>
            );
          })}
        </div>

        {createError ? <p className="mt-3 text-sm text-clay">{createError}</p> : null}
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-moss">History</p>
          <h2 className="mt-1 text-xl text-ink">{energyPageCopy.historyTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
            {energyPageCopy.historyDesc}
          </p>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setToolFilter("all")}
            className={[
              "rounded-full px-3.5 py-2 text-sm transition",
              toolFilter === "all"
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-soft hover:bg-white/70 hover:text-ink",
            ].join(" ")}
          >
            {energyPageCopy.allTools}
            <span className="ml-1.5 text-[11px] opacity-60">{sessions.length}</span>
          </button>
          {energyTools.map((tool) => (
            <button
              key={tool.key}
              type="button"
              onClick={() => setToolFilter(tool.key)}
              className={[
                "rounded-full px-3.5 py-2 text-sm transition",
                toolFilter === tool.key
                  ? "bg-ink text-paper shadow-sm"
                  : "text-ink-soft hover:bg-white/70 hover:text-ink",
              ].join(" ")}
            >
              {tool.icon} {tool.title}
              <span className="ml-1.5 text-[11px] opacity-60">{counts[tool.key]}</span>
            </button>
          ))}
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            icon="⚡"
            title={energyPageCopy.emptyTitle}
            description={energyPageCopy.emptyDesc}
          />
        ) : shownSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 p-8 text-center">
            <p className="text-sm text-ink-soft">{energyPageCopy.filteredEmpty}</p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => setToolFilter("all")}
            >
              查看全部记录
            </button>
          </div>
        ) : (
          <>
            {deleteError ? <p className="mb-3 text-sm text-clay">{deleteError}</p> : null}
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              {shownSessions.map((session) => (
                <EnergySessionCard
                  key={session.id}
                  session={session}
                  deleting={deletingId === session.id}
                  onDelete={() => void handleDelete(session.id)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
