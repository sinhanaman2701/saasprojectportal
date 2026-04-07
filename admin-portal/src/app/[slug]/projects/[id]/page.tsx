"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import TenantHeader from "@/components/tenant/TenantHeader";
import type { TenantField } from "@/components/dynamic-form/DynamicForm";
import { MapPin, Home, Building, Plane, Train, Bus, Pill, Utensils, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type ProjectData = {
  id: number;
  status: string;
  isActive: boolean;
  isArchived: boolean;
  isDraft: boolean;
  coverImageUrl: string | null;
  data: Record<string, any>;
  attachments: Record<string, any[]>;
  createdAt: string;
  updatedAt: string;
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams() as { slug?: string; id?: string };
  const slug = params?.slug as string;
  const projectId = params?.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [fields, setFields] = useState<TenantField[]>([]);
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Initialize carousel to show cover image (isCover: true) on load
  useEffect(() => {
    if (project?.attachments?.bannerImages && project.attachments.bannerImages.length > 0) {
      const coverIndex = project.attachments.bannerImages.findIndex((img: any) => img.isCover);
      if (coverIndex >= 0) {
        setCurrentImageIndex(coverIndex);
      }
    }
  }, [project?.attachments?.bannerImages]);

  useEffect(() => {
    if (!slug || !projectId) return;

    const token = localStorage.getItem("tenantToken");
    const storedSlug = localStorage.getItem("tenantSlug");

    // Fetch project with auth
    fetch(`${API}/api/${slug}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())
      .then((projectRes) => {
        if (projectRes.status_code !== 200) {
          setError(projectRes.status_message || "Failed to load project");
          setLoading(false);
          return;
        }

        setProject(projectRes.response_data);

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
        setError("Unable to connect to server");
        setLoading(false);
      });
  }, [slug, projectId]);

  // Load fields for the tenant (needed for section grouping and labels)
  useEffect(() => {
    if (!slug || !project) return;
    const token = localStorage.getItem("tenantToken");
    if (!token) return;

    fetch(`${API}/api/${slug}/fields`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status_code === 200) setFields(d.response_data || []);
        else if (d.status_code === 401) router.push(`/${slug}/login`);
      })
      .catch(() => {});
  }, [slug, project, router]);

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this project?")) return;

    setArchiving(true);
    const token = localStorage.getItem("tenantToken");
    try {
      const res = await fetch(`${API}/api/${slug}/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isArchived: true, isActive: false }),
      });
      const data = await res.json();
      if (data.status_code !== 200) {
        throw new Error(data.status_message || "Failed to archive project");
      }
      // Update local state to reflect archived status immediately
      setProject((prev) => prev ? { ...prev, isArchived: true, isActive: false } : null);
    } catch (err: any) {
      alert(err.message || "Failed to archive project");
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!confirm("Restore this project to active status?")) return;

    setArchiving(true);
    const token = localStorage.getItem("tenantToken");
    try {
      const res = await fetch(`${API}/api/${slug}/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isArchived: false, isActive: true, isDraft: false }),
      });
      const data = await res.json();
      if (data.status_code !== 200) {
        throw new Error(data.status_message || "Failed to restore project");
      }
      // Update local state to reflect active status immediately
      setProject((prev) => prev ? { ...prev, isArchived: false, isActive: true, isDraft: false } : null);
    } catch (err: any) {
      alert(err.message || "Failed to restore project");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#78716C] text-sm font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center gap-4">
        <div className="text-[#DC2626]">{error || "Project not found"}</div>
        <Link
          href={`/${slug}`}
          className="text-sm text-[#78716C] hover:text-[#1C1917] underline"
        >
          ← Back to listings
        </Link>
      </div>
    );
  }

  if (!tenantInfo) return null;

  // Group fields by section and sort in standard order
  const sectionOrder = ["Property Information", "Project Details", "Location & Attachments"];
  const sections = [...new Set(fields.map((f) => f.section))].sort((a, b) => {
    const aIndex = sectionOrder.indexOf(a);
    const bIndex = sectionOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const projectName = project.data?.projectName || "Untitled Project";

  const statusBadge =
    project.isDraft ? (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Draft
      </span>
    ) : project.isArchived ? (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Archived
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        {project.status || "Active"}
      </span>
    );

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <TenantHeader
        tenantName={tenantInfo.name}
        tenantSlug={tenantInfo.slug}
        logoUrl={tenantInfo.logoUrl}
      />

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors"
          >
            <span>←</span>
            <span>{tenantInfo.name}</span>
          </Link>
        </div>

        {/* Cover image carousel */}
        {(() => {
          const bannerImages = project.attachments?.bannerImages || [];
          const hasMultipleImages = bannerImages.length > 1;

          if (bannerImages.length === 0) return null;

          return (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 bg-[#F5F3EF]">
              {/* Main image */}
              <img
                src={bannerImages[currentImageIndex]?.url || project.coverImageUrl}
                alt={`${projectName} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Navigation arrows - only show if multiple images */}
              {hasMultipleImages && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {/* Image counter - only show if multiple images */}
              {hasMultipleImages && (
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                  {currentImageIndex + 1} / {bannerImages.length}
                </div>
              )}

              {/* Dots indicator - only show if multiple images */}
              {hasMultipleImages && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {bannerImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Header */}
        <div className="flex items-start justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1C1917] mb-3">{projectName}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {statusBadge}
              <span className="text-sm text-[#78716C]">
                Listed{" "}
                {project.createdAt
                  ? new Date(project.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {!project.isArchived ? (
              <>
                <Link
                  href={`/${slug}/projects/new?editId=${projectId}`}
                  className="flex items-center gap-2 h-10 px-5 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Edit Project
                </Link>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="flex items-center gap-2 h-10 px-5 bg-white hover:bg-[#FEF2F2] text-[#DC2626] border border-[#E7E5E4] hover:border-[#FECACA] font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {archiving ? "Archiving..." : "Archive Project"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleUnarchive}
                  disabled={archiving}
                  className="flex items-center gap-2 h-10 px-5 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {archiving ? "Restoring..." : "Restore to Active"}
                </button>
                <Link
                  href={`/${slug}/projects/new?editId=${projectId}`}
                  className="flex items-center gap-2 h-10 px-5 bg-white hover:bg-[#F5F3EF] text-[#1C1917] border border-[#E7E5E4] font-medium rounded-lg transition-colors text-sm"
                >
                  Edit Project
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Sections */}
        {sections.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-12 text-center">
            <p className="text-[#78716C]">No details available for this project.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => {
              const sectionFields = fields
                .filter((f) => f.section === section)
                .sort((a, b) => a.order - b.order);

              return (
                <div
                  key={section}
                  className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-[#F5F3EF]">
                    <h2 className="text-base font-semibold text-[#1C1917]">{section}</h2>
                  </div>
                  <div className="px-6 py-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                      {sectionFields.map((field) => (
                        <div key={field.key} className={field.type === "LOCATION" ? "md:col-span-2" : ""}>
                          <dt className="text-xs font-medium text-[#78716C] uppercase tracking-wide mb-1.5">
                            {field.label}
                          </dt>
                          <dd className="text-[#1C1917]">
                            <ReadOnlyField
                              field={field}
                              value={project.data?.[field.key]}
                              attachments={project.attachments?.[field.key]}
                            />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Read-only field renderer ─────────────────────────────────────────────────

function ReadOnlyField({
  field,
  value,
  attachments,
}: {
  field: TenantField;
  value: any;
  attachments?: any[];
}) {
  // For file fields, check attachments instead of value
  const isFileField = field.type === 'IMAGE' || field.type === 'IMAGE_MULTI' || field.type === 'FILE';
  const hasAttachments = attachments && attachments.length > 0;

  // For file fields, consider empty only if both value AND attachments are empty
  const empty = isFileField
    ? (!hasAttachments && (!value || value === ''))
    : (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));

  if (empty && !hasAttachments) {
    return <span className="text-[#A8A29E] text-sm italic">Not provided</span>;
  }

  switch (field.type) {
    case "TEXT":
    case "NUMBER":
    case "PRICE":
    case "AREA":
      return <span className="text-[#1C1917]">{value}</span>;


    case "SELECT":
      return <span className="text-[#1C1917]">{value}</span>;

    case "MULTISELECT":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(Array.isArray(value) ? value : []).map((v: string) => (
            <span
              key={v}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F3EF] text-[#78716C]"
            >
              {v}
            </span>
          ))}
        </div>
      );

    case "CHECKBOX":
      return (
        <span className={`text-sm font-medium ${value ? "text-green-700" : "text-[#A8A29E]"}`}>
          {value ? "Yes" : "No"}
        </span>
      );

    case "LOCATION":
      // Check if this is nearbyPlaces (array of {category, distance, unit})
      if (field.key === 'nearbyPlaces' && Array.isArray(value)) {
        if (value.length === 0) return <span className="text-[#A8A29E] text-sm italic">Not specified</span>;

        // Icon mapping for nearby places
        const iconMap: Record<string, React.ReactNode> = {
          'Hospital': <Pill size={16} className="text-[#C9A84C]" />,
          'School': <Home size={16} className="text-[#C9A84C]" />,
          'Shopping Mall': <ShoppingBag size={16} className="text-[#C9A84C]" />,
          'Airport': <Plane size={16} className="text-[#C9A84C]" />,
          'Railway Station': <Train size={16} className="text-[#C9A84C]" />,
          'Metro Station': <Train size={16} className="text-[#C9A84C]" />,
          'Bus Stand': <Bus size={16} className="text-[#C9A84C]" />,
          'Bank': <Building size={16} className="text-[#C9A84C]" />,
          'Pharmacy': <Pill size={16} className="text-[#C9A84C]" />,
          'Restaurant': <Utensils size={16} className="text-[#C9A84C]" />,
        };

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {value.map((place: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2.5 bg-[#FAFAF8] rounded-lg px-3 py-2 border border-[#E7E5E4]">
                <span className="text-[#C9A84C] shrink-0">
                  {iconMap[place.category] || <MapPin size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#78716C] truncate">{place.category}</p>
                  <p className="text-sm font-semibold text-[#1C1917]">
                    {place.distance} <span className="text-xs font-medium text-[#A8A29E]">{place.unit || 'km'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        );
      }
      // Standard LOCATION display
      return (
        <div className="space-y-2">
          {value?.address && (
            <p className="text-[#1C1917] text-sm">{value.address}</p>
          )}
          {value?.iframe && (
            <div className="rounded-lg overflow-hidden border border-[#E7E5E4]">
              <div dangerouslySetInnerHTML={{ __html: value.iframe }} />
            </div>
          )}
        </div>
      );

    case "IMAGE":
    case "IMAGE_MULTI": {
      const images = attachments || [];
      if (images.length === 0) return <span className="text-[#A8A29E] text-sm italic">No images</span>;
      return (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img: any, idx: number) => (
            <div
              key={idx}
              className={`relative rounded-lg overflow-hidden bg-[#F5F3EF] ${
                img.isCover ? "ring-2 ring-[#C9A84C]" : ""
              }`}
            >
              <img
                src={img.url}
                alt={`Image ${idx + 1}`}
                className="w-full h-24 object-cover"
              />
              {img.isCover && (
                <div className="absolute top-1 left-1 bg-[#C9A84C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "FILE": {
      const files = attachments || [];
      if (files.length === 0) return <span className="text-[#A8A29E] text-sm italic">No files</span>;
      return (
        <div className="space-y-1.5">
          {files.map((f: any, idx: number) => (
            <a
              key={idx}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#8B6914] underline"
            >
              {f.url.split("/").pop()}
            </a>
          ))}
        </div>
      );
    }

    case "DATERANGE": {
      return <span className="text-sm">{value}</span>;
    }

    default:
      return <span className="text-[#1C1917]">{value ?? "Not provided"}</span>;
  }
}
