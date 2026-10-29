
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from './ui/Feedback';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
import { profileCsvFile } from '../services/profilingApi';
import { deleteCsvFile, loadCsvFile, saveCsvFile } from '../services/csvFileStore';
import './DataProfiling.css';

// Selected CSV files by profile id. Each file is also saved in the browser
// (see csvFileStore) so a record can still run after a page reload; this Map
// is the in-memory copy.
const csvFilesById = new Map();

const MIN_SPINNER_MS = 1000;

const formatNumber = (value) =>
  value === null || value === undefined
    ? '—'
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Results returned by the profiling API (POST /api/v1/files/profile)
function CsvProfileResults({ report }) {
  const {
    summary,
    columns = [],
    numeric_statistics: numericStatistics = [],
    preview_rows: previewRows = [],
  } = report;
  const cellCount = summary.row_count * summary.column_count;
  const completeness = cellCount
    ? `${(100 - (summary.total_missing_values / cellCount) * 100).toFixed(1)}%`
    : '—';
  const previewHeaders = columns.length
    ? columns.map((column) => column.name)
    : Object.keys(previewRows[0] || {});

  const finding = (column) => {
    if (column.missing_count > 0) return `Review · ${column.missing_percentage}% missing`;
    if (summary.row_count > 1 && column.unique_count === summary.row_count) return 'OK · unique (possible key)';
    return 'OK';
  };

  return (
    <>
      <div className="data-profile-summary">
        <div>
          <span>ROWS</span>
          <strong>{formatNumber(summary.row_count)}</strong>
        </div>

        <div>
          <span>COLUMNS</span>
          <strong>{formatNumber(summary.column_count)}</strong>
        </div>

        <div>
          <span>AVG. COMPLETENESS</span>
          <strong>{completeness}</strong>
        </div>

        <div>
          <span>DUPLICATE ROWS</span>
          <strong>{formatNumber(summary.duplicate_row_count)}</strong>
        </div>

        <div>
          <span>MISSING VALUES</span>
          <strong>{formatNumber(summary.total_missing_values)}</strong>
        </div>
      </div>

      <div className="data-profile-table-card">
        <h3>Column profile ({columns.length} columns)</h3>

        <div className="data-profile-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Data type</th>
                <th>Missing</th>
                <th>Missing %</th>
                <th>Unique values</th>
                <th>Duplicate values</th>
                <th>Finding</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => (
                <tr key={column.name}>
                  <td>{column.name}</td>
                  <td>{column.data_type}</td>
                  <td>{formatNumber(column.missing_count)}</td>
                  <td>{column.missing_percentage}%</td>
                  <td>{formatNumber(column.unique_count)}</td>
                  <td>{formatNumber(column.duplicate_values)}</td>
                  <td>{finding(column)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {numericStatistics.length > 0 && (
        <div className="data-profile-table-card">
          <h3>Numeric statistics ({numericStatistics.length} columns)</h3>

          <div className="data-profile-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Minimum</th>
                  <th>Maximum</th>
                  <th>Mean</th>
                  <th>Median</th>
                </tr>
              </thead>
              <tbody>
                {numericStatistics.map((column) => (
                  <tr key={column.name}>
                    <td>{column.name}</td>
                    <td>{formatNumber(column.minimum)}</td>
                    <td>{formatNumber(column.maximum)}</td>
                    <td>{formatNumber(column.mean)}</td>
                    <td>{formatNumber(column.median)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="data-profile-table-card">
        <h3>Preview (first {previewRows.length} rows)</h3>

        <div className="data-profile-table-scroll">
          <table>
            <thead>
              <tr>
                {previewHeaders.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index}>
                  {previewHeaders.map((header) => (
                    <td key={header}>
                      {row[header] === null || row[header] === undefined ? (
                        <span className="data-profile-null">empty</span>
                      ) : (
                        String(row[header])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// onRecordOpenChange(open) and backToRecordsRef let the sidebar show a
// "Back to records" button while a record is open (see App.jsx).
export default function DataProfiling({ onRecordOpenChange, backToRecordsRef }) {
  const { notify, confirm } = useFeedback();
  const [editingId, setEditingId] = useState(null);

  // Row actions menu: { id, top, right } in viewport pixels. The records table
  // scrolls sideways, which would clip a normal dropdown, so it is fixed.
  const [rowMenu, setRowMenu] = useState(null);
  const closeRowMenu = useCallback(() => setRowMenu(null), []);
  useCloseOnOutsideClick(Boolean(rowMenu), closeRowMenu);

  useEffect(() => {
    if (!rowMenu) return undefined;
    window.addEventListener('scroll', closeRowMenu, true);
    window.addEventListener('resize', closeRowMenu);
    return () => {
      window.removeEventListener('scroll', closeRowMenu, true);
      window.removeEventListener('resize', closeRowMenu);
    };
  }, [rowMenu, closeRowMenu]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [sourceType, setSourceType] = useState('Salesforce');
  const [showDetails, setShowDetails] = useState(false);

  const [name, setName] = useState('');
  const [sourceConnection, setSourceConnection] = useState('');
  const [objectName, setObjectName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [showRunPrompt, setShowRunPrompt] = useState(false);

  
  const [savedProfiles, setSavedProfiles] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('dataProfilingProfiles') || '[]'
      );
    } catch {
      return [];
    }
  });

  const [showSavedList, setShowSavedList] = useState(true);

  useEffect(() => {
    localStorage.setItem(
      'dataProfilingProfiles',
      JSON.stringify(savedProfiles)
    );
  }, [savedProfiles]);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileResults, setShowProfileResults] = useState(false);
  const currentProfileResults = selectedProfile?.profileResults;

  // CSV profiling through the API
  const [runFile, setRunFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [runFileLoading, setRunFileLoading] = useState(false);
  const openRecordId = useRef(null);
  const runController = useRef(null);
  const fileInputRef = useRef(null);

  // Cancel an in-flight upload if the user leaves the screen
  useEffect(() => () => runController.current?.abort(), []);

  // Escape closes the New profiling modal, like the app's other dialogs
  useEffect(() => {
    if (!showNewForm) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShowNewForm(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [showNewForm]);

  
  const profileColumns = {
    Account: [
      ['Name', 'Text', 'Text', '98.5%', 'Account name'],
      ['AccountNumber', 'Text(40)', 'Text', '82%', 'Alphanumeric'],
      ['Industry', 'Picklist', 'Picklist', '64.3%', 'Industry values'],
      ['Phone', 'Phone', 'Phone', '72.1%', 'Mixed formats'],
      ['BillingCountry', 'Text', 'Picklist', '96%', 'Country values'],
      ['AnnualRevenue', 'Currency', 'Currency', '58.9%', 'Numeric values'],
    ],
    Contact: [
      ['FirstName', 'Text(40)', 'Text', '95%', 'First name'],
      ['LastName', 'Text(80)', 'Text', '99%', 'Last name'],
      ['Email', 'Email', 'Email', '87.6%', 'Invalid email candidates'],
      ['Phone', 'Phone', 'Phone', '72.1%', 'Mixed formats'],
      ['AccountId', 'Reference', 'Lookup', '91%', 'Account relationship'],
      ['MailingCountry', 'Text', 'Picklist', '84%', 'Country values'],
    ],
    Lead: [
      ['FirstName', 'Text(40)', 'Text', '89%', 'First name'],
      ['LastName', 'Text(80)', 'Text', '98%', 'Last name'],
      ['Company', 'Text(255)', 'Text', '96%', 'Company name'],
      ['Email', 'Email', 'Email', '81%', 'Invalid email candidates'],
      ['Status', 'Picklist', 'Picklist', '100%', 'Lead status values'],
      ['LeadSource', 'Picklist', 'Picklist', '76%', 'Lead source values'],
    ],
    Opportunity: [
      ['Name', 'Text(120)', 'Text', '99%', 'Opportunity name'],
      ['StageName', 'Picklist', 'Picklist', '100%', 'Stage values'],
      ['Amount', 'Currency', 'Currency', '78%', 'Numeric values'],
      ['CloseDate', 'Date', 'Date', '96%', 'Date format'],
      ['AccountId', 'Reference', 'Lookup', '92%', 'Account relationship'],
      ['Probability', 'Percent', 'Numeric', '88%', 'Percentage values'],
    ],
    Case: [
      ['CaseNumber', 'Auto Number', 'Text', '100%', 'Unique identifier'],
      ['Subject', 'Text(255)', 'Text', '96%', 'Case subject'],
      ['Status', 'Picklist', 'Picklist', '100%', 'Case status values'],
      ['Priority', 'Picklist', 'Picklist', '98%', 'Priority values'],
      ['Origin', 'Picklist', 'Picklist', '94%', 'Case origin values'],
      ['AccountId', 'Reference', 'Lookup', '82%', 'Account relationship'],
    ],
  };



  
  const handleNew = () => {
    setEditingId(null);
    setShowNewForm(true);
    setShowDetails(false);
    setShowSavedList(true);
    setSourceType('Salesforce');
    setName('');
    setSourceConnection('');
    setObjectName('');
    setCsvFile(null);
  };


  const handleNext = () => {
    setShowDetails(true);
  };

  const handleBack = () => {
    setShowDetails(false);
  };

  const saveEdit = (profile, keepsCurrentFile) => {
    const fileName = keepsCurrentFile ? profile.sourceConnection : csvFile?.name;
    const next = {
      name: name.trim(),
      sourceType,
      sourceConnection: sourceType === 'Salesforce' ? sourceConnection : fileName,
      objectName: sourceType === 'Salesforce' ? objectName : fileName,
    };
    const sourceChanged =
      next.sourceType !== profile.sourceType ||
      next.sourceConnection !== profile.sourceConnection ||
      next.objectName !== profile.objectName ||
      (sourceType === 'CSV' && Boolean(csvFile) && csvFile !== csvFilesById.get(profile.id));

    if (sourceType === 'CSV' && csvFile) {
      csvFilesById.set(profile.id, csvFile);
      saveCsvFile(profile.id, csvFile);
    }
    if (sourceType !== 'CSV') {
      csvFilesById.delete(profile.id);
      deleteCsvFile(profile.id);
    }

    // Results no longer match a different source, so the profile must run again
    const updated = {
      ...profile,
      ...next,
      ...(sourceChanged ? { status: 'Saved', profiled: false, profileResults: null } : {}),
    };

    setSavedProfiles((previousProfiles) =>
      previousProfiles.map((item) => (item.id === profile.id ? updated : item))
    );
    notify(`${updated.name} updated`, {
      type: 'success',
      message: sourceChanged ? 'The source changed, so run the profile again.' : undefined,
    });

    setEditingId(null);
    setShowNewForm(false);
    setShowDetails(false);
    setShowSavedList(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      notify('Name is required', { type: 'warning', message: 'Give the profile a name.' });
      return;
    }

    if (sourceType === 'Salesforce' && (!sourceConnection || !objectName)) {
      notify('Source is incomplete', { type: 'warning', message: 'Select a source connection and table/object.' });
      return;
    }

    const editingProfile = editingId
      ? savedProfiles.find((profile) => profile.id === editingId)
      : null;
    // When editing a CSV profile, keeping the current file is allowed
    const keepsCurrentFile = editingProfile?.sourceType === 'CSV' && !csvFile;

    if (sourceType === 'CSV' && !csvFile && !keepsCurrentFile) {
      notify('CSV file missing', { type: 'warning', message: 'Upload a CSV file to profile.' });
      return;
    }

    if (editingProfile) {
      saveEdit(editingProfile, keepsCurrentFile);
      return;
    }


    const newProfile = {
      id: `DP-${Date.now()}`,
      name: name.trim(),
      sourceType,
      sourceConnection:
        sourceType === 'Salesforce' ? sourceConnection : csvFile.name,
      objectName: sourceType === 'Salesforce' ? objectName : csvFile.name,
      createdAt: new Date().toLocaleString(),
      status: 'Saved',
      profiled: false,
      profileResults: null,
    };

    if (sourceType === 'CSV') {
      csvFilesById.set(newProfile.id, csvFile);
      saveCsvFile(newProfile.id, csvFile);
    }

    setSavedProfiles((previousProfiles) => [
      ...previousProfiles,
      newProfile,
    ]);

    setShowNewForm(false);
    setShowDetails(false);
    setShowSavedList(true);
  };

  const openRecord = (profile) => {
    const fileInMemory = csvFilesById.get(profile.id) ?? null;
    openRecordId.current = profile.id;
    setSelectedProfile(profile);
    setRunFile(fileInMemory);
    setRunFileLoading(profile.sourceType === 'CSV' && !fileInMemory);
    setRunError('');

    if (profile.sourceType === 'CSV' && !fileInMemory) {
      loadCsvFile(profile.id).then((file) => {
        if (file) csvFilesById.set(profile.id, file);
        // Ignore the result if another record was opened meanwhile
        if (openRecordId.current !== profile.id) return;
        setRunFile(file);
        setRunFileLoading(false);
      });
    }

    setShowProfileResults(Boolean(profile.profiled && profile.profileResults));
    setShowRunPrompt(!(profile.profiled && profile.profileResults));
    setShowNewForm(false);
    setShowSavedList(false);
  };

  const handleEdit = (profile) => {
    setEditingId(profile.id);
    setSourceType(profile.sourceType);
    setName(profile.name);
    setSourceConnection(profile.sourceType === 'Salesforce' ? profile.sourceConnection : '');
    setObjectName(profile.sourceType === 'Salesforce' ? profile.objectName : '');
    setCsvFile(null);
    setShowDetails(true);
    setShowNewForm(true);
  };

  const handleDelete = async (profile) => {
    const ok = await confirm({
      title: `Delete ${profile.name}?`,
      message: profile.sourceType === 'CSV'
        ? 'The profile and its saved results are removed. The CSV file on your computer is not affected.'
        : 'The profile and its saved results are removed.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;

    csvFilesById.delete(profile.id);
    deleteCsvFile(profile.id);
    setSavedProfiles((previousProfiles) =>
      previousProfiles.filter((item) => item.id !== profile.id)
    );
    notify(`Deleted ${profile.name}`);
  };

  const menuProfile = rowMenu
    ? savedProfiles.find((profile) => profile.id === rowMenu.id)
    : null;

  const runRowAction = (action) => {
    setRowMenu(null);
    action(menuProfile);
  };

  const toggleRowMenu = (event, profile) => {
    event.stopPropagation();
    if (rowMenu?.id === profile.id) {
      setRowMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu({ id: profile.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  
  
  const showResults = (profileToUpdate, profileResults) => {
    const updatedProfile = {
      ...profileToUpdate,
      profiled: true,
      status: 'Profiled',
      profileResults,
    };

    // Save the results against this specific record.
    setSavedProfiles((previousProfiles) =>
      previousProfiles.map((profile) =>
        profile.id === profileToUpdate.id ? updatedProfile : profile
      )
    );

    setSelectedProfile(updatedProfile);
    setShowRunPrompt(false);
    setShowProfileResults(true);
  };

  const runCsvProfile = async (profile, pickedFile) => {
    const file = pickedFile ?? runFile ?? csvFilesById.get(profile.id);

    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    const controller = new AbortController();
    runController.current = controller;
    setRunning(true);
    setRunError('');

    try {
      const startedAt = Date.now();
      const response = await profileCsvFile(file, { signal: controller.signal });
      const report = response.profiling_report;

      // A fast local backend would otherwise flash the spinner for a few ms
      const remaining = MIN_SPINNER_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (controller.signal.aborted) return;

      showResults(profile, {
        source: 'api',
        profileId: response.profile_id,
        filename: response.filename,
        report,
        profiledAt: new Date().toISOString(),
      });
      notify('Profiling complete', {
        type: 'success',
        message: `${response.filename} · ${formatNumber(report.summary.row_count)} rows, ${report.summary.column_count} columns`,
      });
    } catch (error) {
      if (error.name === 'AbortError') return;
      setRunError(error.message);
      notify('Profiling failed', { type: 'error', message: error.message });
    } finally {
      if (runController.current === controller) {
        runController.current = null;
        setRunning(false);
      }
    }
  };

  // Only reached when the record's file is no longer stored in this browser
  const handleRunFilePicked = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedProfile) return;

    csvFilesById.set(selectedProfile.id, file);
    saveCsvFile(selectedProfile.id, file);
    setRunFile(file);
    runCsvProfile(selectedProfile, file);
  };

  const handleRunProfile = () => {
    if (!selectedProfile) return;

    if (selectedProfile.sourceType === 'CSV') {
      runCsvProfile(selectedProfile);
      return;
    }

    // Generate the profile details for this record.
    const columns = profileColumns[selectedProfile.objectName] || [];

    showResults(selectedProfile, {
      rows: 184302,
      columnCount: columns.length,
      completeness: '81.4%',
      duplicateCandidates: 2318,
      columnsWithIssues: 7,
      columns,
      profiledAt: new Date().toISOString(),
    });
  };

  const cancelRunPrompt = () => {
    runController.current?.abort();
    runController.current = null;
    setRunning(false);
    setRunError('');
    setShowRunPrompt(false);
    setShowSavedList(true);
  };

  const closeResults = () => {
    setShowProfileResults(false);
    setShowSavedList(true);
    setSelectedProfile(null);
  };

  const recordOpen = Boolean(selectedProfile) && (showRunPrompt || showProfileResults);

  useEffect(() => {
    onRecordOpenChange?.(recordOpen);
  }, [recordOpen, onRecordOpenChange]);

  // Hide the sidebar button when leaving this screen
  useEffect(() => () => onRecordOpenChange?.(false), [onRecordOpenChange]);

  useEffect(() => {
    if (!backToRecordsRef) return undefined;
    backToRecordsRef.current = () => (showRunPrompt ? cancelRunPrompt() : closeResults());
    return () => {
      backToRecordsRef.current = null;
    };
  });



  return (
    <main className="data-profiling-page">
      <header className="data-profiling-header">
        <h1 className="data-profiling-title">Data Profiling</h1>

        {/* Hidden on an open record, where it would stack the form above it.
            visibility keeps its space so the header height does not change. */}
        <button
          type="button"
          className="data-profiling-new-button"
          onClick={handleNew}
          style={showRunPrompt || showProfileResults ? { visibility: 'hidden' } : undefined}
        >
          + New
        </button>
      </header>

      {showSavedList && !showRunPrompt && !showProfileResults && (
      <section className="data-profiling-records">
        <div className="data-profiling-list-header">
          <div>
            <h2>Recently Viewed</h2>
            <p>{savedProfiles.length} items</p>
          </div>
        </div>

        <div className="data-profiling-records-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source Type</th>
                <th>Source Connection / File</th>
                <th>Table / Object</th>
                <th>Status</th>
                <th>Created</th>
                <th className="data-profiling-actions-cell" aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {savedProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <button
                      type="button"
                      className="data-profiling-record-link"
                      onClick={() => openRecord(profile)}
                    >
                      {profile.name}
                    </button>
                  </td>
                  <td>{profile.sourceType === 'CSV' ? 'File (CSV)' : 'Salesforce'}</td>
                  <td>{profile.sourceConnection}</td>
                  <td>{profile.objectName}</td>
                  <td>
                    <span className="data-profiling-status">
                      {profile.status}
                    </span>
                  </td>
                  <td>{profile.createdAt}</td>
                  <td className="data-profiling-actions-cell">
                    <button
                      type="button"
                      className={`data-profiling-row-menu-button ${rowMenu?.id === profile.id ? 'open' : ''}`}
                      aria-label={`Actions for ${profile.name}`}
                      aria-haspopup="menu"
                      aria-expanded={rowMenu?.id === profile.id}
                      onClick={(event) => toggleRowMenu(event, profile)}
                    >
                      ⋮
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

      {menuProfile && createPortal(
        <div
          className="data-profiling-row-menu ui-popup-menu"
          role="menu"
          style={{ top: rowMenu.top, right: rowMenu.right }}
        >
          <button type="button" role="menuitem" onClick={() => runRowAction(openRecord)}>
            {menuProfile.profiled && menuProfile.profileResults ? 'View results' : 'Run profile'}
          </button>
          <button type="button" role="menuitem" onClick={() => runRowAction(handleEdit)}>
            Edit
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => runRowAction(handleDelete)}>
            Delete
          </button>
        </div>,
        document.body
      )}

      {showNewForm && createPortal(
        <div className="data-profiling-modal-backdrop">
        <section
          className="data-profiling-form data-profiling-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="data-profiling-modal-title"
        >
          <div className="data-profiling-form-header">
            <h2 id="data-profiling-modal-title">
              {editingId ? 'Edit Data Profiling' : showDetails ? 'New Data Profiling' : 'Select Source Type'}
            </h2>

            <button
              type="button"
              className="data-profiling-close-button"
              onClick={() => setShowNewForm(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {!showDetails ? (
            <>
              <p className="data-profiling-description">
                Select the source for your profiling task.
              </p>

              <div className="data-profiling-radio-options">
                <label className="data-profiling-radio-card">
                  <input
                    type="radio"
                    name="sourceType"
                    value="Salesforce"
                    checked={sourceType === 'Salesforce'}
                    onChange={() => setSourceType('Salesforce')}
                  />

                  <span>
                    <strong>Salesforce</strong>
                    <small>Profile data from a Salesforce connection</small>
                  </span>
                </label>

                <label className="data-profiling-radio-card">
                  <input
                    type="radio"
                    name="sourceType"
                    value="CSV"
                    checked={sourceType === 'CSV'}
                    onChange={() => setSourceType('CSV')}
                  />

                  <span>
                    <strong>File (CSV)</strong>
                    <small>Profile data from an uploaded CSV file</small>
                  </span>
                </label>
              </div>

              <div className="data-profiling-form-actions">
                <button
                  type="button"
                  className="data-profiling-cancel-button"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="data-profiling-next-button"
                  onClick={handleNext}
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="data-profiling-description">
                Enter the details for your {sourceType === 'CSV' ? 'CSV file' : 'Salesforce'} profiling task.
              </p>

              <div className="data-profiling-fields">
                <label className="data-profiling-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter profiling name"
                  />
                </label>

                {sourceType === 'Salesforce' ? (
                  <>
                    <label className="data-profiling-field">
                      <span>Source connection</span>
                      <select
                        value={sourceConnection}
                        onChange={(event) => setSourceConnection(event.target.value)}
                      >
                        <option value="">Select connection</option>
                        <option value="LEGACY_CRM_PG">LEGACY_CRM_PG</option>
                        <option value="ERP_ORACLE">ERP_ORACLE</option>
                        <option value="DW_MSSQL">DW_MSSQL</option>
                      </select>
                    </label>

                    <label className="data-profiling-field">
                      <span>Table / Object / File</span>
                      <select
                        value={objectName}
                        onChange={(event) => setObjectName(event.target.value)}
                      >
                        <option value="">Select table/object</option>
                        <option value="Account">Account</option>
                        <option value="Contact">Contact</option>
                        <option value="Lead">Lead</option>
                        <option value="Opportunity">Opportunity</option>
                        <option value="Case">Case</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="data-profiling-field">
                    <span>Upload file (CSV)</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setCsvFile(event.target.files?.[0] ?? null)
                      }
                    />
                    {csvFile && (
                      <small className="data-profiling-file-name">
                        Selected: {csvFile.name}
                      </small>
                    )}
                    {!csvFile && editingId && savedProfiles.find((profile) => profile.id === editingId)?.sourceType === 'CSV' && (
                      <small className="data-profiling-file-name">
                        Current file: {savedProfiles.find((profile) => profile.id === editingId).sourceConnection}.
                        Choose a file only to replace it.
                      </small>
                    )}
                  </label>
                )}
              </div>

              <div className="data-profiling-form-actions">
                <button
                  type="button"
                  className="data-profiling-cancel-button"
                  onClick={handleBack}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="data-profiling-next-button"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </section>
        </div>,
        document.body
      )}
      
    {showRunPrompt && selectedProfile && (
      <section className="data-profiling-run-prompt">
        {running && (
          <div className="data-profiling-run-overlay" role="status" aria-label="Profiling">
            <span className="data-profiling-dots">
              {[0, 1, 2, 3, 4, 5].map((dot) => (
                <i key={dot} />
              ))}
            </span>
          </div>
        )}
        <span className="data-profiling-run-eyebrow">Run profile</span>
        <h2>{selectedProfile.name}</h2>

        {selectedProfile.sourceType !== 'CSV' && (
          <p>
            Ready to profile {selectedProfile.objectName}?
            Click Run profile to view the profiling results.
          </p>
        )}

        {selectedProfile.sourceType === 'CSV' && (
          <>
            <div className="data-profiling-run-source">
              <span>File (CSV)</span>
              <strong>{runFile?.name ?? selectedProfile.objectName}</strong>
              {runFile && <small>{formatFileSize(runFile.size)}</small>}
            </div>
            <p>
              Click Run profile to check row counts, missing values,
              duplicates and column statistics.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={handleRunFilePicked}
            />
          </>
        )}

        {runError && (
          <p className="data-profiling-run-error" role="alert">
            {runError}
          </p>
        )}

        <div className="data-profiling-form-actions">
          <button
            type="button"
            className="data-profiling-cancel-button"
            onClick={cancelRunPrompt}
          >
            Cancel
          </button>
          <button
            type="button"
            className="data-profiling-next-button"
            onClick={handleRunProfile}
            disabled={running || runFileLoading}
          >
            {running ? (
              <>
                <Spinner /> Profiling…
              </>
            ) : (
              'Run profile'
            )}
          </button>
        </div>
      </section>
    )}

    {showProfileResults && selectedProfile && (
      <section className="data-profile-results">
        <div className="data-profile-results-header">
          <div>
            <h2>{selectedProfile.name}</h2>
            <p>
              {selectedProfile.sourceType === 'CSV'
                ? 'File (CSV)'
                : 'Salesforce'}{' '}
              · {selectedProfile.objectName}
            </p>
          </div>
          <button
            type="button"
            className="data-profiling-next-button"
            onClick={closeResults}
          >
            Back to records
          </button>
        </div>

        {currentProfileResults?.source === 'api' ? (
          <CsvProfileResults report={currentProfileResults.report} />
        ) : (
        <>
        <div className="data-profile-summary">
          <div>
            <span>ROWS</span>
            <strong>
              {currentProfileResults?.rows?.toLocaleString() ?? '—'}
            </strong>
          </div>

          <div>
            <span>COLUMNS</span>
            <strong>{currentProfileResults?.columnCount ?? 0}</strong>
          </div>

          <div>
            <span>AVG. COMPLETENESS</span>
            <strong>{currentProfileResults?.completeness ?? '—'}</strong>
          </div>

          <div>
            <span>DUPLICATE CANDIDATES</span>
            <strong>
              {currentProfileResults?.duplicateCandidates?.toLocaleString() ?? '—'}
            </strong>
          </div>

          <div>
            <span>COLUMNS WITH ISSUES</span>
            <strong>{currentProfileResults?.columnsWithIssues ?? 0}</strong>
          </div>
        </div>


        <div className="data-profile-table-card">
          <h3>
            {selectedProfile.objectName} field profile
            ({currentProfileResults?.columns?.length || 0} columns)
          </h3>

          <div className="data-profile-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Declared type</th>
                  <th>Inferred type</th>
                  <th>Populated</th>
                  <th>Format / pattern</th>
                  <th>Finding</th>
                </tr>
              </thead>
              <tbody>
               {(currentProfileResults?.columns || []).map(
                  (column) => (
                    <tr key={column[0]}>
                      <td>{column[0]}</td>
                      <td>{column[1]}</td>
                      <td>{column[2]}</td>
                      <td>{column[3]}</td>
                      <td>{column[4]}</td>
                      <td>
                        {column[3] === '100%' ? 'OK' : 'Review values'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </section>
    )}

    </main>
  );
}