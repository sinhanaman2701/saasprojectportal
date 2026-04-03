"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@koltepatil.test');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken', data.response_data.token);
        router.push('/dashboard');
      } else {
        alert(data.status_message || 'Authentication failed.');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Branding Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1C1917]">
        {/* Background image simulation with gradient */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1C1917]/90 via-[#1C1917]/70 to-[#8B6914]/60" />

        {/* Decorative gold line */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#C9A84C] via-[#C9A84C] to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-14">
          <img src="/logo.jpg" alt="Kolte Patil" className="h-10 w-auto object-contain" />

          <div className="space-y-6">
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Manage your<br />
              <span className="text-[#C9A84C]">premium listings</span><br />
              with ease.
            </h1>
            <p className="text-white/60 text-lg max-w-sm leading-relaxed">
              A refined portal for curating exceptional real estate experiences.
            </p>

          </div>

          <p className="text-white/30 text-xs tracking-wide">© 2026 Kolte Patil Developments. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAFAF8]">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/logo.jpg" alt="Kolte Patil" className="h-9 w-auto object-contain" />
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-[#1C1917] tracking-tight mb-2">Welcome back</h2>
            <p className="text-[#78716C] text-base">Sign in to access the admin portal.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1C1917] tracking-wide">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-[#E7E5E4] rounded-[10px] px-4 py-3.5 text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all text-base"
                placeholder="admin@koltepatil.test"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1C1917] tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-[#E7E5E4] rounded-[10px] px-4 py-3.5 pr-12 text-[#1C1917] placeholder-[#A8A29E] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 outline-none transition-all text-base"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#78716C] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C9A84C] hover:bg-[#8B6914] disabled:opacity-60 text-white rounded-[10px] py-4 font-bold text-base shadow-md hover:shadow-lg transition-all duration-200 mt-6 tracking-wide"
            >
              {loading ? 'Signing in...' : 'Sign In to Portal'}
            </button>
          </form>

          <p className="text-center text-[#A8A29E] text-xs mt-8">Prototype credentials shown on login page</p>
        </div>
      </div>
    </div>
  );
}
