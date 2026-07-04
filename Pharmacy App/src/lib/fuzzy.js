function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarity(a, b) {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshtein(s1, s2);
  return 1 - dist / maxLen;
}

export function findNearDuplicates(name, existingItems, threshold = 0.6) {
  return existingItems
    .map((item) => ({ item, score: similarity(name, item.name) }))
    .filter(({ score }) => score >= threshold && score < 1)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
