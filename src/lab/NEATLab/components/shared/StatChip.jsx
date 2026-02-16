export default function StatChip({ label, value, pulse = false }) {
  return (
    <div className={`stat-chip ${pulse ? "pulse" : ""}`.trim()}>
      <span className="chip-label">{label}</span>
      <span className="chip-value">{value}</span>
    </div>
  );
}
