import { useEffect, useRef } from "react";
import {
  closeApp,
  offConfirmToExit,
  onConfirmToExit,
  setNavigationBarLeftButton,
  showToast,
} from "zmp-sdk/apis";
import { useLocation, useNavigate } from "zmp-ui";

const EXIT_CONFIRMATION_WINDOW = 2_000;
const APP_BACK_EVENT = "localgo:back";

export function requestAppBack() {
  window.dispatchEvent(new Event(APP_BACK_EVENT));
}

/**
 * Keeps native Android/iOS back behavior in sync with the in-app router.
 * A first back press at the root warns the user; the second one exits.
 */
function AppBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const lastExitAttemptRef = useRef(0);

  useEffect(() => {
    locationRef.current = location;
    lastExitAttemptRef.current = 0;
  }, [location]);

  useEffect(() => {
    const handleNativeBack = () => {
      const historyIndex = Number(window.history.state?.idx ?? 0);
      const isHomePage = locationRef.current.pathname === "/";

      if (historyIndex > 0) {
        lastExitAttemptRef.current = 0;
        navigate(-1);
        return;
      }

      // A deep link has no previous in-app history, so take the user home first.
      if (!isHomePage) {
        lastExitAttemptRef.current = 0;
        navigate("/", { replace: true, direction: "backward" });
        return;
      }

      const now = Date.now();
      const isSecondPress =
        now - lastExitAttemptRef.current <= EXIT_CONFIRMATION_WINDOW;

      if (isSecondPress) {
        lastExitAttemptRef.current = 0;
        void closeApp().catch(() => undefined);
        return;
      }

      lastExitAttemptRef.current = now;
      void showToast({ message: "Nhấn lần nữa để thoát ứng dụng" }).catch(
        () => undefined,
      );
    };

    onConfirmToExit(handleNativeBack);
    window.addEventListener(APP_BACK_EVENT, handleNativeBack);

    // The native left button cannot be repositioned, so the app renders its
    // own controllable back button while preserving the native back event.
    void setNavigationBarLeftButton({ type: "none" }).catch(() => undefined);

    return () => {
      window.removeEventListener(APP_BACK_EVENT, handleNativeBack);
      offConfirmToExit();
    };
  }, [navigate]);

  return null;
}

export default AppBackHandler;
