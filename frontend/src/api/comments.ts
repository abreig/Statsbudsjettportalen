import apiClient from './client';

export interface CaseComment {
  id: string;
  caseId: string;
  commentText: string;
  anchorText: string | null;
  commentId: string; // ProseMirror mark commentId (UUID)
  authorId: string;
  authorName: string;
  status: 'open' | 'resolved' | 'closed';
  parentCommentId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  replies: CaseComment[];
}

export interface CreateCommentPayload {
  commentText: string;
  anchorText: string | null;
  commentId: string; // UUID for the ProseMirror mark
}

export interface ReplyCommentPayload {
  commentText: string;
}

export async function fetchComments(caseId: string): Promise<CaseComment[]> {
  const { data } = await apiClient.get<CaseComment[]>(`/cases/${caseId}/comments`);
  return data;
}

export async function createComment(caseId: string, payload: CreateCommentPayload): Promise<CaseComment> {
  const { data } = await apiClient.post<CaseComment>(`/cases/${caseId}/comments`, payload);
  return data;
}

export async function replyToComment(caseId: string, commentDbId: string, payload: ReplyCommentPayload): Promise<CaseComment> {
  const { data } = await apiClient.post<CaseComment>(`/cases/${caseId}/comments/${commentDbId}/replies`, payload);
  return data;
}

export async function resolveComment(caseId: string, commentDbId: string): Promise<void> {
  await apiClient.patch(`/cases/${caseId}/comments/${commentDbId}/resolve`);
}

export async function reopenComment(caseId: string, commentDbId: string): Promise<void> {
  await apiClient.patch(`/cases/${caseId}/comments/${commentDbId}/reopen`);
}

export async function deleteComment(caseId: string, commentDbId: string): Promise<void> {
  await apiClient.delete(`/cases/${caseId}/comments/${commentDbId}`);
}
