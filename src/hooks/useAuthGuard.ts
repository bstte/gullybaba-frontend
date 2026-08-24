"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { hydrate, loadAuthFromStorage } from "@/src/store/authSlice";

export function useAuthGuard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, admin, profile } = useAppSelector((state) => state.auth);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      const stored = loadAuthFromStorage();
      if (!stored) {
        router.push("/login");
        return;
      }
      dispatch(hydrate(stored));
    }
    setChecked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { token, admin, profile, ready: checked && !!token };
}
