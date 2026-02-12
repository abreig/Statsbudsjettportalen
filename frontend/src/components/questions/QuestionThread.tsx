import { useState } from 'react';
import { Button, Textarea, Alert, BodyShort, Detail, Heading } from '@navikt/ds-react';
import { MessageCircle, Send } from 'lucide-react';
import { useQuestions, useCreateQuestion, useAnswerQuestion } from '../../hooks/useQuestions.ts';
import { useAuthStore } from '../../stores/authStore.ts';
import { canAskQuestion, canAnswerQuestion } from '../../lib/roles.ts';
import { formatDate } from '../../lib/formatters.ts';

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
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});

  const handleAskQuestion = () => {
    if (!newQuestion.trim()) return;
    createQuestion.mutate(newQuestion.trim(), {
      onSuccess: () => setNewQuestion(''),
    });
  };

  const handleAnswer = (questionId: string) => {
    const text = answerTexts[questionId]?.trim();
    if (!text) return;
    answerQuestion.mutate(
      { questionId, answerText: text },
      {
        onSuccess: () => {
          setAnswerTexts((prev) => {
            const next = { ...prev };
            delete next[questionId];
            return next;
          });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="py-4 text-sm text-gray-500">Laster sporsmal...</div>;
  }

  return (
    <div className="space-y-4">
      <Heading size="xsmall" level="3" className="flex items-center gap-2">
        <MessageCircle size={18} />
        Sporsmal og svar ({questions?.length ?? 0})
      </Heading>

      {questions && questions.length === 0 && (
        <BodyShort size="small" className="text-gray-500">
          Ingen sporsmal er stilt enna.
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
                <BodyShort size="small">{q.answerText}</BodyShort>
              </div>
            )}

            {!q.answerText && canAnswerQuestion(role) && (
              <div className="ml-4 mt-2 space-y-2">
                <Textarea
                  label="Ditt svar"
                  size="small"
                  hideLabel
                  value={answerTexts[q.id] ?? ''}
                  onChange={(e) =>
                    setAnswerTexts((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  minRows={2}
                  resize="vertical"
                  placeholder="Skriv svar her..."
                />
                <Button
                  size="small"
                  onClick={() => handleAnswer(q.id)}
                  disabled={!answerTexts[q.id]?.trim()}
                  loading={answerQuestion.isPending}
                  icon={<Send size={14} />}
                >
                  Svar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canAskQuestion(role) && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Textarea
            label="Still et sporsmal til fagdepartementet"
            size="small"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            minRows={2}
            resize="vertical"
            placeholder="Skriv sporsmalet ditt her..."
          />
          <Button
            size="small"
            onClick={handleAskQuestion}
            disabled={!newQuestion.trim()}
            loading={createQuestion.isPending}
            icon={<Send size={14} />}
          >
            Send sporsmal
          </Button>
        </div>
      )}

      {createQuestion.isError && (
        <Alert variant="error" size="small">
          Kunne ikke sende sporsmal. Provigjen.
        </Alert>
      )}
    </div>
  );
}
