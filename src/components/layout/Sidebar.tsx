"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/src/store/hooks";
import { hasOrdersAccess } from "@/src/lib/permissions";

export default function Sidebar() {
  const pathname = usePathname();
  const profile = useAppSelector((state) => state.auth.profile);

  const models = [
    { name: "Dashboard Overview", path: "/dashboard", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
    { name: "Users", path: "/users", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { name: "Orders", path: "/orders", icon: "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z", requiresOrdersAccess: true },
    { name: "Products", path: "/products", icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" },
    { name: "Coupons", path: "/coupons", icon: "M9 14.25l6-6m4.5-3.493V21a.75.75 0 01-1.28.53l-2.22-2.22-2.22 2.22a.75.75 0 01-1.06 0l-2.22-2.22-2.22 2.22a.75.75 0 01-1.28-.53V4.757c0-.52.263-1 .693-1.28A17.756 17.756 0 0112 2.25c2.787 0 5.426.634 7.787 1.777.43.28.693.76.693 1.28z" },
    { name: "Blog", path: "/blog", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
    { name: "Abandoned Carts", path: "/abandoned-carts", icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.116 60.116 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" }
  ].filter((model) => !model.requiresOrdersAccess || hasOrdersAccess(profile));

  return (
    <aside className="w-60 bg-[#0f172a] border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-800 bg-[#1e293b]/20">
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block font-sans">
          Core Modules
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {models.map((model) => {
          const isActive = pathname === model.path;
          return (
            <Link
              key={model.name}
              href={model.path}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-left text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#E31E24] text-white font-bold shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4 shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={model.icon} />
              </svg>
              <span>{model.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
