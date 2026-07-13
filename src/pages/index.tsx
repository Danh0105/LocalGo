import type { CSSProperties } from "react";
import { useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import SearchPopup from "@/components/search-popup";

import bg from "@/static/icon-06.png";
import mascot from "@/static/mascot.png";
import emblem from "@/static/emblem.png";
import customerService from "@/static/customer-service.png";
import dragonBoat from "@/static/dragon-boat.png";
import friedRice from "@/static/fried-rice.png";
import chart from "@/static/presentation.png";
import historical from "@/static/icon-12.png";
import news from "@/static/search.png";
import ocop from "@/static/icon-13.png";
import tourism from "@/static/world-tour.png";
import map from "@/static/map.png";
import phone from "@/static/phone.png";
import pottery from "@/static/pottery.png";
import restaurant from "@/static/restaurant.png";
import robot from "@/static/robot.png";
import temple from "@/static/temple.png";
import tractor from "@/static/tractor.png";
import "../css/pages/home.css";
import "../css/pages/about.css";

const featuredItems: {
  label: string;
  image: string;
  path?: string;
}[] = [
  {
    label: "Giới thiệu",
    image: chart,
    path: "/about",
  },
  {
    label: "Đền\nChùa - Miếu",
    image: temple,
    path: "/temples",
  },
  {
    label: "Điểm du lịch",
    image: tourism,
    path: "/attractions",
  },
  {
    label: "Đặc sản",
    image: restaurant,
    path: "/specialties",
  },
];

const menuItems = [
  {
    label: "Di tích lịch sử",
    image: historical,
    path: "/historical-sites",
  },
  {
    label: "Nông nghiệp",
    image: tractor,
    path: "/agriculture",
  },
  {
    label: "OCOP",
    image: ocop,
    path: "/ocop",
  },
  {
    label: "Làng nghề",
    image: pottery,
    path: "/craft-villages",
  },
  {
    label: "Ẩm thực",
    image: friedRice,
    path: "/cuisine",
  },
  {
    label: "Lễ hội",
    image: dragonBoat,
    path: "/festivals",
  },
  {
    label: "Tour\ntrải nghiệm",
    image: tourism,
    path: "/experience-tours",
  },
  {
    label: "Bản đồ",
    image: map,
    path: "/map",
  },
  {
    label: "AI\nHướng dẫn viên",
    image: robot,
  },
  {
    label: "Tin tức",
    image: news,
    path: "/news",
  },
  {
    label: "Liên hệ",
    image: phone,
    path: "/contacts",
  },
  {
    label: "Phản hồi",
    image: customerService,
    path: "/feedback",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Page className="home-page">
      {/* HERO */}
      <section className="village-hero">
        <img
          className="village-hero__background"
          src={bg}
          alt="Xã Truông Mít"
        />

        {/* Đường cong sóng trắng */}
        <svg
          className="village-hero__wave"
          viewBox="0 0 375 70"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,70 L0,48 Q187.5,-28 375,48 L375,70 Z"
            fill="#ffffff"
          />
        </svg>

        <div className="village-hero__brand">
          <img className="village-hero__mascot" src={mascot} alt="" />
          <h1>XÃ TRUÔNG MÍT</h1>
        </div>
      </section>

      <main className="home-content">
        {/* TIÊU ĐỀ + TÌM KIẾM */}
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

        {/* 4 CHỨC NĂNG NỔI BẬT */}
        <section className="featured-grid">
          {featuredItems.map((item) => (
            <button
              className="feature-card"
              key={item.label}
              type="button"
              onClick={() => item.path && navigate(item.path)}
            >
              <div className="feature-card__image">
                <img src={item.image} alt="" />
              </div>

              <span>{item.label}</span>
            </button>
          ))}
        </section>

        {/* MENU */}
        <section
          className="menu-panel"
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
