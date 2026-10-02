'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { AparikDocumentTypeId } from '@/lib/aparik/document-types.constants';
import { MAX_APARIK_DOCUMENT_BYTES } from '@/lib/aparik/document-upload.constants';
import type { AparikSelectedDocument } from './AparikDocumentsSection';

interface DocumentTypeOption {
  id: AparikDocumentTypeId;
  label: string;
  icon: 'id' | 'social' | 'selfie' | 'other';
}

interface AparikDocumentTypeTilesProps {
  options: DocumentTypeOption[];
  documents: AparikSelectedDocument[];
  onAssignFile: (type: AparikDocumentTypeId, file: File) => void;
  onClearType: (type: AparikDocumentTypeId) => void;
  clickHint: string;
  replaceHint: string;
  disabled?: boolean;
}

function DocumentTypeIcon({ icon }: { icon: DocumentTypeOption['icon'] }) {
  if (icon === 'selfie') {
    return (
      <svg className="size-7 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M5.5 19.5c1.4-3 3.8-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === 'social') {
    return (
      <svg className="size-7 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 10h10M7 13h7M7 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === 'other') {
    return (
      <svg className="size-7 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8 4h6l4 4v12a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M14 4v4h4M12 14v4M10 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className="size-7 text-gray-600" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 10.5h5M13 13.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function isAllowedFile(file: File): boolean {
  const type = file.type.toLowerCase();
  return (
    type === 'image/jpeg' ||
    type === 'image/jpg' ||
    type === 'image/png' ||
    type === 'application/pdf'
  );
}

function TilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type === 'application/pdf') {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (file.type === 'application/pdf') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-100 px-1">
        <svg className="size-7 text-red-500" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 4h6l4 4v12a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="max-w-full truncate text-[10px] font-medium text-gray-700">PDF</span>
      </div>
    );
  }

  if (!previewUrl) {
    return <div className="h-full w-full bg-gray-100" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
    <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
  );
}

export function AparikDocumentTypeTiles({
  options,
  documents,
  onAssignFile,
  onClearType,
  clickHint,
  replaceHint,
  disabled = false,
}: AparikDocumentTypeTilesProps) {
  const inputRefs = useRef<Partial<Record<AparikDocumentTypeId, HTMLInputElement | null>>>({});

  const handleChange = (type: AparikDocumentTypeId, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !isAllowedFile(file) || file.size <= 0 || file.size > MAX_APARIK_DOCUMENT_BYTES) {
      return;
    }
    onAssignFile(type, file);
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option) => {
        const document = documents.find((item) => item.type === option.id) ?? null;
        const hasFile = Boolean(document);

        return (
          <div key={option.id} className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRefs.current[option.id]?.click()}
              aria-label={option.label}
              className={`relative flex h-32 w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-2 py-2.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                hasFile
                  ? 'border-admin-500 bg-admin-50/40'
                  : 'border-dashed border-gray-300 bg-gray-50 hover:border-admin-400 hover:bg-admin-50/30'
              }`}
            >
              {document ? (
                <TilePreview file={document.file} />
              ) : (
                <>
                  <DocumentTypeIcon icon={option.icon} />
                  <span className="text-[11px] font-semibold leading-tight text-gray-800">
                    {option.label}
                  </span>
                  <span className="text-[10px] font-medium leading-tight text-admin-600">
                    {clickHint}
                  </span>
                </>
              )}
              {hasFile ? (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-1 text-center">
                  <span className="block text-[10px] font-semibold text-white">{option.label}</span>
                  <span className="block text-[9px] text-white/90">{replaceHint}</span>
                </span>
              ) : null}
            </button>
            {document ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onClearType(option.id)}
                className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow hover:bg-red-600 disabled:opacity-50"
                aria-label="Remove"
              >
                ×
              </button>
            ) : null}
            <input
              ref={(node) => {
                inputRefs.current[option.id] = node;
              }}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              className="hidden"
              disabled={disabled}
              onChange={(event) => handleChange(option.id, event)}
            />
          </div>
        );
      })}
    </div>
  );
}
