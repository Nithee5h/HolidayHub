import Skeleton from '../ui/Skeleton';

export default function PackageCardSkeleton() {
  return (
    <div className="pkg-card pkg-card--skeleton" aria-hidden="true">
      <div className="pkg-card__media">
        <Skeleton height="100%" radius="0" />
      </div>
      <div className="pkg-card__body">
        <Skeleton width="40%" height="0.75rem" />
        <Skeleton width="75%" height="1.3rem" />
        <Skeleton height="0.85rem" />
        <Skeleton width="85%" height="0.85rem" />
        <Skeleton width="60%" height="1.8rem" />
        <div className="pkg-card__footer">
          <Skeleton width="35%" height="2rem" />
          <Skeleton width="25%" height="1rem" />
        </div>
      </div>
    </div>
  );
}
