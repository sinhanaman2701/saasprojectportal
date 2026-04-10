"use client";
import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import SuperadminHeader from "@/components/SuperadminHeader";
import { ArrowLeft, Plus, Trash2, GripVertical, Edit2, X, Download, BarChart3, CheckCircle, Copy, RefreshCw } from "lucide-react";
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

const inputClass = "flex h-10 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none";

const FIELD_TYPES = [
  "TEXT", "NUMBER", "SELECT", "MULTISELECT",
  "IMAGE", "IMAGE_MULTI", "FILE", "CHECKBOX", "LOCATION",
  "PRICE", "AREA", "DATERANGE",
];

type TenantField = {
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
  maxLength: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  allowCaption: boolean;
};

type Tenant = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  status: string;
  fields: TenantField[];
  _count: { projects: number };
};

type Tab = "fields" | "branding" | "api" | "admins" | "analytics" | "sections";

function SortableFieldRow({ field, onEdit, onDelete }: { field: TenantField; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-[#E7E5E4] rounded-lg px-4 py-3 group"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-[#A8A29E] hover:text-[#78716C]">
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#1C1917] truncate">{field.label}</span>
          {field.required && <span className="text-[#DC2626] text-xs">*</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-mono text-[#78716C]">{field.key}</span>
          <span className="text-xs bg-[#F5F3EF] text-[#78716C] px-1.5 py-0.5 rounded">{field.type}</span>
          <span className="text-xs text-[#A8A29E]">{field.section}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 hover:bg-[#F5F3EF] rounded-md transition-colors">
          <Edit2 size={14} className="text-[#78716C]" />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-[#FEF2F2] rounded-md transition-colors">
          <Trash2 size={14} className="text-[#DC2626]" />
        </button>
      </div>
    </div>
  );
}

export default function TenantManagePage({ params }: { params: Promise<{ slug?: string }> }) {
  const { slug } = use(params);
  const resolvedSlug = slug as string;
  const tenantSlug = slug as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("fields");
  const [sections, setSections] = useState<string[]>([]);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<TenantField | null>(null);
  const [brandingForm, setBrandingForm] = useState({ name: "" });
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [fieldsSaved, setFieldsSaved] = useState(true);
  const [adminForm, setAdminForm] = useState({ email: "", password: "", name: "" });
  const [admins, setAdmins] = useState<Array<{ id: number; email: string; name: string | null; createdAt: string }>>([]);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminDeletingId, setAdminDeletingId] = useState<number | null>(null);

  // Section management state
  const [sectionList, setSectionList] = useState<Array<{ name: string; fieldCount: number; order: number }>>([]);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: "" });
  const [sectionDeleting, setSectionDeleting] = useState<string | null>(null);

  const [fieldForm, setFieldForm] = useState({
    key: "", label: "", type: "TEXT", section: "", required: false, placeholder: "", options: "" as string | null, showInList: true, maxLength: "",
    imageWidth: "", imageHeight: "",
    allowCaption: false,
  });

  // Option editor state for SELECT/MULTISELECT fields
  const [optionItems, setOptionItems] = useState<Array<{ label: string; value: string }>>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchSections = useCallback(async () => {
    try {
      const token = localStorage.getItem("superadminToken");
      const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Check content type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response from /sections:", text.substring(0, 500));
        return;
      }

      const data = await res.json();
      if (data.status_code === 200) {
        setSectionList(data.response_data || []);
        // Also update local sections array for field modal dropdown
        const sectionNames = (data.response_data || []).map((s: { name: string }) => s.name);
        setSections(sectionNames.length > 0 ? sectionNames : ["Property Information", "Project Details", "Location & Attachments"]);
      } else {
        console.error("Sections fetch failed:", data);
      }
    } catch (e) {
      console.error("Failed to fetch sections", e);
    }
  }, [tenantSlug]);

  const fetchTenant = useCallback(async () => {
    try {
      const token = localStorage.getItem("superadminToken");
      if (!token) { window.location.href = "/admin/login"; return; }

      const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Check content type
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response from /tenant:", text.substring(0, 500));
        setError("Server returned invalid response. Check console for details.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.status_code !== 200) { setError(data.status_message); setLoading(false); return; }

      const t = data.response_data;
      setTenant(t);
      setBrandingForm({ name: t.name });

      // Fetch sections from API
      await fetchSections();
      setLoading(false);
    } catch {
      setError("Unable to connect to server");
      setLoading(false);
    }
  }, [tenantSlug, fetchSections]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  const getFieldsForSection = (section: string) =>
    (tenant?.fields || []).filter((f) => f.section === section).sort((a, b) => a.order - b.order);

  const handleDragEnd = async (event: DragEndEvent, section: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !tenant) return;

    const sectionFields = getFieldsForSection(section);
    const oldIndex = sectionFields.findIndex((f) => f.id === active.id);
    const newIndex = sectionFields.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sectionFields, oldIndex, newIndex);
    const updatedFields = (tenant.fields || []).map((f) => {
      const reorderedItem = reordered.find((r) => r.id === f.id);
      if (reorderedItem) return { ...f, order: reordered.indexOf(reorderedItem) };
      return f;
    });

    setTenant({ ...tenant, fields: updatedFields as TenantField[] });

    // Persist to backend
    const token = localStorage.getItem("superadminToken");
    await fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/reorder`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: reordered.map((f, i) => ({ id: f.id, order: i })),
      }),
    });
  };

  const openAddField = (section: string) => {
    setEditingField(null);
    setFieldForm({ key: "", label: "", type: "TEXT", section, required: false, placeholder: "", showInList: true, maxLength: "", options: null, imageWidth: "", imageHeight: "", allowCaption: false });
    setOptionItems([]);
    setNewOptionLabel("");
    setNewOptionValue("");
    setShowFieldModal(true);
  };

  const openEditField = (field: TenantField) => {
    setEditingField(field);
    setFieldForm({
      key: field.key, label: field.label, type: field.type, section: field.section,
      required: field.required, placeholder: field.placeholder || "", showInList: field.showInList,
      options: field.options,
      maxLength: field.maxLength ? String(field.maxLength) : "",
      imageWidth: field.imageWidth ? String(field.imageWidth) : "",
      imageHeight: field.imageHeight ? String(field.imageHeight) : "",
      allowCaption: field.allowCaption ?? false,
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

  const handleSaveField = async () => {
    if (!fieldForm.label.trim() || !fieldForm.key.trim()) {
      alert("Label and Key are required");
      return;
    }

    const finalKey = fieldForm.key.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const maxId = (tenant?.fields || []).length > 0 ? Math.max(...(tenant?.fields || []).map((f) => f.id)) : 0;

    // Build options from UI editor
    let optionsPayload = null;
    if (fieldForm.type === "SELECT" || fieldForm.type === "MULTISELECT") {
      if (optionItems.length > 0) {
        optionsPayload = optionItems;
      }
    }

    if (editingField) {
      // Build the full updated field (include ALL fields so local state stays in sync)
      const updatedFieldData: TenantField = {
        ...editingField,
        key: finalKey,
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
        options: optionsPayload,
      };

      // Optimistically update local state so the modal shows correct values if reopened
      const updatedFields = (tenant?.fields || []).map((f) =>
        f.id === editingField.id ? updatedFieldData : f
      );
      setTenant({ ...tenant!, fields: updatedFields });
      setShowFieldModal(false);

      // Persist to backend — await so errors are visible to the user
      try {
        const token = localStorage.getItem("superadminToken");
        const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/${editingField.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            key: finalKey,
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
            options: optionsPayload,
          }),
        });
        const data = await res.json();
        if (data.status_code !== 200) {
          // Revert local state and tell the user what went wrong
          setTenant({ ...tenant!, fields: tenant?.fields || [] });
          alert(`Failed to save field: ${data.status_message}`);
          return;
        }
      } catch {
        // Network error — revert and alert
        setTenant({ ...tenant!, fields: tenant?.fields || [] });
        alert("Failed to save field: could not reach the server. Check your connection and try again.");
        return;
      }

    } else {
      // Add new field - update local state immediately (like wizard)
      const allFields = tenant?.fields || [];

      // Check if this field is being added to a newly created section (section has no fields yet)
      const sectionHasExistingFields = allFields.some((f) => f.section === fieldForm.section);

      let fieldOrder: number;
      if (sectionHasExistingFields) {
        // Existing section: continue the order sequence within this section
        const maxOrderInSection = Math.max(
          ...allFields.filter((f) => f.section === fieldForm.section).map((f) => f.order)
        );
        fieldOrder = maxOrderInSection + 1;
      } else {
        // New section (no fields yet): use max order across ALL fields + 100 to ensure section appears at bottom
        const maxFieldOrder = allFields.length > 0 ? Math.max(...allFields.map((f) => f.order)) : 0;
        fieldOrder = maxFieldOrder + 100;
      }

      const newField: TenantField = {
        id: maxId + 1,
        tenantId: tenant?.id || 0,
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
        options: optionsPayload,
        placeholder: fieldForm.placeholder || null,
        validation: null,
      };
      setTenant({ ...tenant!, fields: [...(tenant?.fields || []), newField] });

      // Persist to backend in background
      const token = localStorage.getItem("superadminToken");
      fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newField),
      }).catch(console.error);
    }

    setShowFieldModal(false);
  };

  const handleDeleteField = (fieldId: number) => {
    if (!confirm("Delete this field?")) return;
    // Update local state immediately (like wizard)
    const updatedFields = (tenant?.fields || []).filter((f) => f.id !== fieldId);
    setTenant({ ...tenant!, fields: updatedFields });

    // Persist to backend in background
    const token = localStorage.getItem("superadminToken");
    fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/${fieldId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  // Section management functions - same logic as wizard
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

  const handleSaveSection = async () => {
    if (!sectionForm.name.trim()) {
      alert("Section name is required");
      return;
    }

    const trimmedName = sectionForm.name.trim();

    // Check for duplicates (client-side validation like wizard)
    if (!editingSection && sectionList.some((s) => s.name === trimmedName)) {
      alert(`Section "${trimmedName}" already exists`);
      return;
    }
    if (editingSection && editingSection !== trimmedName && sectionList.some((s) => s.name === trimmedName)) {
      alert(`Section "${trimmedName}" already exists`);
      return;
    }

    const token = localStorage.getItem("superadminToken");
    if (!token) {
      alert("Not authenticated. Please login again.");
      window.location.href = "/admin/login";
      return;
    }

    // Update local state immediately (like wizard)
    if (editingSection) {
      // Rename section - update all fields in that section
      const updatedFields = (tenant?.fields || []).map((f) =>
        f.section === editingSection ? { ...f, section: trimmedName } : f
      );
      setTenant({ ...tenant!, fields: updatedFields });

      // Update section list
      setSectionList(sectionList.map((s) => s.name === editingSection ? { ...s, name: trimmedName } : s));

      // Persist to backend
      fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/sections/${encodeURIComponent(editingSection)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ newSection: trimmedName }),
      }).catch(console.error);
    } else {
      // Add new section to list with high order value (like backend does)
      const maxOrder = sectionList.length > 0 ? Math.max(...sectionList.map((s) => s.order)) : 0;
      const newSection = { name: trimmedName, fieldCount: 0, order: maxOrder + 100 };
      const updatedSectionList = [...sectionList, newSection].sort((a, b) => a.order - b.order);
      setSectionList(updatedSectionList);

      // Persist to backend
      fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/sections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ section: trimmedName }),
      }).catch(console.error);
    }

    setShowSectionModal(false);
  };

  const handleDeleteSection = async (sectionName: string) => {
    const fieldCount = (tenant?.fields || []).filter((f) => f.section === sectionName).length;
    if (fieldCount > 0) {
      if (!confirm(`Delete section "${sectionName}" along with ${fieldCount} field(s)? This cannot be undone.`)) return;
      // Update local state immediately (like wizard)
      const updatedFields = (tenant?.fields || []).filter((f) => f.section !== sectionName);
      setTenant({ ...tenant!, fields: updatedFields });
      setSectionList(sectionList.filter((s) => s.name !== sectionName));

      // Persist to backend
      const token = localStorage.getItem("superadminToken");
      fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/sections/${encodeURIComponent(sectionName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(console.error);
    } else {
      // Empty section - just remove from local state
      if (!confirm(`Delete empty section "${sectionName}"?`)) return;
      setSectionList(sectionList.filter((s) => s.name !== sectionName));

      // Persist to backend
      const token = localStorage.getItem("superadminToken");
      fetch(`http://localhost:3002/admin/portals/${tenantSlug}/fields/sections/${encodeURIComponent(sectionName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(console.error);
    }
  };

  // Option editor helpers
  const handleAddOption = () => {
    if (!newOptionLabel.trim() || !newOptionValue.trim()) {
      alert("Please enter both label and value for the option");
      return;
    }
    setOptionItems([...optionItems, { label: newOptionLabel.trim(), value: newOptionValue.trim() }]);
    setNewOptionLabel("");
    setNewOptionValue("");
  };

  const handleRemoveOption = (index: number) => {
    setOptionItems(optionItems.filter((_, i) => i !== index));
  };

  const handleKeyDownOption = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    const token = localStorage.getItem("superadminToken");
    const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(brandingForm),
    });
    const data = await res.json();
    setSaving(false);
    if (data.status_code === 200) {
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2000);
      fetchTenant();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <SuperadminHeader />
        <div className="max-w-5xl mx-auto px-6 py-12 flex items-center justify-center">
          <div className="text-[#78716C]">Loading...</div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <SuperadminHeader />
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-[#DC2626]">{error || "Tenant not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <SuperadminHeader />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#78716C] hover:text-[#1C1917] mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to portals
        </Link>

        {/* Tenant Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-[#C9A84C]">
                {tenant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-[#1C1917]">{tenant.name}</h1>
              <p className="text-[#78716C] text-sm font-mono">/{tenant.slug}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            tenant.status === "LIVE" ? "bg-green-100 text-green-800" :
            tenant.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {tenant.status}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#E7E5E4] mb-8">
          {(["fields", "branding", "api", "admins", "analytics"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-[#C9A84C] text-[#C9A84C]"
                  : "border-transparent text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              {tab === "api" ? "API Config" : tab === "admins" ? "Admins" : tab === "analytics" ? "Analytics" : tab === "sections" ? "Sections" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ─── Fields Tab ─── */}
        {activeTab === "fields" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-[#1C1917]">Field Schema</h2>
                <p className="text-[#78716C] text-sm mt-0.5">Define the fields that tenant admins will fill out when creating projects.</p>
              </div>
              <div className="flex items-center gap-3">
                {!fieldsSaved && (
                  <button
                    onClick={() => { fetchTenant(); setFieldsSaved(true); }}
                    className="flex items-center gap-2 h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    <CheckCircle size={14} /> Changes Saved
                  </button>
                )}
                <button
                  onClick={openAddSection}
                  className="flex items-center gap-2 h-9 px-4 bg-white border border-[#E7E5E4] hover:border-[#C9A84C] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
                >
                  <Plus size={14} /> Add Section
                </button>
                <button
                  onClick={() => openAddField(sections[0])}
                  className="flex items-center gap-2 h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  <Plus size={14} /> Add Field
                </button>
              </div>
            </div>

            {tenant.fields.length === 0 && sectionList.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 text-center">
                <p className="text-[#78716C] mb-4">No fields configured yet. Add fields to build the project creation form.</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {["Property Info", "Details", "Location", "Amenities"].map((s) => (
                    <button
                      key={s}
                      onClick={() => openAddField(s)}
                      className="px-4 py-2 border border-[#E7E5E4] rounded-lg text-sm text-[#78716C] hover:border-[#C9A84C] hover:text-[#1C1917] transition-colors"
                    >
                      + Add to "{s}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {sectionList.map((section) => {
                  const sectionFields = getFieldsForSection(section.name);
                  const isEmpty = sectionFields.length === 0;
                  return (
                    <div key={section.name}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wide">{section.name}</h3>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditSection(section.name)}
                              className="p-1 hover:bg-[#F5F3EF] rounded-md transition-colors"
                              title="Rename section"
                            >
                              <Edit2 size={12} className="text-[#78716C]" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(section.name)}
                              className="p-1 hover:bg-[#FEF2F2] rounded-md transition-colors"
                              title="Delete section and its fields"
                            >
                              <Trash2 size={12} className="text-[#DC2626]" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => openAddField(section.name)}
                          className="flex items-center gap-1 text-xs text-[#78716C] hover:text-[#C9A84C] transition-colors"
                        >
                          <Plus size={12} /> Add field
                        </button>
                      </div>
                      {isEmpty ? (
                        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 text-sm text-[#DC2626] flex items-center gap-2">
                          <span className="text-lg">⚠️</span>
                          <span>This section is empty. Click "Add field" to add fields or delete this section.</span>
                        </div>
                      ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, section.name)}>
                          <SortableContext items={sectionFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                              {sectionFields.map((field) => (
                                <SortableFieldRow
                                  key={field.id}
                                  field={field}
                                  onEdit={() => openEditField(field)}
                                  onDelete={() => handleDeleteField(field.id)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Branding Tab ─── */}
        {activeTab === "branding" && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-[#1C1917] mb-1">Branding</h2>
            <p className="text-[#78716C] text-sm mb-8">Customize how the tenant portal looks.</p>

            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Portal Name</label>
                <input
                  type="text"
                  value={brandingForm.name}
                  onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Logo URL</label>
                <input
                  type="text"
                  value={tenant.logoUrl || ""}
                  onChange={async (e) => {
                    const token = localStorage.getItem("superadminToken");
                    await fetch(`http://localhost:3002/admin/portals/${tenantSlug}`, {
                      method: "PUT",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ logoUrl: e.target.value }),
                    });
                    fetchTenant();
                  }}
                  placeholder="https://example.com/logo.png"
                  className={inputClass}
                />
              </div>

              {brandingSaved && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                  Branding saved successfully.
                </div>
              )}

              <button
                onClick={handleSaveBranding}
                disabled={saving}
                className="h-10 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? "Saving..." : "Save Branding"}
              </button>
            </div>
          </div>
        )}

        {/* ─── API Tab ─── */}
        {activeTab === "api" && (
          <ApiConfigTab tenantSlug={tenantSlug} tenantName={tenant.name} />
        )}
        {/* ─── Admins Tab ─── */}
        {activeTab === "admins" && (
          <TenantAdminsTab tenantSlug={tenantSlug} active={true} />
        )}

        {/* ─── Analytics Tab ─── */}
        {activeTab === "analytics" && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-[#1C1917] mb-1">Analytics Dashboard</h2>
            <p className="text-[#78716C] text-sm mb-8">View project statistics and engagement metrics for this portal.</p>

            <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-[#F5F3EF] rounded-lg">
                <BarChart3 size={20} className="text-[#78716C]" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1C1917]">Analytics Dashboard</p>
                  <p className="text-xs text-[#78716C]">View total projects, active listings, drafts, archived, and top viewed projects.</p>
                </div>
                <Link
                  href={`/admin/portals/${tenantSlug}/analytics`}
                  className="flex items-center gap-2 h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Open Dashboard →
                </Link>
              </div>

              <div className="border-t border-[#E7E5E4] pt-5">
                <h3 className="text-sm font-medium text-[#1C1917] mb-3">Available Metrics</h3>
                <div className="space-y-2">
                  {[
                    { label: "Total Projects", desc: "All projects across all statuses" },
                    { label: "Active", desc: "Published live projects" },
                    { label: "Drafts", desc: "Work-in-progress projects" },
                    { label: "Archived", desc: "Retired/completed projects" },
                    { label: "Top Projects by Views", desc: "Most viewed projects with click counts" },
                  ].map((metric) => (
                    <div key={metric.label} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#1C1917]">{metric.label}</p>
                        <p className="text-xs text-[#78716C]">{metric.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Field Modal ─── */}
      {showFieldModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#E7E5E4] w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
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
                    {FIELD_TYPES.map((t) => (
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
                    {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                    <option value="__new__">+ New section</option>
                  </select>
                </div>
              </div>
              {fieldForm.section === "__new__" && (
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">New Section Name</label>
                  <input
                    type="text"
                    value={fieldForm.section === "__new__" ? "" : fieldForm.section}
                    onChange={(e) => setFieldForm({ ...fieldForm, section: e.target.value })}
                    placeholder="e.g. Legal Info"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              )}

              {(fieldForm.type === "SELECT" || fieldForm.type === "MULTISELECT") && (
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Options</label>
                  <div className="border border-[#E7E5E4] rounded-lg p-3 bg-[#FAFAF8]">
                    {/* Existing options */}
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
                    {/* Add new option */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        onKeyDown={handleKeyDownOption}
                        placeholder="Label (e.g., 2 BHK)"
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        onKeyDown={handleKeyDownOption}
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
                  <p className="text-xs text-[#A8A29E] mt-1">Maximum characters allowed for this field</p>
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
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E5E4] bg-[#FAFAF8] rounded-b-xl">
              <button
                onClick={() => setShowFieldModal(false)}
                className="h-9 px-4 bg-white border border-[#E7E5E4] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveField}
                disabled={!fieldForm.label || !fieldForm.type}
                className="h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {editingField ? "Update Field" : "Add Field"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Section Modal ─── */}
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
    </div>
  );
}

// ─── API Config Tab ───────────────────────────────────────────────────

function ApiConfigTab({ tenantSlug, tenantName }: { tenantSlug: string; tenantName: string }) {
  const [postmanCollection, setPostmanCollection] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [tokenCopied, setTokenCopied] = useState(false);

  const fetchPostman = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("superadminToken");
      // Fetch tenant data first to get access token
      const tenantRes = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tenantData = await tenantRes.json();
      const tenantAccessToken = tenantData.response_data?.accessToken;
      const tenantStatus = tenantData.response_data?.status;

      if (!tenantAccessToken) {
        console.error("No access token found for tenant");
        setLoading(false);
        return;
      }

      console.log("Fetching Postman with token:", tenantAccessToken.substring(0, 10) + "...", "tenant status:", tenantStatus);

      // Now fetch Postman collection with the token
      const postmanRes = await fetch(`http://localhost:3002/api/${tenantSlug}/postman.json`, {
        headers: { "Access-Token": tenantAccessToken },
      });
      const postmanData = await postmanRes.json();
      console.log("Postman response:", postmanData);
      if (postmanData.status_code === 200 && postmanData.response_data) {
        setPostmanCollection(postmanData.response_data);
        setLastFetched(new Date());
      } else {
        console.error("Failed to fetch Postman collection:", postmanData);
      }
    } catch (e) {
      console.error("Failed to fetch Postman collection", e);
    }
    setLoading(false);
  };

  const fetchAccessToken = async () => {
    try {
      const token = localStorage.getItem("superadminToken");
      const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status_code === 200 && data.response_data?.accessToken) {
        setAccessToken(data.response_data.accessToken);
      }
    } catch (e) {
      console.error("Failed to fetch access token", e);
    }
  };

  const regenerateToken = async () => {
    if (!confirm("Regenerate access token? This will break existing mobile app integrations.")) return;
    try {
      const token = localStorage.getItem("superadminToken");
      const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}/regenerate-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status_code === 200 && data.response_data?.accessToken) {
        setAccessToken(data.response_data.accessToken);
        setTokenCopied(false);
      }
    } catch (e) {
      console.error("Failed to regenerate token", e);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(accessToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  useEffect(() => {
    fetchAccessToken();
    fetchPostman();
  }, [tenantSlug]);

  const downloadPostman = () => {
    if (!postmanCollection) return;
    const blob = new Blob([JSON.stringify(postmanCollection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tenantName.replace(/\s+/g, "_")}_API.postman_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[#1C1917]">API Configuration</h2>
          <p className="text-[#78716C] text-sm">Download Postman collection &amp; mobile API token.</p>
        </div>
        <button
          onClick={fetchPostman}
          disabled={loading}
          className="flex items-center gap-2 h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          title="Regenerate Postman collection with latest field schema"
        >
          ↻ Refresh
        </button>
      </div>

      {lastFetched && (
        <p className="text-xs text-[#A8A29E] mb-4">
          Last updated: {lastFetched.toLocaleTimeString()}
        </p>
      )}

      <div className="bg-white rounded-xl border border-[#E7E5E4] p-6 space-y-6">
        {/* Mobile API Access Token */}
        <div className="border-b border-[#E7E5E4] pb-5">
          <h3 className="text-sm font-medium text-[#1C1917] mb-3 flex items-center gap-2">
            Mobile API Access Token
            <span className="text-[#A8A29E] font-normal text-xs">(Access-Token header)</span>
          </h3>
          {accessToken ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <code className="flex-1 text-xs font-mono bg-[#F5F3EF] px-3 py-2.5 rounded-lg text-[#78716C] break-all border border-[#E7E5E4]">
                  {accessToken}
                </code>
                <button
                  onClick={copyToken}
                  className="h-9 px-3 bg-[#F5F3EF] hover:bg-[#E7E5E4] text-[#78716C] rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                >
                  {tokenCopied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={regenerateToken}
                  className="h-9 px-3 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                  title="Generate a new token (old one will stop working)"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-xs text-[#A8A29E]">
                Include this token in the <code className="bg-[#F5F3EF] px-1.5 py-0.5 rounded">Access-Token</code> header for mobile API requests.
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#78716C]">Loading token...</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Tenant Slug</label>
          <input type="text" value={tenantSlug} readOnly className={`${inputClass} font-mono bg-[#F5F3EF]`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Base API URL</label>
          <code className="block text-sm bg-[#F5F3EF] px-4 py-3 rounded-lg font-mono text-[#78716C]">
            http://localhost:3002/api/{tenantSlug}
          </code>
        </div>
        <div className="border-t border-[#E7E5E4] pt-5">
          <h3 className="text-sm font-medium text-[#1C1917] mb-3">Endpoints</h3>
          <div className="space-y-2">
            {[
              { method: "GET", path: `/api/${tenantSlug}/projects`, desc: "List projects (auth required)" },
              { method: "GET", path: `/api/${tenantSlug}/projects/:id`, desc: "Get project detail (auth required)" },
              { method: "POST", path: `/api/${tenantSlug}/projects/:id/click`, desc: "Track click (auth required)" },
              { method: "GET", path: `/api/${tenantSlug}/postman.json`, desc: "Download Postman (auth required)" },
            ].map((ep, idx) => (
              <div key={`${ep.method}-${ep.path}-${idx}`} className="flex items-center gap-3">
                <span className={`inline-flex items-center justify-center w-16 h-6 rounded text-xs font-bold ${
                  ep.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                }`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-[#78716C] flex-1 truncate">{ep.path}</code>
                <span className="text-xs text-[#A8A29E] whitespace-nowrap">{ep.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#F5F3EF] rounded-lg border border-[#E7E5E4]">
            <p className="text-xs text-[#78716C]">
              <strong className="text-[#1C1917]">Note:</strong> All mobile API endpoints require the <code className="bg-white px-1.5 py-0.5 rounded">Access-Token</code> header. See token above.
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8 text-[#78716C]">Loading Postman collection...</div>
        )}

        {!loading && postmanCollection && (
          <button
            onClick={downloadPostman}
            className="w-full h-10 flex items-center justify-center gap-2 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Download size={16} /> Download Postman Collection
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tenant Admins Sub-tab ───────────────────────────────────────────────────

function TenantAdminsTab({ tenantSlug, active }: { tenantSlug: string; active: boolean }) {
  const [admins, setAdmins] = useState<Array<{ id: number; email: string; name: string | null; createdAt: string }>>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadAdmins = () => {
    const token = localStorage.getItem("superadminToken");
    fetch(`http://localhost:3002/admin/portals/${tenantSlug}/admins`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status_code === 200) setAdmins(d.response_data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (active) {
      loadAdmins();
    }
  }, [tenantSlug, active]);

  const handleCreate = async () => {
    setError("");
    setSaving(true);
    const token = localStorage.getItem("superadminToken");
    const res = await fetch(`http://localhost:3002/admin/portals/${tenantSlug}/admins`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.status_code !== 201) { setError(data.status_message || "Failed"); return; }
    setShowModal(false);
    setForm({ email: "", password: "", name: "" });
    loadAdmins();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this admin?")) return;
    setDeleting(id);
    const token = localStorage.getItem("superadminToken");
    await fetch(`http://localhost:3002/admin/portals/${tenantSlug}/admins/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleting(null);
    loadAdmins();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-[#1C1917]">Portal Admins</h2>
          <p className="text-[#78716C] text-sm mt-0.5">Create tenant admin accounts to manage this portal.</p>
        </div>
        <button
          onClick={() => { setForm({ email: "", password: "", name: "" }); setError(""); setShowModal(true); }}
          className="flex items-center gap-2 h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
        >
          <Plus size={14} /> Add Admin
        </button>
      </div>

      {admins.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 text-center">
          <p className="text-[#78716C] mb-4">No admins configured yet.</p>
          <button
            onClick={() => { setForm({ email: "", password: "", name: "" }); setError(""); setShowModal(true); }}
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
          >
            Create First Admin
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E7E5E4] bg-[#FAFAF8]">
                <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Email</th>
                <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-[#F5F3EF] last:border-0">
                  <td className="px-6 py-4 text-sm text-[#1C1917]">{admin.name || "—"}</td>
                  <td className="px-6 py-4 text-sm text-[#78716C] font-mono">{admin.email}</td>
                  <td className="px-6 py-4 text-sm text-[#A8A29E]">
                    {new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(admin.id)}
                      disabled={deleting === admin.id}
                      className="p-1.5 hover:bg-[#FEF2F2] rounded-md text-[#DC2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={deleting === admin.id ? "Deleting..." : "Delete"}
                    >
                      {deleting === admin.id ? (
                        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl border border-[#E7E5E4] w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4]">
              <h3 className="font-semibold text-[#1C1917]">Add Portal Admin</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-[#F5F3EF] rounded-md">
                <X size={18} className="text-[#78716C]" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="priya@koltepatil.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E7E5E4] bg-[#FAFAF8] rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="h-9 px-4 bg-white border border-[#E7E5E4] text-[#1C1917] font-medium rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.email || !form.password}
                className="h-9 px-4 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
