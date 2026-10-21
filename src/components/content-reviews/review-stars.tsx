export default function ReviewStars({ rating }: { rating: number }) {
  return (
    <span
      className="content-review-stars"
      role="img"
      aria-label={`${rating} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={star <= Math.round(rating) ? "is-active" : ""}
        >
          ★
        </span>
      ))}
    </span>
  );
}
