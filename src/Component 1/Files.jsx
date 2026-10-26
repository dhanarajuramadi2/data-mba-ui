
import { useCallback, useMemo, useState } from 'react';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
import './Files.css';

const initialJobs = [
  { id: 1, name: 'EXT_CASE_FILES_2023', direction: 'SF_PROD → folder', files: 8902, size: '21.4 GB', status: 'Complete · checksums match', date: '29 Sep 2026, 11:48' },
  { id: 2, name: 'MIG_CONTRACT_PDFS', direction: 'INBOUND_SHARE → SF_UAT', files: 3118, size: '6.2 GB', status: '3,104 ok · 14 parent not found', date: '28 Sep 2026, 09:12' },
  { id: 3, name: 'EXT_OPP_ATTACH', direction: 'SF_QA → folder', files: '—', size: '—', status: 'Token expired · paused', date: '27 Sep 2026, 16:20' },
];

const objectOptions = ['Case', 'Account', 'Contact', 'Opportunity', 'User'];
const orgOptions = ['SF_PROD', 'SF_UAT', 'SF_QA', 'SF_DEV01'];

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function FileJobMenu({ onClose, onDownload, onDuplicate, onRemove }) {
  useCloseOnOutsideClick(true, onClose);
  return (
    <div className="files-job-menu ui-popup-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onDownload}>⇩ Download details</button>
      <button type="button" onClick={onDuplicate}>⧉ Duplicate job</button>
      <button type="button" className="danger" onClick={onRemove}>✕ Remove job</button>
    </div>
  );
}

