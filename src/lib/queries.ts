import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BootstrapResponse,
  CheckinData,
  DocumentData,
  GoalData,
  GoalStatus,
  ReviewData,
  ReviewPeriodType,
} from "../../shared/types";
import { api, type GoalPatch, type PatternDraft } from "./api";

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
