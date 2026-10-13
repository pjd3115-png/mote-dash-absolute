import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import ApperIcon from '@/components/ApperIcon';
import VerdictBadge from '@/components/VerdictBadge';
import RiskMeter from '@/components/RiskMeter';
import { StatsSkeleton } from '@/components/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/utils/date';

const { eq, gte, and } = window.ApperSDK.CoreSDK;

export const route = { path: '/', layout: 'owner', access: 'authenticated' };
export const nav = { icon: 'LayoutDashboard', label: 'Dashboard', order: 10, profiles: null };

const ROW_FIELDS = ['Name', 'verdict_c', 'riskScore_c', 'sourceName_c', 'checkedOn_c', 'CreatedOn'];

function countBlock(id, where) {
  const block = { id, fields: [{ field: 'Id', fn: 'Count', alias: 'count' }] };
  if (where) block.where = where;
  return block;
}

function fetchMetrics() {
  return sdk
    .table('checks_c')
    .select([{ field: 'Id' }])
    .aggregate([
      countBlock('total'),
      countBlock('supported', eq('verdict_c', 'Supported')),
      countBlock('contradicted', eq('verdict_c', 'Contradicted')),
      countBlock('unverified', eq('verdict_c', 'Unverified')),
      countBlock('highRisk', gte('riskScore_c', 60)),
    ])
    .limit(1)
    .fetch()
    .then((res) => {
      if (!res.success) throw new Error(res.message);
      const read = (id) => {
        const block = res.aggregators?.find((a) => a.id === id);
        return block?.data?.count ?? block?.count ?? block?.value ?? 0;
      };
      return {
        total: read('total'),
        supported: read('supported'),
        contradicted: read('contradicted'),
        unverified: read('unverified'),
        highRisk: read('highRisk'),
      };
    });
}

function fetchRecent() {
  return sdk
    .table('checks_c')
    .select(ROW_FIELDS)
    .orderByDesc('CreatedOn')
    .limit(6)
    .fetch()
    .then((res) => {
      if (!res.success) throw new Error(res.message);
      return res.data;
    });
}

function fetchQueue() {
  return sdk
    .table('checks_c')
    .select(ROW_FIELDS)
    .where(and(eq('verdict_c', 'Unverified'), gte('riskScore_c', 40)))
    .orderByDesc('riskScore_c')
    .limit(5)
    .fetch()
    .then((res) => {
      if (!res.success) throw new Error(res.message);
      return res.data;
    });
}

function ErrorNote({ message, onRetry }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-4 text-sm">
      <p className="text-destructive">{message || 'Something went wrong loading this section.'}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function CheckRow({ record }) {
  return (
    <li>
      <Link
        to={`/checks/${record.Id}`}
        className="flex items-center justify-between gap-3 rounded-sm px-2 py-3 transition-colors duration-(--transition-fast) hover:bg-accent"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{record.Name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {record.sourceName_c || 'No named source'} · {formatRelativeTime(record.CreatedOn)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <VerdictBadge verdict={record.verdict_c} />
          <RiskMeter score={record.riskScore_c} showLabel={false} />
        </div>
      </Link>
    </li>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const { data: metrics, loading: metricsLoading, error: metricsError, run: reloadMetrics } = useFetch(fetchMetrics, []);
  const { data: recent, loading: recentLoading, error: recentError, run: reloadRecent } = useFetch(fetchRecent, []);
  const { data: queue, loading: queueLoading, error: queueError, run: reloadQueue } = useFetch(fetchQueue, []);

  const chartData = [
    { name: 'Supported', count: metrics?.supported ?? 0, fill: 'var(--success)' },
    { name: 'Contradicted', count: metrics?.contradicted ?? 0, fill: 'var(--destructive)' },
    { name: 'Unverified', count: metrics?.unverified ?? 0, fill: 'var(--warning)' },
  ];

  function startCheck() {
    navigate('/checks/new', { state: { content: draft.trim() } });
  }

  const recentRows = recent ?? [];
  const queueRows = queue ?? [];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-sm border border-border bg-card p-5 shadow-(--shadow-sm) md:grid-cols-[1fr_1.1fr] md:p-7">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-highlight">Verification desk</p>
          <h1 className="font-heading text-3xl font-semibold leading-tight">Check a story before it spreads</h1>
          <p className="text-sm text-muted-foreground">
            Paste a forwarded message or headline. TruthScan compares it with the fact library and flags the wording
            tricks that misleading posts rely on.
          </p>
        </div>
        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste the message or headline you want to check…"
            rows={4}
            aria-label="Story to check"
          />
          <Button onClick={startCheck}>
            <ApperIcon name="ScanSearch" size={16} /> Analyze story
          </Button>
        </div>
      </section>

      <section aria-label="Summary">
        {metricsError ? (
          <ErrorNote message={metricsError.message} onRetry={reloadMetrics} />
        ) : metricsLoading && metrics === undefined ? (
          <StatsSkeleton count={4} />
        ) : (
          <dl className="grid grid-cols-2 divide-border rounded-sm border border-border bg-card md:grid-cols-4 md:divide-x">
            {[
              { label: 'Stories checked', value: metrics?.total ?? 0, tone: 'text-foreground' },
              { label: 'Supported', value: metrics?.supported ?? 0, tone: 'text-success' },
              { label: 'Contradicted', value: metrics?.contradicted ?? 0, tone: 'text-destructive' },
              { label: 'High risk', value: metrics?.highRisk ?? 0, tone: 'text-warning' },
            ].map((item) => (
              <div key={item.label} className="space-y-1 p-4 md:p-5">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                <dd className={`font-heading text-3xl font-semibold tabular-nums ${item.tone}`}>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Verdicts so far</CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading && metrics === undefined ? (
              <Skeleton className="h-48 w-full" />
            ) : (metrics?.total ?? 0) === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Run your first check to see the split.</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      cursor={{ fill: 'var(--accent)' }}
                      contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--popover-foreground)' }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="font-heading text-lg">Needs a human look</CardTitle>
            <span className="text-xs text-muted-foreground">Unverified, risk 40 or above</span>
          </CardHeader>
          <CardContent>
            {queueError ? (
              <ErrorNote message={queueError.message} onRetry={reloadQueue} />
            ) : queueLoading && queue === undefined ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : queueRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ApperIcon name="CircleCheck" size={28} className="text-success" />
                <p className="text-sm text-muted-foreground">Nothing is waiting. Every risky story has a verdict.</p>
              </div>
            ) : (
              <ul aria-busy={queueLoading} className="divide-y divide-border">
                {queueRows.map((row) => (
                  <CheckRow key={row.Id} record={row} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="font-heading text-lg">Recent checks</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/checks">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentError ? (
            <ErrorNote message={recentError.message} onRetry={reloadRecent} />
          ) : recentLoading && recent === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ApperIcon name="ScanSearch" size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No checks yet. Paste a story above to start.</p>
            </div>
          ) : (
            <ul aria-busy={recentLoading} className="divide-y divide-border">
              {recentRows.map((row) => (
                <CheckRow key={row.Id} record={row} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
