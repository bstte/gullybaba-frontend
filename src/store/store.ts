import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/src/store/authSlice";
import uiReducer from "@/src/store/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
