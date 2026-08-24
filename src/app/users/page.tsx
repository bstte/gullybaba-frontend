"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchUsers } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";

interface User {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  mobile: string | null;
  date_created: string;
}

export default function UsersPage() {
  const { token, ready } = useAuthGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const limit = 20;

  // Handle Search Debouncing (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on new search query
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadData = async (token: string, pageNum: number, searchVal: string, roleVal: string) => {
    try {
      setIsLoading(true);
      const res = await fetchUsers(token, pageNum, limit, searchVal, roleVal);
      if (res.success) {
        setUsers(res.users);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.total || 0);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !token) return;
    loadData(token, currentPage, debouncedSearch, selectedRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, currentPage, debouncedSearch, selectedRole]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Top Header */}
      <Header />

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Dynamic page content */}
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
          
          {/* Toast Notification */}
          {notification && (
            <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded shadow-md border text-xs font-medium flex items-center gap-2 animate-bounce ${
              notification.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              <span className="w-1.5 h-1.5 bg-current rounded-full"></span>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Page Header */}
          <div className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-sans">Users Management</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-sans">
                View customer details live from the WooCommerce database.
              </p>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-col md:flex-row items-center gap-4 justify-between shrink-0">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white focus:ring-1 focus:ring-black focus:border-black outline-none font-sans"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs text-gray-500 whitespace-nowrap font-medium font-sans">Filter by Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setCurrentPage(1); // Reset to page 1
                }}
                className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-black focus:border-black font-sans font-medium"
              >
                <option value="">All Roles</option>
                <option value="customer">customer</option>
                <option value="administrator">administrator</option>
              </select>
            </div>
          </div>

          {/* Main Content Area - Table */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto relative min-h-[300px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading data...</span>
                    </div>
                  </div>
                )}
                
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-bold">ID</th>
                      <th className="py-3.5 px-4 font-bold">Name</th>
                      <th className="py-3.5 px-4 font-bold">Username</th>
                      <th className="py-3.5 px-4 font-bold">Email</th>
                      <th className="py-3.5 px-4 font-bold">Mobile</th>
                      <th className="py-3.5 px-4 font-bold">Role</th>
                      <th className="py-3.5 px-4 font-bold">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.625a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l.228.914a3 3 0 00-2.82 2.066m-3.137.893a3 3 0 002.82-2.066m0 0a3 3 0 00-2.82-2.066m0 0V7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-sans font-medium text-gray-500">No users found matching current filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-gray-900">{user.id}</td>
                          <td className="py-3 px-4 text-gray-700 font-medium font-sans">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ""} ${user.last_name || ""}`.trim() 
                              : "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-medium font-sans">{user.username}</td>
                          <td className="py-3 px-4 text-gray-500 font-sans">{user.email || "—"}</td>
                          <td className="py-3 px-4 text-gray-500 font-mono">{user.mobile || "—"}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans ${
                              user.role === "administrator" 
                                ? "bg-purple-50 border-purple-100 text-purple-700"
                                : "bg-gray-100 border-gray-200 text-gray-700"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-sans">
                            {new Date(user.date_created).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
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

          {/* Pagination Footer */}
          <div className="bg-white border-t border-gray-200 py-3.5 px-6 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-500 font-sans font-medium">
              Showing <span className="font-semibold text-gray-900">{users.length}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> users
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 border border-gray-250 px-3 py-1.5 rounded shadow-xs transition-colors font-sans"
              >
                Previous
              </button>
              
              <span className="text-xs text-gray-600 font-medium font-sans px-2">
                Page <strong className="text-gray-900 font-bold">{currentPage}</strong> of <strong className="text-gray-900 font-bold">{totalPages}</strong>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 border border-gray-250 px-3 py-1.5 rounded shadow-xs transition-colors font-sans"
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
