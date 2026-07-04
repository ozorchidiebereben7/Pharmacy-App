export function Logo({ size = 32, withWordmark = false }) {
  return (
    <span className="logo-mark">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--color-primary)" />
        <path d="M14 7h4v7h7v4h-7v7h-4v-7H7v-4h7z" fill="#fff" />
      </svg>
      {withWordmark && <span className="logo-wordmark">Pharmacy App</span>}
    </span>
  );
}
