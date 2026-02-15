import { Node, mergeAttributes } from '@tiptap/core';

/**
 * ProseMirror schema for the case document model.
 *
 * Structure:
 *   caseDocument
 *     └─ caseSection (field_key, label, required)
 *          ├─ sectionTitle (non-editable heading)
 *          └─ sectionContent (editable rich text)
 */

// ─── caseDocument (top-level node) ─────────────────────
export const CaseDocument = Node.create({
  name: 'caseDocument',
  topNode: true,
  content: 'caseSection+',

  addAttributes() {
    return {
      caseId: { default: null },
      version: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="case-document"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'case-document', class: 'case-document' }), 0];
  },
});

// ─── caseSection ───────────────────────────────────────
export const CaseSection = Node.create({
  name: 'caseSection',
  group: 'block',
  content: 'sectionTitle sectionContent',

  addAttributes() {
    return {
      fieldKey: { default: '' },
      label: { default: '' },
      required: { default: false },
    };
  },

  parseHTML() {
    return [{
      tag: 'section[data-type="case-section"]',
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        return {
          fieldKey: el.getAttribute('data-field-key'),
          label: el.getAttribute('data-label'),
          required: el.getAttribute('data-required') === 'true',
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'case-section',
        'data-field-key': HTMLAttributes.fieldKey,
        'data-label': HTMLAttributes.label,
        'data-required': HTMLAttributes.required ? 'true' : 'false',
        class: 'case-section',
      }),
      0,
    ];
  },
});

// ─── sectionTitle (non-editable heading) ────────────────
export const SectionTitle = Node.create({
  name: 'sectionTitle',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      level: { default: 2 },
    };
  },

  parseHTML() {
    return [{ tag: 'h2[data-type="section-title"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'h2',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'section-title',
        class: 'section-title',
        contenteditable: 'false',
      }),
      0,
    ];
  },
});

// ─── sectionContent (editable rich text) ─────────────────
export const SectionContent = Node.create({
  name: 'sectionContent',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="section-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'section-content',
        class: 'section-content',
      }),
      0,
    ];
  },
});
