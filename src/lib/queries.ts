import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CheckinData, DocumentData } from "../../shared/types";
import { api } from "./api";

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
