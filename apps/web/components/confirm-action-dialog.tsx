"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from "@propad/ui";
import { useEffect, useState } from "react";

interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onOpenChange,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-600">
            Audit reason
          </label>
          <Input
            placeholder="Add a short reason for audit logs"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            className={
              destructive ? "bg-red-600 text-white hover:bg-red-700" : undefined
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
