import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  authorize,
  getAccessToken as getZaloAccessToken,
} from "zmp-sdk";
import { clearBusinessProfileCache } from "@/lib/business-profile-cache";
import { ApiRequestError, setApiAuthHandler } from "@/lib/http-client";

import {
  AuthRequestError,
  AuthTokens,
  CurrentUser,
  getCurrentUser,
  loginWithZalo,
  loginWithEmail,
  refreshAuthToken,
} from "@/services/auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "error";

interface AuthSession {
  user: CurrentUser;
  accessToken: string;
}

interface AuthenticateOptions {
  requestUserInfoPermission?: boolean;
  allowAfterForcedLogout?: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  accessToken: string | null;
  status: AuthStatus;
  error: string;
  authenticate: (options?: AuthenticateOptions) => Promise<AuthSession>;
  refreshSession: () => Promise<AuthSession>;
  refreshUser: () => Promise<CurrentUser>;
  logout: () => void;
  forceLogout: () => void;
  loginEmail: (email: string, password: string) => Promise<AuthSession>;
}

const ACCESS_TOKEN_KEY = "localgo.auth.access-token";
const REFRESH_TOKEN_KEY = "localgo.auth.refresh-token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSessionValue(key: string): string | null {
  try {
    const persisted = window.localStorage.getItem(key);
    if (persisted) return persisted;
  } catch {
    // Try legacy storage when persistent storage is unavailable.
  }
  try {
    const legacy = window.sessionStorage.getItem(key);
    if (legacy) {
      try {
        window.localStorage.setItem(key, legacy);
        window.sessionStorage.removeItem(key);
      } catch {
        // Keep the legacy session when persistent storage is unavailable.
      }
    }
    return legacy;
  } catch {
    return null;
  }
}

function writeSession(tokens: AuthTokens): void {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    try {
      window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch {
      // The in-memory state still keeps the current session usable.
    }
    return;
  }
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Legacy storage may be unavailable.
  }
}

function hasStoredSession(): boolean {
  // Read both values so legacy refresh tokens are migrated even when the
  // access token is still valid.
  const accessToken = readSessionValue(ACCESS_TOKEN_KEY);
  const refreshToken = readSessionValue(REFRESH_TOKEN_KEY);
  return Boolean(accessToken || refreshToken);
}

function clearSession(): void {
  clearBusinessProfileCache();
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storageName].removeItem(ACCESS_TOKEN_KEY);
      window[storageName].removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Storage may be unavailable in restricted webviews.
    }
  }
}

function authMessage(error: unknown): string {
  if (error instanceof AuthRequestError) return error.message;
  return "Không thể xác thực tài khoản Zalo. Vui lòng thử lại.";
}

