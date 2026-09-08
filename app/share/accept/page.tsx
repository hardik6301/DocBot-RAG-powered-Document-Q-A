import { Suspense } from "react";
import ShareAcceptClient from "./ShareAcceptClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-surface text-on-surface-variant">
          Loading invite…
        </div>
      }
    >
      <ShareAcceptClient />
    </Suspense>
  );
}
