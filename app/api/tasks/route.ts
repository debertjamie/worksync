import {
  getUidFromRequest,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { TaskStatus } from '@/lib/types';

const VALID_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

/**
 * GET /api/tasks — returns the authenticated user's tasks ordered by status
 * then position. Touches request headers (via the auth helper) so it executes
 * at request time under cacheComponents.
 */
export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await getUidFromRequest(request);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });
    return Response.json(tasks);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

/**
 * POST /api/tasks — creates a task for the authenticated user. Requires a
 * non-empty title; defaults status to TODO and appends the task to the end of
 * its column. Reads the request body so it executes at request time under
 * cacheComponents.
 */
export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await getUidFromRequest(request);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    status?: unknown;
  } | null;

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const status: TaskStatus =
    typeof body?.status === 'string' &&
    VALID_STATUSES.includes(body.status as TaskStatus)
      ? (body.status as TaskStatus)
      : 'TODO';

  const description =
    typeof body?.description === 'string' ? body.description : null;

  try {
    const position = await prisma.task.count({ where: { userId, status } });

    const task = await prisma.task.create({
      data: { userId, title, description, status, position },
    });

    return Response.json(task, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
