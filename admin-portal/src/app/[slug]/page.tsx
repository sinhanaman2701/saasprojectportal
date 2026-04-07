"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import TenantHeader from "@/components/tenant/TenantHeader";
import { Plus, Grid, List, Search } from "lucide-react";

type Project = {
  id: number;
  status: string;
  isActive: boolean;
  isArchived: boolean;
  isDraft: boolean;
  coverImageUrl: string | null;
  data: Record<string, any>;
  createdAt: string;
};

type Filter = "active" | "archived" | "drafts" | "all";

export default function TenantDashboard() {
  const router = useRouter();
  const params = useParams() as { slug?: string };
  const urlSlug = params?.slug as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [filtered, setFiltered] = useState<Project[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenantInfo, setTenantInfo] = useState<{ name: string; slug: string; logoUrl: string | null } | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Read auth state from localStorage
    const storedToken = localStorage.getItem("tenantToken");
    const storedSlug = localStorage.getItem("tenantSlug");
    setToken(storedToken);

    // Fetch tenant info with logo from backend
    if (storedSlug) {
      fetch(`http://localhost:3002/admin/portals/${storedSlug}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.response_data) {
            setTenantInfo({
              name: d.response_data.name,
              slug: d.response_data.slug,
              logoUrl: d.response_data.logoUrl,
            });
          } else {
            setTenantInfo({
              name: storedSlug,
              slug: storedSlug,
              logoUrl: null,
            });
          }
        })
        .catch(() => {
          setTenantInfo({
            name: storedSlug,
            slug: storedSlug,
            logoUrl: null,
          });
        });
    }
  }, []);

  useEffect(() => {
    if (!urlSlug) return;
    setLoading(true);
    setError("");
    const filterMap: Record<Filter, string> = {
      active: "active",
      archived: "archived",
      drafts: "drafts",
      all: "all",
    };
    const fetchProjects = async () => {
      const fetchToken = localStorage.getItem("tenantToken");
      const res = await fetch(`http://localhost:3002/api/${urlSlug}/projects?filter=${filterMap[filter]}&limit=50`, {
        headers: { Authorization: `Bearer ${fetchToken}` },
      });
      const d = await res.json();
      if (d.status_code !== 200) { setError(d.status_message); setLoading(false); return; }
      setProjects(d.response_data || []);
      setFiltered(d.response_data || []);
      setLoading(false);
    };
    fetchProjects();
  }, [filter, urlSlug]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(projects);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      projects.filter((p) => {
        const name = (p.data?.projectName || "").toLowerCase();
        const location = (p.data?.location || "").toLowerCase();
        return name.includes(q) || location.includes(q);
      })
    );
  }, [search, projects]);

  // Auth check handled by layout - if we render, user is authenticated
  if (!urlSlug || !token) return null;
  if (!tenantInfo) return null;

  const tabs: { key: Filter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "drafts", label: "Drafts" },
    { key: "archived", label: "Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <TenantHeader
        tenantName={tenantInfo.name}
        tenantSlug={tenantInfo.slug}
        logoUrl={tenantInfo.logoUrl}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1C1917]">{tenantInfo.name}</h1>
            <p className="text-[#78716C] mt-1 text-sm">Manage your project listings</p>
          </div>
          <Link
            href={`/${urlSlug}/projects/new`}
            className="flex items-center gap-2 h-10 px-5 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Plus size={16} />
            New Project
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-1 bg-white border border-[#E7E5E4] rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-[#1C1917] text-white"
                    : "text-[#78716C] hover:text-[#1C1917]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 max-w-xs" />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="py-20 text-center text-[#78716C]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-16 text-center">
            <p className="text-[#78716C] mb-4">No projects yet. Create your first listing.</p>
            <Link
              href={`/${urlSlug}/projects/new`}
              className="inline-flex items-center gap-2 h-10 px-5 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
            >
              <Plus size={16} /> New Project
            </Link>
          </div>
        ) : (
          <div className={view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            : "flex flex-col gap-4"
          }>
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                slug={urlSlug}
                view={view}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, slug, view }: {
  project: Project;
  slug: string;
  view: "grid" | "list";
}) {
  const projectName = project.data?.projectName || "Untitled";
  const location = project.data?.location || "";
  const bedrooms = project.data?.bedrooms;
  const price = project.data?.price;

  const statusBadge =
    project.status === "ONGOING" ? "bg-blue-100 text-blue-800" :
    project.status === "LATEST" ? "bg-green-100 text-green-800" :
    "bg-gray-100 text-gray-800";

  return (
    <Link href={`/${slug}/projects/${project.id}`}>
      <div className={`bg-white rounded-xl border border-[#E7E5E4] overflow-hidden hover:shadow-md transition-shadow ${
        view === "list" ? "flex flex-row h-40" : ""
      }`}>
        {/* Cover Image */}
        <div className={`relative ${view === "list" ? "w-56 shrink-0" : "aspect-video"}`}>
          {project.coverImageUrl ? (
            <img src={project.coverImageUrl} alt={projectName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#F5F3EF] flex items-center justify-center">
              <span className="text-[#A8A29E] text-sm">No cover</span>
            </div>
          )}
          {/* Status badge */}
          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge}`}>
            {project.status?.toLowerCase()}
          </span>
          {project.isDraft && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Draft
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 flex flex-col justify-between ${view === "list" ? "flex-1" : ""}`}>
          <div>
            <h3 className="font-semibold text-[#1C1917] truncate">{projectName}</h3>
            {location && <p className="text-sm text-[#78716C] mt-0.5 truncate">{location}</p>}
          </div>
          <div className="flex items-center gap-3 mt-3">
            {bedrooms && (
              <span className="text-xs bg-[#F5F3EF] text-[#78716C] px-2 py-0.5 rounded">
                {bedrooms} BHK
              </span>
            )}
            {price && (
              <span className="text-xs font-medium text-[#C9A84C]">
                {price}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