export default function Files() {
  const { notify, confirm } = useFeedback();
  const [menuJobId, setMenuJobId] = useState(null);
  const closeMenu = useCallback(() => setMenuJobId(null), []);
  const [tab, setTab] = useState('extract');
  const [sourceOrg, setSourceOrg] = useState('SF_PROD');
  const [linkedObject, setLinkedObject] = useState('Case');
  const [fileTypes, setFileTypes] = useState({
    Files: true,
    Attachments: true,
    Documents: false,
  });
  const [criteria, setCriteria] = useState(
    "Status = 'Closed' AND ClosedDate < LAST_N_YEARS:3 AND Account.Type = 'Customer'"
  );
  const [extensions, setExtensions] = useState('pdf, docx, xlsx, png, jpg');
  const [maxSize, setMaxSize] = useState('100');
  const [createdBetween, setCreatedBetween] = useState('Any');
  const [version, setVersion] = useState('Latest only');
  const [destination, setDestination] = useState('/Volumes/archive/case-files');
  const [pattern, setPattern] = useState('{CaseNumber}/{Title}_v{VersionNumber}.{ext}');
  const [manifest, setManifest] = useState(true);
  const [resume, setResume] = useState(true);
  const [zip, setZip] = useState(false);
  const [jobs, setJobs] = useState(initialJobs);
  const [notice, setNotice] = useState('');
  const [showCriteriaHelp, setShowCriteriaHelp] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showEstimate, setShowEstimate] = useState(false);
  const jobName = 'EXT_CASE_FILES_2026';
  const [running, setRunning] = useState(false);

  const selectedTypes = Object.values(fileTypes).filter(Boolean).length;

  const estimate = useMemo(() => {
    const baseFiles =
      linkedObject === 'Case' ? 12480 :
      linkedObject === 'Account' ? 8750 :
      linkedObject === 'Contact' ? 6320 :
      linkedObject === 'Opportunity' ? 5400 : 434;

    const typeFactor = selectedTypes === 0 ? 0 : selectedTypes / 2;
    const sizeFactor = Number(maxSize) <= 10 ? 0.42 :
      Number(maxSize) <= 50 ? 0.72 : 1;

    const files = Math.round(baseFiles * typeFactor * sizeFactor);
    const gb = (files * 3.1 / 1000).toFixed(1);
    const calls = Math.round(files * 0.98);
    const skipped = Math.max(0, Math.round(files * 0.0033));

    return { files, gb, calls, skipped };
  }, [linkedObject, selectedTypes, maxSize]);

  function toggleFileType(type) {
    setFileTypes(current => ({
      ...current,
      [type]: !current[type],
    }));
  }

  function runEstimate() {
    setShowEstimate(true);
    setNotice(`Estimate refreshed for ${sourceOrg} · ${linkedObject}.`);
  }

  function saveAsJob() {
    if (!jobName.trim()) {
      setNotice('Enter a job name before saving.');
      return;
    }

    const newJob = {
      id: Date.now(),
      name: jobName.trim(),
      direction: tab === 'extract' ? `${sourceOrg} → folder` : `folder → ${sourceOrg}`,
      files: estimate.files.toLocaleString('en-US'),
      size: `${estimate.gb} GB`,
      status: 'Saved · ready to run',
      date: new Date().toLocaleString(),
    };

    setJobs(current => [newJob, ...current].slice(0, 4));
    setNotice(`Job "${jobName}" saved in this demo.`);
  }

  function startExtract() {
    if (selectedTypes === 0) {
      setNotice('Select at least one file type before starting.');
      return;
    }

    if (!destination.trim()) {
      setNotice('Enter an output destination.');
      return;
    }

    if (tab === 'extract' && !sourceOrg) {
      setNotice('Select a source organization.');
      return;
    }

    setRunning(true);

    const newJob = {
      id: Date.now(),
      name: jobName.trim() || `FILE_JOB_${Date.now()}`,
      direction: tab === 'extract' ? `${sourceOrg} → folder` : `folder → ${sourceOrg}`,
      files: estimate.files.toLocaleString('en-US'),
      size: `${estimate.gb} GB`,
      status: 'Running · demo',
      date: new Date().toLocaleString(),
    };

    setJobs(current => [newJob, ...current].slice(0, 4));
    setNotice('Demo job started and added to Recent file jobs.');
  }

  function viewJob(job) {
    setSelectedJob(job);
  }

  function downloadManifest() {
    const content = [
      'Job,Direction,Files,Size,Status,Started',
      ...jobs.map(job =>
        [job.name, job.direction, job.files, job.size, job.status, job.date]
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\r\n');

    downloadFile('file-jobs-manifest.csv', content);
    setNotice('File jobs manifest downloaded.');
  }

  async function handleJobAction(job, action) {
    closeMenu();

    if (action === 'download') {
      downloadFile(
        `${job.name}.csv`,
        `Job,Direction,Files,Size,Status,Started\n${[
          job.name, job.direction, job.files, job.size, job.status, job.date
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')}`
      );
      notify(`Downloaded ${job.name}.csv`, { type: 'success' });
    } else if (action === 'duplicate') {
      setJobs(current => [
        { ...job, id: Date.now(), name: `${job.name}_COPY`, status: 'Saved · ready to run' },
        ...current,
      ].slice(0, 4));
      notify(`Duplicated ${job.name}`, { type: 'success', message: 'The copy is saved and ready to run.' });
    } else if (action === 'remove') {
      const ok = await confirm({
        title: `Remove ${job.name}?`,
        message: 'Files already extracted are not deleted.',
        confirmLabel: 'Remove job',
        danger: true,
      });
      if (!ok) return;
      setJobs(current => current.filter(item => item.id !== job.id));
      notify(`Removed ${job.name}`);
    }
  }

  return (
    <div className="files-page">
      <header className="files-topbar">
        <label className="files-global-search">
          <span>⌕</span>
          <input placeholder="Search jobs, connections, migration plans..." />
        </label>

        <div className="files-user">
          <span className="files-bell">♧</span>
        </div>
      </header>

      <header className="files-heading">
        <div>
          <h1>Files</h1>
          <p>Salesforce Files (ContentVersion), legacy Attachments and Documents.</p>
        </div>

        <div className="files-heading-actions">
          <button className="files-button" onClick={saveAsJob}>Save as job</button>
          <button className="files-button" onClick={runEstimate}>Estimate</button>
          <button className="files-button primary" onClick={startExtract}>
            ▶ {running ? 'Start another' : tab === 'extract' ? 'Start extract' : 'Start migration'}
          </button>
        </div>
      </header>

      <div className="files-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'migrate'}
          className={tab === 'migrate' ? 'selected' : ''}
          onClick={() => {
            setTab('migrate');
            setNotice('Inbound file migration selected.');
          }}
        >
          Migrate files into Salesforce
        </button>

        <button
          role="tab"
          aria-selected={tab === 'extract'}
          className={tab === 'extract' ? 'selected' : ''}
          onClick={() => {
            setTab('extract');
            setNotice('Extract files from Salesforce selected.');
          }}
        >
          Extract files from Salesforce
        </button>
      </div>

      {notice && (
        <div className="files-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
        </div>
      )}

      <div className="files-content">
        <div className="files-main-column">
          <section className="files-card">
            <div className="files-card-heading">
              <span className="files-step">1</span>
              <div>
                <h2>{tab === 'extract' ? 'Source and file selection' : 'Inbound source and file selection'}</h2>
                <p>
                  {tab === 'extract'
                    ? 'Choose the source organization, file types and parent record criteria to extract files from Salesforce.'
                    : 'Choose the inbound folder, target organization and file rules for migration.'}
                </p>
              </div>
            </div>

            <div className="files-form-grid">
              <label className="files-field">
                <span>{tab === 'extract' ? 'SOURCE ORG' : 'TARGET ORG'}</span>
                <select value={sourceOrg} onChange={event => setSourceOrg(event.target.value)}>
                  {orgOptions.map(org => <option key={org}>{org}</option>)}
                </select>
              </label>

              <label className="files-field">
                <span>LINKED TO OBJECT</span>
                <select value={linkedObject} onChange={event => setLinkedObject(event.target.value)}>
                  {objectOptions.map(object => <option key={object}>{object}</option>)}
                </select>
              </label>

              <div className="files-field">
                <span>FILE TYPES</span>
                <div className="files-checkbox-row">
                  {Object.keys(fileTypes).map(type => (
                    <label key={type}>
                      <input
                        type="checkbox"
                        checked={fileTypes[type]}
                        onChange={() => toggleFileType(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              <label className="files-field files-field-wide">
                <span>PARENT RECORD CRITERIA (OPTIONAL SOQL WHERE)</span>
                <div className="files-query-input">
                  <input value={criteria} onChange={event => setCriteria(event.target.value)} />
                  <button
                    type="button"
                    title="Show SOQL criteria help"
                    onClick={() => setShowCriteriaHelp(value => !value)}
                  >
                    {'{}'}
                  </button>
                </div>
                <small>Filter parent records to control which files are {tab === 'extract' ? 'extracted' : 'migrated'}.</small>
                {showCriteriaHelp && (
                  <div className="files-help">
                    Example: <code>Status = 'Closed'</code>. Use a valid WHERE expression for the selected object.
                    <button type="button" onClick={() => setCriteria("Status = 'Closed'")}>
                      Use example
                    </button>
                  </div>
                )}
              </label>

              <label className="files-field">
                <span>FILE EXTENSIONS</span>
                <input value={extensions} onChange={event => setExtensions(event.target.value)} />
                <small>Comma-separated list of file extensions.</small>
              </label>

              <label className="files-field">
                <span>MAX SIZE</span>
                <select value={maxSize} onChange={event => setMaxSize(event.target.value)}>
                  <option value="10">≤ 10 MB</option>
                  <option value="50">≤ 50 MB</option>
                  <option value="100">≤ 100 MB</option>
                  <option value="500">≤ 500 MB</option>
                  <option value="2000">≤ 2 GB</option>
                </select>
                <small>Maximum file size per file.</small>
              </label>

              <label className="files-field">
                <span>CREATED BETWEEN</span>
                <select value={createdBetween} onChange={event => setCreatedBetween(event.target.value)}>
                  <option>Any</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                </select>
                <small>Created date range (optional).</small>
              </label>

              <label className="files-field">
                <span>VERSIONS</span>
                <select value={version} onChange={event => setVersion(event.target.value)}>
                  <option>Latest only</option>
                  <option>All versions</option>
                  <option>Latest published</option>
                </select>
                <small>Which file version to extract.</small>
              </label>
            </div>
          </section>

          <section className="files-card">
            <div className="files-card-heading">
              <span className="files-step">2</span>
              <div>
                <h2>Output settings</h2>
                <p>Configure where files will be saved and how they are packaged.</p>
              </div>
            </div>

            <div className="files-output-grid">
              <label className="files-field">
                <span>{tab === 'extract' ? 'DESTINATION' : 'INBOUND FOLDER'}</span>
                <div className="files-destination">
                  <input value={destination} onChange={event => setDestination(event.target.value)} />
                  <button
                    type="button"
                    title="Choose example destination"
                    onClick={() => setDestination('/Volumes/archive/case-files')}
                  >
                    ▱
                  </button>
                </div>
                <small>Target folder for extracted files.</small>
              </label>

              <label className="files-field">
                <span>FOLDER &amp; NAME PATTERN</span>
                <input value={pattern} onChange={event => setPattern(event.target.value)} />
                <small>Use placeholders to organise extracted files.</small>
              </label>
            </div>

            <div className="files-options">
              <label>
                <input type="checkbox" checked={manifest} onChange={event => setManifest(event.target.checked)} />
                <span>
                  <strong>Manifest CSV with SHA-256 checksums</strong>
                  <small>Generate a manifest file with file details and checksums.</small>
                </span>
              </label>

              <label>
                <input type="checkbox" checked={resume} onChange={event => setResume(event.target.checked)} />
                <span>
                  <strong>Resume partial downloads</strong>
                  <small>Continue failed downloads from last run.</small>
                </span>
              </label>

              <label>
                <input type="checkbox" checked={zip} onChange={event => setZip(event.target.checked)} />
                <span>
                  <strong>Zip per parent record</strong>
                  <small>Create a separate ZIP file for each parent record.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="files-card files-jobs-card">
            <div className="files-card-heading files-jobs-heading">
              <span className="files-step">3</span>
              <div>
                <h2>Recent file jobs</h2>
                <p>View and manage previously created jobs.</p>
              </div>
              <button className="files-manifest-button" onClick={downloadManifest}>
                ↓ Manifest
              </button>
            </div>

            <div className="files-jobs-table-wrap">
              <table className="files-jobs-table">
                <thead>
                  <tr>
                    <th>JOB</th>
                    <th>DIRECTION</th>
                    <th>FILES</th>
                    <th>SIZE</th>
                    <th>STATUS</th>
                    <th>STARTED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id}>
                      <td>{job.name}</td>
                      <td>{job.direction}</td>
                      <td>{job.files}</td>
                      <td>{job.size}</td>
                      <td>
                        <span className={`files-job-status ${
                          job.status.startsWith('Complete') ? 'success' :
                          job.status.startsWith('Running') ? 'running' :
                          job.status.startsWith('Saved') ? 'saved' : 'warning'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td>{job.date}</td>
                      <td className="files-job-actions">
                        <button className="files-link-button" onClick={() => viewJob(job)}>View</button>
                        <button
                          className="files-more-button"
                          aria-label={`More actions for ${job.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuJobId(menuJobId === job.id ? null : job.id);
                          }}
                        >
                          ···
                        </button>
                        {menuJobId === job.id && (
                          <FileJobMenu
                            onClose={closeMenu}
                            onDownload={() => handleJobAction(job, 'download')}
                            onDuplicate={() => handleJobAction(job, 'duplicate')}
                            onRemove={() => handleJobAction(job, 'remove')}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="files-side-column">
          <section className="files-card files-estimate-card">
            <div className="files-side-title">
              <span>▤</span>
              <h2>Estimate</h2>
            </div>

            <div className="files-estimate-grid">
              <div>
                <strong>{estimate.files.toLocaleString('en-US')}</strong>
                <span>files matched</span>
              </div>
              <div>
                <strong>{estimate.gb} GB</strong>
                <span>to download</span>
              </div>
              <div>
                <strong>~{(estimate.calls / 1000).toFixed(1)}k</strong>
                <span>API calls</span>
              </div>
              <div>
                <strong>{estimate.skipped}</strong>
                <span>skipped · over size</span>
              </div>
            </div>

            <div className="files-budget-label">
              <span>Daily API budget after run</span>
              <strong>15% → {Math.min(99, 15 + Math.ceil(estimate.calls / 100000))}%</strong>
            </div>
            <div className="files-budget-track"><span style={{ width: `${Math.min(99, 15 + Math.ceil(estimate.calls / 100000))}%` }} /></div>

            {showEstimate && (
              <p className="files-estimate-updated">
                Estimate refreshed using current selections.
              </p>
            )}
          </section>

          <section className="files-card files-criteria-card">
            <h2>How the criteria resolve</h2>
            <div className="files-step-explanation">
              <span>1</span>
              <p>Query {linkedObject} IDs using the WHERE clause (Bulk API query).</p>
            </div>
            <div className="files-step-explanation">
              <span>2</span>
              <p>Query ContentDocumentLink by LinkedEntityId in chunks of 200 IDs.</p>
            </div>
            <div className="files-step-explanation">
              <span>3</span>
              <p>Stream VersionData to disk, with parallel downloads and retry handling.</p>
            </div>
          </section>

          <section className="files-card files-inbound-card">
            <h2><span>ⓘ</span> Inbound file migration</h2>
            <p>
              Uses a manifest (file path + parent external ID). Files are created as
              ContentVersion with FirstPublishLocationId. Files over 2 GB are flagged
              before upload.
            </p>
            <p className="files-inbound-note">
              Current mode: <strong>{tab === 'extract' ? 'Extract from Salesforce' : 'Migrate into Salesforce'}</strong>
            </p>
          </section>
        </aside>
      </div>

      {selectedJob && (
        <div className="files-modal-backdrop" onClick={() => setSelectedJob(null)}>
          <section
            className="files-job-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="files-job-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="files-modal-heading">
              <h2 id="files-job-modal-title">File job details</h2>
              <button onClick={() => setSelectedJob(null)} aria-label="Close">×</button>
            </div>
            <dl>
              <dt>Job name</dt><dd>{selectedJob.name}</dd>
              <dt>Direction</dt><dd>{selectedJob.direction}</dd>
              <dt>Files</dt><dd>{selectedJob.files}</dd>
              <dt>Size</dt><dd>{selectedJob.size}</dd>
              <dt>Status</dt><dd>{selectedJob.status}</dd>
              <dt>Started</dt><dd>{selectedJob.date}</dd>
            </dl>
            <button className="files-button primary" onClick={() => setSelectedJob(null)}>Close</button>
          </section>
        </div>
      )}

      {manifest && (
        <span className="files-config-indicator" aria-hidden="true">
          SHA-256 manifest enabled
        </span>
      )}
    </div>
  );
}
