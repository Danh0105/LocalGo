import "@/css/components/content-rating.css";

export default function ContentRating({
  rating,
}: {
  rating?: { average: number; total: number };
}) {
  if (!rating) return null;
  return (
    <span className="content-rating">
      <span aria-hidden="true">★</span>
      {rating.total ? (
        <>
          <strong>{rating.average.toFixed(1)}</strong>
          <small>({rating.total} đánh giá)</small>
        </>
      ) : (
        <small>Chưa có đánh giá</small>
      )}
    </span>
  );
}
