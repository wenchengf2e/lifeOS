import type {
  ApiErrorBody,
  BootstrapResponse,
  ChatMessageEntry,
  ChatSessionDetailResponse,
  ChatSessionEntry,
  CheckinData,
  CoachProfileData,
  CoachRef,
  CoachSkillKey,
  CoachStateResponse,
  DocumentData,
  EnergySessionData,
  EnergySessionEntry,
  EnergyToolKey,
  ExportResponse,
  FearData,
  FearEntry,
  GoalData,
  GoalEntry,
  GoalStatus,
  ItemEntry,
  PatternEntry,
  PatternStatus,
  ReviewData,
  ReviewPeriodType,
  TelosCategory,
  TelosItemEntry,
  TelosPriority,
  TelosProfileData,
  TelosSnapshotEntry,
  TelosSnapshotMeta,
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

export type GoalCreateInput = {
  title: string;
  domain?: string;
  status?: GoalStatus;
  data?: GoalData;
};

export type GoalPatch = {
  title?: string;
  domain?: string;
  status?: GoalStatus;
  data?: GoalData;
};

export type FearCreateInput = {
  data?: FearData;
};

export type FearPatch = {
  data?: FearData;
  archived?: boolean;
};

export type EnergySessionCreateInput = {
  tool: EnergyToolKey;
  data?: EnergySessionData;
  completed?: boolean;
};

export type EnergySessionPatch = {
  data?: EnergySessionData;
  completed?: boolean;
};

export type TelosProfileInput = {
  mission: string;
  currentState: string;
  idealState: string;
};

export type TelosItemCreateInput = {
  category: TelosCategory;
  parentId?: string | null;
  title: string;
  status?: string;
  priority?: TelosPriority;
  sortOrder?: number;
  data?: unknown;
};

export type TelosItemPatch = {
  title?: string;
  status?: string;
  priority?: TelosPriority;
  parentId?: string | null;
  sortOrder?: number;
  data?: unknown;
};

export type CoachProfileInput = Omit<CoachProfileData, "version">;

export type CoachChatInput = {
  /** 指定会话时优先使用；省略则续接当前 active 会话。 */
  sessionId?: string;
  message: string;
  skill?: CoachSkillKey;
  signalId?: string;
  triggerRef?: Record<string, unknown>;
  /** true 时先归档当前 active 会话，再开启新一轮。 */
  startNewSession?: boolean;
  /** 前端当地日期键（YYYY-MM-DD）；服务端据此计算「今天」与周复盘。 */
  localDate?: string;
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

  createFear(input: FearCreateInput = {}) {
    return request<{ ok: true; fear: FearEntry }>("/api/fears", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateFear(id: string, patch: FearPatch) {
    return request<{ ok: true; fear: FearEntry }>(`/api/fears/${encode(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deleteFear(id: string) {
    return request<{ ok: true }>(`/api/fears/${encode(id)}`, { method: "DELETE" });
  },

  createEnergySession(input: EnergySessionCreateInput) {
    return request<{ ok: true; session: EnergySessionEntry }>("/api/energy", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateEnergySession(id: string, patch: EnergySessionPatch) {
    return request<{ ok: true; session: EnergySessionEntry }>(`/api/energy/${encode(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deleteEnergySession(id: string) {
    return request<{ ok: true }>(`/api/energy/${encode(id)}`, { method: "DELETE" });
  },

  getTelosProfile() {
    return request<{ profile: TelosProfileData }>("/api/telos/profile");
  },

  saveTelosProfile(input: TelosProfileInput) {
    return request<{ ok: true; profile: TelosProfileData }>("/api/telos/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  listTelosItems() {
    return request<{ items: TelosItemEntry[] }>("/api/telos/items");
  },

  createTelosItem(input: TelosItemCreateInput) {
    return request<{ ok: true; item: TelosItemEntry }>("/api/telos/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateTelosItem(id: string, patch: TelosItemPatch) {
    return request<{ ok: true; item: TelosItemEntry }>(`/api/telos/items/${encode(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deleteTelosItem(id: string) {
    return request<{ ok: true; deletedIds: string[]; deletedCount: number }>(
      `/api/telos/items/${encode(id)}`,
      { method: "DELETE" },
    );
  },

  listTelosSnapshots() {
    return request<{ snapshots: TelosSnapshotMeta[] }>("/api/telos/snapshots");
  },

  getTelosSnapshot(id: string) {
    return request<{ snapshot: TelosSnapshotEntry | null }>(
      `/api/telos/snapshots/${encode(id)}`,
    );
  },

  // 快照由服务端抓取当前档案与全部条目，客户端不传任何内容。
  createTelosSnapshot() {
    return request<{ ok: true; snapshot: TelosSnapshotMeta }>("/api/telos/snapshots", {
      method: "POST",
    });
  },

  deleteTelosSnapshot(id: string) {
    return request<{ ok: true }>(`/api/telos/snapshots/${encode(id)}`, { method: "DELETE" });
  },

  /** 传入本地日期，服务端才不会用 UTC 时钟算错「今天」。 */
  getCoachState(localDate?: string) {
    const query = localDate ? `?date=${encode(localDate)}` : "";
    return request<CoachStateResponse>(`/api/coach/state${query}`);
  },

  saveCoachProfile(input: CoachProfileInput) {
    return request<{ ok: true; profile: CoachProfileData }>("/api/coach/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  getCoachSession(id: string) {
    return request<ChatSessionDetailResponse>(`/api/coach/sessions/${encode(id)}`);
  },

  sendCoachChat(input: CoachChatInput) {
    return request<{
      ok: true;
      session: ChatSessionEntry;
      userMessage: ChatMessageEntry;
      assistantMessage: ChatMessageEntry;
      /** 换话题时被归档的上一轮会话（含服务端生成的小结）。 */
      archivedSession?: ChatSessionEntry;
    }>("/api/coach/chat", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  completeCoachSession(id: string, summary?: string) {
    return request<{ ok: true; session: ChatSessionEntry }>(
      `/api/coach/sessions/${encode(id)}/complete`,
      {
        method: "POST",
        body: JSON.stringify(summary?.trim() ? { summary } : {}),
      },
    );
  },

  resolveCoachProposal(messageId: string, proposalId: string, action: "apply" | "dismiss") {
    return request<{ ok: true; message: ChatMessageEntry; appliedRef?: CoachRef }>(
      `/api/coach/messages/${encode(messageId)}/proposals/${encode(proposalId)}`,
      {
        method: "POST",
        body: JSON.stringify({ action }),
      },
    );
  },

  createGoal(input: GoalCreateInput) {
    return request<{ ok: true; goal: GoalEntry }>("/api/goals", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateGoal(id: string, patch: GoalPatch) {
    return request<{ ok: true; goal: GoalEntry }>(`/api/goals/${encode(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  deleteGoal(id: string) {
    return request<{ ok: true }>(`/api/goals/${encode(id)}`, { method: "DELETE" });
  },

  exportAll() {
    return request<ExportResponse>("/api/export");
  },
};
