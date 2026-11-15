/** Instant skeleton shown while a route streams in, shaped like the real page to avoid layout jumps. */
export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Cargando">
      <div className="skeleton skeleton--line" style={{ width: 160 }} />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" style={{ width: "min(480px, 80%)", marginBottom: 32 }} />
      <div className="grid-products">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton skeleton--media" />
            <div className="skeleton skeleton--line" style={{ width: "40%" }} />
            <div className="skeleton skeleton--line" style={{ width: "80%" }} />
            <div className="skeleton skeleton--line" style={{ width: "55%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
