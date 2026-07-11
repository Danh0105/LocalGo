import tourism from "@/static/world-tour.png";

export type AttractionCategory = "Sinh thái" | "Trải nghiệm" | "Check-in";

export interface Attraction {
  id: string;
  name: string;
  category: AttractionCategory;
  address: string;
  openHours: string;
  ticket: string;
  summary: string;
  description: string[];
  highlights: string[];
  tip: string;
  image: string;
}

export const attractions: Attraction[] = [
  {
    id: "ho-dau-tieng",
    name: "Hồ Dầu Tiếng",
    category: "Sinh thái",
    address: "Phía bắc xã Truông Mít (cách trung tâm xã 8km)",
    openHours: "Cả ngày",
    ticket: "Miễn phí",
    summary:
      "Hồ thủy lợi nhân tạo lớn nhất Việt Nam với mặt nước mênh mông, đảo nhỏ và bãi cỏ ven hồ lý tưởng để cắm trại.",
    description: [
      "Hồ Dầu Tiếng rộng hơn 27.000ha, là công trình thủy lợi nhân tạo lớn nhất Việt Nam. Mặt hồ xanh biếc trải dài tít tắp, điểm xuyết những đảo nhỏ như đảo Nhím, đảo Xỉn tạo nên khung cảnh sơn thủy hữu tình.",
      "Khu vực ven hồ thuộc địa phận xã có nhiều bãi cỏ rộng, hàng cây xanh mát — điểm cắm trại, dã ngoại cuối tuần được giới trẻ yêu thích. Bình minh và hoàng hôn trên mặt hồ là khoảnh khắc được săn đón nhiều nhất.",
    ],
    highlights: [
      "Cắm trại qua đêm ven hồ",
      "Săn bình minh, hoàng hôn trên mặt nước",
      "Thuê thuyền tham quan đảo Nhím",
      "Câu cá giải trí",
    ],
    tip: "Nên đi vào mùa khô (tháng 12 - tháng 4), mang theo lều và đồ ăn vì dịch vụ quanh hồ còn hạn chế.",
    image: tourism,
  },
  {
    id: "kenh-dong",
    name: "Tuyến kênh Đông",
    category: "Check-in",
    address: "Chạy dọc xã Truông Mít",
    openHours: "Cả ngày",
    ticket: "Miễn phí",
    summary:
      "Con kênh thủy lợi xanh mát chạy dọc xã với hai hàng cây rợp bóng, cung đường đạp xe và chụp ảnh tuyệt đẹp.",
    description: [
      "Kênh Đông dẫn nước từ hồ Dầu Tiếng tưới mát cho hàng chục nghìn hecta đất nông nghiệp. Đoạn chảy qua Truông Mít có bờ kênh thẳng tắp, hai bên là hàng cây xanh và những cánh đồng lúa, mía nối tiếp nhau.",
      "Cung đường dọc bờ kênh được trải nhựa phẳng, ít xe cộ — trở thành tuyến đạp xe, chạy bộ và chụp ảnh 'sống ảo' quen thuộc của người dân và du khách.",
    ],
    highlights: [
      "Đạp xe dọc bờ kênh lúc sáng sớm",
      "Chụp ảnh đồng lúa mùa gặt",
      "Ngắm hoàng hôn trên kênh",
    ],
    tip: "Đẹp nhất vào mùa lúa chín (tháng 3 và tháng 8), nên đi vào sáng sớm hoặc chiều muộn để tránh nắng.",
    image: tourism,
  },
  {
    id: "vuon-trai-cay-thuan-binh",
    name: "Vườn trái cây Thuận Bình",
    category: "Trải nghiệm",
    address: "Ấp Thuận Bình, xã Truông Mít",
    openHours: "07:00 - 17:00 (mùa trái cây)",
    ticket: "50.000đ/người (ăn trái cây tại vườn)",
    summary:
      "Cụm vườn sầu riêng, măng cụt, chôm chôm sai trĩu quả, cho khách tham quan và thưởng thức trái cây tại chỗ.",
    description: [
      "Cụm vườn trái cây Thuận Bình rộng gần 30ha với các vườn sầu riêng, măng cụt, chôm chôm, dâu da được canh tác theo hướng hữu cơ. Vào mùa thu hoạch, cây trái sai trĩu tạo nên khung cảnh miệt vườn trù phú.",
      "Du khách được chủ vườn dẫn tham quan, nghe kể chuyện nghề vườn và tự tay hái, thưởng thức trái cây chín cây ngay dưới tán lá — trải nghiệm được các gia đình có trẻ nhỏ đặc biệt yêu thích.",
    ],
    highlights: [
      "Hái và ăn trái cây tại vườn",
      "Nghe chủ vườn chia sẻ nghề trồng sầu riêng",
      "Mua trái cây giá tận gốc mang về",
    ],
    tip: "Mùa trái cây rộ nhất từ tháng 5 đến tháng 8; cuối tuần khá đông, nên đặt trước qua mục Liên hệ.",
    image: tourism,
  },
  {
    id: "canh-dong-mia",
    name: "Cánh đồng mía Lộc Trung",
    category: "Check-in",
    address: "Ấp Lộc Trung, xã Truông Mít",
    openHours: "Cả ngày",
    ticket: "Miễn phí",
    summary:
      "Cánh đồng mía bạt ngàn xanh mướt — biểu tượng của vùng nguyên liệu mía Tây Ninh, đẹp nhất lúc hoàng hôn.",
    description: [
      "Truông Mít nằm trong vùng nguyên liệu mía trọng điểm của tỉnh. Cánh đồng mía Lộc Trung rộng hàng trăm hecta, trải dài ngút tầm mắt với màu xanh mướt quanh năm.",
      "Vào vụ thu hoạch (tháng 11 - tháng 3), du khách còn được chứng kiến cảnh thu hoạch mía nhộn nhịp và thưởng thức nước mía ép tại ruộng ngọt lịm.",
    ],
    highlights: [
      "Chụp ảnh giữa đồng mía xanh",
      "Xem thu hoạch mía vào vụ",
      "Uống nước mía ép tại ruộng",
    ],
    tip: "Hoàng hôn trên đồng mía rất đẹp; mặc quần áo dài tay để tránh lá mía cứa xước da.",
    image: tourism,
  },
  {
    id: "rung-cao-su",
    name: "Rừng cao su mùa thay lá",
    category: "Check-in",
    address: "Dọc tỉnh lộ 784, xã Truông Mít",
    openHours: "Cả ngày",
    ticket: "Miễn phí",
    summary:
      "Những lô cao su thẳng tắp chuyển màu vàng đỏ rực rỡ vào mùa thay lá, đẹp như trời Âu giữa lòng Tây Ninh.",
    description: [
      "Các lô cao su dọc tỉnh lộ 784 được trồng thẳng hàng tăm tắp, tạo thành những 'đường hầm' cây xanh hun hút. Từ cuối tháng 12 đến tháng 2, rừng cao su đồng loạt thay lá, chuyển từ xanh sang vàng, cam rồi đỏ rực.",
      "Đây là thời điểm các bạn trẻ và nhiếp ảnh gia đổ về chụp ảnh cưới, ảnh nghệ thuật giữa thảm lá khô dày và ánh nắng xuyên qua tán cây.",
    ],
    highlights: [
      "Chụp ảnh mùa cao su thay lá (tháng 12 - tháng 2)",
      "Xem cạo mủ cao su lúc sáng sớm",
      "Picnic dưới tán rừng",
    ],
    tip: "Xin phép chủ lô trước khi vào chụp ảnh và không đốt lá khô — nguy cơ cháy rất cao vào mùa khô.",
    image: tourism,
  },
  {
    id: "ben-thuyen-thuan-an",
    name: "Bến thuyền Thuận An",
    category: "Trải nghiệm",
    address: "Ấp Thuận An, xã Truông Mít",
    openHours: "06:00 - 18:00 hằng ngày",
    ticket: "100.000đ/người/chuyến thuyền",
    summary:
      "Bến thuyền du lịch nhỏ ven kênh, khởi hành các chuyến dạo kênh Đông, trải nghiệm chài lưới cùng ngư dân.",
    description: [
      "Bến thuyền Thuận An là mô hình du lịch cộng đồng do chính các hộ dân ven kênh xây dựng. Từ bến, thuyền máy nhỏ đưa khách dạo dọc kênh Đông, len qua những cánh đồng và vườn cây ăn trái.",
      "Du khách có thể cùng ngư dân thả lưới, đặt lờ bắt cá rồi thưởng thức thành quả nướng ngay tại bến — trải nghiệm sông nước dân dã khó quên.",
    ],
    highlights: [
      "Đi thuyền dạo kênh Đông",
      "Trải nghiệm chài lưới cùng ngư dân",
      "Thưởng thức cá nướng tại bến",
    ],
    tip: "Chuyến sáng sớm (6:00 - 8:00) mát mẻ và dễ gặp cảnh sinh hoạt sông nước nhất; nhớ mang áo phao được phát tại bến.",
    image: tourism,
  },
];
