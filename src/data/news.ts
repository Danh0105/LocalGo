import newsIcon from "@/static/icon-07.png";

export type NewsCategory =
  | "Thông báo"
  | "Hoạt động xã"
  | "Du lịch"
  | "Nông nghiệp"
  | "Chuyển đổi số";

export interface NewsArticle {
  id: string;
  title: string;
  category: NewsCategory;
  publishedAt: string;
  author: string;
  summary: string;
  content: string[];
  tags: string[];
  relatedLinks: string[];
  image: string;
}

export const newsArticles: NewsArticle[] = [
  {
    id: "ra-mat-mini-app-truong-mit",
    title: "Ra mắt Mini App giới thiệu xã Truông Mít",
    category: "Chuyển đổi số",
    publishedAt: "09/07/2026",
    author: "Ban biên tập xã Truông Mít",
    summary:
      "Mini App hỗ trợ người dân và du khách tra cứu thông tin địa phương, điểm đến, sản phẩm, tour trải nghiệm và tin tức mới.",
    content: [
      "Mini App xã Truông Mít được xây dựng nhằm số hóa thông tin địa phương, giúp người dân, du khách và các cơ sở sản xuất tiếp cận dữ liệu một cách thuận tiện hơn.",
      "Ở giai đoạn đầu, ứng dụng cung cấp các nhóm chức năng như giới thiệu địa phương, di tích, nông nghiệp, OCOP, làng nghề, ẩm thực, lễ hội, tour trải nghiệm, bản đồ và tin tức.",
      "Khi kết nối API quản trị, nội dung tin tức có thể được cập nhật theo thời gian thực, hỗ trợ thông báo nhanh và lưu trữ bài viết tập trung.",
    ],
    tags: ["Mini App", "Chuyển đổi số", "Truông Mít"],
    relatedLinks: ["Giới thiệu", "Bản đồ", "Tin tức"],
    image: newsIcon,
  },
  {
    id: "thong-bao-lich-tiep-cong-dan",
    title: "Thông báo lịch tiếp công dân trong tuần",
    category: "Thông báo",
    publishedAt: "08/07/2026",
    author: "Văn phòng UBND xã",
    summary:
      "UBND xã thông tin lịch tiếp công dân, thời gian làm việc và kênh liên hệ để người dân chủ động sắp xếp.",
    content: [
      "Người dân có nhu cầu liên hệ giải quyết thủ tục, phản ánh kiến nghị hoặc đăng ký làm việc vui lòng theo dõi lịch tiếp công dân được cập nhật hằng tuần.",
      "Khi đến làm việc, người dân nên chuẩn bị giấy tờ liên quan để quá trình tiếp nhận và hướng dẫn được nhanh chóng, đầy đủ hơn.",
      "Nội dung này là dữ liệu mẫu, có thể thay bằng thông báo thật từ hệ thống quản trị sau khi tích hợp API.",
    ],
    tags: ["Thông báo", "UBND", "Tiếp công dân"],
    relatedLinks: ["Liên hệ", "Bản đồ"],
    image: newsIcon,
  },
  {
    id: "ngay-hoi-nong-san-dia-phuong",
    title: "Chuẩn bị tổ chức ngày hội nông sản địa phương",
    category: "Nông nghiệp",
    publishedAt: "07/07/2026",
    author: "Tổ truyền thông nông nghiệp",
    summary:
      "Ngày hội nông sản dự kiến giới thiệu trái cây, sản phẩm chế biến, OCOP và các mô hình sản xuất tiêu biểu của xã.",
    content: [
      "Ngày hội nông sản là dịp kết nối hộ sản xuất, tổ hợp tác và người tiêu dùng, đồng thời quảng bá các sản phẩm đặc trưng của xã Truông Mít.",
      "Các gian hàng dự kiến trưng bày trái cây theo mùa, sản phẩm chế biến, mô hình nông nghiệp sạch và thông tin về vùng sản xuất địa phương.",
      "Sự kiện có thể liên thông với các chức năng Nông nghiệp, OCOP, Làng nghề và Tour trải nghiệm trong Mini App.",
    ],
    tags: ["Nông sản", "OCOP", "Sản xuất"],
    relatedLinks: ["Nông nghiệp", "OCOP", "Lễ hội"],
    image: newsIcon,
  },
  {
    id: "goi-y-tour-cuoi-tuan",
    title: "Gợi ý lịch trình cuối tuần tại Truông Mít",
    category: "Du lịch",
    publishedAt: "06/07/2026",
    author: "Ban du lịch cộng đồng",
    summary:
      "Du khách có thể kết hợp đạp xe ven kênh, tham quan vườn cây, thưởng thức ẩm thực và mua đặc sản địa phương.",
    content: [
      "Với lịch trình nửa ngày hoặc một ngày, du khách có thể bắt đầu từ trung tâm xã, di chuyển đến tuyến kênh Đông, ghé vườn cây hoặc điểm làng nghề theo mùa.",
      "Buổi trưa hoặc chiều, khách có thể thưởng thức các món ăn địa phương, mua đặc sản, sản phẩm OCOP và kết thúc bằng điểm check-in hoàng hôn.",
      "Các điểm dừng nên được cập nhật theo mùa vụ, thời tiết và khả năng đón khách của từng cơ sở.",
    ],
    tags: ["Du lịch", "Tour trải nghiệm", "Cuối tuần"],
    relatedLinks: ["Điểm du lịch", "Tour trải nghiệm", "Ẩm thực"],
    image: newsIcon,
  },
  {
    id: "ra-quan-ve-sinh-moi-truong",
    title: "Ra quân vệ sinh môi trường các tuyến đường chính",
    category: "Hoạt động xã",
    publishedAt: "05/07/2026",
    author: "Đoàn thể xã Truông Mít",
    summary:
      "Các đoàn thể và người dân cùng tham gia dọn vệ sinh, trồng cây xanh và chỉnh trang cảnh quan nông thôn.",
    content: [
      "Hoạt động vệ sinh môi trường được tổ chức nhằm tạo cảnh quan xanh, sạch, đẹp tại các tuyến đường chính, khu dân cư và điểm sinh hoạt cộng đồng.",
      "Người dân được khuyến khích phân loại rác, không xả rác xuống kênh mương và cùng chăm sóc cây xanh sau khi trồng.",
      "Những hoạt động cộng đồng như thế này có thể được cập nhật thường xuyên trong mục Tin tức để tăng tính kết nối giữa chính quyền và người dân.",
    ],
    tags: ["Môi trường", "Cộng đồng", "Nông thôn mới"],
    relatedLinks: ["Lễ hội", "Bản đồ"],
    image: newsIcon,
  },
];
