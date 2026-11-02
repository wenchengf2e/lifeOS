import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { DocumentData, DocumentEntry } from "../../shared/types";
import { lifeosDirection } from "../content/lifeos";
import { useSaveDocument } from "../lib/queries";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

const EMPTY: Record<string, string> = {
  statement: "",
  theme: "",
  bet: "",
  notDoing: "",
};

function readForm(data: DocumentData | undefined): Record<string, string> {
  return {
    statement: String(data?.statement ?? ""),
    theme: String(data?.theme ?? ""),
    bet: String(data?.bet ?? ""),
    notDoing: String(data?.notDoing ?? ""),
  };
}

export function DirectionCard({ doc }: { doc: DocumentEntry | undefined }) {
  const saveDocument = useSaveDocument();
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });

  useEffect(() => {
    setForm(readForm(doc?.data));
    setStatus({ type: "idle" });
  }, [doc?.updatedAt]);

  const filled = lifeosDirection.fields.some((field) => form[field.key]?.trim());

  async function handleSave() {
    try {
      await saveDocument.mutateAsync({
        module: lifeosDirection.module,
        key: lifeosDirection.key,
        data: {
          ...form,
          _updated: new Date().toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      });
      setStatus({ type: "saved", message: "方向卡已保存" });
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  return (
    <section className="mb-6 overflow-hidden rounded-[2rem] border border-line/60 bg-white/60 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-moss">
            {lifeosDirection.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl text-ink">{lifeosDirection.title}</h2>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{lifeosDirection.desc}</p>
        </div>
        <Link to="/principles" className="btn-secondary shrink-0">
          {lifeosDirection.linkLabel}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {lifeosDirection.fields.map((field) => (
          <label key={field.key} className="block">
            <span className="block text-sm font-medium text-ink">{field.label}</span>
            <span className="mt-1 block text-[11px] leading-6 text-ink-soft">{field.hint}</span>
            <textarea
              className="field mt-2 resize-y"
              rows={field.rows}
              placeholder={field.placeholder}
              value={form[field.key] ?? ""}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, [field.key]: event.target.value }));
                setStatus({ type: "idle" });
              }}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-ink-soft">
          {status.type === "error" ? (
            <span className="text-clay">{status.message}</span>
          ) : status.type === "saved" ? (
            <span className="text-moss-dark">{status.message}</span>
          ) : doc?.data._updated ? (
            <span>上次保存：{String(doc.data._updated)}</span>
          ) : (
            <span>{filled ? "还没保存过这次修改。" : "方向卡还是空的，先写一句。"}</span>
          )}
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saveDocument.isPending}
        >
          {saveDocument.isPending ? "保存中…" : "保存方向卡"}
        </button>
      </div>
    </section>
  );
}
