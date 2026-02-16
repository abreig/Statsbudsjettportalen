import { useState, useRef } from 'react';
import { Button, Textarea, Alert, BodyShort, Detail, Heading, Label, TextField, Tag } from '@navikt/ds-react';
import { MessageCircle, Send, MessageSquarePlus, ShieldCheck } from 'lucide-react';
import { useQuestions, useCreateQuestion, useAnswerQuestion } from '../../hooks/useQuestions.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { canAskQuestion, canAnswerQuestion, canSendOpinion } from '../../lib/roles.ts';
import { formatDate } from '../../lib/formatters.ts';
import { AnswerEditor } from './AnswerEditor.tsx';
import { createOpinion } from '../../api/cases.ts';
import apiClient from '../../api/client.ts';

interface QuestionThreadProps {
  caseId: string;
}

export function QuestionThread({ caseId }: QuestionThreadProps) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const { data: questions, isLoading } = useQuestions(caseId);
  const createQuestion = useCreateQuestion(caseId);
  const answerQuestion = useAnswerQuestion(caseId);

  const [newQuestion, setNewQuestion] = useState('');
  const answerDataRef = useRef<Record<string, { json: string; text: string }>>({});

  // State for opinion-from-answer flow
  const [opinionFlow, setOpinionFlow] = useState<{
    questionId: string;
    type: 'uttalelse' | 'godkjenning';
  } | null>(null);
  const [opinionUsers, setOpinionUsers] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [opinionUserSearch, setOpinionUserSearch] = useState('');
  const [opinionAssignee, setOpinionAssignee] = useState('');
  const [opinionSending, setOpinionSending] = useState(false);
  const [opinionError, setOpinionError] = useState<string | null>(null);

  const handleAskQuestion = () => {
    if (!newQuestion.trim()) return;
    createQuestion.mutate(newQuestion.trim(), {
      onSuccess: () => setNewQuestion(''),
    });
  };

  const handleAnswer = (questionId: string) => {
    const data = answerDataRef.current[questionId];
    const text = data?.text?.trim();
    if (!text) return;
    answerQuestion.mutate(
      { questionId, answerText: text, answerJson: data?.json ?? null },
      {
        onSuccess: () => {
          delete answerDataRef.current[questionId];
        },
      }
    );
  };

  const startOpinionFlow = async (questionId: string, type: 'uttalelse' | 'godkjenning') => {
    setOpinionError(null);
    try {
      const { data } = await apiClient.get<Array<{ id: string; fullName: string; email: string; departmentId: string }>>('/auth/users');
      setOpinionUsers(data.filter((u) => u.id !== user?.id));
      setOpinionUserSearch('');
      setOpinionAssignee('');
      setOpinionFlow({ questionId, type });
    } catch {
      setOpinionError('Kunne ikke laste brukerliste.');
    }
  };

  const handleAnswerAndOpinion = async () => {
    if (!opinionFlow || !opinionAssignee) return;
    const { questionId, type } = opinionFlow;
    const data = answerDataRef.current[questionId];
    const text = data?.text?.trim();
    if (!text) {
      setOpinionError('Du må skrive et svar før du sender til uttalelse/godkjenning.');
      return;
    }

    setOpinionSending(true);
    setOpinionError(null);

    try {
      // Step 1: Answer the question
      await answerQuestion.mutateAsync({
        questionId,
        answerText: text,
        answerJson: data?.json ?? null,
      });
      delete answerDataRef.current[questionId];

      // Step 2: Create the opinion on the case
      await createOpinion(caseId, {
        assignedTo: opinionAssignee,
        type,
      });

      // Reset state
      setOpinionFlow(null);
      setOpinionAssignee('');
      setOpinionUsers([]);
      setOpinionUserSearch('');
    } catch {
      setOpinionError('Kunne ikke fullføre handlingen. Prøv igjen.');
    } finally {
      setOpinionSending(false);
    }
  };

  const userCanOpinion = canSendOpinion(role, user?.id ?? '', null, null);

  if (isLoading) {
    return <div className="py-4 text-sm text-gray-500">Laster spørsmål...</div>;
  }

  return (
    <div className="space-y-4">
      <Heading size="xsmall" level="3" className="flex items-center gap-2">
        <MessageCircle size={18} />
        Spørsmål og svar ({questions?.length ?? 0})
      </Heading>

      {questions && questions.length === 0 && (
        <BodyShort size="small" className="text-gray-500">
          Ingen spørsmål er stilt ennå.
        </BodyShort>
      )}

      <div className="space-y-3">
        {questions?.map((q) => (
          <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <BodyShort size="small" weight="semibold">
                  {q.askedByName}
                </BodyShort>
                <Detail>{formatDate(q.createdAt)}</Detail>
              </div>
              {q.answerText ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Besvart
                </span>
              ) : (
                <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  Ubesvart
                </span>
              )}
            </div>

            <div className="mb-3 rounded bg-blue-50 p-3 text-sm">
              {q.questionText}
            </div>

            {q.answerText && (
              <div className="ml-4 rounded border-l-4 border-green-400 bg-green-50 p-3">
                <Detail className="mb-1">
                  Svar fra {q.answeredByName} &mdash; {q.answeredAt ? formatDate(q.answeredAt) : ''}
                </Detail>
                {q.answerJson ? (
                  <AnswerEditor initialContent={q.answerJson} editable={false} />
                ) : (
                  <BodyShort size="small">{q.answerText}</BodyShort>
                )}
              </div>
            )}

            {!q.answerText && canAnswerQuestion(role) && (
              <div className="ml-4 mt-2 space-y-2">
                <AnswerEditor
                  editable
                  onUpdate={(json, text) => {
                    answerDataRef.current[q.id] = { json, text };
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    onClick={() => handleAnswer(q.id)}
                    loading={answerQuestion.isPending}
                    icon={<Send size={14} />}
                  >
                    Svar
                  </Button>
                  {userCanOpinion && (
                    <>
                      <Button
                        size="small"
                        variant="secondary"
                        icon={<MessageSquarePlus size={14} />}
                        onClick={() => startOpinionFlow(q.id, 'uttalelse')}
                        disabled={opinionSending}
                      >
                        Svar + til uttalelse
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        icon={<ShieldCheck size={14} />}
                        onClick={() => startOpinionFlow(q.id, 'godkjenning')}
                        disabled={opinionSending}
                      >
                        Svar + til godkjenning
                      </Button>
                    </>
                  )}
                </div>

                {/* Inline opinion recipient picker */}
                {opinionFlow?.questionId === q.id && (
                  <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-3">
                    <Heading size="xsmall" level="4" className="mb-2">
                      {opinionFlow.type === 'uttalelse' ? 'Send svar til uttalelse' : 'Send svar til godkjenning'}
                    </Heading>

                    <Label size="small" className="mb-1">Velg mottaker</Label>
                    <TextField
                      label=""
                      hideLabel
                      placeholder="Søk etter bruker..."
                      value={opinionUserSearch}
                      onChange={(e) => setOpinionUserSearch(e.target.value)}
                      size="small"
                      className="mb-2"
                    />

                    {!opinionAssignee && (
                      <div className="mb-3 max-h-40 space-y-1 overflow-y-auto rounded border border-gray-200 bg-white p-2">
                        {opinionUsers
                          .filter((u) => {
                            const s = opinionUserSearch.toLowerCase();
                            return !s || u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
                          })
                          .map((u) => (
                            <Button
                              key={u.id}
                              size="xsmall"
                              variant="tertiary"
                              className="w-full justify-start"
                              onClick={() => setOpinionAssignee(u.id)}
                            >
                              {u.fullName} ({u.email})
                            </Button>
                          ))}
                      </div>
                    )}

                    {opinionAssignee && (
                      <div className="mb-3 flex items-center gap-2">
                        <Tag variant="info" size="small">
                          {opinionUsers.find((u) => u.id === opinionAssignee)?.fullName ?? opinionAssignee}
                        </Tag>
                        <Button size="xsmall" variant="tertiary" onClick={() => setOpinionAssignee('')}>
                          Endre
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="small"
                        onClick={handleAnswerAndOpinion}
                        loading={opinionSending}
                        disabled={!opinionAssignee}
                        icon={opinionFlow.type === 'uttalelse' ? <MessageSquarePlus size={14} /> : <ShieldCheck size={14} />}
                      >
                        Svar og send
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => {
                          setOpinionFlow(null);
                          setOpinionAssignee('');
                          setOpinionUserSearch('');
                        }}
                      >
                        Avbryt
                      </Button>
                    </div>

                    {opinionError && (
                      <Alert variant="error" size="small" className="mt-2">
                        {opinionError}
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {canAskQuestion(role) && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Textarea
            label="Still et spørsmål til fagdepartementet"
            size="small"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            minRows={2}
            resize="vertical"
            placeholder="Skriv spørsmålet ditt her..."
          />
          <Button
            size="small"
            onClick={handleAskQuestion}
            disabled={!newQuestion.trim()}
            loading={createQuestion.isPending}
            icon={<Send size={14} />}
          >
            Send spørsmål
          </Button>
        </div>
      )}

      {createQuestion.isError && (
        <Alert variant="error" size="small">
          Kunne ikke sende spørsmål. Prøv igjen.
        </Alert>
      )}
    </div>
  );
}
