"use client";

import React from "react";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  currentCount?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  currentCount,
  onPageChange,
  itemLabel = "items",
  className = "",
}: TablePaginationProps) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const to =
    currentCount !== undefined
      ? (currentPage - 1) * itemsPerPage + currentCount
      : Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={`bg-slate-50/70 border-t border-slate-200/80 py-3.5 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 ${className}`}
    >
      <div className="text-xs text-slate-500 font-sans font-medium">
        Showing <span className="font-semibold text-slate-900">{from}</span>
        {totalItems > 0 && from !== to && (
          <>
            {" "}to <span className="font-semibold text-slate-900">{to}</span>
          </>
        )}{" "}
        of <span className="font-semibold text-slate-900">{totalItems.toLocaleString("en-IN")}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
        >
          <span>‹</span>
          <span>Previous</span>
        </button>

        <span className="text-xs text-slate-600 font-medium font-sans px-2">
          Page <strong className="text-slate-900 font-bold">{currentPage}</strong> of{" "}
          <strong className="text-slate-900 font-bold">{Math.max(1, totalPages)}</strong>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors font-sans cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
        >
          <span>Next</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
}
