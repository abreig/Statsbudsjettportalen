import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchComments,
  createComment,
  replyToComment,
  resolveComment,
  reopenComment,
  deleteComment,
} from '../api/comments';
import type {
  CreateCommentPayload,
  ReplyCommentPayload,
} from '../api/comments';

export function useComments(caseId: string | undefined) {
  return useQuery({
    queryKey: ['comments', caseId],
    queryFn: () => fetchComments(caseId!),
    enabled: !!caseId,
  });
}

export function useCreateComment(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommentPayload) => createComment(caseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', caseId] });
    },
  });
}

export function useReplyToComment(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { commentDbId: string; payload: ReplyCommentPayload }) =>
      replyToComment(caseId, params.commentDbId, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', caseId] });
    },
  });
}

export function useResolveComment(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentDbId: string) => resolveComment(caseId, commentDbId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', caseId] });
    },
  });
}

export function useReopenComment(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentDbId: string) => reopenComment(caseId, commentDbId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', caseId] });
    },
  });
}

export function useDeleteComment(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentDbId: string) => deleteComment(caseId, commentDbId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', caseId] });
    },
  });
}
