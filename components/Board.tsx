'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@/lib/types';
import { COLUMNS } from '@/lib/types';
import {
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from '@/lib/api';
import { auth } from '@/lib/firebase/client';
import type { TaskFormValues } from './TaskForm';
import Column from './Column';
import WelcomePopup from './WelcomePopup';
import { useToast } from './ToastProvider';

const STATUSES: readonly TaskStatus[] = COLUMNS.map((c) => c.status);

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && STATUSES.includes(value as TaskStatus);
}

/**
 * The Kanban board. Loads the signed-in user's tasks on mount, keeps them in
 * state grouped by status, and wires create / edit / delete / move through
 * lib/api. Tasks can be moved with the arrow buttons / status dropdown (which
 * append to the end of the target column) or by dragging between and within
 * columns via dnd-kit. All moves persist through updateTask(id,{status,position}).
 */
export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcome, setWelcome] = useState<{ open: boolean; count: number }>({
    open: false,
    count: 0,
  });
  const welcomeShownRef = useRef(false);
  const toast = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    let active = true;
    listTasks()
      .then((data) => {
        if (!active) return;
        setTasks(data);
        // Welcome-back decision, driven by the fetch resolving (an external
        // event, not an effect body). Fires once per sign-in session for
        // RETURNING users only: with Google sign-in Firebase can't separate
        // register from login, so a brand-new account has equal
        // creationTime/lastSignInTime; those — and any missing metadata — are
        // skipped. N is the just-loaded TODO count.
        if (!welcomeShownRef.current) {
          const user = auth.currentUser;
          const created = user?.metadata.creationTime;
          const last = user?.metadata.lastSignInTime;
          // Once-per-browser-session guard: survives page refreshes but resets
          // on a new session (closing the tab/browser) or a sign-out+sign-in,
          // since the key is scoped to the current user's uid.
          const sessionKey = user ? `worksync:welcomed:${user.uid}` : null;
          const alreadyWelcomed =
            sessionKey !== null &&
            typeof sessionStorage !== 'undefined' &&
            sessionStorage.getItem(sessionKey) === '1';
          if (created && last && created !== last && !alreadyWelcomed) {
            welcomeShownRef.current = true;
            if (sessionKey && typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(sessionKey, '1');
            }
            setWelcome({
              open: true,
              count: data.filter((t) => t.status === 'TODO').length,
            });
          }
        }
      })
      .catch((err) => {
        if (active) {
          toast.error(
            err instanceof Error ? err.message : 'Failed to load tasks',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // Runs once on mount; the welcome decision reads the just-loaded tasks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tasksFor(status: TaskStatus): Task[] {
    return tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  // CRUD handlers toast on success and catch+toast on failure. Failures are
  // re-thrown so existing caller behavior is preserved (TaskForm resets its
  // submitting flag in `finally`; TaskCard only closes the edit form after the
  // promise resolves, keeping it open on error).
  async function handleCreate(status: TaskStatus, values: TaskFormValues) {
    try {
      const created = await createTask({ ...values, status });
      setTasks((prev) => [...prev, created]);
      toast.success('Task created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
      throw err;
    }
  }

  async function handleEdit(id: string, values: TaskFormValues) {
    try {
      const updated = await updateTask(id, values);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success('Task updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update task');
      throw err;
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
      throw err;
    }
  }

  // Used by the arrow buttons and the status dropdown: append to the end of the
  // target column. The optional `position` lets drag-and-drop reuse the same
  // persistence path while supplying an explicit drop index.
  async function handleMove(id: string, status: TaskStatus, position?: number) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (position === undefined && task.status === status) return;
    const nextPosition =
      position ?? tasks.filter((t) => t.status === status).length;
    try {
      const updated = await updateTask(id, { status, position: nextPosition });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast.success('Task moved');
    } catch (err) {
      // Not optimistic — state is untouched, so just surface the failure.
      toast.error(err instanceof Error ? err.message : 'Failed to move task');
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Resolve the target status from the drop target's data (cards and columns
    // both carry `{ status }`), falling back to the over id for empty columns
    // whose droppable id IS the status.
    const overData = over.data.current as { status?: TaskStatus } | undefined;
    const targetStatus = overData?.status ?? (isTaskStatus(over.id) ? over.id : null);
    if (!targetStatus) return;

    // Dropped onto itself with no column change — nothing to do.
    if (activeId === String(over.id) && activeTask.status === targetStatus) {
      return;
    }

    const snapshot = tasks;
    let newPosition: number;
    let optimistic: Task[];

    if (activeTask.status === targetStatus) {
      // Intra-column reorder: move the active card to the index of the card it
      // was dropped onto and renumber that column for display.
      const columnIds = snapshot
        .filter((t) => t.status === targetStatus)
        .sort((a, b) => a.position - b.position)
        .map((t) => t.id);
      const oldIndex = columnIds.indexOf(activeId);
      const newIndex = columnIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(columnIds, oldIndex, newIndex);
      newPosition = newIndex;
      const positionById = new Map(reordered.map((id, i) => [id, i]));
      optimistic = snapshot.map((t) =>
        t.status === targetStatus
          ? { ...t, position: positionById.get(t.id) ?? t.position }
          : t,
      );
    } else {
      // Cross-column move: append to the end of the target column.
      newPosition = snapshot.filter((t) => t.status === targetStatus).length;
      optimistic = snapshot.map((t) =>
        t.id === activeId
          ? { ...t, status: targetStatus, position: newPosition }
          : t,
      );
    }

    setTasks(optimistic);

    try {
      const updated = await updateTask(activeId, {
        status: targetStatus,
        position: newPosition,
      });
      setTasks((prev) => prev.map((t) => (t.id === activeId ? updated : t)));
    } catch (err) {
      setTasks(snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to move task');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-pastel-lavender border-t-pastel-lavender-fg"
          role="status"
          aria-label="Loading tasks"
        />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 pb-10">
      <WelcomePopup
        open={welcome.open}
        todoCount={welcome.count}
        onClose={() => setWelcome((w) => ({ ...w, open: false }))}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="grid flex-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <Column
              key={column.status}
              column={column}
              tasks={tasksFor(column.status)}
              onCreate={(values) => handleCreate(column.status, values)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </div>
      </DndContext>
    </main>
  );
}
