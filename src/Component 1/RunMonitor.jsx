
import { useState } from 'react';
import './RunMonitor.css';

const objectStatuses = [
  { name: 'User', status: 'Done', icon: '✓', type: 'done' },
  { name: 'Account', status: '63.0%', icon: '◔', type: 'running' },
  { name: 'Contact', status: 'Queued', icon: '◷', type: 'queued' },
  { name: 'Opportunity', status: 'Skipped', icon: '−', type: 'skipped' },
  { name: 'Line items', status: 'Blocked', icon: '!', type: 'blocked' },
  { name: 'Case', status: 'Queued', icon: '◷', type: 'queued' },
  { name: 'Task', status: 'Queued', icon: '◷', type: 'queued' },
  { name: 'Files', status: 'Queued', icon: '◷', type: 'queued' },
];

const metrics = [
  { label: 'ROWS TO LOAD', value: '178,700', note: 'after filters and dedupe', icon: '▤', type: 'blue' },
  { label: 'IN QUEUE', value: '46,180', note: 'waiting to be sent', icon: '⌛', type: 'gray' },
  { label: 'PROCESSING', value: '20,000', note: '2 jobs in flight', icon: '⚙', type: 'blue' },
  { label: 'SUCCEEDED', value: '112,507', note: 'incl. 5,333 updated', icon: '✓', type: 'green' },
  { label: 'FAILED', value: '13', note: '2 row locks retried OK', icon: '!', type: 'red' },
  { label: 'THROUGHPUT', value: '1,712 /s', note: 'elapsed 1:06 • ETA 0:39', icon: '▥', type: 'blue' },
];

const initialBatches = [
  { batch: 10, rows: '10,000', status: 'Complete', progress: 100, failed: 1 },
  { batch: 11, rows: '10,000', status: 'Complete', progress: 100, failed: 1 },
  { batch: 12, rows: '10,000', status: 'In progress', progress: 43, failed: 1 },
  { batch: 13, rows: '10,000', status: 'In progress', progress: 15, failed: 0 },
  { batch: 14, rows: '10,000', status: 'In progress', progress: 0, failed: 0 },
  { batch: 15, rows: '10,000', status: 'Queued', progress: 0, failed: 0 },
  { batch: 16, rows: '10,000', status: 'Queued', progress: 0, failed: 0 },
];

