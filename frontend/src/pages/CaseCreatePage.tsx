import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heading,
  BodyShort,
  Button,
  TextField,
  Textarea,
  RadioGroup,
  Radio,
  Alert,
} from '@navikt/ds-react';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useCreateCase } from '../hooks/useCases.ts';
import { useUiStore } from '../stores/uiStore.ts';
import {
  CASE_TYPE_LABELS,
  CASE_TYPE_DESCRIPTIONS,
  CASE_TYPE_FIELDS,
} from '../lib/caseTypes.ts';
import type { CaseCreatePayload } from '../api/cases.ts';

interface FormValues {
  caseType: string;
  caseName: string;
  chapter: string;
  post: string;
  amount: string;
  proposalText: string;
  justification: string;
  verbalConclusion: string;
  socioeconomicAnalysis: string;
  goalIndicator: string;
  benefitPlan: string;
  comment: string;
}

export function CaseCreatePage() {
  const navigate = useNavigate();
  const selectedRound = useUiStore((s) => s.selectedRound);
  const createCase = useCreateCase();
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      caseType: '',
      caseName: '',
      chapter: '',
      post: '',
      amount: '',
      proposalText: '',
      justification: '',
      verbalConclusion: '',
      socioeconomicAnalysis: '',
      goalIndicator: '',
      benefitPlan: '',
      comment: '',
    },
  });

  const selectedType = watch('caseType');
  const fields = selectedType ? CASE_TYPE_FIELDS[selectedType] ?? [] : [];

  if (!selectedRound) {
    return (
      <Alert variant="warning">
        Du må velge en budsjettrunde først.{' '}
        <a href="/budget-rounds" className="underline">
          Velg budsjettrunde
        </a>
      </Alert>
    );
  }

  const onSubmit = (data: FormValues) => {
    if (!selectedRound) return;

    const payload: CaseCreatePayload = {
      budgetRoundId: selectedRound.id,
      caseName: data.caseName,
      caseType: data.caseType,
      chapter: data.chapter || undefined,
      post: data.post || undefined,
      amount: data.amount ? Number(data.amount) : undefined,
    };

    // Add content fields based on case type
    for (const field of fields) {
      const val = data[field.key as keyof FormValues];
      if (val) {
        (payload as unknown as Record<string, unknown>)[field.key] = val;
      }
    }

    createCase.mutate(payload, {
      onSuccess: (newCase) => {
        navigate(`/cases/${newCase.id}`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        variant="tertiary"
        size="small"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/cases')}
        className="mb-4"
      >
        Tilbake til saksoversikt
      </Button>

      <Heading size="large" level="1" className="mb-1">
        Opprett ny sak
      </Heading>
      <BodyShort className="mb-6 text-gray-600">
        {selectedRound.name}
      </BodyShort>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            step === 1
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-green-100 text-green-700'
          }`}
        >
          1
        </div>
        <div className="h-px flex-1 bg-gray-300" />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            step === 2
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          2
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            <Heading size="medium" level="2">
              Velg sakstype
            </Heading>

            <Controller
              name="caseType"
              control={control}
              rules={{ required: 'Du må velge en sakstype' }}
              render={({ field, fieldState }) => (
                <RadioGroup
                  legend="Sakstype"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                >
                  {Object.entries(CASE_TYPE_LABELS).map(([key, label]) => (
                    <Radio key={key} value={key}>
                      {label}
                      <BodyShort
                        size="small"
                        className="mt-0.5 text-gray-500"
                      >
                        {CASE_TYPE_DESCRIPTIONS[key]}
                      </BodyShort>
                    </Radio>
                  ))}
                </RadioGroup>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  if (selectedType) setStep(2);
                }}
                disabled={!selectedType}
                icon={<ArrowRight size={16} />}
                iconPosition="right"
              >
                Neste
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            <Heading size="medium" level="2">
              Metadata og innhold
            </Heading>

            <BodyShort size="small" className="text-gray-600">
              Sakstype: <strong>{CASE_TYPE_LABELS[selectedType]}</strong>
            </BodyShort>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Saksnavn"
                {...register('caseName', { required: 'Saksnavn er påkrevd' })}
                error={errors.caseName?.message}
                className="sm:col-span-2"
              />
              <TextField
                label="Kapittel"
                {...register('chapter')}
                placeholder="f.eks. 600"
              />
              <TextField
                label="Post"
                {...register('post')}
                placeholder="f.eks. 01"
              />
              <TextField
                label="Beløp (1 000 kr)"
                type="number"
                {...register('amount')}
                className="sm:col-span-2"
              />
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-4">
              <Heading size="xsmall" level="3">
                Innholdsfelt
              </Heading>
              {fields.map((field) => (
                <Textarea
                  key={field.key}
                  label={field.label}
                  {...register(field.key as keyof FormValues, {
                    required: field.required
                      ? `${field.label} er påkrevd`
                      : false,
                  })}
                  error={
                    errors[field.key as keyof FormValues]?.message as
                      | string
                      | undefined
                  }
                  minRows={3}
                  resize="vertical"
                />
              ))}
            </div>

            {createCase.isError && (
              <Alert variant="error">
                Kunne ikke opprette sak. Sjekk at alle påkrevde felt er fylt ut.
              </Alert>
            )}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                icon={<ArrowLeft size={16} />}
              >
                Forrige
              </Button>
              <Button
                type="submit"
                loading={createCase.isPending}
                icon={<Save size={16} />}
              >
                Opprett sak
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
