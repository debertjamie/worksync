'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types';

export interface TaskFormValues {
  title: string;
  description: string | null;
}

/**
 * Controlled create/edit form. Title is required; description is optional.
 * `initial` pre-fills the fields when editing an existing task.
 */
export default function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Pick<Task, 'title' | 'description'>;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: trimmed,
        description: description.trim() ? description.trim() : null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        required
        autoFocus
        aria-label="Task title"
        className="rounded-lg border border-black/10 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-pastel-lavender-fg/30"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        aria-label="Task description"
        className="resize-none rounded-lg border border-black/10 px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-pastel-lavender-fg/30"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-foreground/70 transition hover:bg-black/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-full bg-pastel-lavender px-3 py-1.5 text-sm font-medium text-pastel-lavender-fg shadow-sm transition hover:brightness-95 disabled:opacity-60"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
