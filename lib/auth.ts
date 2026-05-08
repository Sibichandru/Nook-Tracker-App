/**
 * Auth glue between native Google Sign-In and Firebase Auth.
 *
 * Flow:
 *   1) GoogleSignin.signIn() opens the native account picker (Android) and
 *      returns a Google ID token.
 *   2) That token is converted into a Firebase credential and exchanged for a
 *      Firebase user via signInWithCredential().
 *   3) The Firebase auth state listener (see lib/auth-context.tsx) fires; the
 *      router redirects to /dashboard.
 *
 * BEFORE THIS WORKS:
 *   Paste the OAuth Web Client ID into WEB_CLIENT_ID below. Find it at either:
 *     - google-services.json → oauth_client → entry with `"client_type": 3`
 *     - Google Cloud Console → APIs & Services → Credentials → "Web client
 *       (auto created by Google Service)"
 */

import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInWithCredential,
  type User,
} from "firebase/auth";

import { auth } from "./firebase";

const WEB_CLIENT_ID =
  "989000273329-l6ohdfil4n89cv1fc20i83v9c35s8pfg.apps.googleusercontent.com";

export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
  });
}

/**
 * Opens the native Google account picker and signs the user in to Firebase.
 *
 * @returns the Firebase user on success, or `null` if the user cancelled.
 * @throws on Play Services issues, network errors, or any non-cancel failure.
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();

    // v16+ returns { type: 'success', data: { idToken, user } }; older
    // versions returned { idToken, user } at the top level. Handle both.
    const idToken =
      (result as { data?: { idToken?: string | null } })?.data?.idToken ??
      (result as { idToken?: string | null }).idToken;

    if (!idToken) {
      throw new Error("Google Sign-In did not return an ID token.");
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (
      code === statusCodes.SIGN_IN_CANCELLED ||
      code === statusCodes.IN_PROGRESS
    ) {
      return null;
    }
    throw e;
  }
}

export async function signOutAll(): Promise<void> {
  await firebaseSignOut(auth);
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google session may not exist (e.g. user never signed in via Google
    // on this install). Safe to swallow.
  }
}
