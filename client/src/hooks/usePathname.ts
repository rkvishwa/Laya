import { useEffect, useState } from "react";

export function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    function sync() {
      setPathname(window.location.pathname);
    }

    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
      sync();
    }

    window.addEventListener("popstate", sync);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener("popstate", sync);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  return pathname;
}
