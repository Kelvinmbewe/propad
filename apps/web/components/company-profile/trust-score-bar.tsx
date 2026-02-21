export function TrustScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Number(score || 0)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Trust score</span>
        <span className="font-semibold text-foreground">{clamped}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
