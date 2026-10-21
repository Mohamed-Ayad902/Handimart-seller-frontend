"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, upload } from "@/lib/client/api";
import type { Page, SupportContextType, SupportConversation, SupportMessage } from "@/lib/types";
import { E, tracked } from "@/lib/observability/analytics";

/** There is no realtime channel (handover G3): an open chat polls while the tab is visible, like the app (4s). */
const CHAT_POLL_MS = 5_000;
const INBOX_POLL_MS = 30_000;

export const supportKeys = {
  all: ["support"] as const,
  conversations: ["support", "conversations"] as const,
  messages: (id: string) => ["support", "messages", id] as const,
};

export function useConversations() {
  return useInfiniteQuery({
    queryKey: supportKeys.conversations,
    queryFn: ({ pageParam, signal }) => api.get<Page<SupportConversation>>("/seller/support/conversations", { page: pageParam, size: 20 }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
    refetchInterval: INBOX_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** Newest first from the server, 30 a page; older pages load on demand. */
export function useMessages(id: string) {
  return useInfiniteQuery({
    queryKey: supportKeys.messages(id),
    queryFn: ({ pageParam, signal }) => api.get<Page<SupportMessage>>(`/seller/support/conversations/${id}/messages`, { page: pageParam, size: 30 }, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.pageNumber + 1),
    refetchInterval: CHAT_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<null>(`/seller/support/conversations/${id}/read`),
    onSuccess: () => client.invalidateQueries({ queryKey: supportKeys.conversations }),
  });
}

export function useSendMessage(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ text, attachment }: { text: string | null; attachment: File | null }) =>
      tracked(upload<SupportMessage>(`/seller/support/conversations/${id}/messages`, { text }, attachment ? [["attachment", attachment]] : []), E.SUPPORT_MESSAGE_SENT, { has_attachment: !!attachment }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: supportKeys.messages(id) });
      void client.invalidateQueries({ queryKey: supportKeys.conversations });
    },
  });
}

export interface StartInput {
  subject: string | null;
  contextType: SupportContextType;
  contextRefId: string | null;
  text: string | null;
  attachment: File | null;
}

export function useStartConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ attachment, ...body }: StartInput) => tracked(upload<SupportConversation>("/seller/support/conversations", body, attachment ? [["attachment", attachment]] : []), E.SUPPORT_MESSAGE_SENT, { has_attachment: !!attachment, type: body.contextType }),
    onSuccess: () => client.invalidateQueries({ queryKey: supportKeys.conversations }),
  });
}