const errors = [
  { time: '10:03:05', record: 'C1112090', field: 'Site', code: 'STRING_TOO_LONG', reason: 'Account Site: data value too large (max length=80)' },
  { time: '10:03:00', record: 'C1103512', field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
  { time: '10:02:57', record: 'C1097754', field: 'Legacy_Id__c', code: 'DUPLICATE_VALUE', reason: 'duplicate value found: Legacy_Id__c duplicates value' },
  { time: '10:02:52', record: 'C1088213', field: 'Status__c', code: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', reason: 'bad value for restricted picklist field: Z' },
  { time: '10:02:46', record: 'C1079310', field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
  { time: '10:02:41', record: 'C1070442', field: '—', code: 'CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY', reason: 'AccountTrigger: System.LimitException: Too many queries' },
  { time: '10:02:36', record: 'C1061007', field: 'Legacy_Id__c', code: 'DUPLICATE_VALUE', reason: 'duplicate value found: Legacy_Id__c duplicates value' },
  { time: '10:02:31', record: 'C1052911', field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
];

const failures = [
  { reason: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', count: 5, width: 62 },
  { reason: 'DUPLICATE_VALUE', count: 3, width: 34 },
  { reason: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', count: 2, width: 23 },
  { reason: 'STRING_TOO_LONG', count: 2, width: 20 },
  { reason: 'CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY', count: 1, width: 10 },
];

const previewRows = [
  { field: 'Name', before: 'ACME Industrial Limited', after: 'ACME Industrial Limited', result: 'Kept', type: 'kept' },
  { field: 'Phone', before: '020 7946 0000', after: '+442079460958', result: 'Overwritten', type: 'overwritten' },
  { field: 'Email__c', before: '(blank)', after: 'ops@acme.co.uk', result: 'Filled', type: 'filled' },
];

function PanelTitle({ children, action }) {
  return (
    <div className="rm-panel-title">
      <h3>{children}</h3>
      {action && <div className="rm-panel-action">{action}</div>}
    </div>
  );
}

function StatusPill({ status }) {
  const type = status.toLowerCase().replace(/\s+/g, '-');
  return <span className={`rm-status-pill ${type}`}>{status}</span>;
}

function MetricCard({ metric }) {
  return (
    <div className="rm-metric-card">
      <div className={`rm-metric-icon ${metric.type}`}>{metric.icon}</div>
      <div className="rm-metric-copy">
        <div className="rm-metric-label">{metric.label}</div>
        <div className={`rm-metric-value ${metric.type}`}>{metric.value}</div>
        <div className="rm-metric-note">{metric.note}</div>
      </div>
    </div>
  );
}

function downloadCSV(rows) {
  const headers = ['Time', 'Record', 'Field', 'Error Code', 'Reason'];
  const values = rows.map((row) => [
    row.time, row.record, row.field, row.code, row.reason,
  ]);
  const escapeCSV = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers, ...values].map((row) => row.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'data-mba-error-records.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function RunMonitor() {
  const [runState, setRunState] = useState('Running');
  const [selectedError, setSelectedError] = useState(errors[0]);
  const [showReport, setShowReport] = useState(false);
  const [showRetryMessage, setShowRetryMessage] = useState(false);

  const handlePause = () => {
    setRunState((current) => current === 'Paused' ? 'Running' : 'Paused');
  };

  const handleAbort = () => {
    if (runState === 'Aborted') return;
    const confirmed = window.confirm('Are you sure you want to abort this migration run?');
    if (confirmed) setRunState('Aborted');
  };

  const handleReport = () => {
    setShowReport(true);
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <div className="run-monitor-page">
      <header className="rm-topbar">
        <div className="rm-global-search">
          <span>⌕</span>
          <input aria-label="Global search" placeholder="Search jobs, connections, migration plans..." />
        </div>
      </header>

      <section className="rm-run-header">
        <div className="rm-run-intro">
          <div className="rm-breadcrumb">
            <span>Run R-0929-014</span>
            <span>•</span>
            <a href="#run-plan" onClick={(event) => event.preventDefault()}>PLAN_LEGACY_CRM</a>
            <span>started 10:02:00</span>
            <span>•</span>
            <span>29 Sep 2024, 10:02 AM</span>
          </div>
          <h1>
            Account <span className="rm-title-arrow">→</span> SF_UAT
            <StatusPill status={runState} />
          </h1>
          <p>Monitor the progress of data migration, view batch status, and investigate errors in real time.</p>
        </div>

        <div className="rm-run-actions">
          <button
            className="rm-action-button"
            onClick={handlePause}
            disabled={runState === 'Aborted'}
          >
            <span>{runState === 'Paused' ? '▶' : 'Ⅱ'}</span>
            {runState === 'Paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            className="rm-action-button abort"
            onClick={handleAbort}
            disabled={runState === 'Aborted'}
          >
            <span>◉</span> Abort
          </button>
          <button className="rm-action-button report" onClick={handleReport}>
            <span>▤</span> Reconciliation report
          </button>
        </div>
      </section>

      {runState === 'Paused' && (
        <div className="rm-notice">Migration paused. Select Resume to continue the run.</div>
      )}
      {runState === 'Aborted' && (
        <div className="rm-notice danger">This migration run has been aborted.</div>
      )}

      <section className="rm-object-strip" aria-label="Migration object status">
        {objectStatuses.map((item, index) => (
          <div className={`rm-object-card ${item.type}`} key={item.name}>
            <div className="rm-object-name">{index + 1}. {item.name}</div>
            <div className={`rm-object-status ${item.type}`}>
              <span>{item.icon}</span>{item.status}
            </div>
          </div>
        ))}
      </section>

      <section className="rm-metrics-grid" aria-label="Migration metrics">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section className="rm-progress-panel">
        <div className="rm-progress-heading">
          <strong>Overall progress</strong>
          <div className="rm-mini-progress"><span style={{ width: '63%' }} /></div>
        </div>
        <div className="rm-progress-content">
          <div className="rm-progress-bar" aria-label="63 percent complete">
            <span className="succeeded" style={{ width: '63%' }} />
            <span className="processing" style={{ width: '11.2%' }} />
            <span className="queued" style={{ width: '25.8%' }} />
          </div>
          <div className="rm-progress-legend">
            <span><i className="success-dot" />Succeeded (112,507)</span>
            <span><i className="processing-dot" />Processing (20,000)</span>
            <span><i className="queued-dot" />In queue (46,180)</span>
            <span><i className="failed-dot" />Failed (13)</span>
          </div>
        </div>
        <div className="rm-progress-total">
          <strong>63.0% complete</strong>
          <span>113,400 / 178,700 rows</span>
        </div>
      </section>

      <section className="rm-main-grid">
        <div className="rm-panel rm-batches-panel">
          <PanelTitle action={<span className="rm-muted">11 of 18 complete</span>}>
            Batches <span className="rm-title-muted">· Bulk API 2.0 · 10,000 rows</span>
          </PanelTitle>
          <div className="rm-table-wrap">
            <table className="rm-table rm-batches-table">
              <thead>
                <tr><th>Batch</th><th>Rows</th><th>Status</th><th>Progress</th><th>Failed</th></tr>
              </thead>
              <tbody>
                {initialBatches.map((batch) => (
                  <tr key={batch.batch}>
                    <td>#{batch.batch}</td>
                    <td>{batch.rows}</td>
                    <td><StatusPill status={batch.status} /></td>
                    <td><div className="rm-batch-progress"><span style={{ width: `${batch.progress}%` }} /></div></td>
                    <td className={batch.failed ? 'rm-failed-number' : ''}>{batch.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rm-panel rm-errors-panel">
          <PanelTitle action={
            <>
              <button className="rm-small-button" onClick={() => downloadCSV(errors)}>⇩ Download error CSV</button>
              <button
                className="rm-small-button"
                onClick={() => setShowRetryMessage(true)}
              >
                ⚒ Fix &amp; retry failed
              </button>
            </>
          }>
            <span className="rm-live-dot" /> Error records <span className="rm-title-muted">· Live</span>
          </PanelTitle>
          <div className="rm-error-subtitle">Newest first · {errors.length} shown</div>
          <div className="rm-table-wrap rm-error-table-wrap">
            <table className="rm-table rm-errors-table">
              <thead>
                <tr><th>Time</th><th>Record</th><th>Field</th><th>Error code</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {errors.map((error) => (
                  <tr
                    key={`${error.time}-${error.record}`}
                    className={selectedError?.record === error.record ? 'selected' : ''}
                    onClick={() => setSelectedError(error)}
                  >
                    <td>{error.time}</td>
                    <td>{error.record}</td>
                    <td>{error.field}</td>
                    <td className="rm-error-code">{error.code}</td>
                    <td className="rm-reason-cell" title={error.reason}>{error.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showRetryMessage && (
            <div className="rm-inline-message">
              Retry preview: resolve the underlying validation or duplicate issue before retrying these records.
              <button onClick={() => setShowRetryMessage(false)} aria-label="Dismiss">×</button>
            </div>
          )}
        </div>

        <div className="rm-panel rm-failures-panel">
          <PanelTitle>Failures by reason</PanelTitle>
          <div className="rm-failure-list">
            {failures.map((failure) => (
              <div className="rm-failure-row" key={failure.reason}>
                <span className="rm-failure-name" title={failure.reason}>{failure.reason}</span>
                <div className="rm-failure-track"><span style={{ width: `${failure.width}%` }} /></div>
                <strong>{failure.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="rm-panel rm-preview-panel">
          <PanelTitle action={<span className="rm-rule-label">Rule 4 · score 0.95</span>}>
            Preview · {selectedError?.record || 'C1004821'} → 001DN000009XQ2P
          </PanelTitle>
          <div className="rm-table-wrap">
            <table className="rm-table rm-preview-table">
              <thead>
                <tr><th>Field</th><th>Salesforce now</th><th>After load</th><th>Why</th></tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.field}>
                    <td>{row.field}</td>
                    <td>{row.before}</td>
                    <td className={row.type === 'filled' ? 'rm-filled-value' : ''}>{row.after}</td>
                    <td><span className={`rm-result-tag ${row.type}`}>{row.result}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showReport && (
        <div className="rm-print-note">
          Report print dialog opened. Close this notice to return to the dashboard.
          <button onClick={() => setShowReport(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
