import { useState } from "react";
import { parseJsonResponse } from "../lib/api";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle } from "./ui/Card";
import { Input, Label } from "./ui/Field";

interface LoginScreenProps {
  onSuccess: (email: string, role: "admin" | "guest") => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await parseJsonResponse<{
        email?: string;
        role?: "admin" | "guest";
        error?: string;
        detail?: string;
      }>(res);

      if (!res.ok) {
        setError(payload.detail || payload.error || `Login failed (${res.status})`);
        return;
      }

      onSuccess(payload.email || email, payload.role === "guest" ? "guest" : "admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Brainvave Decision Model</CardTitle>
        </CardHeader>

        <p className="mb-4 text-sm text-slate-600">
          Sign in with the admin credentials configured on the server, or with a
          guest account if your operator has enabled one.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Label>
            Email
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Label>

          <Label>
            Password
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Label>

          {error && <Alert variant="warning">{error}</Alert>}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 font-semibold"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
