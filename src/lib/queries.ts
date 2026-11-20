import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BootstrapResponse,
  ChatSessionDetailResponse,
  CheckinData,
  CoachStateResponse,
  DocumentData,
  GoalData,
  GoalStatus,
  ReviewData,
  ReviewPeriodType,
  TelosItemEntry,
  TelosProfileData,
  TelosSnapshotMeta,
} from "../../shared/types";
import {
  api,
  type CoachChatInput,
  type CoachProfileInput,
  type EnergySessionCreateInput,
  type EnergySessionPatch,
  type FearCreateInput,
  type FearPatch,
  type GoalPatch,
  type PatternDraft,
  type TelosItemCreateInput,
  type TelosItemPatch,
  type TelosProfileInput,
} from "./api";
import { readTelosProfile } from "./compass";
import { todayKey } from "./date";

export const bootstrapQueryKey = ["bootstrap"] as const;

export function useBootstrap() {
  return useQuery({
    queryKey: bootstrapQueryKey,
    queryFn: api.bootstrap,
    staleTime: 15_000,
    retry: 1,
  });
}

function useInvalidateBootstrap() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: bootstrapQueryKey });
}

export function useSaveCheckin() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: ({ date, data }: { date: string; data: CheckinData }) => api.saveCheckin(date, data),
    onSuccess: invalidate,
  });
}

export function useSaveDocument() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: ({ module, key, data }: { module: string; key: string; data: DocumentData }) =>
      api.saveDocument(module, key, data),
    onSuccess: invalidate,
  });
}

export function useCreateItem() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: (input: { module: string; content: string; itemDate?: string | null }) =>
      api.createItem(input),
    onSuccess: invalidate,
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { content?: string; done?: boolean; itemDate?: string | null };
    }) => api.updateItem(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: invalidate,
  });
}

export function useSaveReview() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: ({
      periodType,
      periodKey,
      data,
    }: {
      periodType: ReviewPeriodType;
      periodKey: string;
      data: ReviewData;
    }) => api.saveReview(periodType, periodKey, data),
    onSuccess: invalidate,
  });
}

export function useCreatePattern() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: (draft: PatternDraft) => api.createPattern(draft),
    onSuccess: invalidate,
  });
}

export function useUpdatePattern() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<PatternDraft> }) =>
      api.updatePattern(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeletePattern() {
  const invalidate = useInvalidateBootstrap();
  return useMutation({
    mutationFn: (id: string) => api.deletePattern(id),
    onSuccess: invalidate,
  });
}

/**
 * 目标保存后只改缓存里的这一条，不整页 refetch。
 * 自动保存如果触发 bootstrap 重新拉取，正在输入的字段会被旧数据覆盖。
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      domain?: string;
      status?: GoalStatus;
      data?: GoalData;
    }) => api.createGoal(input),
    onSuccess: ({ goal }) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) =>
        prev ? { ...prev, goals: [goal, ...prev.goals] } : prev,
      );
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GoalPatch }) => api.updateGoal(id, patch),
    onSuccess: ({ goal }) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          // 两个保存请求交错时，别让旧响应覆盖新内容。
          goals: prev.goals.map((item) =>
            item.id === goal.id && item.updatedAt <= goal.updatedAt ? goal : item,
          ),
        };
      });
    },
  });
}

/**
 * 恐惧清单沿用目标的缓存策略：保存后只改这一条，不整页 refetch。
 * 自动保存触发 bootstrap 重新拉取，会把正在输入的字段覆盖成旧数据。
 */
export function useCreateFear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FearCreateInput = {}) => api.createFear(input),
    onSuccess: ({ fear }) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) =>
        prev ? { ...prev, fears: [fear, ...(prev.fears ?? [])] } : prev,
      );
    },
  });
}

export function useUpdateFear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FearPatch }) => api.updateFear(id, patch),
    onSuccess: ({ fear }) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          // 两个保存请求交错时，别让旧响应覆盖新内容。
          fears: (prev.fears ?? []).map((item) =>
            item.id === fear.id && item.updatedAt <= fear.updatedAt ? fear : item,
          ),
        };
      });
    },
  });
}

export function useDeleteFear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFear(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) =>
        prev ? { ...prev, fears: (prev.fears ?? []).filter((item) => item.id !== id) } : prev,
      );
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGoal(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) =>
        prev ? { ...prev, goals: prev.goals.filter((item) => item.id !== id) } : prev,
      );
    },
  });
}

/**
 * 能量充电屋沿用恐惧清单的缓存策略：保存后只改这一条，不整页 refetch。
 * 沉浸式书写会防抖自动保存（延时见 AUTOSAVE_DEBOUNCE_MS），refetch 会把正在输入的草稿覆盖成旧数据。
 */
