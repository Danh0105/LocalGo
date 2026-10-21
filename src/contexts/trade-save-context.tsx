import { isTradePostAvailable, subscribeTradePostInvalidation } from "@/lib/trade-post-availability";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSnackbar } from "zmp-ui";

import { useCurrentUser } from "@/contexts/auth-context";
import {
  TradePostResponse,
  removeTradePostSave,
  saveTradePost,
} from "@/services/trade-posts";

export class TradeSaveLoginRequiredError extends Error {
  constructor() {
    super("Vui lòng đăng nhập Zalo để lưu tin.");
    this.name = "TradeSaveLoginRequiredError";
  }
}

export interface TradeSaveState {
  isSaved: boolean;
  saveCount: number;
  isSaving: boolean;
}

interface TradeSaveContextValue {
  getSaveState: (post: Pick<TradePostResponse, "id" | "isSaved" | "saveCount">) => TradeSaveState;
  syncTradePosts: (posts: Array<Pick<TradePostResponse, "id" | "slug" | "isSaved" | "saveCount">>) => void;
  toggleSave: (
    post: Pick<TradePostResponse, "id" | "slug" | "isSaved" | "saveCount">,
    accessTokenOverride?: string
  ) => Promise<TradeSaveState>;
}

const TradeSaveContext = createContext<TradeSaveContextValue | undefined>(
  undefined
);

function fromPost(
  post: Pick<TradePostResponse, "id" | "isSaved" | "saveCount">
): TradeSaveState {
  return {
    isSaved: post.isSaved === true,
    saveCount: Math.max(0, Number(post.saveCount) || 0),
    isSaving: false,
  };
}

export function TradeSaveProvider({ children }: { children: ReactNode }) {
  const { accessToken, status } = useCurrentUser();
  const { openSnackbar } = useSnackbar();
  const [states, setStates] = useState<Record<string, TradeSaveState>>({});
  const statesRef = useRef(states);
  const knownPosts = useRef(new Map<string, { slug: string }>());

  useEffect(() => subscribeTradePostInvalidation(() => {
    setStates((current) => {
      const next = { ...current };
      for (const [id, post] of knownPosts.current) {
        if (!isTradePostAvailable(post)) {
          delete next[id];
          knownPosts.current.delete(id);
        }
      }
      statesRef.current = next;
      return next;
    });
  }), []);

  useEffect(() => {
    statesRef.current = states;
  }, [states]);

  useEffect(() => {
    if (status === "authenticated" && accessToken) return;
    setStates({});
  }, [accessToken, status]);

  const getSaveState = useCallback(
    (post: Pick<TradePostResponse, "id" | "isSaved" | "saveCount">) =>
      states[post.id] ?? fromPost(post),
    [states]
  );

  const syncTradePosts = useCallback(
    (posts: Array<Pick<TradePostResponse, "id" | "slug" | "isSaved" | "saveCount">>) => {
      setStates((current) => {
        let next = current;
        for (const post of posts) {
          if (!isTradePostAvailable(post)) continue;
          knownPosts.current.set(post.id, { slug: post.slug });
          const known = current[post.id];
          if (known?.isSaving) continue;
          const incoming = fromPost(post);
          if (
            known &&
            known.isSaved === incoming.isSaved &&
            known.saveCount === incoming.saveCount
          ) {
            continue;
          }
          if (next === current) next = { ...current };
          next[post.id] = incoming;
        }
        return next;
      });
    },
    []
  );

  const toggleSave = useCallback(
    async (
      post: Pick<TradePostResponse, "id" | "slug" | "isSaved" | "saveCount">,
      accessTokenOverride?: string
    ): Promise<TradeSaveState> => {
      const token = accessTokenOverride ?? accessToken;
      if (!token) {
        throw new TradeSaveLoginRequiredError();
      }

      const previous = statesRef.current[post.id] ?? fromPost(post);
      if (previous.isSaving) return previous;

      const optimistic: TradeSaveState = {
        isSaved: !previous.isSaved,
        saveCount: Math.max(0, previous.saveCount + (previous.isSaved ? -1 : 1)),
        isSaving: true,
      };
      setStates((current) => ({ ...current, [post.id]: optimistic }));

      try {
        if (previous.isSaved) {
          await removeTradePostSave(token, post.id || post.slug);
          const result = { ...optimistic, isSaving: false };
          setStates((current) => ({ ...current, [post.id]: result }));
          openSnackbar({
            text: "Đã bỏ lưu tin",
            type: "success",
            position: "bottom",
            duration: 2200,
            icon: true,
          });
          return result;
        }

        const response = await saveTradePost(token, post.id || post.slug);
        const result: TradeSaveState = {
          isSaved: response.saved,
          saveCount: Math.max(0, Number(response.saveCount) || 0),
          isSaving: false,
        };
        setStates((current) => ({ ...current, [post.id]: result }));
        openSnackbar({
          text: "Đã lưu tin",
          type: "success",
          position: "bottom",
          duration: 2200,
          icon: true,
        });
        return result;
      } catch (error) {
        setStates((current) => ({
          ...current,
          [post.id]: { ...previous, isSaving: false },
        }));
        const message =
          error instanceof Error ? error.message : "Không thể cập nhật tin đã lưu.";
        openSnackbar({
          text: message,
          type: "error",
          position: "bottom",
          duration: 3200,
          icon: true,
        });
        throw error;
      }
    },
    [accessToken, openSnackbar, status]
  );

  const value = useMemo<TradeSaveContextValue>(
    () => ({ getSaveState, syncTradePosts, toggleSave }),
    [getSaveState, syncTradePosts, toggleSave]
  );

  return (
    <TradeSaveContext.Provider value={value}>
      {children}
    </TradeSaveContext.Provider>
  );
}

export function useTradeSaves(): TradeSaveContextValue {
  const value = useContext(TradeSaveContext);
  if (!value) {
    throw new Error("useTradeSaves must be used inside TradeSaveProvider");
  }
  return value;
}
