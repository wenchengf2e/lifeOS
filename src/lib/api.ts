import type {
  ApiErrorBody,
  BootstrapResponse,
  CheckinData,
  DocumentData,
  ExportResponse,
  ItemEntry,
  PatternEntry,
  PatternStatus,
  ReviewData,
  ReviewPeriodType,
} from "../../shared/types";

export type PatternDraft = {
  title: string;
  trigger?: string;
  reaction?: string;
  payoff?: string;
  cost?: string;
  alternative?: string;
  evidence?: string[];
  status?: PatternStatus;
};

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body?.message || body?.error || res.statusText, body);
  }

  return (await res.json()) as T;
}

function encode(value: string) {
  return encodeURIComponent(value);
}

export const api = {
  bootstrap() {
    return request<BootstrapResponse>("/api/bootstrap");
  },

  saveCheckin(date: string, data: CheckinData) {
    return request<{ ok: true; date: string; updatedAt: string }>(`/api/checkins/${encode(date)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  saveDocument(module: string, key: string, data: DocumentData) {
    return request<{ ok: true; module: string; key: string; updatedAt: string }>(
      `/api/docs/${encode(module)}/${encode(key)}`,
      { method: "PUT", body: JSON.stringify(data) },
    );
  },

  createItem(input: { module: string; content: string; itemDate?: string | null }) {
    return request<{ ok: true; item: ItemEntry }>("/api/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateItem(id: string, patch: { content?: string; done?: boolean; itemDate?: string | null }) {
    return request<{ ok: true; item: ItemEntry }>(`/api/items/${encode(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deleteItem(id: string) {
    return request<{ ok: true }>(`/api/items/${encode(id)}`, { method: "DELETE" });
  },

  saveReview(periodType: ReviewPeriodType, periodKey: string, data: ReviewData) {
    return request<{ ok: true; periodType: string; periodKey: string; updatedAt: string }>(
      `/api/reviews/${encode(periodType)}/${encode(periodKey)}`,
      { method: "PUT", body: JSON.stringify(data) },
    );
  },

  createPattern(draft: PatternDraft) {
    return request<{ ok: true; pattern: PatternEntry }>("/api/patterns", {
      method: "POST",
      body: JSON.stringify(draft),
    });
  },

  updatePattern(id: string, patch: Partial<PatternDraft>) {
    return request<{ ok: true; pattern: PatternEntry }>(`/api/patterns/${encode(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deletePattern(id: string) {
    return request<{ ok: true }>(`/api/patterns/${encode(id)}`, { method: "DELETE" });
  },

  exportAll() {
    return request<ExportResponse>("/api/export");
  },
};
