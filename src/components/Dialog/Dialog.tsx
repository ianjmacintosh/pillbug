import type { ReactNode } from "react";
import {
  Dialog as AriakitDialog,
  DialogHeading,
  useDialogStore,
} from "@ariakit/react";
import "./Dialog.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * When false, Escape and outside clicks are disabled — the dialog can only
   * be closed by an explicit in-dialog action. Use for confirmations where a
   * silent dismissal would be ambiguous (e.g. "did that mean Leave or Stay?").
   */
  dismissible?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: DialogProps) {
  const dialog = useDialogStore({
    open,
    setOpen: (value) => {
      if (!value) onClose();
    },
  });

  return (
    <AriakitDialog
      store={dialog}
      className="dialog"
      backdrop={<div className="dialog-backdrop" />}
      hideOnEscape={dismissible}
      hideOnInteractOutside={dismissible}
    >
      <DialogHeading className="dialog-heading">{title}</DialogHeading>
      {children}
    </AriakitDialog>
  );
}
