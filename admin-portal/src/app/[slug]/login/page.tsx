"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none";

export default function TenantLoginPage() {
  const router = useRouter();
  const params = useParams() as { slug?: string };
  const slug = params?.slug as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logoUrl: string | null } | null>(null);

  useEffect(() => {
    if (!slug) return;
    // Fetch tenant branding info (public endpoint — no auth needed)
    fetch(`http://localhost:3002/admin/portals/${slug}`, {
      headers: { Authorization: `Bearer invalid` },
    }).catch(() => {});
    // Try the public tenant info endpoint — if it fails, just show generic
    fetch(`http://localhost:3002/admin/portals/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.response_data) {
          setTenantInfo({
            name: d.response_data.name,
            logoUrl: d.response_data.logoUrl,
          });
        }
      })
      .catch(() => {});
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) {
      setError("Invalid portal slug");
      return;
    }
    setError("");
    setLoading(true);

    try {
      console.log("Logging in to:", `http://localhost:3002/api/${slug}/auth/login`);
      console.log("Credentials:", { email, password });

      const res = await fetch(`http://localhost:3002/api/${slug}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (data.status_code !== 200) {
        setError(data.status_message || "Login failed");
        setLoading(false);
        return;
      }

      console.log("Setting localStorage:", {
        tenantToken: data.response_data.token ? "present" : "missing",
        tenantEmail: data.response_data.email,
        tenantSlug: data.response_data.tenantSlug,
      });

      localStorage.setItem("tenantToken", data.response_data.token);
      localStorage.setItem("tenantEmail", data.response_data.email);
      localStorage.setItem("tenantSlug", data.response_data.tenantSlug);

      // Force a small delay to ensure localStorage is written
      setTimeout(() => {
        console.log("Redirecting to:", `/${slug}`);
        router.push(`/${slug}`);
      }, 100);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Unable to connect to server");
      setLoading(false);
    }
  };

  if (!slug) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-[#78716C]">Invalid portal URL.</p>
      </div>
    );
  }

  const tenantName = tenantInfo?.name || slug;
  const color = "#C9A84C";

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            {tenantInfo?.logoUrl ? (
              <img src={tenantInfo.logoUrl} alt={tenantName} className="h-10 w-auto object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: color }}
              >
                {tenantName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-[#1C1917]">{tenantName}</h1>
          <p className="text-[#78716C] mt-1 text-sm">Sign in to your admin portal</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                required
              />
            </div>

            {error && (
              <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
