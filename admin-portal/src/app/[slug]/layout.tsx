"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams() as { slug?: string };
  const slug = params?.slug as string;
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tenantToken");
    const isLoginPage = pathname.includes("/login");

    if (!token && !isLoginPage) {
      router.push(`/${slug}/login`);
    } else {
      setIsChecking(false);
    }
  }, [pathname, router, slug]);

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#78716C] text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
