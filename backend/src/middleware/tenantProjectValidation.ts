import { FieldType } from '@prisma/client';
import prisma from '../lib/prisma';

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
}

/**
 * Validates project data against a tenant's TenantField schema.
 * Returns { valid: boolean, errors: [{ field: key, message: string }] }
 */
export async function validateProjectData(
  tenantId: number,
  data: Record<string, unknown>,
  partial = false,
  attachments?: Record<string, { url: string; order: number; isCover: boolean }[]>
): Promise<ValidationResult> {
  const errors: FieldError[] = [];

  const fields = await prisma.tenantField.findMany({
    where: { tenantId },
    select: {
      key: true,
      label: true,
      type: true,
      required: true,
      options: true,
      validation: true,
    },
  });

  for (const field of fields) {
    const value = data[field.key];

    // For file fields, check attachments if no value in data
    const isFileField = field.type === 'IMAGE' || field.type === 'IMAGE_MULTI' || field.type === 'FILE';
    if (isFileField && field.required && !partial) {
      const hasFiles = attachments && attachments[field.key] && attachments[field.key].length > 0;
      if (!hasFiles && (!value || value === '')) {
        errors.push({ field: field.key, message: `${field.label} is required` });
        continue;
      }
      // If files exist, skip further validation for this field
      if (hasFiles) {
        continue;
      }
    }

    const fieldError = validateSingleField(field, value, partial);
    if (fieldError) {
      errors.push({ field: field.key, message: fieldError });
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateSingleField(
  field: {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    options: unknown;
    validation: unknown;
  },
  value: unknown,
  partial: boolean
): string | null {
  if (!partial && field.required) {
    if (value === undefined || value === null || value === '') {
      return `${field.label} is required`;
    }
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  switch (field.type) {
    case FieldType.TEXT: {
      if (typeof value !== 'string') {
        return `${field.label} must be text`;
      }
      // Check maxLength from field schema (new approach)
      const schemaMaxLength = (field as any).maxLength as number | null;
      if (schemaMaxLength && value.length > schemaMaxLength) {
        return `${field.label} must be at most ${schemaMaxLength} characters`;
      }
      // Also check legacy validation rules for backward compatibility
      const rules = field.validation as Array<{ rule: string; value: unknown }> | null;
      if (rules && Array.isArray(rules)) {
        for (const rule of rules) {
          if (rule.rule === 'minLength' && typeof rule.value === 'number' && value.length < rule.value) {
            return `${field.label} must be at least ${rule.value} characters`;
          }
          if (rule.rule === 'maxLength' && typeof rule.value === 'number' && value.length > rule.value) {
            return `${field.label} must be at most ${rule.value} characters`;
          }
          if (rule.rule === 'pattern' && typeof rule.value === 'string' && !new RegExp(rule.value).test(value)) {
            return `${field.label} format is invalid`;
          }
        }
      }
      break;
    }

    case FieldType.LOCATION: {
      // Check if this is a nearbyPlaces field (array of {category, distance, unit})
      if (field.key === 'nearbyPlaces') {
        if (Array.isArray(value)) {
          for (const place of value as any[]) {
            if (!place.category || typeof place.category !== 'string') {
              return `${field.label} each place must have a category`;
            }
            if (place.distance !== undefined && place.distance !== '' && isNaN(Number(place.distance))) {
              return `${field.label} distance must be a number`;
            }
            if (place.unit && !['km', 'm'].includes(place.unit)) {
              return `${field.label} unit must be 'km' or 'm'`;
            }
          }
        } else if (value !== null && value !== undefined && value !== '') {
          return `${field.label} must be a list of places`;
        }
      } else {
        // Standard LOCATION: object { address, iframe } or address string
        if (typeof value === 'object' && value !== null) {
          const loc = value as { address?: string; iframe?: string };
          if (loc.address && typeof loc.address !== 'string') {
            return `${field.label} address must be text`;
          }
          if (loc.iframe && typeof loc.iframe !== 'string') {
            return `${field.label} iframe must be text`;
          }
        } else if (typeof value === 'string') {
          // Simple string address is also valid
        } else {
          return `${field.label} must be a location string or object`;
        }
      }
      break;
    }

    case FieldType.NUMBER:
    case FieldType.PRICE:
    case FieldType.AREA: {
      const cleaned = String(value).replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num)) {
        return `${field.label} must be a valid number`;
      }
      const rules = field.validation as Array<{ rule: string; value: number }> | null;
      if (rules && Array.isArray(rules)) {
        for (const rule of rules) {
          if (rule.rule === 'min' && num < rule.value) {
            return `${field.label} must be at least ${rule.value}`;
          }
          if (rule.rule === 'max' && num > rule.value) {
            return `${field.label} must be at most ${rule.value}`;
          }
        }
      }
      break;
    }

    case FieldType.SELECT: {
      const options = field.options as Array<{ label: string; value: string }> | null;
      if (options && Array.isArray(options)) {
        const allowed = options.map((o) => (typeof o === 'string' ? o : o.value));
        if (!allowed.includes(String(value))) {
          return `${field.label} must be one of: ${allowed.join(', ')}`;
        }
      }
      break;
    }

    case FieldType.MULTISELECT: {
      if (!Array.isArray(value)) {
        return `${field.label} must be a list`;
      }
      const options = field.options as Array<{ label: string; value: string }> | null;
      if (options && Array.isArray(options)) {
        const allowed = options.map((o) => (typeof o === 'string' ? o : o.value));
        for (const v of value as unknown[]) {
          if (!allowed.includes(String(v))) {
            return `Invalid option selected for ${field.label}`;
          }
        }
      }
      break;
    }

    case FieldType.CHECKBOX:
      if (typeof value !== 'boolean') {
        return `${field.label} must be true or false`;
      }
      break;

    case FieldType.DATERANGE: {
      if (typeof value !== 'string') {
        return `${field.label} must be a date range string`;
      }
      const parts = value.split(' to ');
      if (parts.length !== 2) {
        return `${field.label} must be in "Start to End" date format`;
      }
      if (isNaN(Date.parse(parts[0])) || isNaN(Date.parse(parts[1]))) {
        return `${field.label} contains invalid dates`;
      }
      break;
    }

    // IMAGE, IMAGE_MULTI, FILE: skip — validated server-side after multer
    default:
      break;
  }

  return null;
}
