import { MapPin, ArrowUpRight, Sparkles, Leaf } from "lucide-react";
import { useNavigate } from "zmp-ui";
import { formatTradePostPrice } from "@/lib/trade-post-presentation";
import {
  getTradePostCategoryName,
  type TradePostResponse,
} from "@/services/trade-posts";
import fallback from "@/static/image-placeholder.svg";

export default function SectionTradeCard({
  post,
}: {
  post: TradePostResponse;
}) {
  const navigate = useNavigate();
  const image = post.thumbnailUrl || post.images?.[0]?.thumbnailUrl || post.images?.[0]?.url;
  return (
    <button
      className="section-trade-card"
      type="button"
      onClick={() =>
        navigate(`/trade/${encodeURIComponent(post.slug)}`)
      }
    >
      <div className="section-trade-card__image">
        <img
          src={image || fallback}
          className={image ? undefined : "is-placeholder"}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.classList.add("is-placeholder");
            event.currentTarget.src = fallback;
          }}
        />
        {post.featured && (
          <span>
            <Sparkles size={11} />
            Nổi bật
          </span>
        )}
      </div>
      <div className="section-trade-card__body">
        <span className="section-trade-card__category">
          {getTradePostCategoryName(post.category, post.categoryInfo)}
        </span>
        <h3>{post.title}</h3>
        <p>{post.summary}</p>
        <small>
          <span className="section-trade-card__avatar" aria-hidden="true">
            {(post.owner?.displayName || post.contactName || "L").charAt(0)}
          </span>
          {post.owner?.displayName || post.contactName}
        </small>
        <div className="section-trade-card__footer">
          <span>
            <MapPin size={12} />
            {post.address}
          </span>
          <strong
            className={post.purpose === "NON_PROFIT" ? "is-nonprofit" : ""}
          >
            {post.purpose === "NON_PROFIT" && <Leaf size={13} />}
            {formatTradePostPrice(post)}
          </strong>
        </div>
      </div>
      <span className="section-trade-card__arrow">
        <ArrowUpRight size={16} />
      </span>
    </button>
  );
}
