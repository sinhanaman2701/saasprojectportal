"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("superadminToken");
    const isLoginPage = pathname === "/admin/login";
    if (!token && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
