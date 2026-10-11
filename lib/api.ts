import { auth } from '@/lib/firebase/client';
import type { Task, TaskStatus } from '@/lib/types';

/**
 * Fetch wrapper that attaches the current user's Firebase ID token and JSON
 * headers to every /api/tasks request. Throws if no user is signed in.
 */
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken();

  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** Payload accepted when creating a task. */
export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
}

/** Fields that may be patched on an existing task. */
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  position?: number;
}

/** GET /api/tasks — the authenticated user's tasks. */
export function listTasks(): Promise<Task[]> {
  return apiFetch<Task[]>('/api/tasks');
}

/** POST /api/tasks — create a task. */
export function createTask(input: CreateTaskInput): Promise<Task> {
  return apiFetch<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** PATCH /api/tasks/[id] — update a task. */
export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return apiFetch<Task>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** DELETE /api/tasks/[id] — delete a task. */
export function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' });
}
