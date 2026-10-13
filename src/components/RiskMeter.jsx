import { cn } from '@/lib/utils';
import { riskLevel } from '@/utils/analyzer';

export default function RiskMeter({ score = 0, showLabel = true, className }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const level = riskLevel(value);
  const bar = level === 'High' ? 'bg-destructive' : level === 'Medium' ? 'bg-warning' : 'bg-success';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Risk ${value} out of 100, ${level}`}
      >
        <div className={cn('h-full', bar)} style={{ width: `${value}%` }} />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {value} · {level}
        </span>
      )}
    </div>
  );
}
