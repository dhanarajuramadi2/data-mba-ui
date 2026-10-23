
export default function JobLibraryHeader({ onImport, onNewJob }) {
  return (
    <header className="job-library-header">
      <div>
        <h1>Job Library</h1>
        <p>
          Portable job definitions — build once in a sandbox,
          promote to production.
        </p>
      </div>

      <div className="job-library-header-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onImport}
        >
          Import XML / JSON
        </button>

        <button
          type="button"
          className="button button-primary"
          onClick={onNewJob}
        >
          ＋ New job
        </button>
      </div>
    </header>
  );
}