export function useCreateEnergySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EnergySessionCreateInput) => api.createEnergySession(input),
    onSuccess: ({ session }) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) =>
        prev ? { ...prev, energySessions: [session, ...(prev.energySessions ?? [])] } : prev,
      );
    },
  });
}

export function useUpdateEnergySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EnergySessionPatch }) =>
      api.updateEnergySession(id, patch),
    onSuccess: ({ session }) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          // 两个保存请求交错时，别让旧响应覆盖新内容。
          energySessions: (prev.energySessions ?? []).map((item) =>
            item.id === session.id && item.updatedAt <= session.updatedAt ? session : item,
          ),
        };
      });
    },
  });
}

export function useDeleteEnergySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEnergySession(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<BootstrapResponse>(bootstrapQueryKey, (prev) =>
        prev
          ? { ...prev, energySessions: (prev.energySessions ?? []).filter((item) => item.id !== id) }
          : prev,
      );
    },
  });
}

// ---- 人生罗盘 ----
//
// 罗盘数据不进入 bootstrap：使用独立的 ["telos", ...] 查询键，
// bootstrap 失败或变慢不会影响罗盘页面，罗盘的写入也不会触发全量 refetch。

const telosItemsQueryKey = ["telos", "items"] as const;
const telosProfileQueryKey = ["telos", "profile"] as const;
const telosSnapshotsQueryKey = ["telos", "snapshots"] as const;

export function useTelosItems() {
  return useQuery({
    queryKey: telosItemsQueryKey,
    queryFn: async () => (await api.listTelosItems()).items,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useTelosProfile() {
  return useQuery({
    queryKey: telosProfileQueryKey,
    queryFn: async () => readTelosProfile(await api.getTelosProfile()),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSaveTelosProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TelosProfileInput) => api.saveTelosProfile(input),
    onSuccess: ({ profile }) => {
      queryClient.setQueryData<TelosProfileData>(telosProfileQueryKey, profile);
    },
  });
}

export function useCreateTelosItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TelosItemCreateInput) => api.createTelosItem(input),
    onSuccess: ({ item }) => {
      queryClient.setQueryData<TelosItemEntry[]>(telosItemsQueryKey, (prev) =>
        prev ? [...prev, item] : prev,
      );
    },
  });
}

export function useUpdateTelosItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TelosItemPatch }) =>
      api.updateTelosItem(id, patch),
    onSuccess: ({ item }) => {
      queryClient.setQueryData<TelosItemEntry[]>(telosItemsQueryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((existing) =>
          // 自动保存可能交错返回，旧响应不要覆盖新内容。
          existing.id === item.id && existing.updatedAt <= item.updatedAt ? item : existing,
        );
      });
    },
  });
}

export function useDeleteTelosItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTelosItem(id),
    onSuccess: ({ deletedIds }) => {
      const removed = new Set(deletedIds);
      queryClient.setQueryData<TelosItemEntry[]>(telosItemsQueryKey, (prev) =>
        prev ? prev.filter((item) => !removed.has(item.id)) : prev,
      );
    },
  });
}

