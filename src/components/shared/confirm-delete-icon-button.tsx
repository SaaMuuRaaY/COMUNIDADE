"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  size?: "sm" | "icon";
  ariaLabel?: string;
};

export function ConfirmDeleteIconButton({
  onConfirm,
  title = "Excluir?",
  description = "Esta ação não pode ser desfeita.",
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  pending,
  size = "icon",
  ariaLabel = "Excluir",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  async function handleConfirm() {
    try {
      setRunning(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        className="text-muted-foreground hover:text-destructive"
        aria-label={ariaLabel}
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={running}>
              {cancelLabel}
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={running}>
              {running ? "Excluindo…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
