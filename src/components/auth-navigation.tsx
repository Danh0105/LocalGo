import { useEffect } from "react";
import { useNavigate } from "zmp-ui";

export default function AuthNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    const login = () => navigate("/login", { replace: true });
    window.addEventListener("localgo:auth-required", login);
    return () => window.removeEventListener("localgo:auth-required", login);
  }, [navigate]);
  return null;
}
