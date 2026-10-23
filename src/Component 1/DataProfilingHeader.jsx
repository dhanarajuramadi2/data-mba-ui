
export default function DataProfilingHeader({
  onExport,
  onSaveAsJob,
}) {
  return (
    <header className="profiling-header">
      <div className="profiling-header-title">
        <h1>Data Profiling</h1>
        <p>
          Completeness, value sets and formats — checked against
          the target Salesforce schema.
        </p>
      </div>

      <div className="profiling-header-actions">
        <button
          type="button"
          className="profiling-button profiling-button-secondary"
          onClick={onExport}
        >
          <span aria-hidden="true">⇩</span>
          Export profile
        </button>

        <button
          type="button"
          className="profiling-button profiling-button-secondary"
          onClick={onSaveAsJob}
        >
          <span aria-hidden="true">▣</span>
          Save as job
        </button>
      </div>
    </header>
  );
}
