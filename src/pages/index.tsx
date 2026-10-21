import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import SearchPopup from "@/components/search-popup";
import BusinessProfileMenu from "@/components/business-profile-menu";
import NotificationBell from "@/components/notification-bell";
import ZaloAuthDialog from "@/components/zalo-auth-dialog";
import { requestAppBack } from "@/components/app-back-handler";
import { useCurrentUser } from "@/contexts/auth-context";

import bg from "@/static/home-hero.jpg";
import mascot from "@/static/mascot.png";
import emblem from "@/static/emblem.png";
import customerService from "@/static/customer-service.png";
import dragonBoat from "@/static/dragon-boat.png";
import friedRice from "@/static/fried-rice.png";
import chart from "@/static/presentation.png";
import historical from "@/static/icon-12.png";
import news from "@/static/search.png";
import tourism from "@/static/world-tour.png";
import map from "@/static/map.png";
import phone from "@/static/phone.png";
import pottery from "@/static/pottery.png";
import restaurant from "@/static/restaurant.png";
import temple from "@/static/temple.png";
import tractor from "@/static/tractor.png";
import gps from "@/static/gps.png";
import "../css/pages/home.css";
import "../css/pages/about.css";

const featuredItems = [
  { label: "Giới thiệu", image: chart, path: "/about" },
  { label: "Điểm du lịch\nĐền - Chùa - Miếu", image: temple, path: "/temples" },
  { label: "Giao thương", image: gps, path: "/trade" },
  { label: "Đặc sản", image: restaurant, path: "/specialties" },
];

const menuItems = [
  { label: "Cơ sở địa phương", image: restaurant, path: "/business-profiles" },
  { label: "Di tích lịch sử", image: historical, path: "/historical-sites" },
  { label: "Nông nghiệp", image: tractor, path: "/agriculture" },
  { label: "Làng nghề", image: pottery, path: "/craft-villages" },
  { label: "Ẩm thực", image: friedRice, path: "/cuisine" },
  { label: "Lễ hội", image: dragonBoat, path: "/festivals" },
  { label: "Tour\ntrải nghiệm", image: tourism, path: "/experience-tours" },
  { label: "Bản đồ", image: map, path: "/map" },
  { label: "Tin tức", image: news, path: "/news" },
  { label: "Liên hệ", image: phone, path: "/contacts" },
  { label: "Phản hồi", image: customerService, path: "/feedback" },
];

type PendingHomeAction =
  | { type: "navigate"; path: string }
  | { type: "search" };

function getAuthenticationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Không thể xác thực tài khoản Zalo. Vui lòng thử lại.";
}

function HomePage() {
  const navigate = useNavigate();
  const { user, accessToken, status, authenticate } = useCurrentUser();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingAction, setPendingAction] =
    useState<PendingHomeAction | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const authInFlightRef = useRef(false);

  const completeAction = (action: PendingHomeAction) => {
    if (action.type === "search") {
      setSearchOpen(true);
      return;
    }
    navigate(action.path);
  };

  const authenticateAndContinue = async (action: PendingHomeAction) => {
    if (authInFlightRef.current) return;

    authInFlightRef.current = true;
    setAuthDialogOpen(true);
    setAuthLoading(true);
    setAuthError("");
    try {
      await authenticate();
      setAuthDialogOpen(false);
      setPendingAction(null);
      completeAction(action);
    } catch (error: unknown) {
      setAuthError(getAuthenticationErrorMessage(error));
    } finally {
      authInFlightRef.current = false;
      setAuthLoading(false);
    }
  };

  const requireAuthentication = (action: PendingHomeAction) => {
    // TEMP: Skip the Zalo login gate for browser testing in development.
    // Remove this block to require login again during local development.
    if (import.meta.env.DEV) {
      completeAction(action);
      return;
    }

    if (status === "authenticated" && user && accessToken) {
      completeAction(action);
      return;
    }

    setPendingAction(action);
    void authenticateAndContinue(action);
  };

  return (
    <Page className="home-page">
      <section className="village-hero">
        <NotificationBell
          alwaysVisible
          prominent
          className="home-notification-bell"
        />
        <img
          className="village-hero__background"
          src={bg}
          alt="Xã Truông Mít"
        />

        <svg
          className="village-hero__wave"
          viewBox="0 0 430 74"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,74 L0,58 C58,23 105,9 158,24 C224,43 282,68 342,59 C380,53 407,41 430,34 L430,74 Z"
            fill="#ffffff"
          />
        </svg>

        <div className="village-hero__brand">
          <img className="village-hero__mascot" src={mascot} alt="" />
          <h1>Xã Truông Mít</h1>
        </div>
      </section>

      <main className="home-content">
        <div className="section-heading-row">
          <h2 className="section-title">
            <span className="section-title__line" />
            Mini App
          </h2>

          <button
            className="search-pill"
            type="button"
            aria-label="Tìm kiếm"
            onClick={() => setSearchOpen(true)}
          >
            <span>Tìm kiếm</span>
            <Icon icon="zi-search" />
          </button>
        </div>

        <section className="featured-grid" aria-label="Chức năng nổi bật">
          {featuredItems.map((item) => (
            <button
              className="feature-card"
              key={item.label}
              type="button"
              onClick={() =>
                requireAuthentication({ type: "navigate", path: item.path })
              }
            >
              <div className="feature-card__image">
                <img src={item.image} alt="" />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </section>

        <section
          className="menu-panel"
          aria-label="Danh mục tiện ích"
          style={{ "--menu-watermark": `url(${emblem})` } as CSSProperties}
        >
          <BusinessProfileMenu />
          {menuItems.map((item) => (
            <button
              className="menu-item"
              key={item.label}
              type="button"
              onClick={() =>
                "path" in item &&
                item.path &&
                (item.path === "/business-profiles" ? navigate(item.path) : requireAuthentication({ type: "navigate", path: item.path }))
              }
            >
              <div className="menu-item__image">
                <img src={item.image} alt="" />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </section>
      </main>

      <SearchPopup open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ZaloAuthDialog
        visible={authDialogOpen}
        loading={authLoading}
        error={authError}
        onRetry={() => {
          if (pendingAction) void authenticateAndContinue(pendingAction);
        }}
        onClose={() => {
          if (authLoading) return;
          setAuthDialogOpen(false);
          setPendingAction(null);
          setAuthError("");
        }}
      />
    </Page>
  );
}

export default HomePage;
