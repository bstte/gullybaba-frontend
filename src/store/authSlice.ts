import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchUserById, loginAdmin } from "@/src/services/api";

const TOKEN_KEY = "gullybaba_admin_token";
const ADMIN_KEY = "gullybaba_admin_user";
const PROFILE_KEY = "gullybaba_admin_profile";

export interface AdminUser {
  id: number;
  username: string;
  name?: string;
  email?: string;
  roles?: string[];
}

export interface CustomerProfile {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  mobile: string | null;
  billing?: Record<string, string> | null;
  shipping?: Record<string, string> | null;
  date_created: string;
  avatar_url?: string | null;
}

interface AuthState {
  token: string | null;
  admin: AdminUser | null;
  profile: CustomerProfile | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  admin: null,
  profile: null,
  status: "idle",
  error: null,
};

export interface StoredAuth {
  token: string;
  admin: AdminUser;
  profile: CustomerProfile | null;
}

export function loadAuthFromStorage(): StoredAuth | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(TOKEN_KEY);
  const adminStr = localStorage.getItem(ADMIN_KEY);
  const profileStr = localStorage.getItem(PROFILE_KEY);

  if (!token || !adminStr) return null;

  try {
    return {
      token,
      admin: JSON.parse(adminStr),
      profile: profileStr ? JSON.parse(profileStr) : null,
    };
  } catch (e) {
    return null;
  }
}

function persistAuth(token: string, admin: AdminUser, profile: CustomerProfile | null) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  if (profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials: { username: string; password: string }) => {
    const loginRes = await loginAdmin(credentials);
    if (!loginRes.success || !loginRes.token) {
      throw new Error(loginRes.message || "Invalid credentials");
    }

    const token: string = loginRes.token;
    const admin: AdminUser = loginRes.admin;

    let profile: CustomerProfile | null = null;
    try {
      const profileRes = await fetchUserById(token, admin.id);
      if (profileRes.success) {
        profile = profileRes.user;
      }
    } catch (e) {
      // Profile is a secondary enrichment; login still succeeds without it.
    }

    persistAuth(token, admin, profile);
    return { token, admin, profile };
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrate: (state, action: PayloadAction<StoredAuth>) => {
      state.token = action.payload.token;
      state.admin = action.payload.admin;
      state.profile = action.payload.profile;
      state.status = "succeeded";
    },
    logout: (state) => {
      clearStoredAuth();
      state.token = null;
      state.admin = null;
      state.profile = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload.token;
        state.admin = action.payload.admin;
        state.profile = action.payload.profile;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Login failed";
      });
  },
});

export const { hydrate, logout } = authSlice.actions;
export default authSlice.reducer;
