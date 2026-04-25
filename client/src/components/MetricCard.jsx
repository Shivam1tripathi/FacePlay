export function MetricCard({ icon: Icon, label, value, detail, active }) {
  return (
    <article className={active ? 'metric-card is-active' : 'metric-card'}>
      <div className="metric-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}
