export function SkeletonLoader({ count = 3, height = 'h-24' }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-carbon-900 border border-carbon-800 rounded-xl ${height} w-full`} />
      ))}
    </div>
  );
}
