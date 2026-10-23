import { useEffect, useMemo, useRef, useState } from 'react';
import { useFeedback } from './ui/feedbackContext';
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

// Simulated run: one tick per second while the run is Running.
const TOTAL_ROWS = 178700;
const BATCH_SIZE = 10000;
const BATCH_COUNT = Math.ceil(TOTAL_ROWS / BATCH_SIZE);
const IN_FLIGHT = 20000;
const START_SUCCEEDED = 112507;
const START_ELAPSED = 66;

const errorPool = [
  { field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
  { field: 'Legacy_Id__c', code: 'DUPLICATE_VALUE', reason: 'duplicate value found: Legacy_Id__c duplicates value' },
  { field: 'Status__c', code: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', reason: 'bad value for restricted picklist field: Z' },
  { field: 'Site', code: 'STRING_TOO_LONG', reason: 'Account Site: data value too large (max length=80)' },
  { field: '—', code: 'CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY', reason: 'AccountTrigger: System.LimitException: Too many queries' },
];

const initialFailureCounts = {
  FIELD_CUSTOM_VALIDATION_EXCEPTION: 5,
  DUPLICATE_VALUE: 3,
  INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST: 2,
  STRING_TOO_LONG: 2,
  CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY: 1,
};

// Deterministic per-batch failure counts so the table doesn't jump around.
const batchFailures = Array.from({ length: BATCH_COUNT }, (_, index) => (index * 7) % 5 === 0 ? 0 : (index % 3));

const formatNumber = (value) => Math.round(value).toLocaleString('en-US');

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const clockTime = () =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const initialErrors = [
  { time: '10:03:05', record: 'C1112090', field: 'Site', code: 'STRING_TOO_LONG', reason: 'Account Site: data value too large (max length=80)' },
  { time: '10:03:00', record: 'C1103512', field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
  { time: '10:02:57', record: 'C1097754', field: 'Legacy_Id__c', code: 'DUPLICATE_VALUE', reason: 'duplicate value found: Legacy_Id__c duplicates value' },
  { time: '10:02:52', record: 'C1088213', field: 'Status__c', code: 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', reason: 'bad value for restricted picklist field: Z' },
  { time: '10:02:46', record: 'C1079310', field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
  { time: '10:02:41', record: 'C1070442', field: '—', code: 'CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY', reason: 'AccountTrigger: System.LimitException: Too many queries' },
  { time: '10:02:36', record: 'C1061007', field: 'Legacy_Id__c', code: 'DUPLICATE_VALUE', reason: 'duplicate value found: Legacy_Id__c duplicates value' },
  { time: '10:02:31', record: 'C1052911', field: 'BillingCountryCode', code: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', reason: 'Billing country is required for Customer accounts.' },
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


const initialSim = () => ({
  succeeded: START_SUCCEEDED,
  failed: 13,
  elapsed: START_ELAPSED,
  throughput: 1712,
  errors: initialErrors,
  failureCounts: initialFailureCounts,
});

function nextSim(previous) {
  const done = previous.succeeded + previous.failed;
  const remaining = TOTAL_ROWS - done;
  if (remaining <= 0) return previous;

  const throughput = Math.round(1550 + Math.random() * 400);
  let failed = previous.failed;
  let { errors, failureCounts } = previous;

  if (Math.random() < 0.3 && remaining > throughput) {
    const sample = errorPool[Math.floor(Math.random() * errorPool.length)];
    const error = {
      ...sample,
      time: clockTime(),
      record: `C1${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      fresh: true,
    };
    failed += 1;
    errors = [error, ...errors.map((item) => ({ ...item, fresh: false }))].slice(0, 60);
    failureCounts = { ...failureCounts, [sample.code]: (failureCounts[sample.code] || 0) + 1 };
  }

  const succeeded = Math.min(TOTAL_ROWS - failed, previous.succeeded + throughput);

  return {
    ...previous,
    succeeded,
    failed,
    errors,
    failureCounts,
    throughput,
    elapsed: previous.elapsed + 1,
  };
}

export default function RunMonitor() {
  const { notify, confirm } = useFeedback();
  // What the user chose. 'Complete' is derived from the data, not stored.
  const [controlState, setControlState] = useState('Running');
  const [sim, setSim] = useState(initialSim);
  const [selectedRecord, setSelectedRecord] = useState(initialErrors[0].record);
  const [showReport, setShowReport] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const completionNotified = useRef(false);

  const done = sim.succeeded + sim.failed;
  const isFinished = done >= TOTAL_ROWS;
  const runState = isFinished && controlState === 'Running' ? 'Complete' : controlState;

  useEffect(() => {
    if (runState !== 'Running') return undefined;
    const timer = window.setInterval(() => setSim(nextSim), 1000);
    return () => window.clearInterval(timer);
  }, [runState]);

  useEffect(() => {
    if (runState !== 'Complete' || completionNotified.current) return;
    completionNotified.current = true;
    notify('Account load complete', {
      type: sim.failed ? 'warning' : 'success',
      message: `${formatNumber(sim.succeeded)} rows loaded · ${sim.failed} failed. Contact starts next.`,
      duration: 6000,
    });
  }, [runState, sim.failed, sim.succeeded, notify]);

  const isActive = runState === 'Running';
  const remaining = Math.max(0, TOTAL_ROWS - done);
  const processing = isActive ? Math.min(IN_FLIGHT, remaining) : 0;
  const queued = remaining - processing;
  const percent = (done / TOTAL_ROWS) * 100;
  const throughput = isActive ? sim.throughput : 0;
  const eta = sim.throughput ? remaining / sim.throughput : 0;

  const metrics = [
    { label: 'ROWS TO LOAD', value: formatNumber(TOTAL_ROWS), note: 'after filters and dedupe', icon: '▤', type: 'blue' },
    { label: 'IN QUEUE', value: formatNumber(queued), note: 'waiting to be sent', icon: '⌛', type: 'gray' },
    {
      label: 'PROCESSING',
      value: formatNumber(processing),
      note: processing ? `${Math.ceil(processing / BATCH_SIZE)} jobs in flight` : 'no jobs in flight',
      icon: '⚙',
      type: 'blue',
    },
    {
      label: 'SUCCEEDED',
      value: formatNumber(sim.succeeded),
      note: `incl. ${formatNumber(sim.succeeded * 0.0474)} updated`,
      icon: '✓',
      type: 'green',
    },
    { label: 'FAILED', value: formatNumber(sim.failed), note: '2 row locks retried OK', icon: '!', type: 'red' },
    {
      label: 'THROUGHPUT',
      value: `${formatNumber(throughput)} /s`,
      note: `elapsed ${formatDuration(sim.elapsed)} • ${isFinished ? 'done' : `ETA ${formatDuration(eta)}`}`,
      icon: '▥',
      type: 'blue',
    },
  ];

  const objects = objectStatuses.map((item) => {
    if (item.name !== 'Account') {
      if (item.name === 'Contact' && runState === 'Complete') {
        return { ...item, status: 'Starting…', icon: '◔', type: 'running' };
      }
      return item;
    }
    if (runState === 'Complete') return { ...item, status: 'Done', icon: '✓', type: 'done' };
    if (runState === 'Aborted') return { ...item, status: 'Aborted', icon: '!', type: 'blocked' };
    return { ...item, status: `${percent.toFixed(1)}%`, icon: runState === 'Paused' ? 'Ⅱ' : '◔' };
  });

  const batches = useMemo(() => {
    const current = Math.floor(done / BATCH_SIZE);
    const first = Math.max(0, Math.min(current - 2, BATCH_COUNT - 7));
    return Array.from({ length: Math.min(7, BATCH_COUNT) }, (_, offset) => {
      const index = first + offset;
      const start = index * BATCH_SIZE;
      const size = Math.min(BATCH_SIZE, TOTAL_ROWS - start);
      const progress = Math.max(0, Math.min(100, ((done - start) / size) * 100));
      const inFlight = start < done + processing;
      return {
        batch: index + 1,
        rows: formatNumber(size),
        progress: Math.round(progress),
        status: progress >= 100 ? 'Complete' : inFlight && isActive ? 'In progress' : progress > 0 ? 'Paused' : 'Queued',
        failed: progress > 0 ? batchFailures[index] : 0,
      };
    });
  }, [done, processing, isActive]);

  const completedBatches = Math.floor(done / BATCH_SIZE);

  const failures = useMemo(() => {
    const entries = Object.entries(sim.failureCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] || 1;
    return entries.map(([reason, count]) => ({ reason, count, width: (count / max) * 62 }));
  }, [sim.failureCounts]);

  const selectedError = sim.errors.find((item) => item.record === selectedRecord) || sim.errors[0];

  const handlePause = () => {
    const next = runState === 'Paused' ? 'Running' : 'Paused';
    setControlState(next);
    notify(next === 'Paused' ? 'Run paused' : 'Run resumed', {
      message: next === 'Paused'
        ? 'Batches already sent to Salesforce will finish.'
        : 'Sending the next batch.',
    });
  };

  const handleAbort = async () => {
    if (runState === 'Aborted') return;
    const confirmed = await confirm({
      title: 'Abort this migration run?',
      message: `${formatNumber(sim.succeeded)} rows already loaded stay in SF_UAT. ${formatNumber(remaining)} queued rows will not be sent.`,
      confirmLabel: 'Abort run',
      danger: true,
    });
    if (confirmed) {
      setControlState('Aborted');
      notify('Run aborted', { type: 'error', message: 'You can restart the plan from the Migration screen.' });
    }
  };

  const handleRestart = () => {
    setSim({ ...initialSim(), succeeded: 0, failed: 0, elapsed: 0, errors: [], failureCounts: {} });
    completionNotified.current = false;
    setControlState('Running');
    notify('Run restarted', { type: 'info', message: 'Account → SF_UAT from the first batch.' });
  };

  const handleRetry = () => {
    if (!sim.failed) {
      notify('No failed records to retry', { type: 'info' });
      return;
    }
    const attempted = sim.failed;
    const fixed = Math.ceil(attempted * 0.6);
    setRetrying(true);
    window.setTimeout(() => {
      notify(`Retried ${attempted} records`, {
        type: 'success',
        message: `${fixed} loaded after auto-fix · ${attempted - fixed} still need a mapping change.`,
        duration: 5500,
      });
      setSim((previous) => {
        const removed = previous.errors.slice(-fixed);
        const failureCounts = { ...previous.failureCounts };
        removed.forEach((item) => {
          failureCounts[item.code] = Math.max(0, (failureCounts[item.code] || 0) - 1);
        });
        return {
          ...previous,
          succeeded: previous.succeeded + Math.min(fixed, previous.failed),
          failed: Math.max(0, previous.failed - fixed),
          errors: previous.errors.slice(0, previous.errors.length - removed.length),
          failureCounts,
        };
      });
      setRetrying(false);
    }, 1800);
  };

  const handleReport = () => {
    setShowReport(true);
    window.setTimeout(() => window.print(), 100);
  };

  const isFinal = runState === 'Aborted' || runState === 'Complete';

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
          {isFinal ? (
            <button className="rm-action-button" onClick={handleRestart}>
              <span>↻</span> Run again
            </button>
          ) : (
            <button className="rm-action-button" onClick={handlePause}>
              <span>{runState === 'Paused' ? '▶' : 'Ⅱ'}</span>
              {runState === 'Paused' ? 'Resume' : 'Pause'}
            </button>
          )}
          <button
            className="rm-action-button abort"
            onClick={handleAbort}
            disabled={isFinal}
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
      {runState === 'Complete' && (
        <div className="rm-notice success">
          Account finished: {formatNumber(sim.succeeded)} loaded, {sim.failed} failed. Contact is starting.
        </div>
      )}

      <section className="rm-object-strip" aria-label="Migration object status">
        {objects.map((item, index) => (
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
          <div className="rm-mini-progress"><span style={{ width: `${percent}%` }} /></div>
        </div>
        <div className="rm-progress-content">
          <div className="rm-progress-bar" aria-label={`${percent.toFixed(0)} percent complete`}>
            <span className="succeeded" style={{ width: `${percent}%` }} />
            <span className={`processing ${isActive ? 'rm-pulse' : ''}`} style={{ width: `${(processing / TOTAL_ROWS) * 100}%` }} />
            <span className="queued" style={{ width: `${(queued / TOTAL_ROWS) * 100}%` }} />
          </div>
          <div className="rm-progress-legend">
            <span><i className="success-dot" />Succeeded ({formatNumber(sim.succeeded)})</span>
            <span><i className="processing-dot" />Processing ({formatNumber(processing)})</span>
            <span><i className="queued-dot" />In queue ({formatNumber(queued)})</span>
            <span><i className="failed-dot" />Failed ({formatNumber(sim.failed)})</span>
          </div>
        </div>
        <div className="rm-progress-total">
          <strong>{percent.toFixed(1)}% complete</strong>
          <span>{formatNumber(done)} / {formatNumber(TOTAL_ROWS)} rows</span>
        </div>
      </section>

      <section className="rm-main-grid">
        <div className="rm-panel rm-batches-panel">
          <PanelTitle action={<span className="rm-muted">{completedBatches} of {BATCH_COUNT} complete</span>}>
            Batches <span className="rm-title-muted">· Bulk API 2.0 · 10,000 rows</span>
          </PanelTitle>
          <div className="rm-table-wrap">
            <table className="rm-table rm-batches-table">
              <thead>
                <tr><th>Batch</th><th>Rows</th><th>Status</th><th>Progress</th><th>Failed</th></tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.batch}>
                    <td>#{batch.batch}</td>
                    <td>{batch.rows}</td>
                    <td><StatusPill status={batch.status} /></td>
                    <td>
                      <div className="rm-batch-progress">
                        <span
                          className={batch.progress >= 100 ? 'complete' : ''}
                          style={{ width: `${batch.progress}%` }}
                        />
                      </div>
                    </td>
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
              <button
                className="rm-small-button"
                onClick={() => {
                  downloadCSV(sim.errors);
                  notify(`Downloaded ${sim.errors.length} error records`, { type: 'success' });
                }}
                disabled={!sim.errors.length}
              >
                ⇩ Download error CSV
              </button>
              <button
                className="rm-small-button"
                onClick={handleRetry}
                disabled={retrying || !sim.failed}
              >
                {retrying ? 'Retrying…' : '⚒ Fix & retry failed'}
              </button>
            </>
          }>
            <span className={`rm-live-dot ${isActive ? 'rm-pulse' : ''}`} /> Error records{' '}
            <span className="rm-title-muted">· {isActive ? 'Live' : runState}</span>
          </PanelTitle>
          <div className="rm-error-subtitle">Newest first · {sim.errors.length} shown</div>
          <div className="rm-table-wrap rm-error-table-wrap">
            <table className="rm-table rm-errors-table">
              <thead>
                <tr><th>Time</th><th>Record</th><th>Field</th><th>Error code</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {sim.errors.map((error) => (
                  <tr
                    key={`${error.time}-${error.record}`}
                    className={`${selectedError?.record === error.record ? 'selected' : ''} ${error.fresh ? 'ui-row-flash' : ''}`}
                    onClick={() => setSelectedRecord(error.record)}
                  >
                    <td>{error.time}</td>
                    <td>{error.record}</td>
                    <td>{error.field}</td>
                    <td className="rm-error-code">{error.code}</td>
                    <td className="rm-reason-cell" title={error.reason}>{error.reason}</td>
                  </tr>
                ))}
                {sim.errors.length === 0 && (
                  <tr><td colSpan={5} className="rm-muted">No errors so far.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
            {failures.length === 0 && <span className="rm-muted">No failures.</span>}
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
