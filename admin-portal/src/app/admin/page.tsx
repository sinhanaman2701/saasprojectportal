"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SuperadminHeader from "@/components/SuperadminHeader";
import { LayoutDashboard, Plus, LogOut, Trash2 } from "lucide-react";

type Tenant = {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  status: "PENDING" | "LIVE" | "SUSPENDED";
  projectCount: number;
  createdAt: string;
};

const statusBadgeClass: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  LIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pending",
  LIVE: "Live",
  SUSPENDED: "Suspended",
};

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleDeleteTenant = async (slug: string, name: string) => {
    if (!confirm(`Delete portal "${name}"? This will delete all fields, projects, and admins. This cannot be undone.`)) {
      return;
    }

    setDeletingSlug(slug);
    setError("");

    try {
      const token = localStorage.getItem("superadminToken");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const res = await fetch(`http://localhost:3002/admin/portals/${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.status_code !== 200) {
        setError(data.status_message || "Failed to delete portal");
        setDeletingSlug(null);
        return;
      }

      setTenants(tenants.filter((t) => t.slug !== slug));
      setDeletingSlug(null);
    } catch {
      setError("Unable to connect to server");
      setDeletingSlug(null);
    }
  };

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem("superadminToken");
      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const res = await fetch("http://localhost:3002/admin/portals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status_code !== 200) {
        setError(data.status_message || "Failed to load");
        setLoading(false);
        return;
      }

      setTenants(data.response_data || []);
      setLoading(false);
    } catch {
      setError("Unable to connect to server");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <SuperadminHeader />
        <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center">
          <div className="text-[#78716C]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <SuperadminHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1C1917]">Tenant Portals</h1>
            <p className="text-[#78716C] mt-1 text-sm">{tenants.length} portal{tenants.length !== 1 ? "s" : ""} configured</p>
          </div>
          <Link
            href="/admin/portals/new"
            className="flex items-center gap-2 h-10 px-5 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
          >
            + New Portal
          </Link>
        </div>

        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {tenants.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E7E5E4] p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F5F3EF] flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard size={20} className="text-[#A8A29E]" />
            </div>
            <h3 className="text-[#1C1917] font-medium mb-1">No portals yet</h3>
            <p className="text-[#78716C] text-sm mb-6">Create your first tenant portal to get started.</p>
            <Link
              href="/admin/portals/new"
              className="inline-flex items-center gap-2 h-10 px-5 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors text-sm"
            >
              + Create First Portal
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E7E5E4] bg-[#FAFAF8]">
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Tenant</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Slug</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Projects</th>
                  <th className="text-left text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-[#78716C] uppercase tracking-wide px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-[#FAFAF8]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {tenant.logoUrl ? (
                          <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#C9A84C] flex items-center justify-center text-white text-xs font-bold">
                            {tenant.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-[#1C1917]">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#78716C] font-mono">{tenant.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[tenant.status]}`}>
                        {statusLabel[tenant.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#78716C]">{tenant.projectCount}</td>
                    <td className="px-6 py-4 text-sm text-[#78716C]">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`/${tenant.slug}/login`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#78716C] hover:text-[#C9A84C] transition-colors"
                          title="Open tenant portal login"
                        >
                          Login →
                        </a>
                        <Link
                          href={`/admin/portals/${tenant.slug}`}
                          className="text-sm font-medium text-[#C9A84C] hover:text-[#8B6914] transition-colors"
                        >
                          Manage →
                        </Link>
                        <button
                          onClick={() => handleDeleteTenant(tenant.slug, tenant.name)}
                          disabled={deletingSlug === tenant.slug}
                          className="p-1.5 hover:bg-[#FEF2F2] rounded-md transition-colors text-[#A8A29E] hover:text-[#DC2626] disabled:opacity-50"
                          title="Delete portal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
