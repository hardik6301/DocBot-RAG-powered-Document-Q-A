import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-8 text-center text-body-sm text-on-surface-variant">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
