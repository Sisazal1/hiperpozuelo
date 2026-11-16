// Esqueleto mientras carga una ruta dinámica (ficha, categoría, pack). Se pinta al instante.
export default function Loading() {
  return (
    <div className="route-skeleton" aria-busy="true" aria-label="Cargando">
      <div className="skeleton sk-line" />
      <div className="skeleton sk-title" />
      <div className="skeleton sk-line" />
      <div className="sk-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skeleton sk-card" key={i} style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  );
}
