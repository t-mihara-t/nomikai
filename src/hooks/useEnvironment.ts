import { useState, useEffect } from 'react';
import liff from '@line/liff';

export interface EnvironmentInfo {
  /** Whether the app is running inside LINE (LIFF) */
  isLiff: boolean;
  /** Whether LIFF SDK has been initialized */
  initialized: boolean;
  /** LIFF user profile (if available) */
  profile: { userId: string; displayName: string; pictureUrl?: string } | null;
  /** LINE user ID (if logged in via LIFF) */
  lineUserId: string | null;
  /** Error during initialization */
  error: string | null;
}

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

/**
 * Custom hook to detect and manage LINE LIFF vs Web browser environment.
 * - In LINE app: initializes LIFF SDK, retrieves user profile
 * - In Web browser: skips LIFF, returns isLiff=false
 */
export function useEnvironment(): EnvironmentInfo {
  const [state, setState] = useState<EnvironmentInfo>({
    isLiff: false,
    initialized: false,
    profile: null,
    lineUserId: null,
    error: null,
  });

  useEffect(() => {
    if (!LIFF_ID) {
      // No LIFF ID configured - pure web mode
      setState((prev) => ({ ...prev, initialized: true, isLiff: false }));
      return;
    }

    liff
      .init({ liffId: LIFF_ID })
      .then(async () => {
        const isInClient = liff.isInClient();

        if (liff.isLoggedIn()) {
          try {
            const profile = await liff.getProfile();
            setState({
              isLiff: isInClient,
              initialized: true,
              profile: {
                userId: profile.userId,
                displayName: profile.displayName,
                pictureUrl: profile.pictureUrl,
              },
              lineUserId: profile.userId,
              error: null,
            });
            return;
          } catch {
            // Profile fetch failed - continue without profile
          }
        }

        setState({
          isLiff: isInClient,
          initialized: true,
          profile: null,
          lineUserId: null,
          error: null,
        });
      })
      .catch((err: Error) => {
        setState({
          isLiff: false,
          initialized: true,
          profile: null,
          lineUserId: null,
          error: err.message,
        });
      });
  }, []);

  return state;
}
