# WorkSync

Sync your tasks from anywhere. A small per-user Kanban board: sign in with Google, then create, edit, move, and delete tasks across **To Do**, **In Progress**, and **Done** columns. Each user only ever sees their own tasks.

Move tasks by dragging cards between and within columns, or use the per-card ← / → arrows and status dropdown as a keyboard and screen-reader-friendly fallback. Every move persists to the same `PATCH /api/tasks/[id]` endpoint.

Create, edit, and delete actions surface pastel colored toast notifications (and any failure is notified). Returning users are greeted on sign-in with a one-time welcome-back popup showing how many tasks are still in To Do.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19, TypeScript, Tailwind CSS v4: frontend and serverless API in one app
- Firebase Auth: managed login via Google sign in. The browser signs in with the Firebase client SDK, API routes verify the Firebase ID token with the Firebase Admin SDK
- Supabase Postgres and Prisma 6: database and type safe ORM
- Route handler (`app/api/*`) as the serverless backend: no separate server

## How Auth Works

1. The browser signs in with Google through Firebase and receives an ID token.
2. Every request to `/api/tasks` sends that token as `Authorization: Bearer <Token>`.
3. The route handler verifies the token with the Firebase Admin SDK and scopes every database query to the authenticated user's `uid`. A missing or invalid token returns `401` and a task that isn't yours returns `404`.

## Setup

### Prerequisites

- Node.js 20+ and npm
- A Firebase project with Google enabled as a sign-in provider
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` (through the `postinstall` script) to produce the typed Prisma client.

### 2. Configure environment variables

Copy the example file and fill in real values.

### 3. Set up Firebase

1. Access the [Firebase console](https://console.firebase.google.com/).
2. Enable Google provider in the sign in method.
3. Register a Web app and copy the config values into the `NEXT_PUBLIC_FIREBASE_*` variables.
4. From the service accounts, generate new private key and copy the values `project_id`, `client_email`, and `private_key`.

### 4. Database Setup

1. Copy connection strings from Supabase project (pooled port `6543` and direct port `5432`).
2. Create the `Task` table from the Prisma schema:

```bash
npx prisma db push
```

Use `npx prisma migrate dev` to track migrations.

### 5. Run

```bash
npm run dev
```

## API Reference

All routes require an `Authorization: Bearer <Token>` header and operate only on the authenticated user's tasks.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/tasks` | Get the list of current user's tasks |
| `POST` | `/api/tasks` | Create a task, body: `{ title, description?, status? }`. Defaults `status` to `TODO` |
| `PATCH` | `/api/tasks/[id]` | Update attribute(s) on a task, `404` if not found/not owned |
| `DELETE` | `/api/tasks/[id]` | Delete a task, `404` if not found/not owned |

### Data Model

```prisma
model Task {
  id          String     @id @default(cuid())
  userId      String     // Firebase UID
  title       String
  description String?
  status      TaskStatus @default(TODO)   // TODO | IN_PROGRESS | DONE
  position    Int                         // manual order within a column
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

## Project Structure

```
app/
  api/tasks/route.ts        GET and POST route
  api/tasks/[id]/route.ts   PATCH and DELETE route
  page.tsx                  AuthGate + Kanban board
  layout.tsx, globals.css   layout + pastel theme tokens
components/                 AuthGate, Board, Column, TaskCard, TaskForm,
                            ToastProvider (toasts), WelcomePopup
lib/
  firebase/client.ts        Firebase + Google provider
  firebase/admin.ts         Admin SDK (lazy singleton) for token verification
  auth.ts                   Bearer token verification helper
  prisma.ts                 Prisma client singleton
  api.ts                    client fetch wrapper
  types.ts                  shared Task types + column config
prisma/schema.prisma        Task model + TaskStatus enum
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build (type checks and compiles)
- `npm run start` — serve production build
- `npm run lint` — run ESLint
- `npm run db:generate` — regenerate the Prisma client
