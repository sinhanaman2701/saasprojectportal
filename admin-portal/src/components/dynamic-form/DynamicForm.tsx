"use client";
import { useState, useCallback } from "react";
import FieldRenderer from "./FieldRenderer";
import StepperBar from "./StepperBar";

export type TenantField = {
  id: number;
  tenantId: number;
  key: string;
  label: string;
  type: string;
  section: string;
  order: number;
  required: boolean;
  placeholder: string | null;
  options: any;
  validation: any;
  showInList: boolean;
  maxLength?: number; // Character limit for TEXT fields
  imageWidth?: number;  // Target width in pixels (IMAGE/IMAGE_MULTI only)
  imageHeight?: number; // Target height in pixels (IMAGE/IMAGE_MULTI only)
  allowCaption?: boolean; // Enable caption input for IMAGE/IMAGE_MULTI
};

type Props = {
  fields: TenantField[];
  initialData?: Record<string, any>;
  initialAttachments?: Record<string, any[]>;
  tenantSlug: string;
  projectId?: number; // if editing
  onSubmit: (data: Record<string, any>, attachments: Record<string, any[]>, isDraft: boolean) => Promise<void>;
};

export type FormValues = Record<string, any>;
export type FormAttachments = Record<string, { url?: string; file?: File; caption?: string; order: number; isCover: boolean }[]>;

export default function DynamicForm({ fields, initialData = {}, initialAttachments = {}, tenantSlug, projectId, onSubmit }: Props) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>(() => {
    const v: FormValues = {};
    for (const f of fields) {
      if (initialData[f.key] !== undefined) v[f.key] = initialData[f.key];
      else if (f.type === "CHECKBOX") v[f.key] = false;
      else if (f.type === "MULTISELECT") v[f.key] = [];
      else v[f.key] = "";
    }
    return v;
  });
  const [attachments, setAttachments] = useState<FormAttachments>(() => {
    const a: FormAttachments = {};
    for (const key of Object.keys(initialAttachments)) {
      console.log(`Initializing attachment for ${key}:`, initialAttachments[key]);
      a[key] = initialAttachments[key].map((item: any) => ({
        url: item.url,
        caption: item.caption,
        file: undefined,
        order: item.order,
        isCover: item.isCover ?? false,
      }));
    }
    console.log('Initial attachments state:', a);
    return a;
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  // Group fields by section and sort by first field's order in each section
  const sections = [...new Set(fields.map((f) => f.section))];
  sections.sort((a, b) => {
    const aFirstField = fields.find((f) => f.section === a);
    const bFirstField = fields.find((f) => f.section === b);
    return (aFirstField?.order || 0) - (bFirstField?.order || 0);
  });
  const stepLabels = sections.map((s) => ({ label: s }));

  const sectionFields = (section: string) =>
    fields.filter((f) => f.section === section).sort((a, b) => a.order - b.order);

  const currentSection = sections[step - 1];
  const currentFields = currentSection ? sectionFields(currentSection) : [];

  const setValue = useCallback((key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }, []);

  const setAttachment = useCallback((fieldKey: string, items: FormAttachments[string]) => {
    setAttachments((prev) => ({ ...prev, [fieldKey]: items }));
  }, []);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    for (const f of currentFields) {
      const val = values[f.key];
      if (f.required) {
        if (f.type === "IMAGE_MULTI" || f.type === "IMAGE" || f.type === "FILE") {
          const att = attachments[f.key];
          if (!att || att.length === 0) {
            errs[f.key] = `${f.label} is required`;
          }
        } else if (val === undefined || val === null || val === "") {
          errs[f.key] = `${f.label} is required`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [currentFields, values, attachments]);

  const handleNext = () => {
    if (validate()) {
      setStep((s) => Math.min(s + 1, sections.length));
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (isDraft: boolean) => {
    // Drafts bypass required-field validation — the backend handles partial validation.
    // Only enforce required fields for full published listings.
    if (!isDraft) {
      const allErrs: Record<string, string> = {};
      for (const f of fields) {
        const val = values[f.key];
        if (f.required) {
          if (f.type === "IMAGE_MULTI" || f.type === "IMAGE" || f.type === "FILE") {
            const att = attachments[f.key];
            if (!att || att.length === 0) allErrs[f.key] = `${f.label} is required`;
          } else if (val === undefined || val === null || val === "") {
            allErrs[f.key] = `${f.label} is required`;
          }
        }
      }
      if (Object.keys(allErrs).length > 0) {
        setErrors(allErrs);
        // Jump to first section with errors
        const firstErrField = fields.find((f) => allErrs[f.key]);
        if (firstErrField) setStep(sections.indexOf(firstErrField.section) + 1);
        return;
      }
    }

    setLoading(true);
    setGlobalError("");
    try {
      await onSubmit(values, attachments, isDraft);
    } catch (err: any) {
      setGlobalError(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = sections.length;

  return (
    <div>
      <StepperBar
        step={step}
        totalSteps={totalSteps}
        labels={stepLabels}
        onStepClick={(n) => setStep(n)}
      />

      {globalError && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg mb-6">
          {globalError}
        </div>
      )}

      <div className="space-y-6">
        {currentFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            attachmentItems={attachments[field.key] || []}
            error={errors[field.key]}
            onChange={(val) => setValue(field.key, val)}
            onAttachmentChange={(items) => setAttachment(field.key, items)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="px-6 h-11 flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F3EF] text-[#78716C] text-sm font-medium transition-all"
          >
            Back
          </button>
        )}
        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-[#C9A84C] hover:bg-[#8B6914] text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md"
          >
            Continue
          </button>
        ) : (
          <div className="flex-1 flex gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg border border-[#E7E5E4] bg-white hover:bg-[#F5F3EF] text-[#78716C] text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-[#C9A84C] hover:bg-[#8B6914] text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {loading ? "Publishing..." : "Publish Listing"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
