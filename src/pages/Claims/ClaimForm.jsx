import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { sdk } from '@/services/sdk';
import ApperIcon from '@/components/ApperIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CLAIM_VERDICTS, TOPICS } from '@/utils/analyzer';

function emptyForm() {
  return {
    Name: '',
    verdict_c: 'Contradicted',
    topic_c: 'Health',
    keywords_c: '',
    explanation_c: '',
    reviewedOn_c: new Date().toISOString().slice(0, 10),
  };
}

function fromRecord(record) {
  return {
    Name: record.Name ?? '',
    verdict_c: record.verdict_c ?? 'Contradicted',
    topic_c: record.topic_c ?? 'Health',
    keywords_c: record.keywords_c ?? '',
    explanation_c: record.explanation_c ?? '',
    reviewedOn_c: record.reviewedOn_c ?? '',
  };
}

export default function ClaimForm({ open, onOpenChange, record, onSaved }) {
  const editing = Boolean(record);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(record ? fromRecord(record) : emptyForm());
  }, [open, record]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    if (!form.Name.trim()) {
      toast.error('Write the claim before saving.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        Name: form.Name.trim(),
        verdict_c: form.verdict_c,
        topic_c: form.topic_c,
        keywords_c: form.keywords_c.trim(),
        explanation_c: form.explanation_c,
      };
      if (form.reviewedOn_c) payload.reviewedOn_c = form.reviewedOn_c;
      const table = sdk.table('claims_c');
      const res = editing ? await table.update({ Id: record.Id, ...payload }) : await table.create(payload);
      if (res.messages?.length) {
        toast.error(res.messages[0], { description: res.messages.slice(1).join('\n') || undefined });
      }
      if (!res.data?.length) return;
      toast.success(editing ? 'Claim updated' : 'Claim added to the library');
      onOpenChange(false);
      setForm(emptyForm());
      if (onSaved) onSaved(res.data[0]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? 'Edit claim' : 'Add a claim'}</DialogTitle>
          <DialogDescription>
            Claims in the library are matched against every new check using their keywords.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="claim-name">Claim</Label>
            <Input
              id="claim-name"
              value={form.Name}
              onChange={(e) => setField('Name', e.target.value)}
              placeholder="State the claim in one sentence"
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="claim-verdict">Verdict</Label>
              <Select value={form.verdict_c} onValueChange={(v) => setField('verdict_c', v)}>
                <SelectTrigger id="claim-verdict">
                  <SelectValue placeholder="Choose a verdict" />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_VERDICTS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-topic">Topic</Label>
              <Select value={form.topic_c} onValueChange={(v) => setField('topic_c', v)}>
                <SelectTrigger id="claim-topic">
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-keywords">Keywords</Label>
            <Input
              id="claim-keywords"
              value={form.keywords_c}
              onChange={(e) => setField('keywords_c', e.target.value)}
              placeholder="hot water, cure, viral, infection"
            />
            <p className="text-xs text-muted-foreground">Separate with commas. A story matches when at least two keywords appear.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-explanation">Explanation</Label>
            <Textarea
              id="claim-explanation"
              value={form.explanation_c}
              onChange={(e) => setField('explanation_c', e.target.value)}
              placeholder="Explain why the claim is supported or contradicted…"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-reviewed">Reviewed on</Label>
            <Input id="claim-reviewed" type="date" value={form.reviewedOn_c} onChange={(e) => setField('reviewedOn_c', e.target.value)} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <ApperIcon name="LoaderCircle" size={16} className="animate-spin" /> Saving…
                </>
              ) : editing ? (
                'Save changes'
              ) : (
                'Add claim'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
