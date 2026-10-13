import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import ApperIcon from '@/components/ApperIcon';
import VerdictBadge from '@/components/VerdictBadge';
import RiskMeter from '@/components/RiskMeter';
import { ListSkeleton } from '@/components/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';
import { cn } from '@/lib/utils';
import { VERDICTS } from '@/utils/analyzer';

const { eq, contains, and } = window.ApperSDK.CoreSDK;

export const route = { path: '/checks', layout: 'owner', access: 'authenticated' };
export const nav = { icon: 'ScanSearch', label: 'Checks', order: 20, profiles: null, count: { table: 'checks_c', where: null } };

const FIELDS = ['Name', 'verdict_c', 'riskScore_c', 'sourceName_c', 'language_c', 'checkedOn_c', 'CreatedOn'];
const PAGE_SIZE = 10;

export default function Checks() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [verdict, setVerdict] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [query, verdict, sort]);

  const { data, loading, error, run } = useFetch(() => {
    const filters = [];
    if (verdict !== 'all') filters.push(eq('verdict_c', verdict));
    if (query) filters.push(contains('Name', query));
    let q = sdk.table('checks_c').select(FIELDS);
    if (filters.length) q = q.where(and(...filters));
    q = sort === 'risk' ? q.orderByDesc('riskScore_c') : q.orderByDesc('CreatedOn');
    return q
      .page(page, PAGE_SIZE)
      .fetch()
      .then((res) => {
        if (!res.success) throw new Error(res.message);
        return { rows: res.data, total: res.total ?? res.data.length };
      });
  }, [query, verdict, sort, page]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const firstLoad = loading && data === undefined;
  const filtered = Boolean(query) || verdict !== 'all';
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function open(id) {
    navigate(`/checks/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Checks</h1>
          <p className="text-sm text-muted-foreground">Every story that has been run through TruthScan.</p>
        </div>
        <Button asChild>
          <Link to="/checks/new">
            <ApperIcon name="Plus" size={16} /> New check
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <ApperIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search headlines…"
            className="pl-9"
            aria-label="Search checks"
          />
        </div>
        <Select value={verdict} onValueChange={setVerdict}>
          <SelectTrigger className="md:w-44" aria-label="Filter by verdict">
            <SelectValue placeholder="Verdict" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verdicts</SelectItem>
            {VERDICTS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="md:w-44" aria-label="Sort checks">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="risk">Highest risk first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">{error.message || 'The checks could not be loaded.'}</p>
          <Button variant="outline" size="sm" onClick={run}>
            Try again
          </Button>
        </div>
      ) : firstLoad ? (
        <ListSkeleton rows={8} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border py-14 text-center">
          <ApperIcon name="ScanSearch" size={32} className="text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {filtered ? 'No checks match these filters. Try a different search or verdict.' : 'No checks yet. Paste your first story to see how it scores.'}
          </p>
          {!filtered && (
            <Button asChild>
              <Link to="/checks/new">Run your first check</Link>
            </Button>
          )}
        </div>
      ) : (
        <div aria-busy={loading} className={cn('space-y-4 transition-opacity', loading && 'pointer-events-none opacity-60')}>
          <div className="hidden overflow-x-auto rounded-sm border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Headline</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="text-right">Checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.Id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => open(row.Id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') open(row.Id);
                    }}
                  >
                    <TableCell className="max-w-md">
                      <p className="truncate font-medium">{row.Name}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.sourceName_c || 'No named source'}</p>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={row.verdict_c} />
                    </TableCell>
                    <TableCell>
                      <RiskMeter score={row.riskScore_c} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.language_c}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {row.checkedOn_c ? formatLocalDate(row.checkedOn_c, DATE_FORMATS.SHORT) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li key={row.Id}>
                <div
                  role="link"
                  tabIndex={0}
                  onClick={() => open(row.Id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') open(row.Id);
                  }}
                  className="cursor-pointer space-y-3 rounded-sm border border-border bg-card p-4 transition-colors duration-(--transition-fast) hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-snug">{row.Name}</p>
                    <VerdictBadge verdict={row.verdict_c} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <RiskMeter score={row.riskScore_c} />
                    <span className="text-xs text-muted-foreground">
                      {row.language_c} · {row.checkedOn_c ? formatLocalDate(row.checkedOn_c, DATE_FORMATS.SHORT) : '—'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
