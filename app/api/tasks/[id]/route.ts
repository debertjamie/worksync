import type { NextRequest } from 'next/server';

import {
  getUidFromRequest,
  serverErrorResponse,
  unauthorizedResponse,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { TaskStatus } from '@/lib/types';

const VALID_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

/**
 * PATCH /api/tasks/[id] — updates allowed fields (title, description, status,
 * position) on a task owned by the authenticated user. Returns 404 when no
 * owned row matches.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/tasks/[id]'>
) {
  let userId: string;
  try {
    userId = await getUidFromRequest(request);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  const { id } = await ctx.params;

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    status?: unknown;
    position?: unknown;
  } | null;

  const data: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    position?: number;
  } = {};

  if (typeof body?.title === 'string') {
    const title = body.title.trim();
    if (!title) {
      return Response.json({ error: 'Title cannot be empty' }, { status: 400 });
    }
    data.title = title;
  }

  if (body && 'description' in body) {
    if (typeof body.description === 'string') {
      data.description = body.description;
    } else if (body.description === null) {
      data.description = null;
    }
  }

  if (typeof body?.status === 'string') {
    if (!VALID_STATUSES.includes(body.status as TaskStatus)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }
    data.status = body.status as TaskStatus;
  }

  if (typeof body?.position === 'number' && Number.isInteger(body.position)) {
    data.position = body.position;
  }

  try {
    const { count } = await prisma.task.updateMany({
      where: { id, userId },
      data,
    });

    if (count === 0) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = await prisma.task.findFirst({ where: { id, userId } });
    return Response.json(task);
  } catch (error) {
    return serverErrorResponse(error);
  }
}

/**
 * DELETE /api/tasks/[id] — deletes a task owned by the authenticated user.
 * Returns 404 when no owned row matches.
 */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/tasks/[id]'>
) {
  let userId: string;
  try {
    userId = await getUidFromRequest(request);
  } catch (error) {
    return unauthorizedResponse(error);
  }

  const { id } = await ctx.params;

  try {
    const { count } = await prisma.task.deleteMany({ where: { id, userId } });

    if (count === 0) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}
