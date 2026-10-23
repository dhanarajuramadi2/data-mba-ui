
import { useMemo, useState } from 'react';
import './Reconciliation.css';

const initialRecords = [
  {
    object: 'User', source: 434, filtered: null, merged: null,
    rejected: 22, sent: null, failed: null, expected: 412,
    found: 412, variance: 0, status: 'Reconciled'
  },
  {
    object: 'Account', source: 184302, filtered: 3262, merged: 2318,
    rejected: 22, sent: 178700, failed: 18, expected: 178682,
    found: 178682, variance: 0, status: 'Reconciled'
  },
  {
    object: 'Contact', source: 402550, filtered: 0, merged: 0,
    rejected: 437, sent: 402113, failed: 0, expected: 402113,
    found: 402109, variance: -4, status: 'Exception'
  },
  {
    object: 'Files', detail: 'ContentVersion', source: 3118,
    filtered: 0, merged: 0, rejected: 14, sent: 3104,
    failed: 0, expected: 3104, found: 3104,
    variance: 0, status: 'Reconciled'
  },
  {
    object: 'Opportunity', source: 96410, filtered: null,
    merged: null, rejected: null, sent: null, failed: null,
    expected: null, found: null, variance: null, status: 'Not run'
  }
];

const initialChecks = [
  {
    check: 'Sum of AnnualRevenue',
    source: '8,214,337,120',
    salesforce: '8,214,337,120',
    result: 'Match'
  },
  {
    check: 'Row count per BillingCountryCode',
    source: '212 groups',
    salesforce: '212 groups',
    result: 'Match'
  },
  {
    check: 'Blank Email__c',
    source: '24,064',
    salesforce: '24,064',
    result: 'Match'
  },
  {
    check: 'Accounts with a parent',
    source: '12,406',
    salesforce: '12,406',
    result: 'Match'
  },
  {
    check: 'Distinct owners',
    source: '412',
    salesforce: '412',
    result: 'Match'
  },
  {
    check: 'Random sample · mapped fields',
    source: '1,000 rows',
    salesforce: '998 equal',
    result: '2 differ'
  }
];

const rejectedIssues = [
  { label: 'Contact: parent Account not found', count: 437 },
  { label: 'Account: owner not found', count: 22 },
  { label: 'Files: parent external ID not matched', count: 14 }
];

const failedIssues = [
  { label: 'Validation rule · billing country', count: 7 },
  { label: 'Duplicate external ID', count: 4 },
  { label: 'Restricted picklist value', count: 3 },
  { label: 'Value too long', count: 2 },
  { label: 'Trigger · SOQL limit', count: 2 }
];

const runFiles = [
  {
    name: 'success_account.csv',
    content: 'record_id,status\n001A000001,success\n001A000002,success'
  },
  {
    name: 'errors_account.csv',
    content: 'record_id,error\nC1112090,STRING_TOO_LONG\nC1103512,BILLING_COUNTRY_REQUIRED'
  },
  {
    name: 'rejects_all.csv',
    content: 'object,record_id,reason\nContact,C1097754,Parent Account not found'
  },
  {
    name: 'id_crossref.csv',
    content: 'source_id,salesforce_id\nSRC-1001,001A000001'
  }
];

const formatNumber = value =>
  value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('en-US').format(value);

