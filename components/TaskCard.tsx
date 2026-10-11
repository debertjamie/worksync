'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskStatus } from '@/lib/types';
import { COLUMNS } from '@/lib/types';
import TaskForm, { type TaskFormValues } from './TaskForm';

/** Maps each status to a gentle pastel card tint (mirrors HEADER_CLASSES). */
const CARD_CLASSES: Record<TaskStatus, string> = {
  TODO: 'bg-pastel-blue/40',
  IN_PROGRESS: 'bg-pastel-peach/40',
  DONE: 'bg-pastel-mint/40',
};

/**
 * A single task card. Shows title/description with edit, delete, and
 * move-between-columns controls (prev/next buttons + a status select). The
 * card is also a dnd-kit sortable item: the title area is a drag handle, so
 * the buttons and select stay clickable while cards can be dragged between and
 * within columns. The arrows/select remain the accessible fallback.
 */
export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onMove,
}: {
  task: Task;
  onEdit: (values: TaskFormValues) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onMove: (status: TaskStatus) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { status: task.status },
    disabled: editing,
  });

  const index = COLUMNS.findIndex((c) => c.status === task.status);
  const prev = index > 0 ? COLUMNS[index - 1] : null;
  const next = index < COLUMNS.length - 1 ? COLUMNS[index + 1] : null;

  if (editing) {
    return (
      <TaskForm
        initial={task}
        submitLabel="Save"
        onSubmit={async (values) => {
          await onEdit(values);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 rounded-xl p-3 shadow-sm ${CARD_CLASSES[task.status]} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none active:cursor-grabbing"
      >
        <h3 className="text-sm font-semibold leading-snug text-foreground">
          {task.title}
        </h3>
        {task.description && (
          <p className="mt-1 text-sm leading-snug text-foreground/70">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => prev && onMove(prev.status)}
            disabled={!prev}
            aria-label={prev ? `Move to ${prev.label}` : 'No previous column'}
            className="rounded-md px-2 py-1 text-xs font-medium text-foreground/70 transition hover:bg-black/5 disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => next && onMove(next.status)}
            disabled={!next}
            aria-label={next ? `Move to ${next.label}` : 'No next column'}
            className="rounded-md px-2 py-1 text-xs font-medium text-foreground/70 transition hover:bg-black/5 disabled:opacity-30"
          >
            →
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 text-xs font-medium text-foreground/70 transition hover:bg-black/5"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-md px-2 py-1 text-xs font-medium text-pastel-blush-fg transition hover:bg-pastel-blush/40"
          >
            Delete
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-foreground/60">
        <span className="sr-only">Move task to column</span>
        <select
          value={task.status}
          onChange={(e) => void onMove(e.target.value as TaskStatus)}
          aria-label="Task status"
          className="w-full rounded-lg border border-pastel-lavender bg-white/70 px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-pastel-lavender-fg/40"
        >
          {COLUMNS.map((col) => (
            <option key={col.status} value={col.status}>
              {col.label}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
