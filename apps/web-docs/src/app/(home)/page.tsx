"use client";
import { useRouter } from "next/navigation";
import React from "react";
export default function HomePage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace("/docs");
  }, [router]);

  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-24">
      <div>redirecting...</div>
    </main>
  );
}
