import type { CSSProperties } from "react";
import { useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import SearchPopup from "@/components/search-popup";
import { requestAppBack } from "@/components/app-back-handler";

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
import robot from "@/static/robot.png";
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
  { label: "Di tích lịch sử", image: historical, path: "/historical-sites" },
  { label: "Nông nghiệp", image: tractor, path: "/agriculture" },
  { label: "Làng nghề", image: pottery, path: "/craft-villages" },
  { label: "Ẩm thực", image: friedRice, path: "/cuisine" },
  { label: "Lễ hội", image: dragonBoat, path: "/festivals" },
  { label: "Tour\ntrải nghiệm", image: tourism, path: "/experience-tours" },
  { label: "Bản đồ", image: map, path: "/map" },
  { label: "AI\nHướng dẫn viên", image: robot, path: "/chat" },
  { label: "Tin tức", image: news, path: "/news" },
  { label: "Liên hệ", image: phone, path: "/contacts" },
  { label: "Phản hồi", image: customerService, path: "/feedback" },
];

function HomePage() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Page className="home-page">
      <section className="village-hero">
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
              onClick={() => navigate(item.path)}
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
          {menuItems.map((item) => (
            <button
              className="menu-item"
              key={item.label}
              type="button"
              onClick={() => "path" in item && item.path && navigate(item.path)}
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
    </Page>
  );
}

export default HomePage;
