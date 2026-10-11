'use client';

import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import Logo, { LogoMark } from './Logo';

/**
 * Gates its children behind Firebase Google auth. Shows a spinner while
 * resolving the auth state, a Google sign-in screen when signed out, and the
 * children plus a sign-out button when signed in.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-pastel-lavender border-t-pastel-lavender-fg"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  // Prefer the Google display name; fall back to the email local-part, then a
  // friendly default. Handles a null displayName / null email without crashing.
  const name =
    user.displayName ?? (user.email ? user.email.split('@')[0] : null) ?? 'there';

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <h1>
            <Logo markClassName="h-7 w-7" />
            <span className="sr-only">WorkSync</span>
          </h1>
          <p className="text-sm text-foreground/70">Hello, {name}!</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-foreground/70 sm:inline">
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="rounded-full bg-pastel-blush px-4 py-2 text-sm font-medium text-pastel-blush-fg shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-pastel-blush-fg/40"
          >
            Sign out
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      // A user closing the popup isn't a real error worth surfacing.
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === 'auth/popup-closed-by-user'
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg shadow-pastel-lavender/40">
        <h1 className="flex flex-col items-center gap-3">
          <LogoMark className="h-16 w-16" />
          <span className="text-2xl font-semibold tracking-tight">
            Work<span className="text-pastel-blue-fg">Sync</span>
          </span>
        </h1>
        <p className="mt-2 text-center text-sm text-foreground/60">
          Sign in with Google to open your board
        </p>

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-pastel-lavender bg-white px-4 py-2.5 font-medium text-foreground shadow-sm transition hover:bg-pastel-lavender/20 focus:outline-none focus:ring-2 focus:ring-pastel-lavender-fg/40 disabled:opacity-60"
        >
          <GoogleIcon />
          {submitting ? 'Please wait…' : 'Continue with Google'}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-pastel-blush-fg">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 18 18"
      className="h-4.5 w-4.5"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
