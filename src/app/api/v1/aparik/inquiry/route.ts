import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  isAparikDocumentTypeId,
  type AparikDocumentTypeId,
} from '@/lib/aparik/document-types.constants';
import { hasValidAparikDocumentSet } from '@/lib/aparik/document-rules';
import {
  MAX_APARIK_DOCUMENT_BYTES,
  MAX_APARIK_DOCUMENTS,
} from '@/lib/aparik/document-upload.constants';
import { validateAparikDocumentBuffer } from '@/lib/aparik/validate-document-buffer';
import type { AparikInquiryDocumentAttachment } from '@/lib/email/send-aparik-product-inquiry-email';
import { sendAparikProductInquiryEmail } from '@/lib/email/send-aparik-product-inquiry-email';
import { AppError } from '@/lib/errors/app-error';
import { runApiRoute } from '@/lib/errors/run-api-route';
import { parseAparikInquiryFields } from '@/lib/schemas/aparik-inquiry.schema';
import { logger } from '@/lib/utils/logger';

function createInquiryId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `APR-${timestamp}-${random}`;
}

function readOptionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRequiredString(formData: FormData, key: string): string {
  return readOptionalString(formData, key) ?? '';
}

function readBooleanFlag(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === 'true' || value === '1' || value === 'on';
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '_').trim();
  return base.slice(0, 180) || 'document';
}

async function parseDocuments(formData: FormData): Promise<AparikInquiryDocumentAttachment[]> {
  const files = formData.getAll('documents').filter((entry): entry is File => entry instanceof File);
  const typeValues = formData.getAll('documentTypes').map((entry) => String(entry));

  if (files.length === 0) {
    throw AppError.badRequest('At least one document is required');
  }

  if (files.length > MAX_APARIK_DOCUMENTS) {
    throw AppError.badRequest(`Maximum ${MAX_APARIK_DOCUMENTS} documents allowed`);
  }

  if (typeValues.length !== files.length) {
    throw AppError.badRequest('documentTypes must match documents count');
  }

  const documents: AparikInquiryDocumentAttachment[] = [];
  const seenTypes = new Set<AparikDocumentTypeId>();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const typeRaw = typeValues[index];
    if (!isAparikDocumentTypeId(typeRaw)) {
      throw AppError.badRequest(`Invalid document type: ${typeRaw}`);
    }
    if (seenTypes.has(typeRaw)) {
      throw AppError.badRequest(`Duplicate document type: ${typeRaw}`);
    }
    seenTypes.add(typeRaw);

    if (file.size <= 0 || file.size > MAX_APARIK_DOCUMENT_BYTES) {
      throw AppError.badRequest(`Each document must be up to ${MAX_APARIK_DOCUMENT_BYTES} bytes`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = validateAparikDocumentBuffer(buffer, file.type || 'application/octet-stream');
    if (!contentType) {
      throw AppError.badRequest('Documents must be jpg, png, or pdf');
    }

    documents.push({
      type: typeRaw as AparikDocumentTypeId,
      filename: sanitizeFilename(file.name),
      contentType,
      content: buffer,
    });
  }

  if (!hasValidAparikDocumentSet([...seenTypes])) {
    throw AppError.badRequest(
      'Provide ID/passport and selfie (social card required for passport option)',
    );
  }

  return documents;
}

function buildFieldsFromFormData(formData: FormData) {
  return {
    productId: readRequiredString(formData, 'productId'),
    productSlug: readRequiredString(formData, 'productSlug'),
    productTitle: readRequiredString(formData, 'productTitle'),
    productPrice: readRequiredString(formData, 'productPrice'),
    currency: readRequiredString(formData, 'currency'),
    productImageUrl: readOptionalString(formData, 'productImageUrl'),
    color: readOptionalString(formData, 'color'),
    colorHex: readOptionalString(formData, 'colorHex'),
    variantTitle: readOptionalString(formData, 'variantTitle'),
    sku: readOptionalString(formData, 'sku'),
    firstName: readRequiredString(formData, 'firstName'),
    lastName: readRequiredString(formData, 'lastName'),
    email: readRequiredString(formData, 'email'),
    phone: readRequiredString(formData, 'phone'),
    bankId: readRequiredString(formData, 'bankId'),
    acceptedTerms: readBooleanFlag(formData, 'acceptedTerms') ? true : false,
  };
}

export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      throw AppError.badRequest('multipart/form-data is required');
    }

    const formData = await req.formData();

    let data;
    try {
      data = parseAparikInquiryFields(buildFieldsFromFormData(formData));
    } catch (error) {
      if (error instanceof ZodError) {
        throw AppError.badRequest(error.issues[0]?.message ?? 'Invalid inquiry payload');
      }
      throw error;
    }

    const documents = await parseDocuments(formData);
    const inquiryId = createInquiryId();

    await sendAparikProductInquiryEmail({
      inquiryId,
      productId: data.productId,
      productSlug: data.productSlug,
      productTitle: data.productTitle,
      productPrice: data.productPrice,
      currency: data.currency,
      productImageUrl: data.productImageUrl,
      color: data.color,
      colorHex: data.colorHex,
      variantTitle: data.variantTitle,
      sku: data.sku,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      bankId: data.bankId,
      documents,
    });

    logger.info('Aparik product inquiry submitted', {
      inquiryId,
      productId: data.productId,
      bankId: data.bankId,
      documentCount: documents.length,
    });

    return NextResponse.json(
      {
        data: {
          inquiryId,
        },
      },
      { status: 201 },
    );
  });
}
