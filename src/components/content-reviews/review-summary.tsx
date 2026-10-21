import type { ContentReviewSummary, ReviewStar } from "@/types/content-reviews";
import ReviewStars from "./review-stars";

export default function ReviewSummary({
  summary,
}: {
  summary: ContentReviewSummary;
}) {
  return (
    <div className="content-reviews__summary">
      <div className="content-reviews__score">
        <strong>{summary.total ? summary.average.toFixed(1) : "—"}</strong>
        <ReviewStars rating={summary.average} />
        <span>{summary.total} đánh giá</span>
      </div>
      <div className="content-reviews__distribution">
        {[5, 4, 3, 2, 1].map((star) => {
          const key = String(star) as ReviewStar;
          return (
            <div
              key={star}
              aria-label={`${star} sao: ${summary.counts[key]} đánh giá`}
            >
              <span>
                {star} <b>★</b>
              </span>
              <div className="content-reviews__track">
                <span
                  style={{
                    width: `${Math.max(0, Math.min(100, summary.distribution[key]))}%`,
                  }}
                />
              </div>
              <small>{summary.counts[key]}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