async function requestZaloUserInfoPermission(): Promise<void> {
  try {
    const permissions = await authorize({
      scopes: ["scope.userInfo"],
    });

    if (permissions["scope.userInfo"] !== true) {
      throw new AuthRequestError(
        "Vui lòng cấp quyền truy cập thông tin Zalo để tiếp tục sử dụng LocalGo.",
        0,
        "ZALO_USER_INFO_PERMISSION_REQUIRED"
      );
    }
  } catch (requestError) {
    if (requestError instanceof AuthRequestError) throw requestError;
    throw new AuthRequestError(
      "Vui lòng cấp quyền truy cập tên và ảnh đại diện Zalo để tiếp tục sử dụng LocalGo.",
      0,
      "ZALO_USER_INFO_PERMISSION_REQUIRED"
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasStoredSession()
      ? "loading"
      : "idle"
  );
  const [error, setError] = useState("");
  const inFlightRef = useRef<{
    promise: Promise<AuthSession>;
    requestsUserInfoPermission: boolean;
  } | null>(null);
  const refreshInFlightRef = useRef<Promise<AuthSession> | null>(null);
  const generation = useRef(0);
  const blocked = useRef(false);
  const forced = useRef(false);
  const rotating = useRef<Promise<AuthTokens> | null>(null);
  const checkGeneration = (started: number) => {
    if (generation.current !== started) throw new AuthRequestError("Phiên đăng nhập đã kết thúc.", 401, "SESSION_ENDED");
  };
  const rotateTokens = (token: string) => {
    if (!rotating.current) {
      const task = refreshAuthToken(token);
      rotating.current = task;
      void task.finally(() => { if (rotating.current === task) rotating.current = null; }).catch(() => undefined);
    }
    return rotating.current;
  };

  const authenticate = useCallback(
    function authenticateUser(
      options: AuthenticateOptions = {},
      allowZaloLogin = true
    ): Promise<AuthSession> {
      // ZMP SDK 2.35+ returns an ID-only access token unless scope.userInfo
      // is granted first. The backend requires the Zalo display name, so a
      // normal LocalGo login must request this scope by default.
      const requestUserInfo = allowZaloLogin && options.requestUserInfoPermission !== false;
      if (forced.current && !options.allowAfterForcedLogout) return Promise.reject(new AuthRequestError("Vui lòng đăng nhập lại.", 401));
      if (options.allowAfterForcedLogout) forced.current = false;
      if (blocked.current && !allowZaloLogin) return Promise.reject(new AuthRequestError("Vui lòng đăng nhập lại.", 401));
      if (allowZaloLogin) blocked.current = false;
      const started = generation.current;
      const currentTask = inFlightRef.current;
      if (currentTask) {
        if (!requestUserInfo || currentTask.requestsUserInfoPermission) {
          return currentTask.promise;
        }

        return currentTask.promise.catch(() => {
          if (inFlightRef.current?.promise === currentTask.promise) {
            inFlightRef.current = null;
          }
          return authenticateUser(options);
        });
      }

      const task = (async () => {
        setStatus("loading");
        setError("");

        const token = readSessionValue(ACCESS_TOKEN_KEY);
        if (token) {
          try {
            const profile = await getCurrentUser(token);
            checkGeneration(started);
            setAccessToken(token);
            setUser(profile);
            setStatus("authenticated");
            return { user: profile, accessToken: token };
          } catch (requestError) {
            checkGeneration(started);
            if (
              !(requestError instanceof AuthRequestError) ||
              requestError.status !== 401
            ) {
              throw requestError;
            }
          }
        }

        const storedRefreshToken = readSessionValue(REFRESH_TOKEN_KEY);
        if (storedRefreshToken) {
          try {
            const refreshed = await rotateTokens(storedRefreshToken);
            checkGeneration(started);
            writeSession(refreshed);
            const profile = await getCurrentUser(refreshed.accessToken);
            checkGeneration(started);
            setAccessToken(refreshed.accessToken);
            setUser(profile);
            setStatus("authenticated");
            return { user: profile, accessToken: refreshed.accessToken };
          } catch (requestError) {
            checkGeneration(started);
            clearSession();
            blocked.current = true;
            forced.current = true;
            window.dispatchEvent(new Event("localgo:auth-required"));
            throw requestError;
          }
        } else if (token) {
          clearSession();
        }

        if (!allowZaloLogin) {
          throw new AuthRequestError(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng Zalo.",
            401,
            "UNAUTHORIZED"
          );
        }

        if (requestUserInfo) {
          await requestZaloUserInfoPermission();
        }

        const zaloAccessToken = await getZaloAccessToken();
        if (!zaloAccessToken) {
          throw new AuthRequestError(
            "Không lấy được mã đăng nhập từ Zalo. Vui lòng mở Mini App trong ứng dụng Zalo và thử lại.",
            0
          );
        }

        const tokens = await loginWithZalo(zaloAccessToken);
        checkGeneration(started);
        writeSession(tokens);
        const profile = await getCurrentUser(tokens.accessToken);
        checkGeneration(started);
        setAccessToken(tokens.accessToken);
        setUser(profile);
        setStatus("authenticated");
        return { user: profile, accessToken: tokens.accessToken };
      })().catch((requestError: unknown) => {
        if (started !== generation.current) throw requestError;
        setUser(null);
        setAccessToken(null);
        setStatus("error");
        setError(authMessage(requestError));
        throw requestError;
      });

      const clearInFlight = () => {
        if (inFlightRef.current?.promise === task) {
          inFlightRef.current = null;
        }
      };

      inFlightRef.current = {
        promise: task,
        requestsUserInfoPermission: requestUserInfo,
      };
      void task.then(clearInFlight, clearInFlight);
      return task;
    },
    []
  );

  useEffect(() => {
    if (hasStoredSession()) {
      // Restore without opening Zalo's permission prompt.
      void authenticate({}, false).catch(() => undefined);
    }
  }, [authenticate]);

  const refreshSession = useCallback((): Promise<AuthSession> => {
    if (blocked.current) return Promise.reject(new AuthRequestError("Vui lòng đăng nhập lại.", 401));
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    const started = generation.current;

    const storedRefreshToken = readSessionValue(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      const requestError = new AuthRequestError(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng Zalo.",
        401,
        "UNAUTHORIZED"
      );
      clearSession();
      blocked.current = true;
      forced.current = true;
      generation.current += 1;
      window.dispatchEvent(new Event("localgo:auth-required"));
      setUser(null);
      setAccessToken(null);
      setStatus("error");
      setError(authMessage(requestError));
      return Promise.reject(requestError);
    }

    const task = (async () => {
      const tokens = await rotateTokens(storedRefreshToken);
      checkGeneration(started);
      writeSession(tokens);
      const profile = await getCurrentUser(tokens.accessToken);
      checkGeneration(started);
      setAccessToken(tokens.accessToken);
      setUser(profile);
      setStatus("authenticated");
      setError("");
      return { user: profile, accessToken: tokens.accessToken };
    })().catch((requestError: unknown) => {
      if (started !== generation.current) throw requestError;
      clearSession();
      blocked.current = true;
      forced.current = true;
      generation.current += 1;
      window.dispatchEvent(new Event("localgo:auth-required"));
      setUser(null);
      setAccessToken(null);
      setStatus("error");
      setError(authMessage(requestError));
      throw requestError;
    });

    refreshInFlightRef.current = task;
    const clearRefreshInFlight = () => {
      if (refreshInFlightRef.current === task) {
        refreshInFlightRef.current = null;
      }
    };
    void task.then(clearRefreshInFlight, clearRefreshInFlight);
    return task;
  }, []);

  const refreshUser = useCallback(async (): Promise<CurrentUser> => {
    const started = generation.current;
    if (!accessToken) return (await authenticate()).user;
    try {
      const profile = await getCurrentUser(accessToken);
      checkGeneration(started);
      setUser(profile);
      setStatus("authenticated");
      setError("");
      return profile;
    } catch (requestError) {
      checkGeneration(started);
      if (
        requestError instanceof AuthRequestError &&
        requestError.status === 401
      ) {
        return (await refreshSession()).user;
      }
      setError(authMessage(requestError));
      throw requestError;
    }
  }, [accessToken, authenticate, refreshSession]);

  const logout = useCallback(() => {
    generation.current += 1;
    blocked.current = true;
    inFlightRef.current = null;
    refreshInFlightRef.current = null;
    rotating.current = null;
    clearSession();
    setUser(null);
    setAccessToken(null);
    setStatus("idle");
    setError("");
  }, []);

  const forceLogout = useCallback(() => {
    logout();
    forced.current = true;
    window.dispatchEvent(new Event("localgo:auth-required"));
  }, [logout]);

  const loginEmail = useCallback(async (email: string, password: string): Promise<AuthSession> => {
    logout();
    blocked.current = false;
    forced.current = false;
    const started = generation.current;
    setStatus("loading");
    try {
      const tokens = await loginWithEmail(email, password);
      checkGeneration(started);
      const profile = await getCurrentUser(tokens.accessToken);
      checkGeneration(started);
      writeSession(tokens);
      setUser(profile);
      setAccessToken(tokens.accessToken);
      setStatus("authenticated");
      return { user: profile, accessToken: tokens.accessToken };
    } catch (error) {
      if (generation.current === started) {
        setStatus("error");
        clearSession();
      }
      throw error;
    }
  }, [logout]);

  useEffect(() => {
    setApiAuthHandler({
      generation: () => generation.current,
      authorize: (token) => {
        if (blocked.current) {
          const error = new ApiRequestError("Vui lòng đăng nhập lại.", { status: 401, code: "UNAUTHORIZED" });
          error.authHandled = true;
          throw error;
        }
        return readSessionValue(ACCESS_TOKEN_KEY) ?? token;
      },
      refresh: async (failedToken) => {
        if (blocked.current) throw new AuthRequestError("Vui lòng đăng nhập lại.", 401);
        // A late 401 from the previous access token uses the already rotated pair.
        const stored = readSessionValue(ACCESS_TOKEN_KEY);
        if (stored && stored !== failedToken) return { accessToken: stored };
        return refreshSession();
      },
      expire: forceLogout,
    });
    return () => setApiAuthHandler(null);
  }, [refreshSession, forceLogout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      status,
      error,
      authenticate,
      refreshSession,
      refreshUser,
      logout,
      forceLogout,
      loginEmail,
    }),
    [
      user,
      accessToken,
      status,
      error,
      authenticate,
      refreshSession,
      refreshUser,
      logout,
      forceLogout,
      loginEmail,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCurrentUser(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useCurrentUser must be used inside AuthProvider");
  }
  return value;
}
