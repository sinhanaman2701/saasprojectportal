import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { storage } from '../storage';
import { ProcessedFile } from '../storage/types';

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure base upload dir exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export interface TenantFileContext {
  tenantSlug: string;
  tenantId: number;
}

/**
 * Process image with sharp: auto-rotate, crop/resize to target dimensions, output as JPEG
 */
async function processImage(
  file: Express.Multer.File,
  targetWidth?: number,
  targetHeight?: number
): Promise<Buffer> {
  // Validate buffer
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error(`Empty file buffer for ${file.originalname}`);
  }

  let processor = sharp(file.buffer);

  // Get metadata to check if it's a valid image
  try {
    const metadata = await processor.metadata();
    console.log(`Processing ${file.originalname}: format=${metadata.format}, size=${file.buffer.length} bytes`);
  } catch (metaErr: any) {
    throw new Error(`Invalid image format for ${file.originalname}: ${metaErr.message}`);
  }

  processor = processor.rotate(); // Auto-rotate from EXIF

  if (targetWidth && targetHeight) {
    // Crop and resize to exact dimensions
    processor = processor.resize(targetWidth, targetHeight, {
      fit: 'cover',      // Crop to fill exact dimensions
      position: 'center', // Center the crop
    });
  }

  // Always output as JPEG for consistency
  return await processor.jpeg({ quality: 85 }).toBuffer();
}

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

/**
 * Validates file MIME type and throws error if not allowed
 */
function validateFileType(file: Express.Multer.File): void {
  const mimeType = file.mimetype.toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `File type '${file.mimetype}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
}

/**
 * Creates a multer instance that processes images and uploads via storage abstraction.
 * Returns public URLs (local or S3 depending on STORAGE_TYPE env var).
 */
export function createTenantUpload(tenant: TenantFileContext) {
  const storage = multer.memoryStorage(); // Store in memory for processing

  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
    fileFilter: (req, file, cb) => {
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
        return cb(new Error(`File type '${file.mimetype}' is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
      }
      cb(null, true);
    },
  });

  return upload;
}

/**
 * Process uploaded files and store via storage abstraction.
 * Fetches field dimensions and processes images accordingly.
 */
export async function processUploadedFiles(
  files: Express.Multer.File[],
  fieldKeys: string[],
  tenantId: number,
  prisma: any,
  captions?: Record<string, string[]>
): Promise<Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]>> {
  const attachments: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = {};

  for (const fieldKey of fieldKeys) {
    const matchingFiles = files.filter((f) => f.fieldname === fieldKey);

    // Fetch field config from DB
    const field = await prisma.tenantField.findFirst({
      where: { tenantId, key: fieldKey },
      select: { imageWidth: true, imageHeight: true, allowCaption: true },
    });

    attachments[fieldKey] = [];

    for (let idx = 0; idx < matchingFiles.length; idx++) {
      const file = matchingFiles[idx];

      // Process image (crop/resize if dimensions specified)
      const processedBuffer = await processImage(
        file,
        field?.imageWidth || undefined,
        field?.imageHeight || undefined
      );

      // Create processed file object
      const processedFile: ProcessedFile = {
        buffer: processedBuffer,
        originalName: file.originalname,
        mimeType: 'image/jpeg',
        size: processedBuffer.length,
      };

      // Upload via storage abstraction
      const publicUrl = await storage.upload(processedFile, tenantId, fieldKey);

      attachments[fieldKey].push({
        url: publicUrl,
        caption: field?.allowCaption ? (captions?.[fieldKey]?.[idx] || undefined) : undefined,
        order: idx,
        isCover: idx === 0,
      });
    }
  }

  return attachments;
}

export function getUploadBaseUrl(req: Request, tenantSlug: string, tenantId?: number): string {
  // Use tenantId for storage path (matches actual directory structure: uploads/{tenantId}/{fieldKey}/)
  // The fieldKey is appended by the caller when constructing the full URL
  const storagePath = tenantId ? String(tenantId) : tenantSlug;
  return `${req.protocol}://${req.get('host')}/uploads/${storagePath}/`;
}
