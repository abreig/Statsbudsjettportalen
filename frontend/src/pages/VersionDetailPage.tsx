import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Heading,
  BodyShort,
  BodyLong,
  Label,
  Alert,
  Loader,
  Button,
  Tag,
} from '@navikt/ds-react';
import { ArrowLeft } from 'lucide-react';
import { fetchContentVersion, fetchCase } from '../api/cases.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import { CASE_TYPE_LABELS, CASE_TYPE_FIELDS, FIN_FIELDS } from '../lib/caseTypes.ts';
import { formatAmountNOK, formatDate } from '../lib/formatters.ts';

export function VersionDetailPage() {
  const { id, version } = useParams<{ id: string; version: string }>();
  const navigate = useNavigate();

  const { data: budgetCase, isLoading: caseLoading } = useQuery({
    queryKey: ['cases', id],
    queryFn: () => fetchCase(id!),
    enabled: !!id,
  });

  const { data: versionData, isLoading: versionLoading } = useQuery({
    queryKey: ['case-version', id, version],
    queryFn: () => fetchContentVersion(id!, Number(version!)),
    enabled: !!id && !!version,
  });

  const isLoading = caseLoading || versionLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="xlarge" title="Laster versjon..." />
      </div>
    );
  }

  if (!budgetCase || !versionData) {
    return <Alert variant="error">Kunne ikke laste versjonen.</Alert>;
  }

  const caseType = budgetCase.caseType ?? '';
  const fagFields = CASE_TYPE_FIELDS[caseType] ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <Button
        variant="tertiary"
        size="small"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(`/cases/${id}/history`)}
        className="mb-4"
      >
        Tilbake til historikk
      </Button>

      {/* Version banner */}
      <Alert variant="info" size="small" className="mb-4">
        <div className="flex items-center gap-3">
          <Tag variant="info" size="small">Versjon {versionData.version}</Tag>
          <BodyShort size="small">
            Lagret {formatDate(versionData.createdAt)} av {versionData.createdByName}
          </BodyShort>
          {versionData.status && (
            <CaseStatusBadge status={versionData.status} size="xsmall" />
          )}
        </div>
      </Alert>

      {/* Case header snapshot */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6">
        <Heading size="medium" level="1" className="mb-1">
          {versionData.caseName ?? budgetCase.caseName}
        </Heading>
        <BodyShort className="mt-1 text-gray-600">
          {CASE_TYPE_LABELS[caseType] ?? caseType}
          {versionData.chapter && ` | Kap. ${versionData.chapter}`}
          {versionData.post && ` Post ${versionData.post}`}
        </BodyShort>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <Label size="small" className="text-gray-500">Kapittel</Label>
            <BodyShort>{versionData.chapter ?? '-'}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">Post</Label>
            <BodyShort>{versionData.post ?? '-'}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">Beløp (1 000 kr)</Label>
            <BodyShort>{formatAmountNOK(versionData.amount)}</BodyShort>
          </div>
          <div>
            <Label size="small" className="text-gray-500">Departement</Label>
            <BodyShort>{budgetCase.departmentCode}</BodyShort>
          </div>
        </div>
      </div>

      {/* FAG content fields */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6">
        <Heading size="small" level="2" className="mb-4">
          Faginnhold
        </Heading>
        <div className="space-y-4">
          {fagFields.map((field) => {
            const value = (versionData as Record<string, unknown>)[field.key] as string | null;
            return (
              <div key={field.key}>
                <Label size="small" className="text-gray-600">
                  {field.label}
                </Label>
                <BodyLong className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                  {value || '-'}
                </BodyLong>
              </div>
            );
          })}
        </div>
      </div>

      {/* FIN fields */}
      {(versionData.finAssessment || versionData.finVerbal || versionData.finRConclusion) && (
        <div className="mb-4 rounded-lg border-2 border-[var(--color-fin)]/30 bg-white p-6">
          <Heading size="small" level="2" className="mb-4" style={{ color: 'var(--color-fin)' }}>
            FINs vurdering
          </Heading>
          <div className="space-y-4">
            {FIN_FIELDS.map((field) => {
              const value = (versionData as Record<string, unknown>)[field.key] as string | null;
              if (!value) return null;
              return (
                <div key={field.key}>
                  <Label size="small" className="text-gray-600">
                    {field.label}
                  </Label>
                  <BodyLong className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
                    {value}
                  </BodyLong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