export function useTelosSnapshots() {
  return useQuery({
    queryKey: telosSnapshotsQueryKey,
    queryFn: async () => (await api.listTelosSnapshots()).snapshots,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useTelosSnapshot(id: string | null) {
  return useQuery({
    queryKey: ["telos", "snapshot", id ?? ""] as const,
    queryFn: async () => {
      if (!id) return null;
      return (await api.getTelosSnapshot(id)).snapshot;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCreateTelosSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.createTelosSnapshot(),
    onSuccess: () => {
      // 只刷新快照列表，不影响 items / profile 的本地草稿。
      void queryClient.invalidateQueries({ queryKey: telosSnapshotsQueryKey });
    },
  });
}

export function useDeleteTelosSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTelosSnapshot(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<TelosSnapshotMeta[]>(telosSnapshotsQueryKey, (prev) =>
        prev ? prev.filter((snapshot) => snapshot.id !== id) : prev,
      );
      queryClient.removeQueries({ queryKey: ["telos", "snapshot", id] });
    },
  });
}

// ---- AI 智能教练 ----
//
// 教练数据不进入 bootstrap：使用独立的 ["coach", ...] 查询键。
// 写操作只改对应缓存，避免整页 refetch 覆盖正在输入的对话草稿。

export const coachStateQueryKey = ["coach", "state"] as const;

const RECENT_SESSION_LIMIT = 10;

export function useCoachState() {
  return useQuery({
    queryKey: coachStateQueryKey,
    // 显式传本地日期：Worker 时钟是 UTC，直接算「今天」会在 CST 凌晨差一天。
    queryFn: () => api.getCoachState(todayKey()),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCoachSession(id: string | null) {
  return useQuery({
    queryKey: ["coach", "session", id ?? ""] as const,
    queryFn: async () => {
      if (!id) return null;
      return api.getCoachSession(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSaveCoachProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CoachProfileInput) => api.saveCoachProfile(input),
    onSuccess: ({ profile }) => {
      // 画像变化只影响「先让教练认识你」这条主动洞察，就地更新即可，
      // 避免整体 refetch 让画像面板的「已保存」提示被重置。
      const calibrated = profile.energyWindows.trim().length > 0 || profile.executionClues.length > 0;
      queryClient.setQueryData<CoachStateResponse>(coachStateQueryKey, (prev) =>
        prev
          ? {
              ...prev,
              profile,
              signals: calibrated
                ? prev.signals.filter((signal) => signal.id !== "profile-calibration")
                : prev.signals,
            }
          : prev,
      );
    },
  });
}

/**
 * 发送消息后把两条新消息追加进缓存，不整页 refetch。
 * 换话题时旧会话归档进历史列表；主动洞察发出后从信号列表里移除。
 */
export function useSendCoachChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CoachChatInput) =>
      api.sendCoachChat({ ...input, localDate: input.localDate ?? todayKey() }),
    onSuccess: ({ session, userMessage, assistantMessage, archivedSession }, input) => {
      queryClient.setQueryData<CoachStateResponse>(coachStateQueryKey, (prev) => {
        if (!prev) return prev;

        const previousActive = prev.activeSession;
        const sameSession = previousActive?.id === session.id;
        const baseMessages = sameSession ? prev.activeMessages : [];
        const recentSessions = archivedSession
          ? [
              archivedSession,
              ...prev.recentSessions.filter((item) => item.id !== archivedSession.id),
            ].slice(0, RECENT_SESSION_LIMIT)
          : prev.recentSessions;

        return {
          ...prev,
          activeSession: session,
          activeMessages: [...baseMessages, userMessage, assistantMessage],
          recentSessions,
          signals: input.signalId
            ? prev.signals.filter((signal) => signal.id !== input.signalId)
            : prev.signals,
        };
      });
    },
  });
}

export function useCompleteCoachSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, summary }: { id: string; summary?: string }) =>
      api.completeCoachSession(id, summary),
    onSuccess: ({ session }) => {
      queryClient.setQueryData<CoachStateResponse>(coachStateQueryKey, (prev) =>
        prev
          ? {
              ...prev,
              activeSession: null,
              activeMessages: [],
              recentSessions: [
                session,
                ...prev.recentSessions.filter((item) => item.id !== session.id),
              ].slice(0, RECENT_SESSION_LIMIT),
            }
          : prev,
      );
    },
  });
}

/**
 * 采纳 / 忽略提案：只替换这一条消息，不刷新教练状态。
 * 采纳会写入 checkins / patterns / fears，因此定向失效 bootstrap。
 */
export function useResolveCoachProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      proposalId,
      action,
    }: {
      messageId: string;
      proposalId: string;
      action: "apply" | "dismiss";
    }) => api.resolveCoachProposal(messageId, proposalId, action),
    onSuccess: ({ message }, variables) => {
      const replaceMessage = (item: { id: string }) => item.id === message.id;
      const patch = (prev: ChatSessionDetailResponse) => ({
        ...prev,
        messages: prev.messages.map((item) => (replaceMessage(item) ? message : item)),
      });

      queryClient.setQueryData<CoachStateResponse>(coachStateQueryKey, (prev) =>
        prev
          ? {
              ...prev,
              activeMessages: prev.activeMessages.map((item) =>
                replaceMessage(item) ? message : item,
              ),
            }
          : prev,
      );

      queryClient.setQueryData<ChatSessionDetailResponse | null>(
        ["coach", "session", message.sessionId] as const,
        (prev) => (prev ? patch(prev) : prev),
      );

      if (variables.action === "apply") {
        // 采纳会写业务表，也会改变主动洞察（如恐惧已拆解、画像已补全）；
        // bootstrap 与教练状态都定向失效，避免旧信号点进去变成 invalid_signal。
        void queryClient.invalidateQueries({ queryKey: coachStateQueryKey });
        void queryClient.invalidateQueries({ queryKey: bootstrapQueryKey });
      }
    },
  });
}
