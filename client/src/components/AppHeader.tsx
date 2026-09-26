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
    <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:shrink-0">
      <div className="min-w-0 flex-1">
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
      </div>
      <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
        <nav className="flex w-full gap-2 sm:w-auto sm:flex-wrap">
          <a
            href="/"
            className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium sm:min-h-0 sm:flex-none sm:py-1.5 ${
              isPlayground
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Playground
          </a>
          <a
            href="/docs"
            className={`flex min-h-11 flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium sm:min-h-0 sm:flex-none sm:py-1.5 ${
              !isPlayground
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Documentation
          </a>
        </nav>
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
        <div className="flex w-full items-center justify-between gap-3 text-sm text-slate-600 sm:w-auto sm:justify-start">
          <span className="min-w-0 truncate">{sessionEmail}</span>
          <Button type="button" variant="ghost" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
