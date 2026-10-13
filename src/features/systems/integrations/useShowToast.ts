import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export type ShowToastInput = {
  title: string;
  description?: string;
  variant?: "success" | "error" | "info" | "warning";
};

/** Adapts the integrations pages' { title, description, variant } call shape to the shared toast hook. */
export function useShowToast() {
  const { toasts, addToast, removeToast } = useToast();
  const showToast = useCallback(
    ({ title, description, variant }: ShowToastInput) =>
      addToast({ title, message: description, type: variant }),
    [addToast]
  );
  return { showToast, toasts, removeToast };
}
