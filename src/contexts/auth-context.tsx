import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  authorize,
  getAccessToken as getZaloAccessToken,
} from "zmp-sdk";
import { clearBusinessProfileCache } from "@/lib/business-profile-cache";

import {
  AuthRequestError,
  AuthTokens,
  CurrentUser,
  getCurrentUser,
  loginWithZalo,
  refreshAuthToken,
} from "@/services/auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "error";

interface AuthSession {
  user: CurrentUser;
  accessToken: string;
}

interface AuthenticateOptions {
  requestUserInfoPermission?: boolean;
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
}

const ACCESS_TOKEN_KEY = "localgo.auth.access-token";
const REFRESH_TOKEN_KEY = "localgo.auth.refresh-token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSessionValue(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(tokens: AuthTokens): void {
  try {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    // The in-memory state below still keeps the current Mini App session usable.
  }
}

function clearSession(): void {
  clearBusinessProfileCache();
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Storage may be unavailable in restricted webviews.
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
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState("");
  const inFlightRef = useRef<{
    promise: Promise<AuthSession>;
    requestsUserInfoPermission: boolean;
  } | null>(null);
  const refreshInFlightRef = useRef<Promise<AuthSession> | null>(null);

  const authenticate = useCallback(
    function authenticateUser(
      options: AuthenticateOptions = {}
    ): Promise<AuthSession> {
      // ZMP SDK 2.35+ returns an ID-only access token unless scope.userInfo
      // is granted first. The backend requires the Zalo display name, so a
      // normal LocalGo login must request this scope by default.
      const requestUserInfo = options.requestUserInfoPermission !== false;
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

        let token = readSessionValue(ACCESS_TOKEN_KEY);
        if (token) {
          try {
            const profile = await getCurrentUser(token);
            setAccessToken(token);
            setUser(profile);
            setStatus("authenticated");
            return { user: profile, accessToken: token };
          } catch (requestError) {
            const storedRefreshToken = readSessionValue(REFRESH_TOKEN_KEY);
            if (
              requestError instanceof AuthRequestError &&
              requestError.status === 401 &&
              storedRefreshToken
            ) {
              try {
                const refreshed = await refreshAuthToken(storedRefreshToken);
                writeSession(refreshed);
                token = refreshed.accessToken;
                const profile = await getCurrentUser(token);
                setAccessToken(token);
                setUser(profile);
                setStatus("authenticated");
                return { user: profile, accessToken: token };
              } catch {
                clearSession();
              }
            } else if (
              !(requestError instanceof AuthRequestError) ||
              requestError.status !== 401
            ) {
              throw requestError;
            } else {
              clearSession();
            }
          }
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
        writeSession(tokens);
        const profile = await getCurrentUser(tokens.accessToken);
        setAccessToken(tokens.accessToken);
        setUser(profile);
        setStatus("authenticated");
        return { user: profile, accessToken: tokens.accessToken };
      })().catch((requestError: unknown) => {
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

  const refreshSession = useCallback((): Promise<AuthSession> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const storedRefreshToken = readSessionValue(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      const requestError = new AuthRequestError(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng Zalo.",
        401,
        "UNAUTHORIZED"
      );
      clearSession();
      setUser(null);
      setAccessToken(null);
      setStatus("error");
      setError(authMessage(requestError));
      return Promise.reject(requestError);
    }

    const task = (async () => {
      const tokens = await refreshAuthToken(storedRefreshToken);
      writeSession(tokens);
      const profile = await getCurrentUser(tokens.accessToken);
      setAccessToken(tokens.accessToken);
      setUser(profile);
      setStatus("authenticated");
      setError("");
      return { user: profile, accessToken: tokens.accessToken };
    })().catch((requestError: unknown) => {
      clearSession();
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
    if (!accessToken) return (await authenticate()).user;
    try {
      const profile = await getCurrentUser(accessToken);
      setUser(profile);
      setStatus("authenticated");
      setError("");
      return profile;
    } catch (requestError) {
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
    clearSession();
    setUser(null);
    setAccessToken(null);
    setStatus("idle");
    setError("");
  }, []);

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
