import { Icon, Page } from "zmp-ui";

import bg from "@/static/icon-06.png";
import customerService from "@/static/customer-service.png";
import dragonBoat from "@/static/dragon-boat.png";
import friedRice from "@/static/fried-rice.png";
import chart from "@/static/presentation.png";
import historical from "@/static/icon-12.png";
import news from "@/static/icon-07.png";
import ocop from "@/static/icon-13.png";
import tourism from "@/static/world-tour.png";
import map from "@/static/map.png";
import phone from "@/static/phone.png";
import pottery from "@/static/pottery.png";
import restaurant from "@/static/restaurant.png";
import robot from "@/static/robot.png";
import temple from "@/static/temple.png";
import tractor from "@/static/tractor.png";
import worldTour from "@/static/icon-08.png";
import search from "@/static/search.png";
const featuredItems = [
  {
    label: "Giới thiệu",
    image: chart,
    className: "feature-card--green",
  },
  {
    label: "Đền\nChùa - Miếu",
    image: temple,
    className: "feature-card--cyan",
  },
  {
    label: "Điểm du lịch",
    image: worldTour,
    className: "feature-card--yellow",
  },
  {
    label: "Đặc sản",
    image: restaurant,
    className: "feature-card--pink",
  },
];

const menuItems = [
  { label: "Di tích lịch sử", image: historical },
  { label: "Nông nghiệp", image: tractor },
  { label: "OCOP", image: ocop },
  { label: "Làng nghề", image: pottery },
  { label: "Ẩm thực", image: friedRice },
  { label: "Lễ hội", image: dragonBoat },
  { label: "Tour\ntrải nghiệm", image: tourism },
  { label: "Bản đồ", image: map },
  { label: "AI\nHướng dẫn viên", image: robot },
  { label: "Tin tức", image: search },
  { label: "Liên hệ", image: phone },
  { label: "Phản hồi", image: customerService },
];

function HomePage() {
  return (
    <Page className="home-page">
      <section
        className="village-hero"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="hero-title">Xã Truông Mít</div>
      </section>

      <main className="home-content">
        <button className="video-card" type="button">
          video
        </button>

        <div className="section-heading-row">
          <h1 className="section-title">
            <span />
            Mini App
          </h1>
          <button className="search-pill" type="button" aria-label="Tìm kiếm">
            <span>Tìm kiếm</span>
            <Icon icon="zi-search" />
          </button>
        </div>

        <div className="featured-grid">
          {featuredItems.map((item) => (
            <button
              className={`feature-card ${item.className}`}
              key={item.label}
              type="button"
            >
              <img src={item.image} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <section className="menu-panel">
          {menuItems.map((item) => (
            <button className="menu-item" key={item.label} type="button">
              <img src={item.image} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </section>
      </main>
    </Page>
  );
}

export default HomePage;
