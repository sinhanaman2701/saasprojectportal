"use client";
import React, { useRef, useState } from "react";
import { Upload, X, Star, StarOff, FileText, CheckCircle, GripVertical, Plus, MapPin, Home, Building, Plane, Train, Bus, Pill, Utensils, ShoppingBag } from "lucide-react";
import type { TenantField, FormAttachments } from "./DynamicForm";
import ImageCropper from "./ImageCropper";

const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none";
const textareaClass = `${inputClass} resize-none overflow-hidden`;
const errorClass = "text-xs text-[#DC2626] mt-1.5";
const labelClass = "text-sm font-medium text-[#1C1917] mb-1.5 block";

type Props = {
  field: TenantField;
  value: unknown;
  attachmentItems: FormAttachments[string];
  error?: string;
  onChange: (val: unknown) => void;
  onAttachmentChange: (items: FormAttachments[string]) => void;
};

// ─── Image Uploader (shared between IMAGE and IMAGE_MULTI) ───────────────────

type ImageItem = { url?: string; file?: File; caption?: string; order: number; isCover: boolean };

function ImageUploader({
  field,
  items,
  onChange,
}: {
  field: TenantField;
  items: { url?: string; file?: File; caption?: string; order: number; isCover: boolean }[];
  onChange: (items: { url?: string; file?: File; caption?: string; order: number; isCover: boolean }[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maxImages = field.type === "IMAGE" ? 1 : 10;
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Cleanup object URLs on unmount (memory leak fix)
  React.useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.url && item.url.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [items]);

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File(
      [croppedBlob],
      pendingFile!.name.replace(/\.[^/.]+$/, '.jpg'),
      { type: 'image/jpeg' }
    );
    const newItems: ImageItem[] = [{
      url: URL.createObjectURL(croppedFile),
      file: croppedFile,
      order: items.length,
      isCover: items.length === 0,
    }];
    onChange([...items, ...newItems]);
    setCropModalOpen(false);
    setPendingFile(null);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - items.length;
    const toAdd = Array.from(files).slice(0, remaining);

    // Check if field has dimensions - if so, show crop modal for each file
    const hasDimensions = field.imageWidth && field.imageHeight;

    if (hasDimensions && toAdd.length > 0) {
      // Show crop modal for the first file (IMAGE fields only allow 1 anyway)
      setPendingFile(toAdd[0]);
      setCropModalOpen(true);
      return;
    }

    // No crop needed - add files directly
    const newItems: ImageItem[] = toAdd.map((file, i) => ({
      url: URL.createObjectURL(file),
      file,
      order: items.length + i,
      isCover: items.length === 0 && i === 0,
    }));
    onChange([...items, ...newItems]);
  };

  const removeItem = (idx: number) => {
    const updated = items.filter((_, i) => i !== idx);
    if (updated.length > 0 && !updated.some((i) => i.isCover)) {
      updated[0].isCover = true;
    }
    onChange(updated);
  };

  const setCover = (idx: number) => {
    // Track cover by flag, not position
    const updated = items.map((item, i) => ({
      ...item,
      isCover: i === idx,
      order: i,
    }));
    onChange(updated);
  };

  const moveItem = (from: number, to: number) => {
    if (from === to) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    updated.forEach((item, i) => (item.order = i));
    onChange(updated);
  };

  const updateCaption = (idx: number, caption: string) => {
    const updated = items.map((item, i) => ({
      ...item,
      caption: i === idx ? caption : item.caption,
    }));
    onChange(updated);
  };

  return (
    <div>
      {cropModalOpen && pendingFile && field.imageWidth && field.imageHeight && (
        <ImageCropper
          file={pendingFile}
          targetWidth={field.imageWidth}
          targetHeight={field.imageHeight}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropModalOpen(false);
            setPendingFile(null);
          }}
        />
      )}

      <div className="grid grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1"
          >
            <div
              className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                item.isCover ? "border-[#C9A84C]" : "border-[#E7E5E4]"
              }`}
            >
              <img
                src={item.url}
                alt={`Image ${idx + 1}`}
                className="w-full h-24 object-cover"
              />
              {item.isCover && (
                <div className="absolute top-1 left-1 bg-[#C9A84C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star size={7} /> Cover
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-1 flex gap-1">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => moveItem(idx, idx - 1)}
                    className="flex-1 bg-white/80 hover:bg-white text-[9px] font-bold rounded py-0.5"
                  >
                    ←
                  </button>
                )}
                {idx < items.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveItem(idx, idx + 1)}
                    className="flex-1 bg-white/80 hover:bg-white text-[9px] font-bold rounded py-0.5"
                  >
                    →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="flex-1 bg-red-500/80 hover:bg-red-500 text-white text-[9px] font-bold rounded py-0.5"
                >
                  ✕
                </button>
                {!item.isCover && (
                  <button
                    type="button"
                    onClick={() => setCover(idx)}
                    className="flex-1 bg-white/80 hover:bg-white text-[9px] font-bold rounded py-0.5 flex items-center justify-center gap-0.5"
                  >
                    <StarOff size={7} />
                  </button>
                )}
              </div>
            </div>
            {field.allowCaption && (
              <input
                type="text"
                value={item.caption || ''}
                onChange={(e) => updateCaption(idx, e.target.value)}
                placeholder="Add a caption..."
                className="text-xs border border-[#E7E5E4] rounded px-2 py-1 w-full focus:border-[#C9A84C] focus:outline-none"
                maxLength={500}
              />
            )}
          </div>
        ))}

        {items.length < maxImages && (
          <label className="relative rounded-xl border-2 border-dashed border-[#E7E5E4] flex flex-col items-center justify-center h-24 cursor-pointer hover:border-[#C9A84C] hover:bg-[#FAFAF8] transition-all">
            <Upload size={16} className="text-[#A8A29E] mb-1" />
            <span className="text-[10px] text-[#A8A29E] font-medium">
              {field.type === "IMAGE" ? "Add image" : "Add images"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple={field.type === "IMAGE_MULTI"}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {items.length >= maxImages && (
        <p className="text-xs text-[#A8A29E] mt-1.5">
          Maximum {maxImages} image{maxImages > 1 ? "s" : ""} reached
        </p>
      )}
    </div>
  );
}

// ─── File Uploader ──────────────────────────────────────────────────────────

function FileUploader({
  items,
  onChange,
}: {
  items: { url?: string; file?: File; order: number; isCover: boolean }[];
  onChange: (items: { url?: string; file?: File; order: number; isCover: boolean }[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount (memory leak fix)
  React.useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.url && item.url.startsWith('blob:')) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [items]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems = Array.from(files).map((file, i) => ({
      url: URL.createObjectURL(file),
      file,
      order: items.length + i,
      isCover: false,
    }));
    onChange([...items, ...newItems]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {items.length > 0 && (
        <div className="space-y-2 mb-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-[#FAFAF8] rounded-lg px-3 py-2 border border-[#E7E5E4]"
            >
              <FileText size={14} className="text-[#78716C] shrink-0" />
              <span className="flex-1 text-sm text-[#1C1917] truncate">
                {item.file?.name || item.url}
              </span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-[#DC2626] hover:bg-red-50 p-1 rounded"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center justify-center gap-2 h-11 rounded-lg border-2 border-dashed border-[#E7E5E4] cursor-pointer hover:border-[#C9A84C] hover:bg-[#FAFAF8] transition-all text-sm text-[#78716C]">
        <Upload size={14} />
        <span>Choose file{items.length > 0 ? "s" : ""}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>
    </div>
  );
}

// ─── Date Range Picker ──────────────────────────────────────────────────────

function DateRangePicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [start, end] = (value || "").split(" to ");
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={start || ""}
        onChange={(e) => onChange(e.target.value ? `${e.target.value} to ${end || ""}` : "")}
        className={inputClass}
      />
      <span className="text-[#78716C] text-sm shrink-0">to</span>
      <input
        type="date"
        value={end || ""}
        onChange={(e) => onChange(start ? `${start} to ${e.target.value}` : "")}
        className={inputClass}
      />
    </div>
  );
}

// ─── Main FieldRenderer ─────────────────────────────────────────────────────

export default function FieldRenderer({ field, value, attachmentItems, error, onChange, onAttachmentChange }: Props) {
  // Normalize options: handle both string arrays and {label, value} objects
  const rawOptions: any[] = field.options
    ? typeof field.options === "string"
      ? JSON.parse(field.options)
      : field.options
    : [];

  const parsedOptions: Array<{ label: string; value: string }> = rawOptions.map((opt, idx) => {
    if (typeof opt === "string") {
      return { label: opt, value: opt }; // Preserve original string for backend validation
    } else if (opt && typeof opt === "object") {
      return { label: opt.label || opt.value, value: opt.value || opt.label };
    }
    return { label: `Option ${idx + 1}`, value: `opt_${idx}` };
  });

  const renderField = () => {
    switch (field.type) {
      case "TEXT": {
        // TEXT uses auto-expanding textarea
        const ref = useRef<HTMLTextAreaElement>(null);
        const maxLength = field.maxLength;
        const currentValue = typeof value === "string" ? value : "";
        const charCount = currentValue.length;
        const isNearLimit = maxLength && charCount >= maxLength * 0.9;
        const isAtLimit = maxLength && charCount >= maxLength;

        const adjust = () => {
          if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = ref.current.scrollHeight + "px";
          }
        };

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          const newValue = e.target.value;
          if (maxLength && newValue.length > maxLength) {
            // Truncate to max length
            onChange(newValue.slice(0, maxLength));
          } else {
            onChange(newValue);
          }
          setTimeout(adjust, 0);
        };

        return (
          <div>
            <textarea
              ref={ref}
              value={currentValue}
              onChange={handleChange}
              placeholder={field.placeholder || ""}
              rows={1}
              className={textareaClass}
              style={{ height: "auto", minHeight: "44px" }}
            />
            {maxLength && (
              <p className={`text-xs mt-1.5 text-right transition-colors ${
                isAtLimit ? "text-[#DC2626]" : isNearLimit ? "text-[#D97706]" : "text-[#A8A29E]"
              }`}>
                {charCount}/{maxLength}
              </p>
            )}
          </div>
        );
      }

      case "NUMBER":
      case "PRICE":
      case "AREA":
        return (
          <input
            type="number"
            value={typeof value === "number" || typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className={inputClass}
          />
        );

      case "SELECT":
        return (
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{field.placeholder || "Select an option"}</option>
            {parsedOptions.map((opt, idx) => (
              <option key={`${opt.value}-${idx}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "MULTISELECT": {
        const selected: string[] = Array.isArray(value) ? value : [];
        const toggle = (optValue: string) => {
          if (selected.includes(optValue)) {
            onChange(selected.filter((v) => v !== optValue));
          } else {
            onChange([...selected, optValue]);
          }
        };

        // Icon mapping for property amenities
        const iconMap: Record<string, React.ReactNode> = {
          'CCTV Cameras': <CheckCircle size={16} />,
          'Reserved Parking': <CheckCircle size={16} />,
          '24/7 Security': <CheckCircle size={16} />,
          'Power Backup': <CheckCircle size={16} />,
          'Lift': <CheckCircle size={16} />,
          'Gym': <CheckCircle size={16} />,
          'Swimming Pool': <CheckCircle size={16} />,
          'Garden': <CheckCircle size={16} />,
          'Club House': <CheckCircle size={16} />,
          'Children Play Area': <CheckCircle size={16} />,
        };

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {parsedOptions.map((opt, idx) => {
              const isSelected = selected.includes(opt.value);
              const Icon = iconMap[opt.label];
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                    isSelected
                      ? "bg-[#C9A84C] text-white border-[#C9A84C]"
                      : "bg-white text-[#78716C] border-[#E7E5E4] hover:border-[#C9A84C]"
                  }`}
                >
                  <span className="shrink-0">{Icon || <CheckCircle size={16} />}</span>
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        );
      }

      case "CHECKBOX":
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-5 h-5 rounded border-[#E7E5E4] text-[#C9A84C] focus:ring-[#C9A84C]"
            />
            <span className="text-sm text-[#78716C]">{field.placeholder || "Yes"}</span>
          </label>
        );

      case "LOCATION":
        // Check if this is a nearby places field (stores array of {category, distance, unit})
        const isNearbyPlaces = field.key === 'nearbyPlaces';
        const nearbyPlacesValue = Array.isArray(value) ? value : [];

        if (isNearbyPlaces) {
          // Icon mapping for nearby places
          const nearbyIconMap: Record<string, React.ReactNode> = {
            'Hospital': <Pill size={16} />,
            'School': <Home size={16} />,
            'Shopping Mall': <ShoppingBag size={16} />,
            'Airport': <Plane size={16} />,
            'Railway Station': <Train size={16} />,
            'Metro Station': <Train size={16} />,
            'Bus Stand': <Bus size={16} />,
            'Bank': <Building size={16} />,
            'Pharmacy': <Pill size={16} />,
            'Restaurant': <Utensils size={16} />,
          };

          const defaultCategories = [
            'Hospital', 'School', 'Shopping Mall', 'Airport',
            'Railway Station', 'Metro Station', 'Bus Stand',
            'Bank', 'Pharmacy', 'Restaurant',
          ];

          const addPlace = (category: string) => {
            if (!nearbyPlacesValue.find((p: any) => p.category === category)) {
              onChange([...nearbyPlacesValue, { category, distance: '', unit: 'km' }]);
            }
          };

          const updatePlace = (index: number, field: string, val: string) => {
            const updated = [...nearbyPlacesValue];
            updated[index] = { ...updated[index], [field]: val };
            onChange(updated);
          };

          const removePlace = (index: number) => {
            onChange(nearbyPlacesValue.filter((_, i) => i !== index));
          };

          return (
            <div className="space-y-3">
              {nearbyPlacesValue.length > 0 && (
                <div className="space-y-2">
                  {nearbyPlacesValue.map((place: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#FAFAF8] rounded-lg px-3 py-2 border border-[#E7E5E4]">
                      <span className="text-[#78716C] shrink-0">
                        {nearbyIconMap[place.category] || <MapPin size={16} />}
                      </span>
                      <span className="flex-1 text-sm font-medium text-[#1C1917]">{place.category}</span>
                      <input
                        type="number"
                        value={place.distance || ''}
                        onChange={(e) => updatePlace(idx, 'distance', e.target.value)}
                        placeholder="Distance"
                        className="w-20 h-8 rounded border border-[#E7E5E4] px-2 text-sm text-[#1C1917] focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] outline-none"
                      />
                      <select
                        value={place.unit || 'km'}
                        onChange={(e) => updatePlace(idx, 'unit', e.target.value)}
                        className="h-8 rounded border border-[#E7E5E4] bg-white px-2 text-sm text-[#1C1917] focus:border-[#C9A84C] outline-none"
                      >
                        <option value="km">km</option>
                        <option value="m">m</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removePlace(idx)}
                        className="text-[#DC2626] hover:bg-red-50 p-1 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add buttons for unselected categories */}
              <div className="flex flex-wrap gap-2">
                {defaultCategories
                  .filter((cat) => !nearbyPlacesValue.find((p: any) => p.category === cat))
                  .map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => addPlace(cat)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-all"
                    >
                      <Plus size={14} />
                      {cat}
                    </button>
                  ))}
              </div>
            </div>
          );
        }

        // Standard LOCATION field (address + iframe)
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={(typeof value === "object" && value !== null && "address" in value) ? String(value.address || "") : ""}
              onChange={(e) => onChange({ address: e.target.value, iframe: (typeof value === "object" && value !== null && "iframe" in value) ? value.iframe : undefined })}
              placeholder={field.placeholder || "Enter location / address"}
              className={inputClass}
            />
            {(() => {
              const hasIframe = value && typeof value === "object" && "iframe" in value && value.iframe;
              return hasIframe ? (
                <textarea
                  value={String((value as Record<string, unknown>).iframe || "")}
                  onChange={(e) => onChange({ ...(value as Record<string, unknown>), iframe: e.target.value })}
                  placeholder="Google Maps embed iframe"
                  rows={2}
                  className={textareaClass}
                />
              ) : null;
            })()}
          </div>
        );

      case "IMAGE":
      case "IMAGE_MULTI":
        return (
          <ImageUploader
            field={field}
            items={attachmentItems as { url?: string; file?: File; order: number; isCover: boolean }[]}
            onChange={onAttachmentChange}
          />
        );

      case "FILE":
        return (
          <FileUploader
            items={attachmentItems as { url?: string; file?: File; order: number; isCover: boolean }[]}
            onChange={onAttachmentChange}
          />
        );

      case "DATERANGE":
        return (
          <DateRangePicker
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
            placeholder={field.placeholder || undefined}
          />
        );

      default:
        return (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            className={inputClass}
          />
        );
    }
  };

  return (
    <div>
      <label className={labelClass}>
        {field.label}
        {field.required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      {renderField()}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}
