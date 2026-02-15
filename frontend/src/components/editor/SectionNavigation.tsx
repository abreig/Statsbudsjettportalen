import { BodyShort, Label } from '@navikt/ds-react';
import type { CaseFieldConfig } from '../../lib/caseTypes';

interface SectionNavigationProps {
  fagFields: CaseFieldConfig[];
  finFields: CaseFieldConfig[];
  showFinFields: boolean;
  activeSection?: string;
}

export function SectionNavigation({
  fagFields,
  finFields,
  showFinFields,
  activeSection,
}: SectionNavigationProps) {
  const scrollToSection = (fieldKey: string) => {
    const el = document.querySelector(
      `[data-field-key="${fieldKey}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div>
      <Label size="small" className="mb-2 text-gray-500">
        Innholdsfortegnelse
      </Label>
      <nav className="space-y-1">
        {fagFields.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => scrollToSection(field.key)}
            className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
              activeSection === field.key
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BodyShort size="small">
              {field.label}
              {field.required && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </BodyShort>
          </button>
        ))}

        {showFinFields && finFields.length > 0 && (
          <>
            <div className="my-2 border-t border-gray-200 pt-2">
              <Label size="small" className="text-xs text-gray-400 uppercase tracking-wider">
                FIN
              </Label>
            </div>
            {finFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => scrollToSection(field.key)}
                className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  activeSection === field.key
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BodyShort size="small">{field.label}</BodyShort>
              </button>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}
