"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Plus, LogOut, Settings } from "lucide-react";

export default function SuperadminHeader() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("superadminToken");
    localStorage.removeItem("superadminEmail");
    router.push("/admin/login");
  };

  return (
    <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-[#1C1917] flex items-center justify-center">
            <span className="text-[#C9A84C] font-bold text-sm">P</span>
          </div>
          <span className="text-[#A8A29E] text-sm font-medium border-l border-[#E7E5E4] pl-3 ml-1 hidden sm:inline">
            Superadmin
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/portals/new"
            className="flex items-center gap-2 text-sm font-medium text-[#1C1917] hover:bg-[#F5F3EF] px-3 py-2 rounded-lg transition-all"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Portal</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF] px-3 py-2 rounded-lg transition-all"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
