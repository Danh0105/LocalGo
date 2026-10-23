import { useCallback, useRef } from "react";
import { useCurrentUser } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/http-client";
import { AuthRequestError } from "@/services/auth";

export async function requestWithSessionRetry<T>(
  operation: (token: string) => Promise<T>,
  token: string,
  refreshSession: () => Promise<{ accessToken: string }>,
): Promise<T> {
  try {
    return await operation(token);
  } catch (error) {
    if (!(error instanceof ApiRequestError || error instanceof AuthRequestError) || error.status !== 401 || (error instanceof ApiRequestError && error.authHandled)) throw error;
    const session = await refreshSession();
    return operation(session.accessToken);
  }
}

export function useAuthenticatedRequest() {
  const auth = useCurrentUser();
  const authRef = useRef(auth);
  authRef.current = auth;
  return useCallback(async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
    const current = authRef.current;
    const token = current.accessToken ?? (await current.authenticate()).accessToken;
    return requestWithSessionRetry(operation, token, current.refreshSession);
  }, []);
}
