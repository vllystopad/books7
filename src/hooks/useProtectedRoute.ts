"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useProtectedRoute(isValid: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!isValid) {
      router.push("/");
    }
  }, [isValid, router]);
}
