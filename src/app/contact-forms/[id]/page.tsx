"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import {
  fetchContactFormSubmissions,
  updateContactFormSubmissionStatus,
  deleteContactFormSubmission,
} from "@/src/services/api";
import { useAuthGuard } from "@/src/hooks/useAuthGuard";
import { hasContactFormAccess, getDefaultAllowedRoute } from "@/src/lib/permissions";

interface FormSubmissionItem {
  form_id: number;
  form_post_id: number;
  form_date: string;
  status: "read" | "unread" | string;
  fields: Record<string, any>;
}

interface FormInfo {
  id: number;
  name: string;
}

function formatDisplayValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "object" ? (v?.filename || JSON.stringify(v)) : String(v))).join(", ");
  }
  if (typeof val === "object") {
    if (val.filename) return val.filename;
    if (val.url) return "File Attachment";
    return JSON.stringify(val);
  }
  return String(val);
}

export default function ContactFormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const formId = resolvedParams.id;
  const router = useRouter();
  const { token, ready, profile } = useAuthGuard();

  const [formInfo, setFormInfo] = useState<FormInfo | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected Submission Modal
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmissionItem | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const limit = 20;

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const loadSubmissions = async (
    authToken: string,
    fId: string,
    page: number,
    searchVal: string,
    stat: string
  ) => {
    try {
      setIsLoading(true);
      const res = await fetchContactFormSubmissions(
        authToken,
        fId,
        page,
        limit,
        searchVal,
        stat
      );
      if (res.success) {
        setFormInfo(res.form);
        setColumns(res.columns || []);
        setSubmissions(res.submissions || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalItems(res.pagination?.total || 0);
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load submissions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !profile) return;
    if (!hasContactFormAccess(profile)) {
      router.replace(getDefaultAllowedRoute(profile));
    }
  }, [ready, profile, router]);

  useEffect(() => {
    if (!ready || !token) return;
    if (profile && !hasContactFormAccess(profile)) return;
    loadSubmissions(token, formId, currentPage, searchQuery, statusFilter);
  }, [ready, token, profile, formId, currentPage, statusFilter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;
    setCurrentPage(1);
    loadSubmissions(token, formId, 1, searchQuery, statusFilter);
  };

  const handleStatusToggle = async (submission: FormSubmissionItem) => {
    if (!token) return;
    const newStatus = submission.status === "read" ? "unread" : "read";
    try {
      setIsUpdatingStatus(true);
      await updateContactFormSubmissionStatus(token, submission.form_id, newStatus);
      setSubmissions((prev) =>
        prev.map((s) => (s.form_id === submission.form_id ? { ...s, status: newStatus } : s))
      );
      if (selectedSubmission && selectedSubmission.form_id === submission.form_id) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
      showNotification(`Marked as ${newStatus}`);
    } catch (err: any) {
      showNotification(err.message || "Failed to update status", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async (submissionId: number) => {
    if (!confirm(`Are you sure you want to delete submission #${submissionId}?`)) return;
    if (!token) return;
    try {
      await deleteContactFormSubmission(token, submissionId);
      setSubmissions((prev) => prev.filter((s) => s.form_id !== submissionId));
      setTotalItems((prev) => Math.max(0, prev - 1));
      if (selectedSubmission?.form_id === submissionId) {
        setSelectedSubmission(null);
      }
      showNotification("Submission deleted successfully");
    } catch (err: any) {
      showNotification(err.message || "Failed to delete submission", "error");
    }
  };

  // Export submissions to CSV in client
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      showNotification("No submissions to export", "error");
      return;
    }

    const fieldKeys = columns.length > 0 ? columns : Object.keys(submissions[0].fields || {});
    const headers = ["Submission ID", "Date", "Status", ...fieldKeys.map((k) => k.replace(/[-_]/g, " ").toUpperCase())];

    const rows = submissions.map((s) => {
      const fieldValues = fieldKeys.map((k) => {
        const val = s.fields[k];
        return formatDisplayValue(val).replace(/"/g, '""');
      });
      return [s.form_id, s.form_date, s.status, ...fieldValues];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${formInfo?.name || "form"}_submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Choose top 4 primary columns for clean table display
  const primaryDisplayColumns = columns.slice(0, 4);

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
            <div
              className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium flex items-center gap-2.5 transition-all ${
                notification.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              <span>{notification.message}</span>
            </div>
          )}

          {/* Breadcrumb & Top Bar */}
          <div className="bg-white border-b border-gray-200 py-3 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <Link
                href="/contact-forms"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200/80 px-2.5 py-1.5 rounded-md transition-colors"
                title="Back to Contact Forms"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>All Forms</span>
              </Link>

              <div className="h-4 w-px bg-gray-300"></div>

              <div>
                <h1 className="text-base font-bold text-gray-900 font-sans tracking-tight">
                  {formInfo?.name || `Form #${formId}`}
                </h1>
                <span className="text-[11px] text-gray-500 font-sans">
                  Captured submissions &amp; form inquiries
                </span>
              </div>

              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 font-sans ml-1">
                {totalItems} {totalItems === 1 ? "Entry" : "Entries"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={submissions.length === 0}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Export submissions to CSV file"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => token && loadSubmissions(token, formId, currentPage, searchQuery, statusFilter)}
                disabled={isLoading}
                className="text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-250 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                title="Refresh submissions"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-red-600" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
              <div className="relative flex-1">
                <svg
                  className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search in submissions (name, email, query...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-250 rounded-md text-xs focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] outline-none font-sans"
                />
              </div>
              <button
                type="submit"
                className="text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 px-3.5 py-1.5 rounded-md shadow-xs transition-colors whitespace-nowrap"
              >
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    if (token) loadSubmissions(token, formId, 1, "", statusFilter);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                >
                  Reset
                </button>
              )}
            </form>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium font-sans">
                <span>Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-gray-50 border border-gray-250 rounded-md px-2.5 py-1 text-xs text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#E31E24] focus:border-[#E31E24] font-sans font-medium"
                >
                  <option value="all">All Submissions</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions Table Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
              <div className="overflow-x-auto relative min-h-[300px]">
                {isLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-md">
                      <svg className="animate-spin h-4 w-4 text-[#E31E24]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-700 font-sans">Loading submissions...</span>
                    </div>
                  </div>
                )}

                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-bold w-16">ID</th>
                      <th className="py-3 px-4 font-bold w-36">Date</th>
                      {primaryDisplayColumns.map((colKey) => (
                        <th key={colKey} className="py-3 px-4 font-bold capitalize">
                          {colKey.replace(/[-_]/g, " ")}
                        </th>
                      ))}
                      <th className="py-3 px-4 font-bold text-center w-24">Status</th>
                      <th className="py-3 px-4 font-bold text-right w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={primaryDisplayColumns.length + 4} className="py-14 text-center text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                            </div>
                            <span className="font-semibold text-gray-600 text-xs">No submissions found</span>
                            <p className="text-[11px] text-gray-400 max-w-sm">
                              {searchQuery || statusFilter !== "all"
                                ? "No entries matched your search or status filter."
                                : "No submissions have been recorded for this form yet."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => {
                        const isUnread = sub.status !== "read";
                        return (
                          <tr
                            key={sub.form_id}
                            onClick={() => setSelectedSubmission(sub)}
                            className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${
                              isUnread ? "bg-amber-50/20 font-medium" : ""
                            }`}
                          >
                            <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                              #{sub.form_id}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-[11px] font-mono whitespace-nowrap">
                              {sub.form_date}
                            </td>
                            {primaryDisplayColumns.map((colKey) => {
                              const cellVal = sub.fields[colKey];
                              const displayVal = formatDisplayValue(cellVal);

                              return (
                                <td key={colKey} className="py-3 px-4 text-gray-800 max-w-xs truncate font-sans text-xs">
                                  {displayVal}
                                </td>
                              );
                            })}
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isUnread
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                }`}
                              >
                                {sub.status || "unread"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubmission(sub)}
                                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded transition-colors"
                                  title="View submission details"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(sub)}
                                  className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                                  title={sub.status === "read" ? "Mark as unread" : "Mark as read"}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(sub.form_id)}
                                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                                  title="Delete submission"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="bg-gray-50/70 border-t border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 font-sans">
                <span>
                  Showing {submissions.length > 0 ? (currentPage - 1) * limit + 1 : 0} to{" "}
                  {Math.min(currentPage * limit, totalItems)} of {totalItems} submissions
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 border border-gray-250 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                    >
                      Previous
                    </button>
                    <span className="px-2 py-1 text-gray-700 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 border border-gray-250 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submission Details Modal */}
          {selectedSubmission && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E31E24] flex items-center justify-center font-bold font-mono text-xs">
                      #{selectedSubmission.form_id}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 font-sans">
                        Submission Details
                      </h3>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {selectedSubmission.form_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        selectedSubmission.status !== "read"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {selectedSubmission.status || "unread"}
                    </span>
                    <button
                      onClick={() => setSelectedSubmission(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200/60"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Body: Fields list */}
                <div className="p-6 overflow-y-auto space-y-3.5 text-xs font-sans">
                  {Object.entries(selectedSubmission.fields || {}).map(([key, val]) => {
                    const isFile =
                      typeof val === "object" &&
                      val !== null &&
                      !Array.isArray(val) &&
                      Boolean(val.url || val.filename);

                    return (
                      <div key={key} className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                          {key.replace(/[-_]/g, " ")}
                        </span>
                        {isFile ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                            </svg>
                            <a
                              href={val.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-medium text-xs break-all"
                            >
                              {val.filename || "Download File"}
                            </a>
                          </div>
                        ) : (
                          <p className="text-gray-900 font-medium whitespace-pre-wrap break-words leading-relaxed">
                            {formatDisplayValue(val)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusToggle(selectedSubmission)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>
                      {selectedSubmission.status === "read" ? "Mark as Unread" : "Mark as Read"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E31E24] hover:bg-red-700 rounded-md shadow-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
