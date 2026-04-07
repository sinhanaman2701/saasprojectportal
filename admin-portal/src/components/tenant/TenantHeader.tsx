"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

type Props = {
  tenantName: string;
  tenantSlug: string;
  logoUrl?: string | null;
};

export default function TenantHeader({ tenantName, tenantSlug, logoUrl }: Props) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("tenantToken");
    localStorage.removeItem("tenantEmail");
    localStorage.removeItem("tenantSlug");
    router.push(`/${tenantSlug}/login`);
  };

  const color = "#C9A84C";

  return (
    <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={`/${tenantSlug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} className="h-8 w-auto object-contain" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: color }}
            >
              {tenantName.charAt(0)}
            </div>
          )}
          <span
            className="hidden sm:inline text-sm font-medium border-l border-[#E7E5E4] pl-3 ml-1 text-[#78716C]"
          >
            {tenantName}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/${tenantSlug}/settings`}
            className="flex items-center gap-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F3EF] px-3 py-2 rounded-lg transition-all"
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Settings</span>
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
