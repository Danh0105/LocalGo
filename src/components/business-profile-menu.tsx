import { useNavigate } from "zmp-ui";
import { useCurrentUser } from "@/contexts/auth-context";
import restaurant from "@/static/restaurant.png";

export default function BusinessProfileMenu() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  if (user?.role !== "BUSINESS") return null;
  return <button type="button" className="menu-item" onClick={() => navigate("/business/profile")}>
    <div className="menu-item__image"><img src={restaurant} alt="" /></div>
    <span>Hồ sơ cơ sở</span>
  </button>;
}
