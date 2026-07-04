export function FieldError({ message }) {
  if (!message) return null;
  return (
    <span className="field-error" role="alert">
      <span aria-hidden="true">⚠</span> {message}
    </span>
  );
}
