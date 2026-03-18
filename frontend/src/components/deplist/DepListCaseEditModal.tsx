import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal, TextField, Loader, Label } from '@navikt/ds-react';
import type { Editor } from '@tiptap/react';
import { fetchCase, saveContent, saveDocument } from '../../api/cases';
import { DepListContentEditor } from './DepListContentEditor';
import { textToParagraphs } from '../editor/documentUtils';
import { CommentPanel } from '../editor/CommentPanel';
import {
  useComments,
  useCreateComment,
  useReplyToComment,
  useResolveComment,
  useReopenComment,
  useDeleteComment,
} from '../../hooks/useComments';
import { useAuthStore } from '../../stores/authStore';
import type { CaseComment } from '../../api/comments';
import type { JSONContent } from '@tiptap/core';

interface DepListCaseEditModalProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseName: string;
}

function extractSectionContent(contentJson: string | null | undefined, fieldKey: string): string | null {
  if (!contentJson) return null;
  try {
    const doc = JSON.parse(contentJson) as JSONContent;
    const section = doc.content?.find(
      (n) => n.type === 'caseSection' && n.attrs?.fieldKey === fieldKey
    );
    if (!section) return null;
    const sectionContent = section.content?.find((n) => n.type === 'sectionContent');
    if (!sectionContent) return null;
    return JSON.stringify({
      type: 'doc',
      content: sectionContent.content ?? [{ type: 'paragraph' }],
    });
  } catch {
    return null;
  }
}

function reconstructDocument(originalJson: string, updates: Record<string, JSONContent[]>): string {
  const doc = JSON.parse(originalJson) as JSONContent;
  const newContent = (doc.content ?? []).map((section) => {
    if (section.type !== 'caseSection') return section;
    const fieldKey = section.attrs?.fieldKey as string | undefined;
    if (!fieldKey || !(fieldKey in updates)) return section;
    return {
      ...section,
      content: (section.content ?? []).map((child) =>
        child.type === 'sectionContent' ? { ...child, content: updates[fieldKey] } : child
      ),
    };
  });
  return JSON.stringify({ ...doc, content: newContent });
}

function plainTextToDocJson(text: string | null | undefined): string {
  return JSON.stringify({ type: 'doc', content: textToParagraphs(text) });
}

function docJsonToContent(json: string | null): JSONContent[] {
  if (!json) return [{ type: 'paragraph' }];
  try {
    const doc = JSON.parse(json) as JSONContent;
    return doc.content ?? [{ type: 'paragraph' }];
  } catch {
    return [{ type: 'paragraph' }];
  }
}

