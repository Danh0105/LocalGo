import { useEffect, useState } from "react";
import { Icon, Page, useNavigate } from "zmp-ui";

import { OcopCategory, OcopProduct } from "@/data/ocop";
import { getOcopProducts } from "@/services/ocop";
import "../css/pages/ocop.css";

type OcopFilter = "Tất cả" | OcopCategory;

const filters: OcopFilter[] = [
  "Tất cả",
  "Thực phẩm",
  "Đồ uống",
  "Nông sản tươi",
  "Sản phẩm chế biến",
];

function OcopStars({ rating }: { rating: number }) {
  return (
    <span className="ocop-stars" aria-label={`${rating} sao OCOP`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Icon
          className={index < rating ? "ocop-stars__star--active" : ""}
          icon="zi-star-solid"
          key={index}
        />
      ))}
    </span>
  );
}

function OcopPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<OcopFilter>("Tất cả");
  const [products, setProducts] = useState<OcopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError("");

    getOcopProducts({
      category: activeFilter === "Tất cả" ? undefined : activeFilter,
    })
      .then((data) => {
        if (!isActive) return;
        setProducts(data);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setError("Không thể tải danh sách sản phẩm OCOP.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [activeFilter]);

  return (
    <Page className="ocop-page">
      <header className="ocop-header">
        <button
          className="ocop-back"
          type="button"
          aria-label="Quay lại"
          onClick={() => navigate(-1)}
        >
          <Icon icon="zi-arrow-left" />
        </button>
        <div>
          <span>Sản phẩm địa phương</span>
          <h1>OCOP</h1>
        </div>
      </header>

      <main className="ocop-content">
        <section className="ocop-intro">
          <div>
            <span>One Commune One Product</span>
            <p>
              Giới thiệu sản phẩm tiêu biểu, điểm bán và thông tin nhà sản xuất
              của xã Truông Mít.
            </p>
          </div>
        </section>

        <div className="ocop-filters">
          {filters.map((filter) => (
            <button
              className={`ocop-filter${
                filter === activeFilter ? " ocop-filter--active" : ""
              }`}
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {isLoading && <p className="ocop-status">Đang tải dữ liệu...</p>}
        {!isLoading && error && (
          <p className="ocop-status ocop-status--error">{error}</p>
        )}
        {!isLoading && !error && products.length === 0 && (
          <p className="ocop-status">Chưa có sản phẩm trong nhóm này.</p>
        )}

        {!isLoading && !error && (
          <section className="ocop-list">
            {products.map((product) => (
              <button
                className="ocop-card"
                key={product.id}
                type="button"
                onClick={() => navigate(`/ocop/${product.id}`)}
              >
                <div className="ocop-card__image">
                  <img src={product.image} alt="" />
                </div>
                <div className="ocop-card__body">
                  <div className="ocop-card__topline">
                    <span className="ocop-card__category">
                      {product.category}
                    </span>
                    <OcopStars rating={product.rating} />
                  </div>
                  <h2>{product.name}</h2>
                  <p className="ocop-card__producer">
                    <Icon icon="zi-user" />
                    <span>{product.producer}</span>
                  </p>
                  <p className="ocop-card__summary">{product.summary}</p>
                </div>
                <Icon className="ocop-card__arrow" icon="zi-chevron-right" />
              </button>
            ))}
          </section>
        )}
      </main>
    </Page>
  );
}

export default OcopPage;
