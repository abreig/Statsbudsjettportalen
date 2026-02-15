import type { JSONContent } from '@tiptap/core';
import type { CaseFieldConfig } from '../../lib/caseTypes';
import type { CaseContent } from '../../lib/types';

/**
 * Utilities for converting between flat field storage and ProseMirror document JSON.
 */

// Text content field keys that map to CaseContent fields
const TEXT_FIELD_KEYS = [
  'proposalText', 'justification', 'verbalConclusion',
  'socioeconomicAnalysis', 'goalIndicator', 'benefitPlan', 'comment',
  'finAssessment', 'finVerbal', 'finRConclusion',
] as const;

type TextFieldKey = typeof TEXT_FIELD_KEYS[number];

/**
 * Convert plain text to a ProseMirror paragraph node.
 * Splits by newlines to create separate paragraphs.
 */
function textToParagraphs(text: string | null | undefined): JSONContent[] {
  if (!text || text.trim() === '') {
    return [{ type: 'paragraph' }];
  }
  return text.split('\n').map((line) => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : undefined,
  }));
}

/**
 * Check if an inline node has a deletion mark (should be excluded from plain text).
 */
function hasDeletionMark(inline: JSONContent): boolean {
  return (inline.marks ?? []).some((m) => m.type === 'deletion');
}

/**
 * Extract plain text from ProseMirror content nodes.
 * Skips text nodes with deletion marks so flat fields contain clean text.
 */
function paragraphsToText(content: JSONContent[] | undefined): string {
  if (!content || content.length === 0) return '';

  return content
    .map((node) => {
      if (node.type === 'paragraph') {
        return (node.content || [])
          .filter((inline) => !hasDeletionMark(inline))
          .map((inline) => inline.text ?? '')
          .join('');
      }
      if (node.type === 'bulletList' || node.type === 'orderedList') {
        return (node.content || [])
          .map((li) =>
            (li.content || [])
              .map((p) =>
                (p.content || [])
                  .filter((inline) => !hasDeletionMark(inline))
                  .map((inline) => inline.text ?? '').join('')
              )
              .join('\n')
          )
          .join('\n');
      }
      return '';
    })
    .join('\n');
}

/**
 * Build a TipTap-compatible JSON document from flat CaseContent fields.
 */
export function buildDocumentFromContent(
  content: CaseContent | null,
  fagFields: CaseFieldConfig[],
  finFields: CaseFieldConfig[],
  caseId: string,
  showFinFields: boolean
): JSONContent {
  const sections: JSONContent[] = [];

  for (const field of fagFields) {
    const value = content?.[field.key as keyof CaseContent] as string | null;
    sections.push({
      type: 'caseSection',
      attrs: {
        fieldKey: field.key,
        label: field.label,
        required: field.required ?? false,
      },
      content: [
        {
          type: 'sectionTitle',
          content: [{ type: 'text', text: field.label }],
        },
        {
          type: 'sectionContent',
          content: textToParagraphs(value),
        },
      ],
    });
  }

  if (showFinFields) {
    for (const field of finFields) {
      const value = content?.[field.key as keyof CaseContent] as string | null;
      sections.push({
        type: 'caseSection',
        attrs: {
          fieldKey: field.key,
          label: field.label,
          required: false,
        },
        content: [
          {
            type: 'sectionTitle',
            content: [{ type: 'text', text: field.label }],
          },
          {
            type: 'sectionContent',
            content: textToParagraphs(value),
          },
        ],
      });
    }
  }

  return {
    type: 'caseDocument',
    attrs: {
      caseId,
      version: content?.version ?? 1,
    },
    content: sections,
  };
}

/**
 * Extract flat field values from a TipTap document JSON.
 * Returns a Record<string, string | null> mapping field keys to text values.
 */
export function extractFieldsFromDocument(
  doc: JSONContent
): Record<string, string | null> {
  const fields: Record<string, string | null> = {};

  if (!doc.content) return fields;

  for (const section of doc.content) {
    if (section.type !== 'caseSection') continue;
    const fieldKey = section.attrs?.fieldKey;
    if (!fieldKey) continue;

    const sectionContent = section.content?.find(
      (n) => n.type === 'sectionContent'
    );

    const text = paragraphsToText(sectionContent?.content);
    fields[fieldKey] = text || null;
  }

  return fields;
}

/**
 * Check if a field key is a known text content field.
 */
export function isTextContentField(key: string): key is TextFieldKey {
  return TEXT_FIELD_KEYS.includes(key as TextFieldKey);
}
