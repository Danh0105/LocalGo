import { Icon, Page, useNavigate } from "zmp-ui";

import bg from "@/static/icon-06.png";
import dragonBoat from "@/static/dragon-boat.png";
import pottery from "@/static/pottery.png";
import temple from "@/static/temple.png";
import tractor from "@/static/tractor.png";
import "../css/pages/about.css";

const stats = [
  { value: "4.870", unit: "ha", label: "Diện tích tự nhiên" },
  { value: "21.500", unit: "người", label: "Dân số" },
  { value: "7", unit: "ấp", label: "Đơn vị hành chính" },
  { value: "1979", unit: "", label: "Năm thành lập" },
];

const highlights = [
  {
    image: temple,
    title: "Văn hóa - Tín ngưỡng",
    description:
      "Hệ thống đình, chùa, miếu lâu đời gắn liền với đời sống tâm linh của người dân, tiêu biểu là đình Truông Mít với lễ Kỳ Yên hằng năm.",
  },
  {
    image: tractor,
    title: "Nông nghiệp",
    description:
      "Vùng chuyên canh mía, mì và cao su lớn của huyện; đang chuyển đổi mạnh sang cây ăn trái giá trị cao như sầu riêng, mãng cầu.",
  },
  {
    image: pottery,
    title: "Làng nghề truyền thống",
    description:
      "Nghề đan lát, làm bánh tráng phơi sương được gìn giữ qua nhiều thế hệ, tạo việc làm cho hàng trăm lao động địa phương.",
  },
  {
    image: dragonBoat,
    title: "Lễ hội",
    description:
      "Các lễ hội dân gian như đua thuyền, hội xuân thu hút đông đảo du khách, góp phần quảng bá hình ảnh quê hương.",
  },
];

const milestones = [
  {
    year: "1979",
    text: "Thành lập xã Truông Mít trên cơ sở tách từ xã Cầu Khởi, huyện Dương Minh Châu.",
  },
  {
    year: "2015",
    text: "Được công nhận xã đạt chuẩn Nông thôn mới.",
  },
  {
    year: "2021",
    text: "Đạt chuẩn Nông thôn mới nâng cao, hạ tầng giao thông nông thôn được nhựa hóa trên 90%.",
  },
  {
    year: "2025",
    text: "Ra mắt Mini App LocalGo, đẩy mạnh chuyển đổi số trong quảng bá du lịch và nông sản địa phương.",
  },
];

function AboutPage() {
  const navigate = useNavigate();

  return (
    <Page className="about-page">
      <section
        className="about-hero"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <button
          className="about-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div className="about-hero-title">Giới thiệu</div>
      </section>

      <main className="about-content">
        <section className="about-card about-intro">
          <h2 className="about-section-title">
            <span />
            Tổng quan
          </h2>
          <p>
            Xã Truông Mít nằm ở phía nam huyện Dương Minh Châu, tỉnh Tây Ninh,
            cách trung tâm huyện khoảng 15km. Với vị trí tiếp giáp kênh Đông
            hồ Dầu Tiếng, xã có lợi thế lớn về nguồn nước tưới phục vụ sản
            xuất nông nghiệp.
          </p>
          <p>
            Người dân Truông Mít cần cù, mến khách, giàu truyền thống cách
            mạng. Những năm gần đây, xã tập trung phát triển nông nghiệp công
            nghệ cao, gìn giữ làng nghề truyền thống và từng bước khai thác
            tiềm năng du lịch cộng đồng.
          </p>
        </section>

        <div className="about-stats">
          {stats.map((item) => (
            <div className="about-stat" key={item.label}>
              <strong>
                {item.value}
                {item.unit && <small> {item.unit}</small>}
              </strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <section className="about-card">
          <h2 className="about-section-title">
            <span />
            Điểm nổi bật
          </h2>
          <div className="about-highlights">
            {highlights.map((item) => (
              <article className="about-highlight" key={item.title}>
                <img src={item.image} alt="" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="about-card">
          <h2 className="about-section-title">
            <span />
            Dấu mốc phát triển
          </h2>
          <ul className="about-timeline">
            {milestones.map((item) => (
              <li key={item.year}>
                <span className="about-timeline-year">{item.year}</span>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </Page>
  );
}

export default AboutPage;