export function DepListCaseEditModal({ open, onClose, caseId, caseName }: DepListCaseEditModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => fetchCase(caseId),
    enabled: open,
  });

  const { data: commentsData = [] } = useComments(open ? caseId : undefined);
  const createComment = useCreateComment(caseId);
  const replyToComment = useReplyToComment(caseId);
  const resolveComment = useResolveComment(caseId);
  const reopenComment = useReopenComment(caseId);
  const deleteComment = useDeleteComment(caseId);

  const content = caseData?.currentContent;
  const hasFullDocument = Boolean(content?.contentJson);

  const [finAmount, setFinAmount] = useState('');
  const [finAssessmentJson, setFinAssessmentJson] = useState<string | null>(null);
  const [finVerbalJson, setFinVerbalJson] = useState<string | null>(null);
  const [finRConclusionJson, setFinRConclusionJson] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Track the most recently focused editor to wire CommentPanel
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const handleFocus = useCallback((editor: Editor) => {
    setActiveEditor(editor);
  }, []);

  useEffect(() => {
    if (!content && !caseData) return;
    setFinAmount(
      (content?.finAmount ?? caseData?.finAmount) != null
        ? String(content?.finAmount ?? caseData?.finAmount)
        : ''
    );
    const cj = content?.contentJson ?? null;
    setFinAssessmentJson(
      extractSectionContent(cj, 'finAssessment') ?? plainTextToDocJson(content?.finAssessment)
    );
    setFinVerbalJson(
      extractSectionContent(cj, 'finVerbal') ?? plainTextToDocJson(content?.finVerbal)
    );
    setFinRConclusionJson(
      extractSectionContent(cj, 'finRConclusion') ?? plainTextToDocJson(content?.finRConclusion)
    );
  }, [content, caseData]);

  const handleSave = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const parsedFinAmount = finAmount !== '' ? Number(finAmount) : null;
      if (hasFullDocument && content.contentJson) {
        const updatedContentJson = reconstructDocument(content.contentJson, {
          finAssessment: docJsonToContent(finAssessmentJson),
          finVerbal: docJsonToContent(finVerbalJson),
          finRConclusion: docJsonToContent(finRConclusionJson),
        });
        await saveDocument(caseId, {
          contentJson: updatedContentJson,
          finAmount: parsedFinAmount,
          expectedVersion: content.version,
        });
      } else {
        await saveContent(caseId, {
          finAmount: parsedFinAmount,
          finAssessment: content?.finAssessment ?? null,
          finVerbal: content?.finVerbal ?? null,
          finRConclusion: content?.finRConclusion ?? null,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['department-lists'] });
      void queryClient.invalidateQueries({ queryKey: ['case', caseId] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  const handleCreateComment = (commentId: string, text: string, anchorText: string | null) => {
    createComment.mutate({ commentId, commentText: text, anchorText });
  };

  const handleReply = (commentDbId: string, text: string) => {
    replyToComment.mutate({ commentDbId, payload: { commentText: text } });
  };

  const handleResolve = (comment: CaseComment) => {
    resolveComment.mutate(comment.id);
  };

  const handleReopen = (comment: CaseComment) => {
    reopenComment.mutate(comment.id);
  };

  const handleDelete = (comment: CaseComment) => {
    deleteComment.mutate(comment.id);
  };

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={handleClose}
      header={{ heading: caseName, closeButton: !saving }}
      width="xlarge"
    >
      <Modal.Body>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader size="medium" title="Laster sak..." />
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Left column: fields */}
            <div className="min-w-0 flex-1 space-y-5">
              <TextField
                label="FINs tilråding (mill. kr)"
                type="number"
                value={finAmount}
                onChange={(e) => setFinAmount(e.target.value)}
                size="small"
                className="max-w-[200px]"
              />

              <div className="space-y-1">
                <Label size="small">FINs vurdering</Label>
                {finAssessmentJson !== null && (
                  <DepListContentEditor
                    key={`fin-assessment-${caseId}`}
                    initialContent={finAssessmentJson}
                    editable={!saving}
                    onUpdate={setFinAssessmentJson}
                    onFocus={handleFocus}
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label size="small">Konklusjon</Label>
                {finVerbalJson !== null && (
                  <DepListContentEditor
                    key={`fin-verbal-${caseId}`}
                    initialContent={finVerbalJson}
                    editable={!saving}
                    onUpdate={setFinVerbalJson}
                    onFocus={handleFocus}
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label size="small">Regjeringens konklusjon</Label>
                {finRConclusionJson !== null && (
                  <DepListContentEditor
                    key={`fin-rconclusion-${caseId}`}
                    initialContent={finRConclusionJson}
                    editable={!saving}
                    onUpdate={setFinRConclusionJson}
                    onFocus={handleFocus}
                  />
                )}
              </div>
            </div>

            {/* Right column: comments */}
            <div className="w-[300px] shrink-0 border-l border-gray-200 pl-5">
              <CommentPanel
                editor={activeEditor}
                caseId={caseId}
                comments={commentsData}
                currentUserId={user?.id ?? ''}
                activeCommentId={activeCommentId}
                onSetActiveComment={setActiveCommentId}
                onCreateComment={handleCreateComment}
                onReply={handleReply}
                onResolve={handleResolve}
                onReopen={handleReopen}
                onDelete={handleDelete}
              />
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSave} loading={saving} disabled={isLoading || !content}>
          Lagre
        </Button>
        <Button variant="secondary" onClick={handleClose} disabled={saving}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
