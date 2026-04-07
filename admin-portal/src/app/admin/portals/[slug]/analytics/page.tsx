"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import SuperadminHeader from "@/components/SuperadminHeader";
import { ArrowLeft, BarChart3, TrendingUp, FileBox, Archive, FileEdit, Eye } from "lucide-react";

type Stats = {
  total: number;
  active: number;
  drafts: number;
  archived: number;
  topProjects: { id: number; clickCount: number; lastUpdated: string }[];
};

type Tenant = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
};

export default function AnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("superadminToken");
        if (!token) {
          window.location.href = "/admin/login";
          return;
        }

        // Fetch tenant info
        const tenantRes = await fetch(`http://localhost:3002/admin/portals/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tenantData = await tenantRes.json();
        if (tenantData.status_code === 200) {
          setTenant(tenantData.response_data);
        }

        // Fetch stats
        const statsRes = await fetch(`http://localhost:3002/api/${slug}/projects/stats`);
        const statsData = await statsRes.json();
        if (statsData.status_code === 200) {
          setStats(statsData.response_data);
        } else {
          setError(statsData.status_message || "Failed to load stats");
        }

        setLoading(false);
      } catch {
        setError("Unable to connect to server");
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <SuperadminHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center">
          <div className="text-[#78716C]">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <SuperadminHeader />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Link href={`/admin/portals/${slug}`} className="inline-flex items-center gap-2 text-sm text-[#78716C] hover:text-[#1C1917] mb-6">
            <ArrowLeft size={15} /> Back to portal
          </Link>
          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg">
            {error || "Failed to load analytics"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <SuperadminHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <Link href={`/admin/portals/${slug}`} className="inline-flex items-center gap-2 text-sm text-[#78716C] hover:text-[#1C1917] mb-6">
          <ArrowLeft size={15} /> Back to portal
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#C9A84C] flex items-center justify-center text-white font-bold">
              {tenant?.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-[#1C1917]">{tenant?.name} Analytics</h1>
            <p className="text-[#78716C] text-sm">/{slug}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<FileBox size={20} />}
            label="Total Projects"
            value={stats.total}
            color="#1C1917"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Active"
            value={stats.active}
            color="#059669"
          />
          <StatCard
            icon={<FileEdit size={20} />}
            label="Drafts"
            value={stats.drafts}
            color="#D97706"
          />
          <StatCard
            icon={<Archive size={20} />}
            label="Archived"
            value={stats.archived}
            color="#DC2626"
          />
        </div>

        {/* Top Projects Table */}
        <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7E5E4] bg-[#FAFAF8] flex items-center gap-3">
            <BarChart3 size={18} className="text-[#78716C]" />
            <h2 className="text-sm font-semibold text-[#1C1917]">Top Projects by Views</h2>
          </div>
          {stats.topProjects.length === 0 ? (
            <div className="p-12 text-center text-[#78716C] text-sm">
              No projects yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#FAFAF8]">
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Rank</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Project ID</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Clicks</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {stats.topProjects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-[#FAFAF8]/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        idx === 0 ? "bg-[#C9A84C] text-white" :
                        idx === 1 ? "bg-[#E7E5E4] text-[#1C1917]" :
                        idx === 2 ? "bg-[#F5F3EF] text-[#78716C]" :
                        "text-[#A8A29E]"
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-[#78716C]">#{project.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Eye size={14} className="text-[#A8A29E]" />
                        <span className="text-sm font-medium text-[#1C1917]">{project.clickCount.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#A8A29E]">
                      {new Date(project.lastUpdated).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E7E5E4] p-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[#78716C] text-xs font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#1C1917]">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
