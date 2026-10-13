import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import { useProfile } from '@/hooks/useProfile';
import { getTableAccess } from '@/services/userPermissions';
import ApperIcon from '@/components/ApperIcon';
import VerdictBadge from '@/components/VerdictBadge';
import RiskMeter from '@/components/RiskMeter';
import { DetailSkeleton } from '@/components/PageSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatLocalDate, formatRelativeTime, DATE_FORMATS } from '@/utils/date';
import ClaimForm from './ClaimForm';

const { eq } = window.ApperSDK.CoreSDK;

export const route = { path: '/claims/:id', layout: 'owner', access: 'authenticated' };

const FIELDS = ['Name', 'verdict_c', 'topic_c', 'keywords_c', 'explanation_c', 'reviewedOn_c', 'Owner', 'CreatedOn'];

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { canUpdate, canDelete } = getTableAccess(profile, 'claims_c');
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: record, loading, error, run } = useFetch(
    () =>
      sdk
        .table('claims_c')
        .select(FIELDS)
        .get(id)
        .then((res) => res.data ?? null),
    [id]
  );

  const { data: linked, loading: linkedLoading } = useFetch(
    () =>
      sdk
        .table('checks_c')
        .select(['Name', 'verdict_c', 'riskScore_c', 'CreatedOn'])
        .where(eq('matchedClaim_c', id))
        .orderByDesc('CreatedOn')
        .limit(10)
        .fetch()
        .then((res) => {
          if (!res.success) throw new Error(res.message);
          return res.data;
        }),
    [id]
  );

  async function remove() {
    setDeleting(true);
    try {
      const res = await sdk.table('claims_c').remove([id]);
      if (res.messages?.length && !res.data?.length) {
        toast.error(res.messages[0]);
        return;
      }
      toast.success('Claim deleted');
      navigate('/claims');
    } finally {
      setDeleting(false);
    }
  }

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/claims">
        <ApperIcon name="ArrowLeft" size={16} /> Back to Fact library
      </Link>
    </Button>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <div className="flex flex-col items-start gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">{error.message || 'This claim could not be loaded.'}</p>
          <Button variant="outline" size="sm" onClick={run}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (loading && record === undefined) {
    return (
      <div className="space-y-4">
        {back}
        <DetailSkeleton />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-sm border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          This claim was not found. It may have been deleted.
        </div>
      </div>
    );
  }

  const keywords = String(record.keywords_c || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const linkedRows = linked ?? [];

  return (
    <div className="space-y-6">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={record.verdict_c} />
            <Badge variant="secondary">{record.topic_c}</Badge>
          </div>
          <h1 className="font-heading text-3xl font-semibold leading-tight">{record.Name}</h1>
          <p className="text-sm text-muted-foreground">
            Reviewed {record.reviewedOn_c ? formatLocalDate(record.reviewedOn_c, DATE_FORMATS.SHORT) : '—'}
            {record.Owner?.Name ? ` · added by ${record.Owner.Name}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <Button onClick={() => setEditOpen(true)}>
              <ApperIcon name="Pencil" size={16} /> Edit
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive" disabled={deleting}>
                  <ApperIcon name="Trash2" size={16} /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this claim?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{record.Name}" will leave the fact library, so new checks can no longer match it. Existing checks keep their saved verdicts.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>{deleting ? 'Deleting…' : 'Delete claim'}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{record.explanation_c || 'No explanation was written for this claim.'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Matching keywords</CardTitle>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <Badge key={k} variant="outline">
                      {k}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No keywords yet, so this claim cannot match new checks. Use Edit to add some.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:self-start">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Checks that matched</CardTitle>
          </CardHeader>
          <CardContent>
            {linkedLoading && linked === undefined ? (
              <p className="text-sm text-muted-foreground">Loading matches…</p>
            ) : linkedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No checks have matched this claim yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {linkedRows.map((row) => (
                  <li key={row.Id}>
                    <Link
                      to={`/checks/${row.Id}`}
                      className="block space-y-1.5 rounded-sm px-1 py-3 transition-colors duration-(--transition-fast) hover:bg-accent"
                    >
                      <p className="text-sm font-medium leading-snug">{row.Name}</p>
                      <div className="flex items-center justify-between gap-2">
                        <RiskMeter score={row.riskScore_c} showLabel={false} />
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(row.CreatedOn)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ClaimForm open={editOpen} onOpenChange={setEditOpen} record={record} onSaved={run} />
    </div>
  );
}
