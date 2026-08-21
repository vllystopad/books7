"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home after 2 seconds
    const timer = setTimeout(() => {
      router.push("/");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-2">Page not found</p>
        <p className="text-slate-500">Redirecting to home in 2 seconds...</p>
      </div>
    </main>
  );
}
