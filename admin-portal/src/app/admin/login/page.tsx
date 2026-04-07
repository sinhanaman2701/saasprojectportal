"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "flex h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus-visible:border-[#C9A84C] focus-visible:ring-[3px] focus-visible:ring-[#C9A84C]/20 focus-visible:outline-none";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3002/superadmin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.status_code !== 200) {
        setError(data.status_message || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("superadminToken", data.response_data.token);
      localStorage.setItem("superadminEmail", data.response_data.email);
      router.push("/admin");
    } catch {
      setError("Unable to connect to server");
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3002/superadmin/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.status_code !== 201) {
        setError(data.status_message || "Registration failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("superadminToken", data.response_data.token);
      localStorage.setItem("superadminEmail", data.response_data.email);
      router.push("/admin");
    } catch {
      setError("Unable to connect to server");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1C1917] flex items-center justify-center">
              <span className="text-[#C9A84C] font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-semibold text-[#1C1917]">Portal Platform</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1C1917]">Superadmin Access</h1>
          <p className="text-[#78716C] mt-1 text-sm">Sign in to manage tenant portals</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E7E5E4] p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1C1917] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@example.com"
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

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#C9A84C] hover:bg-[#8B6914] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="w-full h-11 bg-white border border-[#E7E5E4] hover:border-[#C9A84C] text-[#1C1917] font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                Create Superadmin Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
