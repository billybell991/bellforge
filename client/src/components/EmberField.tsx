export function EmberField() {
  return (
    <div className="ember-field">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="ember" />
      ))}
    </div>
  );
}
