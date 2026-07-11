import { Icon, Page, useNavigate } from "zmp-ui";

import bg from "@/static/icon-06.png";
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
  className: string;
  path?: string;
}[] = [
  {
    label: "Giới thiệu",
    image: chart,
    className: "feature-card--green",
    path: "/about",
  },
  {
    label: "Đền\nChùa - Miếu",
    image: temple,
    className: "feature-card--cyan",
    path: "/temples",
  },
  {
    label: "Điểm du lịch",
    image: tourism,
    className: "feature-card--yellow",
    path: "/attractions",
  },
  {
    label: "Đặc sản",
    image: restaurant,
    className: "feature-card--pink",
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

  return (
    <Page className="home-page">
      {/* HERO */}
      <section className="village-hero">
        <img
          className="village-hero__background"
          src={bg}
          alt="Xã Truông Mít"
        />

        <div className="village-hero__title-card">
          <h1>XÃ TRUÔNG MÍT</h1>
        </div>
      </section>

      {/* VIDEO */}
      <button className="video-card" type="button">
        <div className="video-card__preview">
          <Icon icon="zi-play-solid" />
        </div>

        <div className="video-card__label">
          <span>Video giới thiệu</span>
        </div>
      </button>

      <main className="home-content">
        {/* TIÊU ĐỀ + TÌM KIẾM */}
        <div className="section-heading-row">
          <h2 className="section-title">
            <span className="section-title__line" />
            Mini App
          </h2>

          <button className="search-pill" type="button" aria-label="Tìm kiếm">
            <span>Tìm kiếm</span>
            <Icon icon="zi-search" />
          </button>
        </div>

        {/* 4 CHỨC NĂNG NỔI BẬT */}
        <section className="featured-grid">
          {featuredItems.map((item) => (
            <button
              className={`feature-card ${item.className}`}
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
        <section className="menu-panel">
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
    </Page>
  );
}

export default HomePage;
