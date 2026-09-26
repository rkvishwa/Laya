import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

const PRODUCT_NAME = "Brainvave Decision Model";

interface AppHeaderProps {
  sessionEmail: string;
  sessionRole?: "admin" | "guest";
  configured: boolean | null;
  currentPath: "playground" | "docs";
  onLogout: () => void;
}

export function AppHeader({
  sessionEmail,
  sessionRole = "admin",
  configured,
  currentPath,
  onLogout,
}: AppHeaderProps) {
  const isPlayground = currentPath === "playground";
  const configHint =
    sessionRole === "guest"
      ? "Set MODEL_BASE_URL and GUEST_API in .env"
      : "Set MODEL_BASE_URL and MODEL_API_KEY in .env";

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:shrink-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {PRODUCT_NAME}
        </h1>
        {isPlayground ? (
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Compose state and typed questions, then run predictions against your
            configured decision endpoint.
          </p>
        ) : (
          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            How to structure requests, interpret answers, and use the playground.
          </p>
        )}
        <nav className="mt-3 flex flex-wrap gap-2">
          <a
            href="/"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              isPlayground
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Playground
          </a>
          <a
            href="/docs"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              !isPlayground
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Documentation
          </a>
        </nav>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Badge
          variant={
            configured === null ? "default" : configured ? "success" : "warning"
          }
        >
          {configured === null
            ? "Checking config…"
            : configured
              ? "Server configured"
              : configHint}
        </Badge>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{sessionEmail}</span>
          <Button type="button" variant="ghost" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
