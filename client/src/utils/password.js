/* Mirrors the server password policy (validators/auth.js). */
export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 && p.length <= 72 },
  { id: 'letter', label: 'Contains a letter', test: (p) => /[a-z]/i.test(p) },
  { id: 'number', label: 'Contains a number', test: (p) => /\d/.test(p) },
];

export const meetsPasswordPolicy = (p) => passwordRules.every((r) => r.test(p));

/** 0–4 strength score for the meter (policy + length + variety). */
export function passwordScore(p) {
  if (!p) return 0;
  let score = passwordRules.filter((r) => r.test(p)).length - 1;
  if (p.length >= 12) score += 1;
  if (/[^a-z0-9]/i.test(p) && /[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  return Math.max(1, Math.min(4, score));
}

export const scoreLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
