const PALETTE = [
  { bg: '#DCEBFF', fg: '#1D4ED8' },
  { bg: '#FFE8D1', fg: '#B45309' },
  { bg: '#F1E4FF', fg: '#7C3AED' },
  { bg: '#D8F5EA', fg: '#0F766E' },
  { bg: '#FFE1EC', fg: '#BE185D' },
  { bg: '#E7F0D1', fg: '#4D7C0F' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function avatarColorFor(name) {
  return PALETTE[hashString(name || '') % PALETTE.length];
}

export function initialsFor(name) {
  const clean = (name || '').replace(/\(.*?\)/g, '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
