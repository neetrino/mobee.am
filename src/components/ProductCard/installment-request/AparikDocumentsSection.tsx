'use client';

import type { AparikDocumentTypeId } from '@/lib/aparik/document-types.constants';
import { AparikDocumentTypeTiles } from './AparikDocumentTypeTiles';

export interface AparikSelectedDocument {
  id: string;
  file: File;
  type: AparikDocumentTypeId;
}

interface DocumentTypeOption {
  id: AparikDocumentTypeId;
  label: string;
  icon: 'id' | 'social' | 'selfie' | 'other';
}

interface AparikDocumentsSectionProps {
  title: string;
  instructions: string;
  artsakhNote: string;
  formatsHint: string;
  clickHint: string;
  replaceHint: string;
  typeOptions: DocumentTypeOption[];
  documents: AparikSelectedDocument[];
  onDocumentsChange: (documents: AparikSelectedDocument[]) => void;
  disabled?: boolean;
  error?: string;
}

function createDocumentId(): string {
  return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AparikDocumentsSection({
  title,
  instructions,
  artsakhNote,
  formatsHint,
  clickHint,
  replaceHint,
  typeOptions,
  documents,
  onDocumentsChange,
  disabled = false,
  error,
}: AparikDocumentsSectionProps) {
  const assignFile = (type: AparikDocumentTypeId, file: File) => {
    const nextDoc: AparikSelectedDocument = {
      id: createDocumentId(),
      file,
      type,
    };
    const withoutType = documents.filter((item) => item.type !== type);
    onDocumentsChange([...withoutType, nextDoc]);
  };

  const clearType = (type: AparikDocumentTypeId) => {
    onDocumentsChange(documents.filter((item) => item.type !== type));
  };

  return (
    <div className="space-y-3" data-aparik-field="documents">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {instructions}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{artsakhNote}</p>
        <p className="mt-2 text-xs text-gray-500">{formatsHint}</p>
      </div>

      <AparikDocumentTypeTiles
        options={typeOptions}
        documents={documents}
        onAssignFile={assignFile}
        onClearType={clearType}
        clickHint={clickHint}
        replaceHint={replaceHint}
        disabled={disabled}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
