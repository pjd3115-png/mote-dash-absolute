import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { sdk } from '@/services/sdk';
import { useFetch } from '@/hooks/useFetch';
import ApperIcon from '@/components/ApperIcon';
import VerdictBadge from '@/components/VerdictBadge';
import RiskMeter from '@/components/RiskMeter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LANGUAGES, analyzeStory, riskLevel } from '@/utils/analyzer';

export const route = { path: '/checks/new', layout: 'owner', access: 'authenticated' };

const CLAIM_FIELDS = ['Name', 'verdict_c', 'keywords_c', 'topic_c'];

export default function CheckNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    Name: '',
    content_c: location.state?.content ?? '',
    sourceName_c: '',
    sourceUrl_c: '',
    language_c: 'English',
  });

  const { data: claimsData, error: claimsError } = useFetch(
    () =>
      sdk
        .table('claims_c')
        .select(CLAIM_FIELDS)
        .limit(100)
        .fetch()
        .then((res) => {
          if (!res.success) throw new Error(res.message);
          return res.data;
        }),
    []
  );
  const claims = claimsData ?? [];

  const analysis = useMemo(
    () =>
      analyzeStory(
        { title: form.Name, content: form.content_c, sourceName: form.sourceName_c },
        claims
      ),
    [form.Name, form.content_c, form.sourceName_c, claimsData]
  );

  const valid = form.Name.trim().length > 0 && form.content_c.trim().length >= 10;
  const hasInput = form.Name.trim().length > 0 || form.content_c.trim().length > 0;

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        Name: form.Name.trim(),
        content_c: form.content_c.trim(),
        sourceName_c: form.sourceName_c.trim(),
        sourceUrl_c: form.sourceUrl_c.trim(),
        language_c: form.language_c,
        verdict_c: analysis.verdict,
        riskScore_c: analysis.riskScore,
        signals_c: analysis.signals.join('\n'),
        reviewerNote_c: '',
        checkedOn_c: new Date().toISOString().slice(0, 10),
      };
      if (analysis.matchedClaim) payload.matchedClaim_c = analysis.matchedClaim.Id;
      const res = await sdk.table('checks_c').create(payload);
      if (res.messages?.length) {
        toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined });
      }
      if (!res.data?.length) return;
      toast.success('Check saved');
      const newId = res.data[0]?.Id;
      navigate(newId ? `/checks/${newId}` : '/checks');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/checks">
          <ApperIcon name="ArrowLeft" size={16} /> Back to Checks
        </Link>
      </Button>

      <div>
        <h1 className="font-heading text-3xl font-semibold">New check</h1>
        <p className="text-sm text-muted-foreground">The analysis on the right updates as you type. Save when you are happy with the details.</p>
      </div>

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5 rounded-sm border border-border bg-card p-5 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={form.Name}
              onChange={(e) => setField('Name', e.target.value)}
              placeholder="Short title, e.g. Free laptops for every student"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Story text</Label>
            <Textarea
              id="content"
              value={form.content_c}
              onChange={(e) => setField('content_c', e.target.value)}
              placeholder="Paste the full message or article text here…"
              rows={8}
            />
            {form.content_c.length > 0 && form.content_c.trim().length < 10 && (
              <p className="text-xs text-destructive">Add a little more text so there is something to analyze.</p>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sourceName">Source name</Label>
              <Input
                id="sourceName"
                value={form.sourceName_c}
                onChange={(e) => setField('sourceName_c', e.target.value)}
                placeholder="Who published it? e.g. Local daily"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source link</Label>
              <Input
                id="sourceUrl"
                value={form.sourceUrl_c}
                onChange={(e) => setField('sourceUrl_c', e.target.value)}
                placeholder="https://example.com/story"
              />
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
          <div className="flex flex-wrap gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={!valid || saving}>
              {saving ? (
                <>
                  <ApperIcon name="LoaderCircle" size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save check'
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/checks">Cancel</Link>
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Live analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasInput ? (
                <p className="text-sm text-muted-foreground">Start typing a headline or paste the story to see the verdict and risk signals.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <VerdictBadge verdict={analysis.verdict} />
                    <RiskMeter score={analysis.riskScore} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Risk level: <span className="font-medium text-foreground">{riskLevel(analysis.riskScore)}</span>
                  </p>
                  {analysis.matchedClaim && (
                    <div className="rounded-sm border border-border bg-muted p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Matched fact-library claim</p>
                      <Link to={`/claims/${analysis.matchedClaim.Id}`} className="font-medium text-highlight underline-offset-2 hover:underline">
                        {analysis.matchedClaim.Name}
                      </Link>
                    </div>
                  )}
                  {analysis.signals.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {analysis.signals.map((signal, index) => (
                        <li key={`${index}-${signal}`} className="flex gap-2">
                          <ApperIcon name="Flag" size={14} className="mt-1 shrink-0 text-warning" />
                          <span>{signal}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No warning signals found in the wording.</p>
                  )}
                  <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                    Demo analysis: it compares your text with the fact library and scores wording signals. An Unverified verdict means no library match, not that the story is true.
                  </p>
                </>
              )}
              {claimsError && <p className="text-xs text-destructive">The fact library could not be loaded, so matching is off.</p>}
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
