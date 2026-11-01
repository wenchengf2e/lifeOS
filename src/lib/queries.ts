import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckinData, DocumentData, ReviewData, ReviewPeriodType } from "../../shared/types";
import { api, type PatternDraft } from "./api";

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
