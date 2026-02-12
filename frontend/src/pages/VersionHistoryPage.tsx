import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Heading,
  BodyShort,
  Alert,
  Loader,
  Button,
  Tag,
} from '@navikt/ds-react';
import { ArrowLeft, Clock, FileText, ArrowRightCircle, MessageCircle } from 'lucide-react';
import { fetchCaseEvents, fetchContentVersions, fetchCase } from '../api/cases.ts';
import { formatDate } from '../lib/formatters.ts';
import { CaseStatusBadge } from '../components/cases/CaseStatusBadge.tsx';
import type { CaseContent, CaseEvent } from '../lib/types.ts';

interface TimelineItem {
  id: string;
  type: 'event' | 'version';
  timestamp: string;
  event?: CaseEvent;
  version?: CaseContent;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: 'Sak opprettet',
  status_changed: 'Status endret',
  content_updated: 'Innhold oppdatert',
  submitted: 'Sendt til FIN',
  returned: 'Returnert til FAG',
  question_asked: 'Sporsmal stilt',
  question_answered: 'Sporsmal besvart',
  assigned: 'Tildelt',
};

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'status_changed':
    case 'returned':
      return <ArrowRightCircle size={16} />;
    case 'content_updated':
      return <FileText size={16} />;
    case 'question_asked':
    case 'question_answered':
      return <MessageCircle size={16} />;
    default:
      return <Clock size={16} />;
  }
}

export function VersionHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: budgetCase, isLoading: caseLoading } = useQuery({
    queryKey: ['cases', id],
    queryFn: () => fetchCase(id!),
    enabled: !!id,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['case-events', id],
    queryFn: () => fetchCaseEvents(id!),
    enabled: !!id,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['case-versions', id],
    queryFn: () => fetchContentVersions(id!),
    enabled: !!id,
  });

  const isLoading = caseLoading || eventsLoading || versionsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size="xlarge" title="Laster historikk..." />
      </div>
    );
  }

  if (!budgetCase) {
    return <Alert variant="error">Kunne ikke laste saken.</Alert>;
  }

  // Build unified timeline
  const timeline: TimelineItem[] = [];

  events?.forEach((ev) => {
    timeline.push({
      id: `event-${ev.id}`,
      type: 'event',
      timestamp: ev.createdAt,
      event: ev,
    });
  });

  versions?.forEach((ver) => {
    timeline.push({
      id: `version-${ver.id}`,
      type: 'version',
      timestamp: ver.createdAt,
      version: ver,
    });
  });

  // Sort descending (newest first)
  timeline.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        variant="tertiary"
        size="small"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate(`/cases/${id}`)}
        className="mb-4"
      >
        Tilbake til sak
      </Button>

      <Heading size="large" level="1" className="mb-1">
        Historikk
      </Heading>
      <BodyShort className="mb-6 text-gray-600">
        {budgetCase.caseName}
      </BodyShort>

      {timeline.length === 0 && (
        <Alert variant="info">Ingen historikk tilgjengelig.</Alert>
      )}

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute top-0 bottom-0 left-5 w-px bg-gray-200" />

        <div className="space-y-4">
          {timeline.map((item) => (
            <div key={item.id} className="relative flex gap-4 pl-12">
              {/* Dot */}
              <div className="absolute left-3.5 top-2 h-3 w-3 rounded-full border-2 border-white bg-[var(--color-primary)] shadow-sm" />

              {item.type === 'event' && item.event && (
                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm">
                    {getEventIcon(item.event.eventType)}
                    <span className="font-medium">
                      {EVENT_TYPE_LABELS[item.event.eventType] ??
                        item.event.eventType}
                    </span>
                    {item.event.eventType === 'status_changed' &&
                      item.event.eventData && (
                        <CaseStatusBadge
                          status={item.event.eventData}
                          size="xsmall"
                        />
                      )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span>{item.event.userName}</span>
                    <span>&mdash;</span>
                    <span>{formatDate(item.event.createdAt)}</span>
                  </div>
                  {item.event.eventData &&
                    item.event.eventType === 'returned' && (
                      <BodyShort
                        size="small"
                        className="mt-2 rounded bg-red-50 p-2 text-red-700"
                      >
                        Begrunnelse: {item.event.eventData}
                      </BodyShort>
                    )}
                </div>
              )}

              {item.type === 'version' && item.version && (
                <div className="flex-1 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Innholdsversjon {item.version.version}
                    </span>
                    <Tag variant="info" size="xsmall">
                      v{item.version.version}
                    </Tag>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {item.version.createdByName} &mdash;{' '}
                    {formatDate(item.version.createdAt)}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {item.version.proposalText && (
                      <div>
                        <strong>Forslag:</strong>{' '}
                        {item.version.proposalText.substring(0, 120)}
                        {item.version.proposalText.length > 120 ? '...' : ''}
                      </div>
                    )}
                    {item.version.finAssessment && (
                      <div>
                        <strong>FIN-vurdering:</strong>{' '}
                        {item.version.finAssessment.substring(0, 120)}
                        {item.version.finAssessment.length > 120 ? '...' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
