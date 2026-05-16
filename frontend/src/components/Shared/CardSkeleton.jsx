import "./CardSkeleton.css";

function CardSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card-skeleton" aria-hidden>
          <div className="card-skeleton-image skeleton-shimmer" />
          <div className="card-skeleton-body">
            <div className="skeleton-line skeleton-shimmer w-40" />
            <div className="skeleton-line skeleton-shimmer w-80" />
            <div className="skeleton-line skeleton-shimmer w-30" />
          </div>
        </div>
      ))}
    </>
  );
}

export default CardSkeleton;
