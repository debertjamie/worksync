import { adminAuth } from '@/lib/firebase/admin';

/**
 * Thrown when a request is missing a valid `Authorization: Bearer <idToken>`
 * header or the token cannot be verified.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Reads the `Authorization: Bearer <idToken>` header from the request, verifies
 * the Firebase ID token, and returns the authenticated user's uid.
 *
 * @throws {UnauthorizedError} when the header is missing/malformed or the token
 * is invalid.
 */
export async function getUidFromRequest(req: Request): Promise<string> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const idToken = header.slice('Bearer '.length).trim();
  if (!idToken) {
    throw new UnauthorizedError('Missing bearer token');
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Converts an UnauthorizedError (or any auth failure) into a 401 JSON Response.
 */
export function unauthorizedResponse(error: unknown): Response {
  const message =
    error instanceof UnauthorizedError ? error.message : 'Unauthorized';
  return Response.json({ error: message }, { status: 401 });
}

/**
 * Converts an unexpected server-side error into a 500 JSON Response, logging
 * the real cause server-side so a generic 500 is never silent. In development
 * the error message is returned to the client to speed up debugging; in
 * production the client only sees a generic message.
 *
 * It also recognises the two most common misconfigurations and returns a 503
 * with an actionable hint:
 *  - Prisma P2021: the table does not exist (run `prisma db push`)
 *  - Prisma P1001: cannot reach the database (check DATABASE_URL / Supabase)
 */
export function serverErrorResponse(error: unknown): Response {
  console.error('[api/tasks] unhandled error:', error);

  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;

  if (code === 'P2021') {
    return Response.json(
      {
        error:
          'Database table "Task" does not exist. Run `npx prisma db push` against your Supabase database to create the schema.',
        code,
      },
      { status: 503 }
    );
  }

  if (code === 'P1001' || code === 'P1000' || code === 'P1017') {
    return Response.json(
      {
        error:
          'Cannot reach the database. Check DATABASE_URL / DIRECT_URL and that your Supabase project is running.',
        code,
      },
      { status: 503 }
    );
  }

  const message =
    process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Internal server error';

  return Response.json({ error: message, code }, { status: 500 });
}
