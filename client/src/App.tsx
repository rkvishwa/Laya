import { useEffect, useState } from "react";
import { parseJsonResponse } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { Playground } from "./components/Playground";

export default function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch("/api/session", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return parseJsonResponse<{ email?: string }>(r);
      })
      .then((data) => {
        setSessionEmail(data.email || "user");
      })
      .catch(() => setSessionEmail(null))
      .finally(() => {
        window.clearTimeout(timeout);
        setAuthLoading(false);
      });
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Clear local session even if logout request fails.
    }
    setSessionEmail(null);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking session…
      </div>
    );
  }

  if (!sessionEmail) {
    return <LoginScreen onSuccess={setSessionEmail} />;
  }

  return <Playground sessionEmail={sessionEmail} onLogout={handleLogout} />;
}
