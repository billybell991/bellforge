export default function AnthologyGenerating() {
  return (
    <div className="phase generating" aria-live="polite" aria-busy="true">
      <div className="generating-content">
        <span className="generating-icon" aria-hidden="true">⚿</span>
        <h2 className="generating-title">Compiling Dossier</h2>
        <p className="generating-subtitle">
          Retrieving case files from the archive&hellip;
        </p>
        <div className="generating-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
