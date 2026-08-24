"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import { fetchPosts } from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  link: string;
  status: string;
  date: string;
  modified: string;
  excerpt: string;
  author: string;
}

export default function BlogPage() {
  const { token, ready } = useAuthGuard();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter fields
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const limit = 20;

  const loadData = async (
    token: string,
    pageNum: number,
    searchVal: string,
    statusVal: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetchPosts(
        token,
        pageNum,
        limit,
        searchVal,
        statusVal
      );
      if (res.success) {
        setPosts(res.posts);
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.total || 0);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load blog posts", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !token) return;
    loadData(token, currentPage, searchQuery, selectedStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, currentPage, selectedStatus]);

  const triggerApplyFilters = () => {
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, searchQuery, selectedStatus);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    if (!token) return;
    setCurrentPage(1);
    loadData(token, 1, "", "all");
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Helper function to strip HTML tags from excerpts
  const stripHtml = (html: string) => {
    if (typeof window === "undefined") return html;
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
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
          <div className="bg-white border-b border-gray-200 py-3.5 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-gray-900 font-sans">Blog Posts</h2>
              <button className="text-[10px] font-bold text-[#E31E24] hover:bg-red-50 border border-[#E31E24] px-2 py-0.5 rounded transition-colors font-sans">
                Create post
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
            {/* Left side: Search Blog Posts */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search blog posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && triggerApplyFilters()}
                className="w-full sm:w-64 pl-3 pr-3 py-1.5 bg-gray-50 border border-gray-250 rounded text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
              />
              <button
                onClick={triggerApplyFilters}
                className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 px-4 py-1.5 rounded shadow-xs transition-colors font-sans whitespace-nowrap"
              >
                Search
              </button>
            </div>

            {/* Right side: Status Filter */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap font-medium font-sans">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 border border-gray-250 rounded px-2.5 py-1 text-xs text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="publish">Publish</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="future">Future</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-250 hover:bg-gray-50 px-3 py-1 rounded transition-colors font-sans"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table Content Area */}
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
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading posts...</span>
                    </div>
                  </div>
                )}
                
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-bold">Post Title</th>
                      <th className="py-3.5 px-4 font-bold">Slug</th>
                      <th className="py-3.5 px-4 font-bold">Author</th>
                      <th className="py-3.5 px-4 font-bold">Excerpt Preview</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Date Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {posts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                            <span className="font-sans font-medium text-gray-500">No blog posts found matching the current filters.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      posts.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900 font-sans max-w-[250px] truncate" title={post.title}>
                            <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:text-[#E31E24] transition-colors">
                              {post.title}
                            </a>
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-mono max-w-[200px] truncate" title={post.slug}>
                            {post.slug}
                          </td>
                          <td className="py-3 px-4 text-gray-700 font-semibold font-sans">
                            {post.author}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-sans max-w-[300px] truncate" title={stripHtml(post.excerpt)}>
                            {stripHtml(post.excerpt)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-sans border ${
                              post.status === "publish" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}>
                              {post.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-sans">
                            {new Date(post.date).toLocaleDateString(undefined, {
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
              Showing <span className="font-semibold text-gray-900">{posts.length}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> posts
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