function downloadText(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  return (
    <span className={`rec-status rec-status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
      {status}
    </span>
  );
}

function MetricCard({ icon, label, value, description, color = 'blue' }) {
  return (
    <div className="rec-metric">
      <span className={`rec-metric-icon ${color}`}>{icon}</span>
      <div className="rec-metric-content">
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

export default function Reconciliation() {
  const [records] = useState(initialRecords);
  const [search, setSearch] = useState('');
  const [selectedObject, setSelectedObject] = useState('Account');
  const [checks, setChecks] = useState(initialChecks);
  const [accepted, setAccepted] = useState(false);
  const [preparedBy, setPreparedBy] = useState('Kushal Shetty');
  const [approvedBy, setApprovedBy] = useState('Business owner');
  const [signedOff, setSignedOff] = useState(false);
  const [notice, setNotice] = useState('');
  const [rerunCount, setRerunCount] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState('Contact');

  const exceptionCount = records.filter(
    row => row.status === 'Exception'
  ).length;

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return records;

    return records.filter(row =>
      `${row.object} ${row.detail || ''} ${row.status}`
        .toLowerCase()
        .includes(query)
    );
  }, [records, search]);

  function rerunChecks() {
    const nextCount = rerunCount + 1;
    setRerunCount(nextCount);

    // Demonstration only: the second run resolves the sample mismatch.
    if (nextCount >= 2) {
      setChecks(current =>
        current.map((check, index) =>
          index === 5
            ? {
                ...check,
                salesforce: '1,000 equal',
                result: 'Match'
              }
            : check
        )
      );

      setNotice('Checks re-run. Sample field check now matches in demo data.');
    } else {
      setNotice('Checks re-run. One sample mismatch remains for review.');
    }
  }

  function chooseObject(objectName) {
    setSelectedObject(objectName);

    if (objectName === 'Account') {
      setChecks(initialChecks);
      return;
    }

    const objectData = {
      Contact: ['402,550', '402,109', '99.9%'],
      User: ['434', '412', '100%'],
      Files: ['3,118', '3,104', '100%']
    };

    const [sourceCount, targetCount, completeness] =
      objectData[objectName];

    setChecks([
      {
        check: 'Source row count',
        source: sourceCount,
        salesforce: targetCount,
        result: objectName === 'Contact' ? '4 differ' : 'Match'
      },
      {
        check: 'External ID uniqueness',
        source: 'No duplicates',
        salesforce: 'No duplicates',
        result: 'Match'
      },
      {
        check: 'Required field completeness',
        source: '100%',
        salesforce: completeness,
        result: objectName === 'Contact' ? '1 differ' : 'Match'
      },
      {
        check: 'Parent relationship coverage',
        source: '100%',
        salesforce: completeness,
        result: objectName === 'Contact' ? '1 differ' : 'Match'
      },
      {
        check: 'Distinct owners',
        source: '412',
        salesforce: '412',
        result: 'Match'
      },
      {
        check: 'Random sample · mapped fields',
        source: '1,000 rows',
        salesforce: '1,000 equal',
        result: 'Match'
      }
    ]);
  }

  function exportRecords() {
    const headers = [
      'Object', 'Source', 'Filtered', 'Merged', 'Rejected',
      'Sent', 'Failed', 'Expected', 'Found in Salesforce',
      'Variance', 'Status'
    ];

    const rows = records.map(row => [
      row.object, row.source, row.filtered, row.merged,
      row.rejected, row.sent, row.failed, row.expected,
      row.found, row.variance, row.status
    ]);

    const csv = [headers, ...rows]
      .map(row =>
        row.map(value =>
          `"${String(value ?? '').replace(/"/g, '""')}"`
        ).join(',')
      )
      .join('\r\n');

    downloadText('reconciliation-report.csv', csv);
    setNotice('Reconciliation table exported to CSV for Excel.');
  }

  function acceptException() {
    setAccepted(true);
    setNotice('Exception accepted in the demo. You can proceed to sign-off.');
  }

  function restoreException() {
    setAccepted(false);
    setSignedOff(false);
    setNotice('Exception reopened for review.');
  }

  function signOff() {
    if (exceptionCount > 0 && !accepted) {
      setNotice('Resolve or accept the exception before signing off.');
      return;
    }

    if (!preparedBy.trim() || !approvedBy.trim()) {
      setNotice('Enter both preparer and approver names.');
      return;
    }

    setSignedOff(true);
    setNotice('UAT sign-off recorded in this demo.');
  }

  function printReport() {
    window.print();
  }

  function showSideBySide() {
    setNotice(
      'Description comparison: Salesforce trims trailing spaces from the source value. Demo preview only.'
    );
  }

  return (
    <div className="reconciliation-page">
      <header className="rec-topbar">
        <div className="rec-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search objects, status..."
            aria-label="Search reconciliation objects"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
      </header>

      <section className="rec-header">
        <div className="rec-heading">
          <div className="rec-breadcrumb">
            <a href="#run" onClick={event => event.preventDefault()}>
              Run R-0929-014
            </a>
            <span>/</span>
            <a href="#plan" onClick={event => event.preventDefault()}>
              PLAN_LEGACY_CRM
            </a>
            <span>/</span>
            <span>SF_UAT</span>
            <span>· generated 29 Sep 2026, 11:48</span>
          </div>

          <h1>
            Reconciliation report
            <span className={`rec-exception-count ${accepted || !exceptionCount ? 'resolved' : ''}`}>
              {accepted || !exceptionCount
                ? 'No open exceptions'
                : `${exceptionCount} exception to resolve`}
            </span>
          </h1>

          <p>
            Compare source data with Salesforce to verify migration accuracy
            and investigate mismatches.
          </p>
        </div>

        <div className="rec-actions">
          <button className="rec-button" onClick={rerunChecks}>
            ⟳ <span>Re-run checks</span>
          </button>
          <button className="rec-button" onClick={exportRecords}>
            ▧ <span>Export Excel</span>
          </button>
          <button className="rec-button" onClick={printReport}>
            ♧ <span>Export PDF</span>
          </button>
        </div>
      </section>

      {notice && (
        <div className="rec-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="rec-panel rec-counts-panel">
        <div className="rec-panel-title">
          <h2>
            Record counts
            <span
              className="rec-info"
              title="Expected = Source - Filtered - Merged - Rejected - Failed"
            >
              i
            </span>
          </h2>
          <p>
            Expected = Source − Filtered − Merged − Rejected − Failed.
            Found = COUNT() in Salesforce for this run's external IDs.
          </p>
        </div>

        <div className="rec-table-wrap">
          <table className="rec-table rec-counts-table">
            <thead>
              <tr>
                {[
                  'Object', 'Source', 'Filtered', 'Merged', 'Rejected',
                  'Sent', 'Failed', 'Expected', 'Found in SF',
                  'Variance', 'Status'
                ].map(label => <th key={label}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(row => (
                <tr
                  key={row.object}
                  className={
                    row.status === 'Exception' && !accepted
                      ? 'exception-row'
                      : ''
                  }
                  onClick={() => setSelectedIssue(row.object)}
                  title="Select this object"
                >
                  <td>
                    <strong>{row.object}</strong>{' '}
                    {row.detail && <span className="rec-detail">{row.detail}</span>}
                  </td>
                  <td>{formatNumber(row.source)}</td>
                  <td>{formatNumber(row.filtered)}</td>
                  <td>{formatNumber(row.merged)}</td>
                  <td>{formatNumber(row.rejected)}</td>
                  <td>{formatNumber(row.sent)}</td>
                  <td>{formatNumber(row.failed)}</td>
                  <td>{formatNumber(row.expected)}</td>
                  <td>{formatNumber(row.found)}</td>
                  <td className={row.variance ? 'rec-variance' : ''}>
                    {row.variance === null
                      ? '—'
                      : row.variance > 0
                        ? `+${row.variance}`
                        : formatNumber(row.variance)}
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        accepted && row.status === 'Exception'
                          ? 'Accepted'
                          : row.status
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="rec-empty">No matching objects.</div>
          )}
        </div>
      </section>

      <section className="rec-metrics">
        <MetricCard
          icon="▤"
          label="Rows to load"
          value="178,700"
          description="after filters and dedupe"
        />
        <MetricCard
          icon="⌛"
          label="In queue"
          value="46,180"
          description="waiting to be sent"
          color="gray"
        />
        <MetricCard
          icon="⚙"
          label="Processing"
          value="20,000"
          description="2 jobs in flight"
        />
        <MetricCard
          icon="✓"
          label="Succeeded"
          value="112,507"
          description="incl. 5,333 updated"
          color="green"
        />
        <MetricCard
          icon="!"
          label="Failed"
          value="13"
          description="2 row locks retried OK"
          color="red"
        />
        <MetricCard
          icon="▥"
          label="Throughput"
          value="1,712/s"
          description="elapsed 1:06 · ETA 0:39"
        />
      </section>

      <section className="rec-progress">
        <strong>Overall progress</strong>

        <div className="rec-progress-main">
          <div className="rec-progress-bar">
            <span className="done" style={{ width: '63%' }} />
            <span className="active" style={{ width: '11.2%' }} />
            <span className="queued" style={{ width: '25.8%' }} />
          </div>

          <div className="rec-legend">
            <span><i className="dot-done" />Succeeded (112,507)</span>
            <span><i className="dot-active" />Processing (20,000)</span>
            <span><i className="dot-queued" />In queue (46,180)</span>
            <span><i className="dot-failed" />Failed (13)</span>
          </div>
        </div>

        <div className="rec-progress-total">
          <strong>63.0% complete</strong>
          <span>113,400 / 178,700 rows</span>
        </div>
      </section>

      <section className="rec-bottom-grid">
        <div className="rec-panel rec-checks">
          <div className="rec-panel-title">
            <h2>
              Field-level checks
              <span className="rec-info" title="Compare source values with Salesforce values">i</span>
            </h2>

            <select
              value={selectedObject}
              onChange={event => chooseObject(event.target.value)}
              aria-label="Select object for field checks"
            >
              <option>Account</option>
              <option>Contact</option>
              <option>User</option>
              <option>Files</option>
            </select>
          </div>

          <div className="rec-table-wrap">
            <table className="rec-table rec-check-table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Source</th>
                  <th>Salesforce</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {checks.map(row => (
                  <tr key={row.check}>
                    <td>{row.check}</td>
                    <td>{row.source}</td>
                    <td>{row.salesforce}</td>
                    <td>
                      <span className={`rec-check-result ${row.result === 'Match' ? 'match' : 'diff'}`}>
                        {row.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rec-check-foot">
            2 differ: Description — trailing spaces removed by Salesforce.{' '}
            <button onClick={showSideBySide}>View side by side</button>
          </div>
        </div>

        <div className="rec-panel rec-issues">
          {!accepted ? (
            <div className="rec-exception-box">
              <div className="rec-exception-heading">
                <span>!</span>
                <div>
                  <strong>{selectedIssue} · {selectedIssue === 'Contact' ? '4 records missing' : 'count details'}</strong>
                  <p>
                    {selectedIssue === 'Contact'
                      ? 'Found in the Recycle Bin. Deleted at 10:04:31 by flow Contact_Merge_Duplicate during the load.'
                      : `Review the reconciliation counts and validation issues associated with ${selectedIssue}.`}
                  </p>
                </div>
              </div>

              <div className="rec-exception-actions">
                <button onClick={restoreException}>Restore &amp; re-check</button>
                <button onClick={acceptException}>Accept with note</button>
              </div>
            </div>
          ) : (
            <div className="rec-accepted-box">
              <strong>✓ Contact exception accepted</strong>
              <p>Acceptance recorded for this demo. Sign-off can continue.</p>
              <button onClick={restoreException}>Re-open exception</button>
            </div>
          )}

          <div className="rec-issue-section">
            <strong>Rejected before load · 473</strong>
            {rejectedIssues.map(issue => (
              <div className="rec-issue-row" key={issue.label}>
                <span>{issue.label}</span>
                <b>{formatNumber(issue.count)}</b>
              </div>
            ))}
          </div>

          <div className="rec-issue-section">
            <strong>Failed in Salesforce · 18</strong>
            {failedIssues.map(issue => (
              <div className="rec-issue-row" key={issue.label}>
                <span>{issue.label}</span>
                <b>{issue.count}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="rec-panel rec-right-panel">
          <div className="rec-files-section">
            <div className="rec-panel-title">
              <h2>♧ Run files</h2>
            </div>

            {runFiles.map(file => (
              <button
                className="rec-file-row"
                key={file.name}
                onClick={() => {
                  downloadText(file.name, file.content);
                  setNotice(`${file.name} downloaded.`);
                }}
              >
                <span>{file.name}</span>
                <span>↓</span>
              </button>
            ))}
          </div>

          <div className="rec-signoff">
            <div className="rec-panel-title">
              <h2>♙ Sign-off</h2>
            </div>

            <label>
              Prepared by
              <input
                value={preparedBy}
                onChange={event => setPreparedBy(event.target.value)}
              />
            </label>

            <label>
              Approved by
              <input
                value={approvedBy}
                onChange={event => setApprovedBy(event.target.value)}
              />
            </label>

            <button
              className="rec-signoff-button"
              disabled={signedOff}
              onClick={signOff}
            >
              {signedOff ? 'Signed off ✓' : 'Sign off UAT'}
            </button>

            <small>
              {signedOff
                ? 'UAT sign-off has been recorded.'
                : exceptionCount && !accepted
                  ? 'Resolve or accept the exception to enable sign-off.'
                  : 'Ready for sign-off.'}
            </small>
          </div>
        </div>
      </section>
    </div>
  );
}
