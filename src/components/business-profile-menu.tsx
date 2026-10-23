import { useNavigate } from "zmp-ui";
import { useCurrentUser } from "@/contexts/auth-context";
import businessProfile from "@/static/business-profile.png";

export default function BusinessProfileMenu() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  if (user?.role !== "BUSINESS") return null;
  return <button type="button" className="menu-item" onClick={() => navigate("/business/profile")}>
    <div className="menu-item__image"><img src={businessProfile} alt="" /></div>
    <span>Hồ sơ cơ sở</span>
  </button>;
}
