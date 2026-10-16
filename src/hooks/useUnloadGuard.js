import { useEffect } from "react";

// Ask before leaving the page while work would be lost: a failed autosave or an AI call in flight.
export function useUnloadGuard(active) {
  useEffect(() => {
    if (!active) return undefined;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);
}
