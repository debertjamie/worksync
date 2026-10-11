'use client';

import { useEffect, useRef } from 'react';

/** Friendly, pluralized welcome message based on the TODO count. */
function welcomeMessage(todoCount: number): string {
  if (todoCount <= 0) {
    return "Welcome back! You're all caught up — no tasks to do.";
  }
  if (todoCount === 1) {
    return 'Welcome back! You have 1 task to do.';
  }
  return `Welcome back! You have ${todoCount} tasks to do.`;
}

/**
 * Accessible, presentational welcome-back modal. Shown once per sign-in session
 * for returning users (the show/once-per-session decision lives in Board). The
 * centered overlay dims the backdrop; Escape, the backdrop, "Got it", and the
 * ✕ all dismiss. Focus moves to the dismiss button on open.
 */
export default function WelcomePopup({
  open,
  todoCount,
  onClose,
}: {
  open: boolean;
  todoCount: number;
  onClose: () => void;
}) {
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    // Focus the primary dismiss action once the modal opens.
    dismissRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="modal-enter w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg shadow-pastel-lavender/40"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="welcome-title"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Welcome back!
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md px-1.5 py-0.5 text-base leading-none text-foreground/50 transition hover:bg-black/5 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-pastel-lavender-fg/40"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm leading-snug text-foreground/70">
          {welcomeMessage(todoCount)}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            ref={dismissRef}
            type="button"
            onClick={onClose}
            className="rounded-full bg-pastel-lavender px-4 py-2 text-sm font-medium text-pastel-lavender-fg shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-pastel-lavender-fg/40"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
