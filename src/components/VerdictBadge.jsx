import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VERDICT_STYLES } from '@/utils/analyzer';

export default function VerdictBadge({ verdict, className }) {
  const value = verdict || 'Unverified';
  return (
    <Badge variant="outline" className={cn('font-medium', VERDICT_STYLES[value], className)}>
      {value}
    </Badge>
  );
}
