"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SuperadminHeader from "@/components/SuperadminHeader";
import StepperBar from "@/components/dynamic-form/StepperBar";
import { ArrowLeft, Check, Plus, X, GripVertical, Download, BarChart3, ExternalLink, Edit2, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none";

type WizardStep = 1 | 2 | 3 | 4 | 5;

type PortalField = {
  key: string;
  label: string;
  type: string;
  section: string;
  order: number;
  required: boolean;
  showInList: boolean;
  placeholder?: string;
  maxLength?: number;
  imageWidth?: number;
  imageHeight?: number;
  allowCaption?: boolean;
  options?: Array<{ label: string; value: string }>;
};

type SortableField = {
  id: number;
  key: string;
  label: string;
  type: string;
  section: string;
  order: number;
  required: boolean;
  showInList: boolean;
  placeholder: string | null;
  maxLength: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  allowCaption: boolean;
  options: Array<{ label: string; value: string }> | null;
};

type SectionItem = {
  name: string;
  fieldCount: number;
};

function SortableFieldPreview({ field }: { field: SortableField }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-[#FAFAF8] border border-[#E7E5E4] rounded-lg px-3 py-2.5"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-[#A8A29E] hover:text-[#78716C]">
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#1C1917] truncate">{field.label}</span>
          {field.required && <span className="text-[#DC2626] text-xs">*</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono text-[#78716C]">{field.key}</span>
          <span className="text-xs bg-white text-[#78716C] px-1.5 py-0.5 rounded border border-[#E7E5E4]">{field.type}</span>
        </div>
      </div>
    </div>
  );
}

function LogoPreview({ url }: { url: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return <span className="text-xs text-[#DC2626]">Invalid image URL</span>;
  }

  return (
    <img
      src={url}
      alt="Logo preview"
      className="max-h-16"
      onError={() => setError(true)}
    />
  );
}

export default function NewPortalPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdData, setCreatedData] = useState<{ slug: string; accessToken: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    adminEmail: "",
    adminPassword: "",
    adminName: "",
  });

  // Default fields (will be fetched from backend or shown as preview)
  const defaultFields: PortalField[] = [
    // Property Information
    { key: "projectName", label: "Project Name", type: "TEXT", section: "Property Information", order: 1, required: true, showInList: true, placeholder: "Enter project name" },
    { key: "location", label: "Location", type: "TEXT", section: "Property Information", order: 2, required: true, showInList: true, placeholder: "Enter location" },
    { key: "price", label: "Price", type: "PRICE", section: "Property Information", order: 3, required: true, showInList: true, placeholder: "" },
    { key: "bannerImages", label: "Banner Images", type: "IMAGE_MULTI", section: "Property Information", order: 4, required: true, showInList: false, placeholder: "" },
    // Project Details
    { key: "bedrooms", label: "Bedrooms", type: "NUMBER", section: "Project Details", order: 5, required: true, showInList: true, placeholder: "" },
    { key: "bathrooms", label: "Bathrooms", type: "NUMBER", section: "Project Details", order: 6, required: false, showInList: true, placeholder: "" },
    { key: "area", label: "Area", type: "AREA", section: "Project Details", order: 7, required: true, showInList: true, placeholder: "" },
    { key: "furnishing", label: "Furnishing", type: "SELECT", section: "Project Details", order: 8, required: true, showInList: true, placeholder: "", options: [{ label: "Unfurnished", value: "unfurnished" }, { label: "Semi-Furnished", value: "semi-furnished" }, { label: "Furnished", value: "furnished" }] },
    { key: "projectStatus", label: "Project Status", type: "SELECT", section: "Project Details", order: 9, required: true, showInList: true, placeholder: "", options: [{ label: "New Launch", value: "new_launch" }, { label: "Under Construction", value: "under_construction" }, { label: "Ready to Move", value: "ready_to_move" }] },
    { key: "description", label: "Description", type: "TEXT", section: "Project Details", order: 10, required: true, showInList: false, placeholder: "Enter project description" },
    { key: "communityAmenities", label: "Community Amenities", type: "IMAGE_MULTI", section: "Project Details", order: 11, required: false, showInList: false, placeholder: "" },
    { key: "propertyAmenities", label: "Property Amenities", type: "MULTISELECT", section: "Project Details", order: 12, required: false, showInList: true, placeholder: "", options: [{ label: "CCTV", value: "cctv" }, { label: "Parking", value: "parking" }, { label: "Security", value: "security" }, { label: "Power Backup", value: "power_backup" }, { label: "Lift", value: "lift" }, { label: "Gym", value: "gym" }, { label: "Pool", value: "pool" }, { label: "Garden", value: "garden" }, { label: "Club House", value: "club_house" }, { label: "Children Play Area", value: "children_play_area" }] },
    // Location & Attachments
    { key: "nearbyPlaces", label: "Nearby Places", type: "LOCATION", section: "Location & Attachments", order: 13, required: false, showInList: false, placeholder: "" },
    { key: "locationIframe", label: "Location Iframe", type: "TEXT", section: "Location & Attachments", order: 14, required: false, showInList: false, placeholder: "Paste Google Maps embed code" },
    { key: "brochure", label: "Brochure", type: "FILE", section: "Location & Attachments", order: 15, required: true, showInList: false, placeholder: "" },
  ];

  const [fields, setFields] = useState<SortableField[]>(
    defaultFields.map((f, i) => ({
      id: i + 1,
      key: f.key,
      label: f.label,
      type: f.type,
      section: f.section,
      order: f.order,
      required: f.required,
      showInList: f.showInList,
      placeholder: f.placeholder || null,
      maxLength: f.maxLength || null,
      imageWidth: null,
      imageHeight: null,
      allowCaption: false,
      options: f.options || null,
    }))
  );

  // Section management state - track sections explicitly so empty sections are visible
  const [sectionList, setSectionList] = useState<string[]>([
    "Property Information",
    "Project Details",
    "Location & Attachments"
  ]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: "" });

  // Empty section warning modal state
  const [showEmptySectionModal, setShowEmptySectionModal] = useState(false);
  const [emptySectionName, setEmptySectionName] = useState("");

  // Field modal state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<SortableField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    key: "", label: "", type: "TEXT", section: "", required: false, placeholder: "", showInList: true,
    options: null as Array<{ label: string; value: string }> | null,
    maxLength: "",
    imageWidth: "",
    imageHeight: "",
    allowCaption: false,
  });

  // Option editor state for SELECT/MULTISELECT
  const [optionItems, setOptionItems] = useState<Array<{ label: string; value: string }>>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const stepLabels = [
    { label: "Basics" },
    { label: "Branding" },
    { label: "Fields" },
    { label: "Admin" },
    { label: "Review" },
  ];

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(fields, oldIndex, newIndex);

    // Update order values
    const updated = reordered.map((f, i) => ({ ...f, order: i + 1 }));
    setFields(updated);
  };

  // Section management functions
  const getUniqueSections = () => {
    // Return sections from state (includes empty sections)
    return sectionList;
  };

  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({ name: "" });
    setShowSectionModal(true);
  };

  const openEditSection = (sectionName: string) => {
    setEditingSection(sectionName);
    setSectionForm({ name: sectionName });
    setShowSectionModal(true);
  };

  const handleSaveSection = () => {
    if (!sectionForm.name.trim()) {
      alert("Section name is required");
      return;
    }

    const trimmedName = sectionForm.name.trim();

    // Check for duplicates
    if (!editingSection && sectionList.includes(trimmedName)) {
      alert(`Section "${trimmedName}" already exists`);
      return;
    }
    if (editingSection && editingSection !== trimmedName && sectionList.includes(trimmedName)) {
      alert(`Section "${trimmedName}" already exists`);
      return;
    }

    if (editingSection) {
      // Rename section - update all fields in that section
      const updated = fields.map((f) =>
        f.section === editingSection ? { ...f, section: trimmedName } : f
      );
      setFields(updated);
      // Update section list
      setSectionList(sectionList.map((s) => s === editingSection ? trimmedName : s));
    } else {
      // Add new section to list
      setSectionList([...sectionList, trimmedName]);
    }

    setShowSectionModal(false);
  };

  const handleDeleteSection = (sectionName: string) => {
    const fieldCount = fields.filter((f) => f.section === sectionName).length;
    if (fieldCount > 0) {
      if (!confirm(`Delete section "${sectionName}" along with ${fieldCount} field(s)? This cannot be undone.`)) return;
      // Delete fields in that section
      const updated = fields.filter((f) => f.section !== sectionName);
      setFields(updated);
    }
    // Remove section from list
    setSectionList(sectionList.filter((s) => s !== sectionName));
  };

  // Field management functions
  const openAddField = (section: string) => {
    setEditingField(null);
    setFieldForm({ key: "", label: "", type: "TEXT", section, required: false, placeholder: "", showInList: true, maxLength: "", imageWidth: "", imageHeight: "", allowCaption: false, options: null });
    setOptionItems([]);
    setNewOptionLabel("");
    setNewOptionValue("");
    setShowFieldModal(true);
  };

  const openEditField = (field: SortableField) => {
    console.log("Editing field:", field);
    setEditingField(field);
    setFieldForm({
      key: field.key, label: field.label, type: field.type, section: field.section,
      required: field.required, placeholder: field.placeholder || "", showInList: field.showInList,
      options: field.options,
      maxLength: field.maxLength ? String(field.maxLength) : "",
      imageWidth: field.imageWidth ? String(field.imageWidth) : "",
      imageHeight: field.imageHeight ? String(field.imageHeight) : "",
      allowCaption: field.allowCaption,
    });
    if (field.options && Array.isArray(field.options)) {
      setOptionItems(field.options);
    } else {
      setOptionItems([]);
    }
    setNewOptionLabel("");
    setNewOptionValue("");
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    if (!fieldForm.label.trim() || !fieldForm.key.trim()) {
      alert("Label and Key are required");
      return;
    }

    const finalKey = fieldForm.key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const maxId = fields.length > 0 ? Math.max(...fields.map((f) => f.id)) : 0;

    if (editingField) {
      // Update existing field
      const updated = fields.map((f) =>
        f.id === editingField.id
          ? {
              ...f,
              label: fieldForm.label,
              type: fieldForm.type,
              section: fieldForm.section,
              required: fieldForm.required,
              placeholder: fieldForm.placeholder || null,
              showInList: fieldForm.showInList,
              maxLength: fieldForm.maxLength ? parseInt(fieldForm.maxLength, 10) : null,
              imageWidth: fieldForm.imageWidth ? parseInt(fieldForm.imageWidth, 10) : null,
              imageHeight: fieldForm.imageHeight ? parseInt(fieldForm.imageHeight, 10) : null,
              allowCaption: fieldForm.allowCaption,
              options: (fieldForm.type === "SELECT" || fieldForm.type === "MULTISELECT") && optionItems.length > 0 ? optionItems : null,
            }
          : f
      );
      setFields(updated);
    } else {
      // Add new field
      // Check if this field is being added to a newly created section (section has no fields yet)
      const sectionHasExistingFields = fields.some((f) => f.section === fieldForm.section);

      let fieldOrder: number;
      if (sectionHasExistingFields) {
        // Existing section: continue the order sequence within this section
        const maxOrderInSection = Math.max(
          ...fields.filter((f) => f.section === fieldForm.section).map((f) => f.order)
        );
        fieldOrder = maxOrderInSection + 1;
      } else {
        // New section (no fields yet): use max order across ALL fields + 100 to ensure section appears at bottom
        const maxFieldOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.order)) : 0;
        fieldOrder = maxFieldOrder + 100;
      }

      const newField: SortableField = {
        id: maxId + 1,
        key: finalKey,
        label: fieldForm.label,
        type: fieldForm.type,
        section: fieldForm.section,
        order: fieldOrder,
        required: fieldForm.required,
        showInList: fieldForm.showInList,
        maxLength: fieldForm.maxLength ? parseInt(fieldForm.maxLength, 10) : null,
        imageWidth: fieldForm.imageWidth ? parseInt(fieldForm.imageWidth, 10) : null,
        imageHeight: fieldForm.imageHeight ? parseInt(fieldForm.imageHeight, 10) : null,
        allowCaption: fieldForm.allowCaption,
        options: (fieldForm.type === "SELECT" || fieldForm.type === "MULTISELECT") && optionItems.length > 0 ? optionItems : null,
        placeholder: fieldForm.placeholder || null,
      };
      setFields([...fields, newField]);
    }

    setShowFieldModal(false);
  };

  const handleDeleteField = (fieldId: number) => {
    if (!confirm("Delete this field?")) return;
    const updated = fields.filter((f) => f.id !== fieldId);
    setFields(updated);
  };

  const handleAddOption = () => {
    if (!newOptionLabel.trim() || !newOptionValue.trim()) {
      alert("Please enter both label and value");
      return;
    }
    setOptionItems([...optionItems, { label: newOptionLabel.trim(), value: newOptionValue.trim() }]);
    setNewOptionLabel("");
    setNewOptionValue("");
  };

  const handleRemoveOption = (index: number) => {
    setOptionItems(optionItems.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep((currentStep + 1) as WizardStep);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as WizardStep);
  };

  const handleStepClick = (stepNum: number) => {
    if (stepNum < currentStep) {
      setCurrentStep(stepNum as WizardStep);
    }
  };

  const validateStep = (step: number): boolean => {
    setError("");
    switch (step) {
      case 1: // Basics
        if (!formData.name.trim()) {
          setError("Portal name is required");
          return false;
        }
        if (!formData.slug.trim()) {
          setError("Portal slug is required");
          return false;
        }
        if (!/^[a-z0-9-]+$/.test(formData.slug)) {
          setError("Slug must contain only lowercase letters, numbers, and hyphens");
          return false;
        }
        break;
      case 3: // Fields - check for empty sections
        for (const section of sectionList) {
          const fieldCount = fields.filter((f) => f.section === section).length;
          if (fieldCount === 0) {
            setError(`Section "${section}" is empty. Please add fields or remove the section.`);
            return false;
          }
        }
        break;
      case 4: // Admin
        if (!formData.adminEmail.trim()) {
          setError("Admin email is required");
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
          setError("Please enter a valid email address");
          return false;
        }
        if (!formData.adminPassword) {
          setError("Admin password is required");
          return false;
        }
        if (formData.adminPassword.length < 8) {
          setError("Password must be at least 8 characters");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNextWithValidation = () => {
    if (currentStep === 3) {
      // Check for empty sections
      const emptySection = sectionList.find((s) => fields.filter((f) => f.section === s).length === 0);
      if (emptySection) {
        setEmptySectionName(emptySection);
        setShowEmptySectionModal(true);
        return;
      }
    }
    if (validateStep(currentStep)) {
      handleNext();
    }
  };

  const persistFieldsToBackend = async (slug: string, token: string) => {
    // Sort fields by order and prepare for backend
    const sortedFields = [...fields].sort((a, b) => a.order - b.order);

    const fieldPayload = sortedFields.map((f, index) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      section: f.section,
      order: index + 1, // Re-index after sort
      required: f.required,
      showInList: f.showInList,
      placeholder: f.placeholder,
      maxLength: f.maxLength,
      imageWidth: f.imageWidth,
      imageHeight: f.imageHeight,
      allowCaption: f.allowCaption,
      options: f.options,
    }));

    try {
      const res = await fetch(`http://localhost:3002/admin/portals/${slug}/fields/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fields: fieldPayload }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
          console.error("Field persistence failed:", data);
          return false;
        }
        return true;
      } else {
        const text = await res.text();
        console.error("Non-JSON response from server:", text.substring(0, 200));
        return false;
      }
    } catch (error) {
      console.error("Field persistence error:", error);
      return false;
    }
  };

  const handleCreate = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("superadminToken");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      // Step 1: Create tenant
      const tenantRes = await fetch("http://localhost:3002/admin/portals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          logoUrl: formData.logoUrl || null,
        }),
      });

      const tenantData = await tenantRes.json();
      if (tenantData.status_code !== 201) {
        setError(tenantData.status_message || "Failed to create portal");
        setLoading(false);
        return;
      }

      const tenant = tenantData.response_data;
      const accessToken = tenant.accessToken;

      // Step 2: Persist field ordering to backend
      await persistFieldsToBackend(formData.slug, token);

      // Step 3: Create admin
      const adminRes = await fetch(`http://localhost:3002/admin/portals/${formData.slug}/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.adminEmail,
          password: formData.adminPassword,
          name: formData.adminName || null,
        }),
      });

      const adminData = await adminRes.json();
      if (adminData.status_code !== 201) {
        // Tenant created but admin failed - show recovery option
        setError(`Portal created but admin setup failed: ${adminData.status_message}. Admin will be created on management page.`);
        setCreatedData({ slug: formData.slug, accessToken });
        setLoading(false);
        return;
      }

      // Success
      setCreatedData({ slug: formData.slug, accessToken });
      setLoading(false);
    } catch {
      setError("Unable to connect to server");
      setLoading(false);
    }
  };

  const getFieldCountBySection = (section: string) => {
    return fields.filter((f) => f.section === section).length;
  };

  // Auto-redirect to management page after success
  useEffect(() => {
    if (createdData) {
      const timer = setTimeout(() => {
        window.location.href = `/admin/portals/${createdData.slug}`;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [createdData]);

  // Success State
  if (createdData) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <SuperadminHeader />
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 shadow-sm text-center">
            <div className="w-16 h-16 bg-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-semibold text-[#1C1917] mb-2">Portal Created Successfully!</h1>
            <p className="text-[#78716C] mb-8">
              {formData.name} is now ready to use.
            </p>

            <div className="bg-[#F5F3EF] rounded-lg p-4 mb-8 text-left">
              <h3 className="text-sm font-medium text-[#1C1917] mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <a
                  href={`/admin/portals/${createdData.slug}`}
                  className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#8B6914] transition-colors"
                >
                  <ExternalLink size={14} />
                  Manage Portal
                </a>
                <a
                  href={`http://localhost:3002/api/${createdData.slug}/postman.json`}
                  className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#8B6914] transition-colors"
                >
                  <Download size={14} />
                  Download Postman Collection
                </a>
                <a
                  href={`/admin/portals/${createdData.slug}`}
                  className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#8B6914] transition-colors"
                >
                  <BarChart3 size={14} />
                  View Analytics
                </a>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Link
                href="/admin/portals/new"
                className="h-11 px-6 bg-white border border-[#E7E5E4] hover:border-[#D6D3D1] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
              >
                Create Another
              </Link>
              <Link
                href={`/admin/portals/${createdData.slug}`}
                className="h-11 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
              >
                Go to Management
              </Link>
            </div>

            <p className="text-xs text-[#A8A29E] mt-6">
              Redirecting to management page in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <SuperadminHeader />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-[#78716C] hover:text-[#1C1917] mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to portals
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1C1917]">Create New Portal</h1>
          <p className="text-[#78716C] mt-1 text-sm">Set up a new tenant portal in 5 easy steps.</p>
        </div>

        <StepperBar step={currentStep} totalSteps={5} labels={stepLabels} onStepClick={handleStepClick} />

        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 shadow-sm">
          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-[#1C1917] mb-1">Portal Basics</h2>
                <p className="text-sm text-[#A8A29E] mb-6">Enter the basic information for your new portal.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                  Portal Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Kolte & Patil Developers"
                  className={inputClass}
                  autoFocus
                />
                <p className="text-xs text-[#A8A29E] mt-1.5">This is the display name for the tenant.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                  Portal Slug <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="koltepatil"
                  className={`${inputClass} font-mono`}
                />
                <p className="text-xs text-[#A8A29E] mt-1.5">
                  Used in URLs: <code className="bg-[#F5F3EF] px-1 py-0.5 rounded">projectportal.com/{formData.slug || "slug"}</code>
                </p>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Link
                  href="/admin"
                  className="h-11 px-6 bg-white border border-[#E7E5E4] hover:border-[#D6D3D1] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleNextWithValidation}
                  disabled={!formData.name || !formData.slug}
                  className="h-11 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  Next: Branding
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-[#1C1917] mb-1">Branding</h2>
                <p className="text-sm text-[#A8A29E] mb-6">Add your portal&apos;s branding elements.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                  Logo URL <span className="text-[#A8A29E]">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className={inputClass}
                  autoFocus
                />
                <p className="text-xs text-[#A8A29E] mt-1.5">Enter the URL of your logo image. Leave empty to add later.</p>
              </div>

              {formData.logoUrl && (
                <div>
                  <p className="text-xs text-[#A8A29E] mb-2">Preview:</p>
                  <div className="bg-[#F5F3EF] rounded-lg p-4 flex items-center justify-center min-h-[80px]">
                    <LogoPreview url={formData.logoUrl} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={handleBack}
                  className="h-11 px-6 bg-white border border-[#E7E5E4] hover:border-[#D6D3D1] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleNext}
                  className="h-11 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Next: Fields
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Fields */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-[#1C1917] mb-1">Field Schema</h2>
                  <p className="text-sm text-[#A8A29E]">Customize sections and fields for this portal.</p>
                </div>
                <button
                  onClick={openAddSection}
                  className="flex items-center gap-2 h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  <Plus size={14} /> Add Section
                </button>
              </div>

              <div className="bg-[#F5F3EF] rounded-lg p-4">
                <p className="text-sm text-[#78716C]">
                  <strong>Default:</strong> 15 fields across 3 sections. Add/remove sections and fields as needed.
                </p>
              </div>

              <div className="space-y-6">
                {sectionList.map((section) => {
                  const sectionFields = fields.filter((f) => f.section === section);
                  const isEmpty = sectionFields.length === 0;
                  return (
                    <div key={section} className={`group rounded-xl border ${isEmpty ? 'border-[#FECACA] bg-[#FEF2F2]' : 'border-[#E7E5E4]'} p-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-semibold uppercase tracking-wide ${isEmpty ? 'text-[#DC2626]' : 'text-[#1C1917]'}`}>{section}</h3>
                          <span className={`text-xs ${isEmpty ? 'text-[#DC2626]' : 'text-[#A8A29E]'}`}>
                            {isEmpty ? 'Empty - Add fields!' : `${sectionFields.length} field${sectionFields.length !== 1 ? 's' : ''}`}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditSection(section)}
                              className="p-1 hover:bg-[#F5F3EF] rounded-md transition-colors"
                              title="Rename section"
                            >
                              <Edit2 size={12} className="text-[#78716C]" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section)}
                              className="p-1 hover:bg-[#FEF2F2] rounded-md transition-colors"
                              title="Delete section"
                            >
                              <Trash2 size={12} className="text-[#DC2626]" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => openAddField(section)}
                          className={`flex items-center gap-1 text-xs font-medium transition-colors ${isEmpty ? 'text-[#DC2626] hover:text-[#991B1B]' : 'text-[#78716C] hover:text-[#C9A84C]'}`}
                        >
                          <Plus size={12} /> {isEmpty ? 'Add Field' : 'Add field'}
                        </button>
                      </div>
                      {isEmpty ? (
                        <div className="flex items-center gap-2 text-sm text-[#DC2626] py-4">
                          <span className="text-lg">⚠️</span>
                          <span>This section is empty. Click "Add Field" to add fields to this section.</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={sectionFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                              {sectionFields.map((field) => (
                                <div key={field.id} className="group/field relative">
                                  <SortableFieldPreview field={field} />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity bg-white rounded-md shadow-sm border border-[#E7E5E4] px-1 py-0.5">
                                    <button
                                      onClick={() => openEditField(field)}
                                      className="p-1 hover:bg-[#F5F3EF] rounded-md transition-colors"
                                      title="Edit field"
                                    >
                                      <Edit2 size={12} className="text-[#78716C]" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteField(field.id)}
                                      className="p-1 hover:bg-[#FEF2F2] rounded-md transition-colors"
                                      title="Delete field"
                                    >
                                      <Trash2 size={12} className="text-[#DC2626]" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={handleBack}
                  className="h-11 px-6 bg-white border border-[#E7E5E4] hover:border-[#D6D3D1] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleNextWithValidation}
                  className="h-11 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Next: Admin
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Admin */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-[#1C1917] mb-1">Admin Setup</h2>
                <p className="text-sm text-[#A8A29E] mb-6">Create the first administrator account for this portal.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                  Admin Email <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@koltepatil.com"
                  className={inputClass}
                  autoFocus
                />
                <p className="text-xs text-[#A8A29E] mt-1.5">This email will be used for login.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                  Admin Password <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="Min. 8 characters"
                  className={inputClass}
                />
                <p className="text-xs text-[#A8A29E] mt-1.5">Must be at least 8 characters.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                  Admin Name <span className="text-[#A8A29E]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  placeholder="Administrator"
                  className={inputClass}
                />
                <p className="text-xs text-[#A8A29E] mt-1.5">Display name for the admin account.</p>
              </div>

              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={handleBack}
                  className="h-11 px-6 bg-white border border-[#E7E5E4] hover:border-[#D6D3D1] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleNextWithValidation}
                  className="h-11 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-[#1C1917] mb-1">Review & Create</h2>
                <p className="text-sm text-[#A8A29E] mb-6">Review your configuration before creating the portal.</p>
              </div>

              <div className="bg-[#F5F3EF] rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-[#1C1917] mb-3">Portal Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#A8A29E]">Name:</span>
                      <span className="ml-2 text-[#1C1917]">{formData.name}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A29E]">Slug:</span>
                      <span className="ml-2 text-[#1C1917] font-mono">{formData.slug}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A29E]">Logo:</span>
                      <span className="ml-2 text-[#1C1917]">{formData.logoUrl || "Not set"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#E7E5E4] pt-4">
                  <h3 className="text-sm font-medium text-[#1C1917] mb-3">Admin Account</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#A8A29E]">Email:</span>
                      <span className="ml-2 text-[#1C1917]">{formData.adminEmail}</span>
                    </div>
                    <div>
                      <span className="text-[#A8A29E]">Name:</span>
                      <span className="ml-2 text-[#1C1917]">{formData.adminName || "Not set"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#E7E5E4] pt-4">
                  <h3 className="text-sm font-medium text-[#1C1917] mb-3">Field Configuration</h3>
                  <div className="text-sm">
                    <span className="text-[#A8A29E]">Fields:</span>
                    <span className="ml-2 text-[#1C1917]">{fields.length} fields across {sectionList.length} sections</span>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {sectionList.map((section) => (
                      <span key={section} className={`text-xs px-2 py-1 rounded border ${getFieldCountBySection(section) === 0 ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-white border-[#E7E5E4] text-[#78716C]'}`}>
                        {section}: {getFieldCountBySection(section)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={handleBack}
                  className="h-11 px-6 bg-white border border-[#E7E5E4] hover:border-[#D6D3D1] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="h-11 px-8 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Create Portal
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty Section Warning Modal */}
      {showEmptySectionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#E7E5E4] w-full max-w-md shadow-xl">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1C1917]">Empty Section</h3>
                  <p className="text-sm text-[#78716C]">Section "{emptySectionName}" has no fields</p>
                </div>
              </div>
              <p className="text-sm text-[#78716C] mb-6">
                Sections cannot be empty. Please add at least one field to this section or remove it before continuing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEmptySectionModal(false);
                    handleDeleteSection(emptySectionName);
                  }}
                  className="flex-1 h-10 bg-white border border-[#E7E5E4] hover:border-[#DC2626] text-[#DC2626] font-medium rounded-lg transition-colors text-sm"
                >
                  Remove Section
                </button>
                <button
                  onClick={() => {
                    setShowEmptySectionModal(false);
                    openAddField(emptySectionName);
                  }}
                  className="flex-1 h-10 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#E7E5E4] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
              <h3 className="font-semibold text-[#1C1917]">{editingSection ? "Edit Section" : "Add Section"}</h3>
              <button onClick={() => setShowSectionModal(false)} className="p-1 hover:bg-[#F5F3EF] rounded-md">
                <X size={18} className="text-[#78716C]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Section Name *</label>
                <input
                  type="text"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveSection();
                    }
                  }}
                  placeholder="e.g. Legal Information"
                  className={inputClass}
                  autoFocus
                />
                <p className="text-xs text-[#A8A29E] mt-1">This will group related fields together in the form.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E5E4] bg-[#FAFAF8] rounded-b-xl">
              <button
                onClick={() => setShowSectionModal(false)}
                className="h-9 px-4 bg-white border border-[#E7E5E4] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
                disabled={!sectionForm.name.trim()}
                className="h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {editingSection ? "Update Section" : "Add Section"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#E7E5E4] w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4] sticky top-0 bg-white">
              <h3 className="font-semibold text-[#1C1917]">{editingField ? "Edit Field" : "Add Field"}</h3>
              <button onClick={() => setShowFieldModal(false)} className="p-1 hover:bg-[#F5F3EF] rounded-md">
                <X size={18} className="text-[#78716C]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Label *</label>
                  <input
                    type="text"
                    value={fieldForm.label}
                    onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                    placeholder="Project Name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Field Key</label>
                  <input
                    type="text"
                    value={fieldForm.key}
                    onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                    placeholder="project_name"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Type *</label>
                  <select
                    value={fieldForm.type}
                    onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value })}
                    className={inputClass}
                  >
                    {["TEXT", "NUMBER", "SELECT", "MULTISELECT", "IMAGE", "IMAGE_MULTI", "FILE", "CHECKBOX", "LOCATION", "PRICE", "AREA", "DATERANGE"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Section *</label>
                  <select
                    value={fieldForm.section}
                    onChange={(e) => setFieldForm({ ...fieldForm, section: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select section</option>
                    {getUniqueSections().map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {(fieldForm.type === "SELECT" || fieldForm.type === "MULTISELECT") && (
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Options</label>
                  <div className="border border-[#E7E5E4] rounded-lg p-3 bg-[#FAFAF8]">
                    {optionItems.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {optionItems.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white rounded border border-[#E7E5E4] px-3 py-2">
                            <span className="flex-1 text-sm text-[#1C1917]">{opt.label}</span>
                            <span className="text-xs font-mono text-[#78716C] bg-[#F5F3EF] px-1.5 py-0.5 rounded">{opt.value}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1 hover:bg-[#FEF2F2] rounded"
                            >
                              <X size={14} className="text-[#DC2626]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        placeholder="Label (e.g., 2 BHK)"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        placeholder="Value (e.g., 2bhk)"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="mt-2 flex items-center gap-1.5 text-xs text-[#C9A84C] hover:text-[#8B6914] font-medium"
                    >
                      <Plus size={12} /> Add option
                    </button>
                  </div>
                </div>
              )}

              {fieldForm.type !== "IMAGE" && fieldForm.type !== "IMAGE_MULTI" && (
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Placeholder</label>
                  <input
                    type="text"
                    value={fieldForm.placeholder}
                    onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                    placeholder="e.g. Enter project name"
                    className={inputClass}
                  />
                </div>
              )}

              {fieldForm.type === "TEXT" && (
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Character Limit (optional)</label>
                  <input
                    type="number"
                    value={fieldForm.maxLength}
                    onChange={(e) => setFieldForm({ ...fieldForm, maxLength: e.target.value })}
                    placeholder="e.g. 200"
                    min="1"
                    className={inputClass}
                  />
                  <p className="text-xs text-[#A8A29E] mt-1">Maximum characters allowed for this text field.</p>
                </div>
              )}

              {(fieldForm.type === "IMAGE" || fieldForm.type === "IMAGE_MULTI") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Image Dimensions (optional)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <input
                          type="number"
                          value={fieldForm.imageWidth || ""}
                          onChange={(e) => setFieldForm({ ...fieldForm, imageWidth: e.target.value })}
                          placeholder="Width (e.g. 360)"
                          min="1"
                          max="4096"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={fieldForm.imageHeight || ""}
                          onChange={(e) => setFieldForm({ ...fieldForm, imageHeight: e.target.value })}
                          placeholder="Height (e.g. 270)"
                          min="1"
                          max="4096"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#A8A29E] mt-1.5">
                      {fieldForm.imageWidth && fieldForm.imageHeight
                        ? `Images will be cropped to ${fieldForm.imageWidth} × ${fieldForm.imageHeight} px`
                        : 'Leave empty for original size (no crop)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowCaption"
                      checked={fieldForm.allowCaption}
                      onChange={(e) => setFieldForm({ ...fieldForm, allowCaption: e.target.checked })}
                      className="w-4 h-4 rounded border-[#E7E5E4] text-[#C9A84C] focus:ring-[#C9A84C]"
                    />
                    <label htmlFor="allowCaption" className="text-sm text-[#1C1917]">
                      Allow captions for images
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={fieldForm.required}
                    onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                    className="w-4 h-4 rounded border-[#E7E5E4] text-[#C9A84C] focus:ring-[#C9A84C]"
                  />
                  Required field
                </label>
                <label className="flex items-center gap-2 text-sm text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={fieldForm.showInList}
                    onChange={(e) => setFieldForm({ ...fieldForm, showInList: e.target.checked })}
                    className="w-4 h-4 rounded border-[#E7E5E4] text-[#C9A84C] focus:ring-[#C9A84C]"
                  />
                  Show in list view
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E5E4] bg-[#FAFAF8] rounded-b-xl sticky bottom-0">
              <button
                onClick={() => setShowFieldModal(false)}
                className="h-9 px-4 bg-white border border-[#E7E5E4] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveField}
                disabled={!fieldForm.label || !fieldForm.type || !fieldForm.section}
                className="h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {editingField ? "Update Field" : "Add Field"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
