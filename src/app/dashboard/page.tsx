"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import {
  fetchAbandonedCarts,
  fetchCoupons,
  fetchOrders,
  fetchPosts,
  fetchProducts,
  fetchUsers,
} from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";

interface RecentOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  currency: string;
  billing: {
    first_name: string;
    last_name: string;
  };
}

interface StatCard {
  name: string;
  path: string;
  icon: string;
  count: number | null;
}

const STAT_ICONS: Record<string, string> = {
  Users: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  Orders: "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  Products: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
  Coupons: "M9 14.25l6-6m4.5-3.493V21a.75.75 0 01-1.28.53l-2.22-2.22-2.22 2.22a.75.75 0 01-1.06 0l-2.22-2.22-2.22 2.22a.75.75 0 01-1.28-.53V4.757c0-.52.263-1 .693-1.28A17.756 17.756 0 0112 2.25c2.787 0 5.426.634 7.787 1.777.43.28.693.76.693 1.28z",
  "Blog Posts": "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  "Abandoned Carts": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.116 60.116 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
};

const getStatusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (normalized === "processing") return "bg-blue-50 border-blue-200 text-blue-800";
  if (normalized === "pending" || normalized === "pending payment") return "bg-amber-50 border-amber-200 text-amber-800";
  if (normalized === "on-hold" || normalized === "on hold") return "bg-gray-100 border-gray-200 text-gray-800";
  if (normalized === "failed" || normalized === "cancelled") return "bg-red-50 border-red-200 text-red-800";
  return "bg-slate-50 border-slate-200 text-slate-800";
};

export default function DashboardOverviewPage() {
  const { token, admin, profile, ready } = useAuthGuard();
  const [stats, setStats] = useState<StatCard[]>([
    { name: "Users", path: "/users", icon: STAT_ICONS.Users, count: null },
    { name: "Orders", path: "/orders", icon: STAT_ICONS.Orders, count: null },
    { name: "Products", path: "/products", icon: STAT_ICONS.Products, count: null },
    { name: "Coupons", path: "/coupons", icon: STAT_ICONS.Coupons, count: null },
    { name: "Blog Posts", path: "/blog", icon: STAT_ICONS["Blog Posts"], count: null },
    { name: "Abandoned Carts", path: "/abandoned-carts", icon: STAT_ICONS["Abandoned Carts"], count: null },
  ]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!ready || !token) return;

    Promise.allSettled([
      fetchUsers(token, 1, 1),
      fetchOrders(token, 1, 5),
      fetchProducts(token, 1, 1),
      fetchCoupons(token, 1, 1),
      fetchPosts(token, 1, 1),
      fetchAbandonedCarts(token, 1, 1),
    ]).then(([usersRes, ordersRes, productsRes, couponsRes, postsRes, cartsRes]) => {
      const totalOf = (res: PromiseSettledResult<any>) =>
        res.status === "fulfilled" && res.value.success ? res.value.pagination?.total ?? 0 : 0;

      setStats([
        { name: "Users", path: "/users", icon: STAT_ICONS.Users, count: totalOf(usersRes) },
        { name: "Orders", path: "/orders", icon: STAT_ICONS.Orders, count: totalOf(ordersRes) },
        { name: "Products", path: "/products", icon: STAT_ICONS.Products, count: totalOf(productsRes) },
        { name: "Coupons", path: "/coupons", icon: STAT_ICONS.Coupons, count: totalOf(couponsRes) },
        { name: "Blog Posts", path: "/blog", icon: STAT_ICONS["Blog Posts"], count: totalOf(postsRes) },
        { name: "Abandoned Carts", path: "/abandoned-carts", icon: STAT_ICONS["Abandoned Carts"], count: totalOf(cartsRes) },
      ]);

      if (ordersRes.status === "fulfilled" && ordersRes.value.success) {
        setRecentOrders(ordersRes.value.orders || []);
      }
      setStatsLoading(false);
    });
  }, [ready, token]);

  if (!ready) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white text-gray-500 font-sans">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const displayName = admin?.name || admin?.username || "Admin";

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Dynamic page content */}
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">

          {/* Title Header */}
          <div className="bg-white border-b border-gray-200 py-4 px-6 shrink-0">
            <h2 className="text-base font-bold text-gray-900 font-sans">Dashboard Overview</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-sans">Welcome to your administration panel overview.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
      

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <Link
                  key={stat.name}
                  href={stat.path}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex items-center justify-between hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block font-sans">{stat.name}</span>
                    {statsLoading ? (
                      <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1.5" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-900 mt-1 block font-sans">
                        {stat.count?.toLocaleString() ?? "—"}
                      </span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#E31E24]/10 flex items-center justify-center text-gray-600 group-hover:text-[#E31E24] transition-colors shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 font-sans">Recent Orders</h3>
                <Link href="/orders" className="text-[10px] font-bold text-[#E31E24] hover:underline font-sans uppercase tracking-wider">
                  View all
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-5 font-bold">Order</th>
                      <th className="py-2.5 px-5 font-bold">Customer</th>
                      <th className="py-2.5 px-5 font-bold">Status</th>
                      <th className="py-2.5 px-5 font-bold">Total</th>
                      <th className="py-2.5 px-5 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={5} className="py-3.5 px-5">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 font-sans">
                          No recent orders found.
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-5 font-mono font-semibold text-gray-900">#{order.id}</td>
                          <td className="py-3 px-5 text-gray-700 font-medium font-sans">
                            {`${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() || "—"}
                          </td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans capitalize ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-gray-900 font-semibold font-mono">
                            {order.currency} {order.total}
                          </td>
                          <td className="py-3 px-5 text-gray-400 font-sans">
                            {new Date(order.date_created).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
