"use client";

import React from "react";

export interface ScreenOptionsColumn {
  id: string;
  label: string;
}

export interface ScreenOptionsToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  buttonText?: string;
}

export function ScreenOptionsToggle({
  isOpen,
  onToggle,
  className = "",
  buttonText = "Screen Options",
}: ScreenOptionsToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer font-sans select-none ${
        isOpen
          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
          : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-300 shadow-2xs"
      } ${className}`}
      title="Toggle Screen Options"
    >
      <span>{buttonText}</span>
      <span className="text-[9px]">{isOpen ? "▲" : "▼"}</span>
    </button>
  );
}

export interface ScreenOptionsProps {
  isOpen: boolean;
  title?: string;
  // Columns (optional)
  columns?: readonly ScreenOptionsColumn[] | ScreenOptionsColumn[];
  tempColumns?: Record<string, boolean>;
  onToggleColumn?: (id: string, checked: boolean) => void;
  // Pagination
  showPagination?: boolean;
  tempItemsPerPage: string;
  onTempItemsPerPageChange: (val: string) => void;
  onApply: () => void;
  minItemsPerPage?: number;
  maxItemsPerPage?: number;
  children?: React.ReactNode;
}

export function ScreenOptions({
  isOpen,
  title,
  columns,
  tempColumns,
  onToggleColumn,
  showPagination = true,
  tempItemsPerPage,
  onTempItemsPerPageChange,
  onApply,
  minItemsPerPage = 1,
  maxItemsPerPage = 100,
  children,
}: ScreenOptionsProps) {
  if (!isOpen) return null;

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs px-6 py-4 shrink-0 z-20 transition-all">
      <div className="max-w-6xl">
        {title && <h3 className="text-sm font-bold text-slate-900 mb-2.5 font-sans">{title}</h3>}

        {/* Optional Columns Selection */}
        {columns && columns.length > 0 && tempColumns && onToggleColumn && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-800 mb-2 font-sans">Columns</h4>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {columns.map((col) => (
                <label
                  key={col.id}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none hover:text-slate-900 font-sans"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(tempColumns[col.id])}
                    onChange={(e) => onToggleColumn(col.id, e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#E31E24] focus:ring-red-500 accent-[#E31E24] cursor-pointer"
                  />
                  <span className="font-medium">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Extra custom options if any */}
        {children}

        {/* Pagination Selection */}
        {showPagination && (
          <div className={`mb-4 ${columns && columns.length > 0 ? "pt-3 border-t border-slate-100" : ""}`}>
            <h4 className="text-xs font-bold text-slate-800 mb-1.5 font-sans">Pagination</h4>
            <div className="flex items-center gap-2 text-xs text-slate-700 font-sans">
              <label htmlFor="screen-options-items-per-page" className="font-medium">
                Number of items per page:
              </label>
              <input
                id="screen-options-items-per-page"
                type="number"
                min={minItemsPerPage}
                max={maxItemsPerPage}
                value={tempItemsPerPage}
                onChange={(e) => onTempItemsPerPageChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onApply()}
                className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-[#E31E24] focus:ring-1 focus:ring-red-500 font-mono shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* Apply Button */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onApply}
            className="px-4 py-1.5 bg-[#E31E24] hover:bg-red-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer font-sans"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
