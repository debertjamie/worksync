'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ColumnConfig, Task, TaskStatus } from '@/lib/types';
import type { TaskFormValues } from './TaskForm';
import TaskForm from './TaskForm';
import TaskCard from './TaskCard';

/** Maps each column status to its pastel header background + readable text. */
const HEADER_CLASSES: Record<TaskStatus, string> = {
  TODO: 'bg-pastel-blue text-pastel-blue-fg',
  IN_PROGRESS: 'bg-pastel-peach text-pastel-peach-fg',
  DONE: 'bg-pastel-mint text-pastel-mint-fg',
};

/**
 * A Kanban column: pastel header with task count, an add button that reveals a
 * TaskForm, and the column's cards. The cards container is a dnd-kit drop
 * target (so even an empty column accepts drops) and hosts a SortableContext
 * for intra-column reordering.
 */
export default function Column({
  column,
  tasks,
  onCreate,
  onEdit,
  onDelete,
  onMove,
}: {
  column: ColumnConfig;
  tasks: Task[];
  onCreate: (values: TaskFormValues) => void | Promise<void>;
  onEdit: (id: string, values: TaskFormValues) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onMove: (id: string, status: TaskStatus) => void | Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column.status,
    data: { status: column.status },
  });

  return (
    <section className="flex w-full flex-col gap-3 rounded-2xl bg-black/2 p-3">
      <div
        className={`flex items-center justify-between rounded-xl px-3 py-2 ${HEADER_CLASSES[column.status]}`}
      >
        <h2 className="text-sm font-semibold">
          {column.label}
          <span className="ml-2 font-normal opacity-70">{tasks.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label={`Add task to ${column.label}`}
          className="rounded-full bg-white/60 px-2.5 py-0.5 text-lg font-medium leading-none transition hover:bg-white/90"
        >
          +
        </button>
      </div>

      <div ref={setNodeRef} className="flex flex-col gap-2">
        {adding && (
          <TaskForm
            submitLabel="Add"
            onSubmit={async (values) => {
              await onCreate(values);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={(values) => onEdit(task.id, values)}
              onDelete={() => onDelete(task.id)}
              onMove={(status) => onMove(task.id, status)}
            />
          ))}
        </SortableContext>

        {!adding && tasks.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-foreground/40">
            No tasks yet
          </p>
        )}
      </div>
    </section>
  );
}
