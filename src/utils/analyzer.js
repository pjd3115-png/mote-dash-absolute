export const VERDICTS = ['Supported', 'Contradicted', 'Unverified'];
export const CLAIM_VERDICTS = ['Supported', 'Contradicted'];
export const LANGUAGES = ['English', 'Marathi', 'Hindi'];
export const TOPICS = ['Health', 'Scams', 'Economy', 'Weather', 'Technology', 'Politics'];

export const VERDICT_STYLES = {
  Supported: 'border-success-border bg-success-muted text-success',
  Contradicted: 'border-destructive/30 bg-destructive/10 text-destructive',
  Unverified: 'border-warning-border bg-warning-muted text-warning',
};

export function riskLevel(score) {
  const value = Number(score) || 0;
  if (value >= 60) return 'High';
  if (value >= 30) return 'Medium';
  return 'Low';
}

const SENSATIONAL = [
  'shocking',
  'breaking',
  "you won't believe",
  'secret',
  'exposed',
  'miracle',
  'cure',
  'banned',
  "they don't want you to know",
  '100% proof',
  'urgent',
  'must watch',
  'conspiracy',
  'hoax',
  'doctors hate',
];

const CHAIN = ['forward this', 'share this', 'share with everyone', 'forward to', 'send this to', 'forward it'];
const VAGUE = ['sources say', 'experts say', 'doctors say', 'scientists say', 'people are saying', 'it is being said'];

function splitKeywords(value) {
  return String(value || '')
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

export function analyzeStory(story, claims) {
  const title = story.title || '';
  const content = story.content || '';
  const text = `${title} ${content}`.trim();
  const lower = text.toLowerCase();
  const signals = [];
  let risk = 0;

  if (!text) {
    return { verdict: 'Unverified', riskScore: 0, signals, matchedClaim: null };
  }

  const sensational = SENSATIONAL.filter((word) => lower.includes(word));
  if (sensational.length) {
    risk += Math.min(30, sensational.length * 10);
    signals.push(`Sensational wording: ${sensational.slice(0, 4).join(', ')}`);
  }

  const letters = text.replace(/[^A-Za-z]/g, '');
  const capitals = text.replace(/[^A-Z]/g, '');
  if (letters.length > 20 && capitals.length / letters.length > 0.3) {
    risk += 15;
    signals.push('Heavy use of capital letters');
  }

  const bangs = (text.match(/!/g) || []).length;
  if (bangs >= 3) {
    risk += 10;
    signals.push(`${bangs} exclamation marks`);
  }

  if (CHAIN.some((phrase) => lower.includes(phrase))) {
    risk += 15;
    signals.push('Forward-chain phrasing');
  }

  const vague = VAGUE.find((phrase) => lower.includes(phrase));
  if (vague) {
    risk += 10;
    signals.push(`Vague attribution ("${vague}")`);
  }

  if (!story.sourceName || !story.sourceName.trim()) {
    risk += 15;
    signals.push('No named source');
  }

  if (text.length < 80) {
    risk += 5;
    signals.push('Very short claim with little context');
  }

  let best = null;
  (claims || []).forEach((claim) => {
    const keywords = splitKeywords(claim.keywords_c);
    if (!keywords.length) return;
    const found = keywords.filter((k) => lower.includes(k));
    const score = found.length / keywords.length;
    if (found.length >= 2 && score >= 0.5 && (!best || score > best.score)) {
      best = { claim, score };
    }
  });

  let verdict = 'Unverified';
  if (best) {
    verdict = best.claim.verdict_c;
    if (verdict === 'Contradicted') {
      risk += 30;
    } else {
      risk = Math.max(0, risk - 20);
    }
    signals.push(`Matches fact-library claim: ${best.claim.Name}`);
  }

  return {
    verdict,
    riskScore: Math.max(0, Math.min(100, risk)),
    signals,
    matchedClaim: best ? best.claim : null,
  };
}
