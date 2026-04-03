"use client";
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="/logo.jpg" alt="Kolte Patil" className="h-8 w-auto object-contain" />
          <span className="hidden sm:inline text-[#A8A29E] text-sm font-medium border-l border-[#E7E5E4] pl-3 ml-1">
            Admin Portal
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF] px-3 py-2 rounded-lg transition-all"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
