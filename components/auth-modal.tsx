"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function AuthModal({ isOpen, onClose, children }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  if (!isOpen || !mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className="fixed inset-0 z-[2147483647] overflow-y-auto">
        <div className="flex min-h-dvh items-start justify-center px-4 py-6 sm:items-center">
          <div
            className="relative z-[2147483647] w-full max-w-md max-h-[calc(100dvh-48px)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-4 shadow-2xl dark:border-dark-line dark:bg-dark-panel"
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
