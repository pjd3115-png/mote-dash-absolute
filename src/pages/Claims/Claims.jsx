import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { useProfile } from '@/hooks/useProfile';
import { getTableAccess } from '@/services/userPermissions';
import ApperIcon from '@/components/ApperIcon';
import VerdictBadge from '@/components/VerdictBadge';
import { ListSkeleton } from '@/components/PageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';
import { cn } from '@/lib/utils';
import { CLAIM_VERDICTS, TOPICS } from '@/utils/analyzer';
import ClaimForm from './ClaimForm';

const { eq, contains, and } = window.ApperSDK.CoreSDK;

export const route = { path: '/claims', layout: 'owner', access: 'authenticated' };
export const nav = { icon: 'BookCheck', label: 'Fact library', order: 30, profiles: null, count: { table: 'claims_c', where: null } };

const FIELDS = ['Name', 'verdict_c', 'topic_c', 'keywords_c', 'reviewedOn_c', 'CreatedOn'];
const PAGE_SIZE = 10;

export default function Claims() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { canCreate } = getTableAccess(profile, 'claims_c');
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [verdict, setVerdict] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [query, topic, verdict]);

  const { data, loading, error, run } = useFetch(() => {
    const filters = [];
    if (topic !== 'all') filters.push(eq('topic_c', topic));
    if (verdict !== 'all') filters.push(eq('verdict_c', verdict));
    if (query) filters.push(contains('Name', query));
    let q = sdk.table('claims_c').select(FIELDS);
    if (filters.length) q = q.where(and(...filters));
    return q
      .orderByDesc('CreatedOn')
      .page(page, PAGE_SIZE)
      .fetch()
      .then((res) => {
        if (!res.success) throw new Error(res.message);
        return { rows: res.data, total: res.total ?? res.data.length };
      });
  }, [query, topic, verdict, page]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const firstLoad = loading && data === undefined;
  const filtered = Boolean(query) || topic !== 'all' || verdict !== 'all';
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function open(id) {
    navigate(`/claims/${id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Fact library</h1>
          <p className="text-sm text-muted-foreground">Claims that have already been verified. New checks are matched against these.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <ApperIcon name="Plus" size={16} /> Add claim
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <ApperIcon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search claims…"
            className="pl-9"
            aria-label="Search claims"
          />
        </div>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="md:w-44" aria-label="Filter by topic">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {TOPICS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={verdict} onValueChange={setVerdict}>
          <SelectTrigger className="md:w-44" aria-label="Filter by verdict">
            <SelectValue placeholder="Verdict" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verdicts</SelectItem>
            {CLAIM_VERDICTS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">{error.message || 'The fact library could not be loaded.'}</p>
          <Button variant="outline" size="sm" onClick={run}>
            Try again
          </Button>
        </div>
      ) : firstLoad ? (
        <ListSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-border py-14 text-center">
          <ApperIcon name="BookCheck" size={32} className="text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {filtered ? 'No claims match these filters.' : 'The library is empty. Add a verified claim so new checks can be matched against it.'}
          </p>
          {!filtered && canCreate && <Button onClick={() => setCreateOpen(true)}>Add the first claim</Button>}
        </div>
      ) : (
        <div aria-busy={loading} className={cn('space-y-4 transition-opacity', loading && 'pointer-events-none opacity-60')}>
          <div className="hidden overflow-x-auto rounded-sm border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead className="text-right">Reviewed</TableHead>
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
                    <TableCell className="max-w-lg">
                      <p className="truncate font-medium">{row.Name}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.keywords_c || 'No keywords'}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.topic_c}</Badge>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={row.verdict_c} />
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {row.reviewedOn_c ? formatLocalDate(row.reviewedOn_c, DATE_FORMATS.SHORT) : '—'}
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
                  <p className="font-medium leading-snug">{row.Name}</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{row.topic_c}</Badge>
                      <VerdictBadge verdict={row.verdict_c} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {row.reviewedOn_c ? formatLocalDate(row.reviewedOn_c, DATE_FORMATS.SHORT) : '—'}
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

      <ClaimForm open={createOpen} onOpenChange={setCreateOpen} record={null} onSaved={run} />
    </div>
  );
}
