"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import TenantHeader from "@/components/tenant/TenantHeader";
import DynamicForm, { type TenantField } from "@/components/dynamic-form/DynamicForm";
import type { FormValues, FormAttachments } from "@/components/dynamic-form/DynamicForm";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function NewProjectPage() {
  const router = useRouter();
  const params = useParams() as { slug?: string };
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const slug = params?.slug as string;

  const [fields, setFields] = useState<TenantField[]>([]);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; slug: string; logoUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantError, setTenantError] = useState("");
  const [initialData, setInitialData] = useState<FormValues | undefined>(undefined);
  const [initialAttachments, setInitialAttachments] = useState<FormAttachments | undefined>(undefined);
  const [projectLoaded, setProjectLoaded] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tenantToken");
    const storedSlug = localStorage.getItem("tenantSlug");
    const storedEmail = localStorage.getItem("tenantEmail");

    if (!token || !slug) {
      router.push(`/${slug}/login`);
      return;
    }

    // Fetch tenant fields (tenant admin auth required)
    fetch(`${API}/api/${slug}/fields`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((fieldsData) => {
        if (fieldsData.status_code === 200) {
          setFields(fieldsData.response_data || []);
        } else if (fieldsData.status_code === 401) {
          setTenantError("Unauthorized. Please login again.");
          router.push(`/${slug}/login`);
          return;
        } else {
          setTenantError(fieldsData.status_message || "Failed to load fields");
          setLoading(false);
          return;
        }

        // Fetch tenant info with logo from backend
        fetch(`http://localhost:3002/admin/portals/${storedSlug || slug}`)
          .then((r) => r.json())
          .then((d) => {
            setTenantInfo({
              name: d.response_data?.name || storedSlug || slug,
              slug: d.response_data?.slug || storedSlug || slug,
              logoUrl: d.response_data?.logoUrl || null,
            });
          })
          .catch(() => {
            setTenantInfo({
              name: storedSlug || slug,
              slug: storedSlug || slug,
              logoUrl: null,
            });
          });
        setLoading(false);
      })
      .catch(() => {
        setTenantError("Unable to connect to server");
        setLoading(false);
      });
  }, [slug, router]);

  // Load existing project data if editing
  useEffect(() => {
    if (!editId || !slug) {
      setProjectLoaded(true); // No project to load, so we're "loaded"
      return;
    }
    const token = localStorage.getItem("tenantToken");
    if (!token) return;

    fetch(`${API}/api/${slug}/projects/${editId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((projectData) => {
        if (projectData.status_code === 200) {
          const project = projectData.response_data;
          console.log('Loaded project data for editing:', project.data);
          console.log('Loaded attachments:', project.attachments);
          setInitialData(project.data || {});
          setInitialAttachments(project.attachments || {});
        } else {
          setTenantError("Failed to load project data: " + projectData.status_message);
        }
        setProjectLoaded(true);
      })
      .catch((err) => {
        setTenantError("Unable to connect to server: " + err);
        setProjectLoaded(true);
      });
  }, [editId, slug]);

  const handleSubmit = async (
    data: FormValues,
    attachments: FormAttachments,
    isDraft: boolean
  ) => {
    const token = localStorage.getItem("tenantToken");
    if (!token) throw new Error("Not authenticated");

    const formPayload = new FormData();
    formPayload.append("data", JSON.stringify(data));
    formPayload.append("isDraft", String(isDraft));
    formPayload.append("status", "ONGOING");

    // Collect ALL field keys that have any attachments (files or existing URLs)
    const fieldKeysWithFiles = Object.keys(attachments).filter(
      (k) => attachments[k]?.length > 0
    );
    if (fieldKeysWithFiles.length > 0) {
      formPayload.append("_fieldKeys", fieldKeysWithFiles.join(","));
    }

    // Append NEW files and track which fields have attachments (including existing URLs with updated metadata)
    for (const fieldKey of fieldKeysWithFiles) {
      const items = attachments[fieldKey];
      for (const item of items) {
        if (item.file) {
          formPayload.append(fieldKey, item.file);
        }
      }
    }

    // Send full attachment state (including existing URLs with updated isCover/order/caption) as JSON
    // This is needed when reordering images or changing cover image without uploading new files
    if (fieldKeysWithFiles.length > 0) {
      const attachmentMetadata: Record<string, { url: string; caption?: string; order: number; isCover: boolean }[]> = {};
      for (const fieldKey of fieldKeysWithFiles) {
        const items = attachments[fieldKey];
        attachmentMetadata[fieldKey] = items.map(item => ({
          url: item.url || '',
          caption: item.caption || '',
          order: item.order,
          isCover: item.isCover,
        })).filter(item => item.url); // Only include items with URLs
      }
      formPayload.append('_attachmentMetadata', JSON.stringify(attachmentMetadata));
    }

    // If editing, use PUT endpoint; otherwise POST for new project
    const url = editId
      ? `${API}/api/${slug}/projects/${editId}`
      : `${API}/api/${slug}/projects`;
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formPayload,
    });
    const resData = await res.json();

    if (resData.status_code !== 200 && resData.status_code !== 201) {
      throw new Error(resData.status_message || "Failed to save project");
    }

    router.push(`/${slug}`);
  };

  if (loading || (editId && !projectLoaded)) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#78716C] text-sm font-medium">
            {editId ? "Loading project data..." : "Loading form..."}
          </p>
        </div>
      </div>
    );
  }

  if (tenantError || !tenantInfo) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-[#DC2626]">{tenantError || "Tenant not found"}</div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <TenantHeader
          tenantName={tenantInfo.name}
          tenantSlug={tenantInfo.slug}
          logoUrl={tenantInfo.logoUrl}
        />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-12">
            <p className="text-[#78716C] mb-4">
              No form fields have been configured for this portal yet.
            </p>
            <p className="text-sm text-[#A8A29E]">
              Contact your superadmin to configure the field schema before creating projects.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <TenantHeader
        tenantName={tenantInfo.name}
        tenantSlug={tenantInfo.slug}
        logoUrl={tenantInfo.logoUrl}
      />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1C1917]">
            {editId ? "Edit Project" : "New Project"}
          </h1>
          <p className="text-[#78716C] mt-1 text-sm">
            {editId
              ? "Update the project details below."
              : "Fill in the details below to create a new listing."}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8">
          <DynamicForm
            fields={fields}
            tenantSlug={slug}
            initialData={initialData}
            initialAttachments={initialAttachments}
            projectId={editId ? parseInt(editId) : undefined}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
