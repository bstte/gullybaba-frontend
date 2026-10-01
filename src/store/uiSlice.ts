"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  sidebarOpen: boolean;
}

const initialState: UIState = {
  sidebarOpen: true,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("gb_sidebar_open", String(state.sidebarOpen));
        } catch {}
      }
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("gb_sidebar_open", String(state.sidebarOpen));
        } catch {}
      }
    },
  },
});

export const { toggleSidebar, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
