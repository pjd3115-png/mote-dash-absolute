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
import { formatLocalDate, DATE_FORMATS } from '@/utils/date';
import { riskLevel } from '@/utils/analyzer';

export const route = { path: '/checks/:id', layout: 'owner', access: 'authenticated' };

const FIELDS = [
  'Name',
  'content_c',
  'sourceName_c',
  'sourceUrl_c',
  'language_c',
  'verdict_c',
  'riskScore_c',
  'signals_c',
  'matchedClaim_c',
  'reviewerNote_c',
  'checkedOn_c',
  'Owner',
  'CreatedOn',
];

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default function CheckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { canUpdate, canDelete } = getTableAccess(profile, 'checks_c');
  const [deleting, setDeleting] = useState(false);

  const { data: record, loading, error, run } = useFetch(
    () =>
      sdk
        .table('checks_c')
        .select(FIELDS)
        .get(id)
        .then((res) => res.data ?? null),
    [id]
  );

  async function remove() {
    setDeleting(true);
    try {
      const res = await sdk.table('checks_c').remove([id]);
      if (res.messages?.length && !res.data?.length) {
        toast.error(res.messages[0]);
        return;
      }
      toast.success('Check deleted');
      navigate('/checks');
    } finally {
      setDeleting(false);
    }
  }

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/checks">
        <ApperIcon name="ArrowLeft" size={16} /> Back to Checks
      </Link>
    </Button>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <div className="flex flex-col items-start gap-3 rounded-sm border border-destructive/30 bg-destructive/10 p-5">
          <p className="text-sm text-destructive">{error.message || 'This check could not be loaded.'}</p>
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
          This check was not found. It may have been deleted.
        </div>
      </div>
    );
  }

  const signals = String(record.signals_c || '')
    .split('\n')
    .filter(Boolean);
  const matchedId = record.matchedClaim_c?.Id ?? null;

  return (
    <div className="space-y-6">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <VerdictBadge verdict={record.verdict_c} />
          <h1 className="font-heading text-3xl font-semibold leading-tight">{record.Name}</h1>
          <p className="text-sm text-muted-foreground">
            Checked {record.checkedOn_c ? formatLocalDate(record.checkedOn_c, DATE_FORMATS.SHORT) : '—'} by {record.Owner?.Name ?? '—'}
          </p>
        </div>
        <div className="flex gap-2">
          {canUpdate && (
            <Button asChild>
              <Link to={`/checks/${id}/edit`}>
                <ApperIcon name="Pencil" size={16} /> Edit
              </Link>
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
                  <AlertDialogTitle>Delete this check?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{record.Name}" and its analysis will be removed. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>{deleting ? 'Deleting…' : 'Delete check'}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Story text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{record.content_c || 'No text was saved.'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Reviewer note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {record.reviewerNote_c || 'No note yet. Use Edit to add what you found.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <RiskMeter score={record.riskScore_c} />
                <p className="text-xs text-muted-foreground">{riskLevel(record.riskScore_c)} risk</p>
              </div>
              {matchedId && (
                <div className="rounded-sm border border-border bg-muted p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Matched claim</p>
                  <Link to={`/claims/${matchedId}`} className="font-medium text-highlight underline-offset-2 hover:underline">
                    {record.matchedClaim_c?.Name}
                  </Link>
                </div>
              )}
              {signals.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {signals.map((signal, index) => (
                    <li key={`${index}-${signal}`} className="flex gap-2">
                      <ApperIcon name="Flag" size={14} className="mt-1 shrink-0 text-warning" />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No warning signals were recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Source</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <Field label="Source name">{record.sourceName_c || 'Not named'}</Field>
                <Field label="Source link">
                  {record.sourceUrl_c ? (
                    <a href={record.sourceUrl_c} target="_blank" rel="noreferrer" className="break-all text-highlight underline-offset-2 hover:underline">
                      {record.sourceUrl_c}
                    </a>
                  ) : (
                    'No link'
                  )}
                </Field>
                <Field label="Language">{record.language_c || '—'}</Field>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
