"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import TenantHeader from "@/components/tenant/TenantHeader";
import { Settings, Lock, User, LogOut } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type Admin = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams() as { slug?: string };
  const slug = params?.slug as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("tenantToken");
    const storedSlug = localStorage.getItem("tenantSlug");

    if (!token || !storedSlug) {
      router.push(`/${slug}/login`);
      return;
    }

    // Fetch admin info
    fetch(`${API}/api/${storedSlug}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status_code === 200) {
          setAdmin(d.response_data);
          // Fetch tenant info with logo from backend
          fetch(`http://localhost:3002/admin/portals/${storedSlug}`)
            .then((r) => r.json())
            .then((td) => {
              setTenantInfo({
                name: td.response_data?.name || storedSlug,
                slug: td.response_data?.slug || storedSlug,
                logoUrl: td.response_data?.logoUrl || null,
              });
            })
            .catch(() => {
              setTenantInfo({
                name: storedSlug,
                slug: storedSlug,
                logoUrl: null,
              });
            });
        } else if (d.status_code === 401) {
          localStorage.removeItem("tenantToken");
          router.push(`/${slug}/login`);
        } else {
          setError(d.status_message || "Failed to load profile");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to connect to server");
        setLoading(false);
      });
  }, [slug, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }

    setPasswordSaving(true);
    const token = localStorage.getItem("tenantToken");
    const storedSlug = localStorage.getItem("tenantSlug");

    try {
      const res = await fetch(`${API}/api/${storedSlug}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await res.json();
      if (meData.status_code === 200) {
        setAdmin(meData.response_data);
      }
    } catch {
      // Ignore errors on me fetch
    }

    try {
      const res = await fetch(`${API}/api/${storedSlug}/auth/change-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (data.status_code === 200) {
        setPasswordMessage({ type: "success", text: "Password changed successfully" });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMessage({ type: "error", text: data.status_message || "Failed to change password" });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Unable to connect to server" });
    }

    setPasswordSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("tenantToken");
    localStorage.removeItem("tenantSlug");
    router.push(`/${slug}/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#78716C] text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error || !admin) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center gap-4">
        <div className="text-[#DC2626]">{error || "Not authenticated"}</div>
        <Link
          href={`/${slug}/login`}
          className="text-sm text-[#78716C] hover:text-[#1C1917] underline"
        >
          ← Back to login
        </Link>
      </div>
    );
  }

  if (!tenantInfo) return null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <TenantHeader
        tenantName={tenantInfo.name}
        tenantSlug={tenantInfo.slug}
        logoUrl={tenantInfo.logoUrl}
      />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1C1917] mb-1">Settings</h1>
          <p className="text-[#78716C] text-sm">Manage your account settings and preferences.</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center gap-3">
              <User size={18} className="text-[#78716C]" />
              <h2 className="text-sm font-semibold text-[#1C1917]">Profile</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#78716C] uppercase tracking-wide mb-1">
                  Email Address
                </label>
                <p className="text-[#1C1917] font-mono text-sm">{admin.email}</p>
              </div>
              {admin.name && (
                <div>
                  <label className="block text-xs font-medium text-[#78716C] uppercase tracking-wide mb-1">
                    Full Name
                  </label>
                  <p className="text-[#1C1917]">{admin.name}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#78716C] uppercase tracking-wide mb-1">
                  Member Since
                </label>
                <p className="text-[#1C1917]">
                  {new Date(admin.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Password Change Card */}
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center gap-3">
              <Lock size={18} className="text-[#78716C]" />
              <h2 className="text-sm font-semibold text-[#1C1917]">Change Password</h2>
            </div>
            <div className="px-6 py-5">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                    className="flex h-10 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      placeholder="Min. 8 characters"
                      className="flex h-10 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none"
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1917] mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      placeholder="Re-enter new password"
                      className="flex h-10 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {passwordMessage && (
                  <div
                    className={`text-sm px-4 py-3 rounded-lg ${
                      passwordMessage.type === "success"
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="h-10 px-6 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                  >
                    {passwordSaving ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Logout Card */}
          <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E7E5E4] flex items-center gap-3">
              <LogOut size={18} className="text-[#DC2626]" />
              <h2 className="text-sm font-semibold text-[#DC2626]">Danger Zone</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-[#78716C] mb-4">
                Logging out will clear your session and require you to sign in again.
              </p>
              <button
                onClick={handleLogout}
                className="h-10 px-6 bg-[#FEF2F2] hover:bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] font-medium rounded-lg transition-colors text-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
