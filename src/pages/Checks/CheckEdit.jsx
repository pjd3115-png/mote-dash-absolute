import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import ApperIcon from '@/components/ApperIcon';
import LookupPicker from '@/components/LookupPicker';
import { DetailSkeleton } from '@/components/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LANGUAGES, VERDICTS } from '@/utils/analyzer';

export const route = { path: '/checks/:id/edit', layout: 'owner', access: 'authenticated' };

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
];

export default function CheckEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: record, loading, error, run } = useFetch(
    () =>
      sdk
        .table('checks_c')
        .select(FIELDS)
        .get(id)
        .then((res) => res.data ?? null),
    [id]
  );

  useEffect(() => {
    if (record) {
      setForm({
        Name: record.Name ?? '',
        content_c: record.content_c ?? '',
        sourceName_c: record.sourceName_c ?? '',
        sourceUrl_c: record.sourceUrl_c ?? '',
        language_c: record.language_c ?? 'English',
        verdict_c: record.verdict_c ?? 'Unverified',
        riskScore_c: record.riskScore_c ?? 0,
        signals_c: record.signals_c ?? '',
        matchedClaim_c: record.matchedClaim_c?.Id ?? record.matchedClaim_c ?? null,
        reviewerNote_c: record.reviewerNote_c ?? '',
        checkedOn_c: record.checkedOn_c ?? '',
      });
    }
  }, [record]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const back = (
    <Button variant="ghost" size="sm" asChild>
      <Link to={`/checks/${id}`}>
        <ApperIcon name="ArrowLeft" size={16} /> Back to check
      </Link>
    </Button>
  );

  async function save(event) {
    event.preventDefault();
    if (!form || saving) return;
    if (!form.Name.trim()) {
      toast.error('Add a headline before saving.');
      return;
    }
    setSaving(true);
    try {
      const score = Math.max(0, Math.min(100, Number(form.riskScore_c) || 0));
      const payload = {
        Id: id,
        Name: form.Name.trim(),
        content_c: form.content_c,
        sourceName_c: form.sourceName_c.trim(),
        sourceUrl_c: form.sourceUrl_c.trim(),
        language_c: form.language_c,
        verdict_c: form.verdict_c,
        riskScore_c: score,
        signals_c: form.signals_c,
        matchedClaim_c: form.matchedClaim_c ?? null,
        reviewerNote_c: form.reviewerNote_c,
      };
      if (form.checkedOn_c) payload.checkedOn_c = form.checkedOn_c;
      const res = await sdk.table('checks_c').update(payload);
      if (res.messages?.length) {
        toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined });
      }
      if (!res.data?.length) return;
      toast.success('Check updated');
      navigate(`/checks/${id}`);
    } finally {
      setSaving(false);
    }
  }

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

  if ((loading && record === undefined) || (record && !form)) {
    return (
      <div className="space-y-4">
        {back}
        <DetailSkeleton />
      </div>
    );
  }

  if (!record || !form) {
    return (
      <div className="space-y-4">
        {back}
        <div className="rounded-sm border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          This check was not found. It may have been deleted.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}
      <div>
        <h1 className="font-heading text-3xl font-semibold">Edit check</h1>
        <p className="text-sm text-muted-foreground">Correct the details, override the verdict, or add what you found.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="space-y-5 rounded-sm border border-border bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg font-semibold">Story</h2>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={form.Name} onChange={(e) => setField('Name', e.target.value)} placeholder="Short title for this story" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Story text</Label>
            <Textarea id="content" value={form.content_c} onChange={(e) => setField('content_c', e.target.value)} placeholder="The full message or article text" rows={6} />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sourceName">Source name</Label>
              <Input id="sourceName" value={form.sourceName_c} onChange={(e) => setField('sourceName_c', e.target.value)} placeholder="Who published it?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source link</Label>
              <Input id="sourceUrl" value={form.sourceUrl_c} onChange={(e) => setField('sourceUrl_c', e.target.value)} placeholder="https://example.com/story" />
            </div>
          </div>
          <div className="space-y-2 md:max-w-xs">
            <Label htmlFor="language">Language</Label>
            <Select value={form.language_c} onValueChange={(v) => setField('language_c', v)}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Choose a language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-5 rounded-sm border border-border bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg font-semibold">Verdict and analysis</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="verdict">Verdict</Label>
              <Select value={form.verdict_c} onValueChange={(v) => setField('verdict_c', v)}>
                <SelectTrigger id="verdict">
                  <SelectValue placeholder="Choose a verdict" />
                </SelectTrigger>
                <SelectContent>
                  {VERDICTS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk">Risk score (0–100)</Label>
              <Input id="risk" type="number" min={0} max={100} value={form.riskScore_c} onChange={(e) => setField('riskScore_c', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkedOn">Checked on</Label>
              <Input id="checkedOn" type="date" value={form.checkedOn_c} onChange={(e) => setField('checkedOn_c', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Matched claim</Label>
            <LookupPicker
              table="claims_c"
              searchField="Name"
              value={form.matchedClaim_c?.Id ?? form.matchedClaim_c ?? null}
              onChange={(value) => setField('matchedClaim_c', value)}
              clearable
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signals">Signals found</Label>
            <Textarea id="signals" value={form.signals_c} onChange={(e) => setField('signals_c', e.target.value)} placeholder="One signal per line, e.g. No named source" rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Reviewer note</Label>
            <Textarea id="note" value={form.reviewerNote_c} onChange={(e) => setField('reviewerNote_c', e.target.value)} placeholder="Add a note for the team…" rows={3} />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <ApperIcon name="LoaderCircle" size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={`/checks/${id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
