function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function FitnessBar({ value = 0, max = 1 }) {
  const safeMax = Number(max) > 0 ? Number(max) : 1;
  const pct = clamp((Number(value) / safeMax) * 100, 0, 100);

  return (
    <div className="fitness-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
