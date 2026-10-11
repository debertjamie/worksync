import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

// Lazy singleton. Env is read inside init (not at module top level) so importing
// this module during `next build` never fails on absent/placeholder credentials.
function getAdminApp(): App {
  if (getApps().length) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // The private key is stored single-line with literal \n sequences; convert
  // them to real newlines before handing it to cert().
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
