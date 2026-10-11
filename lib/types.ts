export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnConfig {
  status: TaskStatus;
  label: string;
  /** Pastel color token used by the Kanban UI for this column. */
  color: string;
}

/** Kanban columns in display order, each mapped to a label and pastel token. */
export const COLUMNS: readonly ColumnConfig[] = [
  { status: 'TODO', label: 'To Do', color: 'var(--pastel-blue)' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'var(--pastel-yellow)' },
  { status: 'DONE', label: 'Done', color: 'var(--pastel-green)' },
] as const;
