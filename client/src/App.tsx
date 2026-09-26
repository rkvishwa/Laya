import { useEffect, useState } from "react";
import { parseJsonResponse } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { Playground } from "./components/Playground";
import { DocsPage } from "./components/DocsPage";
import { usePathname } from "./hooks/usePathname";

export default function App() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<"admin" | "guest">("admin");
  const [authLoading, setAuthLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch("/api/session", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return parseJsonResponse<{ email?: string; role?: "admin" | "guest" }>(
          r,
        );
      })
      .then((data) => {
        setSessionEmail(data.email || "user");
        setSessionRole(data.role === "guest" ? "guest" : "admin");
      })
      .catch(() => {
        setSessionEmail(null);
        setSessionRole("admin");
      })
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
    setSessionRole("admin");
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking session…
      </div>
    );
  }

  if (!sessionEmail) {
    return (
      <LoginScreen
        onSuccess={(email, role) => {
          setSessionEmail(email);
          setSessionRole(role);
        }}
      />
    );
  }

  if (pathname === "/docs" || pathname === "/docs/") {
    return (
      <DocsPage
        sessionEmail={sessionEmail}
        sessionRole={sessionRole}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Playground
      sessionEmail={sessionEmail}
      sessionRole={sessionRole}
      onLogout={handleLogout}
    />
  );
}
