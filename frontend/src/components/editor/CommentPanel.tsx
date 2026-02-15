import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Button,
  BodyShort,
  Textarea,
  Tag,
  Heading,
} from '@navikt/ds-react';
import {
  MessageSquare,
  MessageSquarePlus,
  Reply,
  CheckCircle2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { CaseComment } from '../../api/comments';
import type { CommentInfo } from './CommentsExtension';
import { collectCommentMarks } from './CommentsExtension';

interface CommentPanelProps {
  editor: Editor | null;
  caseId: string;
  comments: CaseComment[];
  currentUserId: string;
  activeCommentId: string | null;
  onSetActiveComment: (commentId: string | null) => void;
  onCreateComment: (commentId: string, text: string, anchorText: string | null) => void;
  onReply: (commentDbId: string, text: string) => void;
  onResolve: (comment: CaseComment) => void;
  onReopen: (comment: CaseComment) => void;
  onDelete: (comment: CaseComment) => void;
}

export function CommentPanel({
  editor,
  caseId: _caseId,
  comments,
  currentUserId,
  activeCommentId,
  onSetActiveComment,
  onCreateComment,
  onReply,
  onResolve,
  onReopen,
  onDelete,
}: CommentPanelProps) {
  const [showNewComment, setShowNewComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const [pendingAnchorText, setPendingAnchorText] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const newCommentRef = useRef<HTMLTextAreaElement>(null);

  // Get comment marks from the document
  const docCommentMarks: CommentInfo[] = editor ? collectCommentMarks(editor.state.doc) : [];

  // Listen for keyboard shortcut event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const commentId = crypto.randomUUID();
        setPendingCommentId(commentId);
        setPendingAnchorText(detail.text ?? null);
        setShowNewComment(true);
        setNewCommentText('');
        setTimeout(() => newCommentRef.current?.focus(), 100);
      }
    };
    window.addEventListener('editor:add-comment', handler);
    return () => window.removeEventListener('editor:add-comment', handler);
  }, []);

  const handleStartComment = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return; // Need selection

    const commentId = crypto.randomUUID();
    const anchorText = editor.state.doc.textBetween(from, to, ' ');
    setPendingCommentId(commentId);
    setPendingAnchorText(anchorText);
    setShowNewComment(true);
    setNewCommentText('');
    setTimeout(() => newCommentRef.current?.focus(), 100);
  };

  const handleSubmitComment = () => {
    if (!newCommentText.trim() || !pendingCommentId || !editor) return;

    // Add the comment mark to the selected text
    editor.commands.addComment(
      pendingCommentId,
      currentUserId,
      '' // name filled by backend
    );

    onCreateComment(pendingCommentId, newCommentText.trim(), pendingAnchorText);

    setShowNewComment(false);
    setNewCommentText('');
    setPendingCommentId(null);
    setPendingAnchorText(null);
  };

  const handleCancelComment = () => {
    setShowNewComment(false);
    setNewCommentText('');
    setPendingCommentId(null);
    setPendingAnchorText(null);
  };

  const handleSubmitReply = (commentDbId: string) => {
    if (!replyText.trim()) return;
    onReply(commentDbId, replyText.trim());
    setReplyingTo(null);
    setReplyText('');
  };

  const handleClickComment = (commentId: string) => {
    onSetActiveComment(commentId);

    // Scroll to the comment mark in the editor
    if (!editor) return;
    const markInfo = docCommentMarks.find((m) => m.commentId === commentId);
    if (markInfo) {
      editor.commands.setTextSelection({ from: markInfo.from, to: markInfo.to });
      editor.commands.scrollIntoView();
    }
  };

  // Check if a comment's anchor still exists in the document
  const isOrphaned = (commentId: string) => {
    return !docCommentMarks.some((m) => m.commentId === commentId);
  };

  const openComments = comments.filter((c) => c.status === 'open' && !c.parentCommentId);
  const resolvedComments = comments.filter((c) => c.status === 'resolved' && !c.parentCommentId);
  const hasSelection = editor ? editor.state.selection.from !== editor.state.selection.to : false;

  return (
    <div className="comment-panel">
      <div className="mb-3 flex items-center justify-between">
        <Heading size="xsmall" level="3" className="flex items-center gap-1.5">
          <MessageSquare size={16} />
          Kommentarer
          {openComments.length > 0 && (
            <Tag variant="warning" size="xsmall" className="ml-1">
              {openComments.length}
            </Tag>
          )}
        </Heading>
        <Button
          type="button"
          variant="tertiary"
          size="xsmall"
          icon={<MessageSquarePlus size={14} />}
          onClick={handleStartComment}
          disabled={!hasSelection}
          title={hasSelection ? 'Legg til kommentar (Ctrl+Shift+C)' : 'Marker tekst for å kommentere'}
        >
          Ny
        </Button>
      </div>

      {/* New comment form */}
      {showNewComment && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-3">
          {pendingAnchorText && (
            <BodyShort size="small" className="mb-2 italic text-gray-600 line-clamp-2">
              &laquo;{pendingAnchorText}&raquo;
            </BodyShort>
          )}
          <Textarea
            ref={newCommentRef}
            label="Kommentar"
            hideLabel
            placeholder="Skriv en kommentar..."
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            minRows={2}
            resize="vertical"
            size="small"
            className="mb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmitComment();
              }
              if (e.key === 'Escape') {
                handleCancelComment();
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="xsmall"
              onClick={handleSubmitComment}
              disabled={!newCommentText.trim()}
            >
              Kommenter
            </Button>
            <Button
              type="button"
              size="xsmall"
              variant="secondary"
              onClick={handleCancelComment}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {/* Open comments */}
      {openComments.length === 0 && !showNewComment && (
        <BodyShort size="small" className="text-gray-500 py-2">
          Ingen aktive kommentarer. Marker tekst for å legge til.
        </BodyShort>
      )}

      <div className="space-y-2">
        {openComments.map((comment) => {
          const orphaned = isOrphaned(comment.commentId);
          const isActive = activeCommentId === comment.commentId;

          return (
            <div
              key={comment.id}
              className={`comment-thread rounded border border-gray-200 bg-white p-3 cursor-pointer
                ${isActive ? 'comment-thread-active' : ''}
                ${orphaned ? 'opacity-60' : ''}
              `}
              onClick={() => handleClickComment(comment.commentId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClickComment(comment.commentId);
              }}
            >
              {/* Comment anchor text */}
              {comment.anchorText && (
                <BodyShort size="small" className="mb-1.5 italic text-gray-500 line-clamp-1">
                  &laquo;{comment.anchorText}&raquo;
                </BodyShort>
              )}

              {orphaned && (
                <Tag variant="neutral" size="xsmall" className="mb-1.5">
                  Tekst slettet
                </Tag>
              )}

              {/* Main comment */}
              <div className="mb-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <BodyShort size="small" className="font-semibold">
                    {comment.authorName}
                  </BodyShort>
                  <BodyShort size="small" className="text-gray-400">
                    {formatRelativeTime(comment.createdAt)}
                  </BodyShort>
                </div>
                <BodyShort size="small" className="whitespace-pre-wrap">
                  {comment.commentText}
                </BodyShort>
              </div>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="comment-reply">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <BodyShort size="small" className="font-semibold">
                          {reply.authorName}
                        </BodyShort>
                        <BodyShort size="small" className="text-gray-400">
                          {formatRelativeTime(reply.createdAt)}
                        </BodyShort>
                      </div>
                      <BodyShort size="small" className="whitespace-pre-wrap">
                        {reply.commentText}
                      </BodyShort>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="tertiary"
                  size="xsmall"
                  icon={<Reply size={12} />}
                  onClick={() => {
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    setReplyText('');
                  }}
                >
                  Svar
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  size="xsmall"
                  icon={<CheckCircle2 size={12} />}
                  onClick={() => onResolve(comment)}
                  className="text-green-700"
                >
                  Løs
                </Button>
                {comment.authorId === currentUserId && (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="xsmall"
                    icon={<Trash2 size={12} />}
                    onClick={() => onDelete(comment)}
                    className="text-red-600"
                  />
                )}
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <Textarea
                    label="Svar"
                    hideLabel
                    placeholder="Skriv et svar..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    minRows={1}
                    resize="vertical"
                    size="small"
                    className="mb-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSubmitReply(comment.id);
                      }
                      if (e.key === 'Escape') {
                        setReplyingTo(null);
                        setReplyText('');
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="xsmall"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim()}
                    >
                      Svar
                    </Button>
                    <Button
                      type="button"
                      size="xsmall"
                      variant="secondary"
                      icon={<X size={12} />}
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resolved comments toggle */}
      {resolvedComments.length > 0 && (
        <div className="mt-4">
          <Button
            type="button"
            variant="tertiary"
            size="xsmall"
            onClick={() => setShowResolved(!showResolved)}
            className="mb-2"
          >
            {showResolved ? 'Skjul' : 'Vis'} løste kommentarer ({resolvedComments.length})
          </Button>

          {showResolved && (
            <div className="space-y-2">
              {resolvedComments.map((comment) => (
                <div
                  key={comment.id}
                  className="comment-thread comment-thread-resolved rounded border border-gray-200 bg-gray-50 p-3"
                >
                  {comment.anchorText && (
                    <BodyShort size="small" className="mb-1 italic text-gray-400 line-clamp-1">
                      &laquo;{comment.anchorText}&raquo;
                    </BodyShort>
                  )}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <BodyShort size="small" className="font-semibold text-gray-500">
                      {comment.authorName}
                    </BodyShort>
                    <Tag variant="success" size="xsmall">Løst</Tag>
                  </div>
                  <BodyShort size="small" className="text-gray-500 whitespace-pre-wrap">
                    {comment.commentText}
                  </BodyShort>

                  {comment.replies.length > 0 && (
                    <div className="mt-1.5 space-y-1.5">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="comment-reply">
                          <BodyShort size="small" className="text-gray-500">
                            <span className="font-semibold">{reply.authorName}:</span> {reply.commentText}
                          </BodyShort>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-1.5 flex gap-1">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="xsmall"
                      icon={<RotateCcw size={12} />}
                      onClick={() => onReopen(comment)}
                    >
                      Gjenåpne
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'nå';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}t`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}
