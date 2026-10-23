
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Spinner } from './ui/Feedback';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
import './Archival.css';

const initialJobs = [
  {
    id: 'ARC_TASK_5Y',
    object: 'Task',
    destination: 'AWS S3',
    records: 1204330,
    dataFreed: '2.3 GB',
    filesFreed: '—',
    lastRun: '12 Sep 2026, 10:24',
    status: 'Archived & deleted',
    criteria: 'IsClosed = true AND ActivityDate < LAST_N_YEARS:5',
    retention: 7,
  },
  {
    id: 'ARC_EMAIL_4Y',
    object: 'EmailMessage',
    destination: 'Azure Blob',
    records: 688902,
    dataFreed: '1.4 GB',
    filesFreed: '18.9 GB',
    lastRun: '2 Sep 2026, 08:11',
    status: 'Archived & deleted',
    criteria: 'MessageDate < LAST_N_YEARS:4',
    retention: 7,
  },
  {
    id: 'ARC_OPP_LOST_5Y',
    object: 'Opportunity',
    destination: 'AWS S3',
    records: 16102,
    dataFreed: '0.03 GB',
    filesFreed: '3.7 GB',
    lastRun: '20 Aug 2026, 14:50',
    status: 'Archived & deleted',
    criteria: "StageName = 'Closed Lost' AND CloseDate < LAST_N_YEARS:5",
    retention: 10,
  },
  {
    id: 'ARC_LEAD_OLD',
    object: 'Lead',
    destination: 'Azure Blob',
    records: 96410,
    dataFreed: '0.19 GB',
    filesFreed: '—',
    lastRun: '28 Aug 2026, 11:03',
    status: 'Delete pending',
    criteria: 'IsConverted = false AND LastActivityDate < LAST_N_YEARS:3',
    retention: 5,
  },
  {
    id: 'ARC_CASE_CLOSED_3Y',
    object: 'Case + 3 child objects',
    destination: 'AWS S3',
    records: 412806,
    dataFreed: '1.6 GB',
    filesFreed: '38.6 GB',
    lastRun: '15 Aug 2026, 09:42',
    status: 'Ready to run',
    criteria: 'IsClosed = true AND ClosedDate < LAST_N_YEARS:3',
    retention: 7,
  },
  {
    id: 'ARC_LOG_2022',
    object: 'Integration_Log__c',
    destination: 'AWS S3',
    records: 0,
    dataFreed: '—',
    filesFreed: '—',
    lastRun: '14 Aug 2026, 16:20',
    status: 'Verify failed',
    criteria: 'CreatedDate < 2023-01-01T00:00:00Z',
    retention: 3,
  },
];

const destinations = [
  { alias: 'ARCHIVE_S3', name: 'AWS S3', logo: 'AWS', detail: 'acme-sf-archive · eu-west-1 · IAM role' },
  { alias: 'ARCHIVE_AZ', name: 'Azure Blob', logo: 'AZ', detail: 'acmearchive/sf-archive · Cool tier', className: 'azure' },
];

const statusOptions = ['Archived & deleted', 'Delete pending', 'Ready to run', 'Verify failed', 'Running'];

const formatNumber = (value) => Number(value || 0).toLocaleString('en-GB');

const nowLabel = () =>
  new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const statusClass = (status) =>
  status.toLowerCase().replaceAll(' ', '-').replace('&', 'and');

function destinationPath(job) {
  const folder = job.object.split(' ')[0];
  return job.destination === 'AWS S3'
    ? `s3://acme-sf-archive/${folder}/`
    : `https://acmearchive.blob.core.windows.net/sf-archive/${folder}/`;
}

function JobFormModal({ job, onClose, onSave }) {
  const [form, setForm] = useState({
    object: job?.object || '',
    destination: job?.destination || 'AWS S3',
    criteria: job?.criteria || '',
    retention: job?.retention || 7,
  });
  const [error, setError] = useState('');

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setError('');
  };

  const submit = (event) => {
    event?.preventDefault();
    if (!form.object.trim() || !form.criteria.trim()) {
      setError('Object and criteria are required.');
      return;
    }
    onSave({ ...form, retention: Number(form.retention) || 1 });
  };

  return (
    <Modal
      title={job ? `Edit ${job.id}` : 'New archive job'}
      subtitle="Records are deleted from Salesforce only after the archive is verified."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ui-button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ui-button primary" onClick={submit}>
            {job ? 'Save changes' : 'Create job'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="ui-field-grid">
          <label className="ui-field">
            <span>Salesforce object *</span>
            <input
              list="archive-object-options"
              value={form.object}
              onChange={update('object')}
              placeholder="e.g. Task"
            />
            <datalist id="archive-object-options">
              {['Task', 'Event', 'EmailMessage', 'Case', 'Opportunity', 'Lead', 'ContentVersion'].map(
                (item) => <option key={item} value={item} />
              )}
            </datalist>
          </label>

          <label className="ui-field">
            <span>Destination</span>
            <select value={form.destination} onChange={update('destination')}>
              {destinations.map((item) => (
                <option key={item.alias} value={item.name}>
                  {item.name} · {item.alias}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="ui-field">
          <span>Criteria (SOQL WHERE) *</span>
          <textarea
            value={form.criteria}
            onChange={update('criteria')}
            placeholder="IsClosed = true AND CreatedDate < LAST_N_YEARS:5"
          />
        </label>

        <label className="ui-field">
          <span>Retention: {form.retention} years</span>
          <input
            type="range"
            min="1"
            max="15"
            value={form.retention}
            onChange={update('retention')}
          />
        </label>

        {error && <p className="ui-field-error">{error}</p>}
      </form>
    </Modal>
  );
}

function RestoreModal({ jobs, onClose, onRestore }) {
  const archived = jobs.filter((job) => job.status === 'Archived & deleted');
  const [jobId, setJobId] = useState(archived[0]?.id || '');
  const [scope, setScope] = useState('ids');
  const [ids, setIds] = useState('');

  const job = archived.find((item) => item.id === jobId);
  const count = scope === 'all' ? job?.records || 0 : ids.split(/[\s,]+/).filter(Boolean).length;

  return (
    <Modal
      title="Restore from archive"
      subtitle="Restored records are re-inserted with their original IDs mapped to Legacy_Id__c."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ui-button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-button primary"
            disabled={!job || count === 0}
            onClick={() => onRestore(job, count)}
          >
            Restore {count ? formatNumber(count) : ''} record{count === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      {archived.length === 0 ? (
        <p className="ui-dialog-message">No completed archives yet.</p>
      ) : (
        <>
          <label className="ui-field">
            <span>Archive</span>
            <select value={jobId} onChange={(event) => setJobId(event.target.value)}>
              {archived.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} · {item.object} · {formatNumber(item.records)} records
                </option>
              ))}
            </select>
          </label>

          <div className="archive-radio-row">
            <label>
              <input type="radio" checked={scope === 'ids'} onChange={() => setScope('ids')} />
              Specific record IDs
            </label>
            <label>
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} />
              Entire archive
            </label>
          </div>

          {scope === 'ids' && (
            <label className="ui-field">
              <span>Record IDs (comma or new line separated)</span>
              <textarea
                value={ids}
                onChange={(event) => setIds(event.target.value)}
                placeholder="00T5j000001AbcD, 00T5j000001AbcE"
              />
            </label>
          )}
        </>
      )}
    </Modal>
  );
}

function RowMenu({ job, onClose, onView, onRun, onConfirmDelete, onEdit, onRemove }) {
  useCloseOnOutsideClick(true, onClose);

  return (
    <div className="archive-action-menu ui-popup-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onView}>View details</button>
      {['Ready to run', 'Verify failed'].includes(job.status) && (
        <button type="button" onClick={onRun}>
          {job.status === 'Verify failed' ? 'Retry archive & verify' : 'Run now'}
        </button>
      )}
      {job.status === 'Delete pending' && (
        <button type="button" onClick={onConfirmDelete}>Delete from Salesforce</button>
      )}
      <button type="button" onClick={onEdit} disabled={job.status === 'Running'}>Edit job</button>
      <button type="button" className="danger" onClick={onRemove} disabled={job.status === 'Running'}>
        Remove job
      </button>
    </div>
  );
}

export default function Archival({ onNavigate }) {
  const { notify, confirm } = useFeedback();

  const [jobs, setJobs] = useState(initialJobs);
  const [search, setSearch] = useState('');
  const [destination, setDestination] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('ARC_TASK_5Y');
  const [menuJobId, setMenuJobId] = useState(null);
  const [modal, setModal] = useState(null); // 'new' | 'edit' | 'restore'
  const [testingDestination, setTestingDestination] = useState(null);
  const timers = useRef({});

  useEffect(() => {
    const running = timers.current;
    return () => Object.values(running).forEach((timer) => window.clearInterval(timer));
  }, []);

  const closeMenu = useCallback(() => setMenuJobId(null), []);

  const updateJob = (id, changes) =>
    setJobs((previous) => previous.map((job) => (job.id === id ? { ...job, ...changes } : job)));

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const matchesSearch =
          `${job.id} ${job.object} ${job.destination} ${job.status}`
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesDestination =
          destination === 'all' || job.destination === destination;

        const matchesStatus =
          status === 'all' || job.status === status;

        return matchesSearch && matchesDestination && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.lastRun).getTime();
        const dateB = new Date(b.lastRun).getTime();

        return sortOrder === 'newest'
          ? dateB - dateA
          : dateA - dateB;
      });
  }, [jobs, search, destination, status, sortOrder]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];

  const visibleIds = filteredJobs.map((job) => job.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelectedJob = (jobId) => {
    setSelectedIds((previous) =>
      previous.includes(jobId)
        ? previous.filter((id) => id !== jobId)
        : [...previous, jobId]
    );
  };

  const selectAllVisible = (checked) => {
    setSelectedIds((previous) =>
      checked
        ? [...new Set([...previous, ...visibleIds])]
        : previous.filter((id) => !visibleIds.includes(id))
    );
  };

  const summaryCards = useMemo(() => {
    const done = jobs.filter((job) => job.status === 'Archived & deleted');
    return [
      {
        label: 'Records Archived',
        value: formatNumber(done.reduce((sum, job) => sum + job.records, 0)),
        description: `Across ${done.length} completed job${done.length === 1 ? '' : 's'}`,
        icon: '▤',
        color: 'blue',
      },
      {
        label: 'Data Storage Freed',
        value: '3.7 GB',
        description: 'SF_PROD data storage 68% → 61%',
        icon: '▣',
        color: 'green',
      },
      {
        label: 'File Storage Freed',
        value: '22.6 GB',
        description: 'SF_PROD file storage 91% → 74%',
        icon: '▤',
        color: 'blue',
      },
      {
        label: 'Stored in Cloud',
        value: '9.8 GB',
        description: 'Compressed · S3 7.1 GB · Azure 2.7 GB',
        icon: '☁',
        color: 'purple',
      },
    ];
  }, [jobs]);

  // Simulated archive run: export → verify → wait for delete approval.
  const runJob = (job) => {
    if (job.status === 'Running') return;
    const total = job.records || 25000 + Math.floor(Math.random() * 200000);
    const willFail = job.status === 'Verify failed' && Math.random() < 0.3;

    updateJob(job.id, { status: 'Running', progress: 0, phase: 'Exporting' });
    notify(`${job.id} started`, { message: `Archiving ${job.object} to ${job.destination}.` });

    let progress = 0;
    timers.current[job.id] = window.setInterval(() => {
      progress = Math.min(100, progress + 6 + Math.random() * 10);
      const phase = progress < 70 ? 'Exporting' : 'Verifying checksums';
      updateJob(job.id, { progress: Math.round(progress), phase });

      if (progress >= 100) {
        window.clearInterval(timers.current[job.id]);
        delete timers.current[job.id];

        if (willFail) {
          updateJob(job.id, { status: 'Verify failed', progress: undefined, lastRun: nowLabel() });
          notify(`${job.id}: verification failed`, {
            type: 'error',
            message: 'Row count in the archive did not match Salesforce. Nothing was deleted.',
          });
        } else {
          updateJob(job.id, {
            status: 'Delete pending',
            progress: undefined,
            records: total,
            lastRun: nowLabel(),
          });
          notify(`${job.id} archived & verified`, {
            type: 'success',
            message: `${formatNumber(total)} records verified. Approve the delete to free Salesforce storage.`,
            duration: 5500,
          });
        }
      }
    }, 450);
  };

  const confirmDelete = async (job) => {
    const ok = await confirm({
      title: `Delete ${formatNumber(job.records)} ${job.object} records from Salesforce?`,
      message: `The archive in ${job.destination} is verified. Records will be hard-deleted from SF_PROD and can only be brought back with "Restore from archive".`,
      confirmLabel: 'Delete from Salesforce',
      danger: true,
    });
    if (!ok) return;
    updateJob(job.id, { status: 'Archived & deleted', lastRun: nowLabel() });
    notify(`${job.id} completed`, {
      type: 'success',
      message: `${formatNumber(job.records)} records removed from Salesforce.`,
    });
  };

  const removeJob = async (job) => {
    const ok = await confirm({
      title: `Remove ${job.id}?`,
      message: 'The job definition is removed. Files already in the archive are kept.',
      confirmLabel: 'Remove job',
      danger: true,
    });
    if (!ok) return;
    setJobs((previous) => previous.filter((item) => item.id !== job.id));
    setSelectedIds((previous) => previous.filter((id) => id !== job.id));
    notify(`${job.id} removed`);
  };

  const runSelected = () => {
    const runnable = jobs.filter(
      (job) => selectedIds.includes(job.id) && ['Ready to run', 'Verify failed'].includes(job.status)
    );
    if (!runnable.length) {
      notify('Nothing to run', {
        type: 'warning',
        message: 'Only jobs that are "Ready to run" or "Verify failed" can be started.',
      });
      return;
    }
    runnable.forEach(runJob);
    setSelectedIds([]);
  };

  const exportSelected = () => {
    const rows = jobs.filter((job) => selectedIds.includes(job.id));
    const header = ['Job', 'Object', 'Destination', 'Records', 'Last run', 'Status'];
    const csv = [header, ...rows.map((job) => [job.id, job.object, job.destination, job.records, job.lastRun, job.status])]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'archive-jobs.csv';
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${rows.length} job${rows.length === 1 ? '' : 's'}`, { type: 'success' });
  };

  const saveJob = (form) => {
    if (modal === 'edit') {
      updateJob(selectedJob.id, form);
      notify(`${selectedJob.id} updated`, { type: 'success' });
    } else {
      const base = `ARC_${form.object.split(/\s|\+/)[0].toUpperCase().replace(/__C$/, '')}_${form.retention}Y`;
      let id = base;
      let counter = 2;
      while (jobs.some((job) => job.id === id)) {
        id = `${base}_${counter}`;
        counter += 1;
      }
      setJobs((previous) => [
        {
          id,
          ...form,
          records: 0,
          dataFreed: '—',
          filesFreed: '—',
          lastRun: nowLabel(),
          status: 'Ready to run',
        },
        ...previous,
      ]);
      setSelectedJobId(id);
      notify(`${id} created`, { type: 'success', message: 'Open the ⋯ menu and choose "Run now" to start it.' });
    }
    setModal(null);
  };

  const restore = (job, count) => {
    setModal(null);
    notify(`Restoring ${formatNumber(count)} ${job.object} records`, {
      message: `Reading from ${job.destination}…`,
    });
    window.setTimeout(() => {
      notify('Restore complete', {
        type: 'success',
        message: `${formatNumber(count)} records re-inserted into SF_PROD.`,
      });
    }, 2500);
  };

  const testDestination = (item) => {
    setTestingDestination(item.alias);
    window.setTimeout(() => {
      setTestingDestination(null);
      notify(`${item.alias} is reachable`, {
        type: 'success',
        message: 'Write, read and delete test object succeeded.',
      });
    }, 1200);
  };

  return (
    <div className="archival-page">
      <header className="archival-topbar">
        <div className="archival-search">
          <span>⌕</span>
          <input
            type="search"
            placeholder="Search archive jobs..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="archival-user">
          <span className="archival-bell">♧</span>
          <span className="archival-avatar">S</span>
          <strong>Shiva Kesava</strong>
          <span>⌄</span>
        </div>
      </header>

      <section className="archival-heading">
        <div>
          <h1>Archive jobs</h1>
          <p>
            Records and files go to AWS S3 or Azure Blob. Salesforce data
            is deleted only after the archive is verified.
          </p>
        </div>
        <div className="archival-heading-actions">
          <button type="button" className="archive-secondary-button" onClick={() => setModal('restore')}>
            Restore from archive
          </button>
          <button type="button" className="archive-primary-button" onClick={() => setModal('new')}>
            New archive job
          </button>
        </div>
      </section>

      <section className="archival-summary">
        {summaryCards.map((card) => (
          <article className="archival-summary-card" key={card.label}>
            <span className={`archival-summary-icon ${card.color}`}>
              {card.icon}
            </span>
            <div>
              <p>{card.label}</p>
              <h2>{card.value}</h2>
              <small>{card.description}</small>
            </div>
          </article>
        ))}
      </section>

      <section className="archival-workspace">
        <div className="archival-jobs-panel">
          <div className="archival-table-toolbar">
            <h2>Archive jobs <span>({jobs.length})</span></h2>

            <input
              type="search"
              placeholder="Search jobs..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              <option value="all">All destinations</option>
              <option value="AWS S3">AWS S3</option>
              <option value="Azure Blob">Azure Blob</option>
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="newest">Last run (newest)</option>
              <option value="oldest">Last run (oldest)</option>
            </select>
          </div>

          {selectedIds.length > 0 && (
            <div className="archive-bulk-bar">
              <strong>{selectedIds.length} selected</strong>
              <button type="button" onClick={runSelected}>▶ Run selected</button>
              <button type="button" onClick={exportSelected}>⇩ Export CSV</button>
              <button type="button" className="link" onClick={() => setSelectedIds([])}>Clear</button>
            </div>
          )}

          <div className="archival-table-scroll">
            <table className="archival-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all visible jobs"
                      checked={allVisibleSelected}
                      onChange={(event) => selectAllVisible(event.target.checked)}
                    />
                  </th>
                  <th>Job / Object</th>
                  <th>Destination</th>
                  <th>Records</th>
                  <th>Data Freed</th>
                  <th>Files Freed</th>
                  <th>Last Run</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className={job.id === selectedJob?.id ? 'archive-row-selected' : ''}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${job.id}`}
                        checked={selectedIds.includes(job.id)}
                        onChange={() => toggleSelectedJob(job.id)}
                      />
                    </td>
                    <td>
                      <strong>{job.id}</strong>
                      <small>{job.object}</small>
                    </td>
                    <td>
                      <span className="archive-destination">
                        {job.destination === 'AWS S3' ? '🟠' : '🔷'}{' '}
                        {job.destination}
                      </span>
                    </td>
                    <td>{job.records ? formatNumber(job.records) : '—'}</td>
                    <td>{job.dataFreed}</td>
                    <td>{job.filesFreed}</td>
                    <td>{job.lastRun}</td>
                    <td>
                      {job.status === 'Running' ? (
                        <div className="archive-running">
                          <span><Spinner /> {job.phase} · {job.progress}%</span>
                          <div className="archive-progress"><span style={{ width: `${job.progress}%` }} /></div>
                        </div>
                      ) : (
                        <span className={`archive-status ${statusClass(job.status)}`}>
                          {job.status}
                        </span>
                      )}
                    </td>
                    <td className="archive-menu-cell">
                      <button
                        type="button"
                        className="archive-row-menu"
                        aria-label={`Actions for ${job.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuJobId(menuJobId === job.id ? null : job.id);
                        }}
                      >
                        ⋯
                      </button>
                      {menuJobId === job.id && (
                        <RowMenu
                          job={job}
                          onClose={closeMenu}
                          onView={() => { setSelectedJobId(job.id); closeMenu(); }}
                          onRun={() => { runJob(job); closeMenu(); }}
                          onConfirmDelete={() => { closeMenu(); confirmDelete(job); }}
                          onEdit={() => { setSelectedJobId(job.id); setModal('edit'); closeMenu(); }}
                          onRemove={() => { closeMenu(); removeJob(job); }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="archive-empty">
                      No archive jobs match your filters.{' '}
                      <button
                        type="button"
                        onClick={() => { setSearch(''); setDestination('all'); setStatus('all'); }}
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="archival-table-footer">
            Showing {filteredJobs.length} of {jobs.length} jobs
            <div>
              <button type="button" disabled>‹</button>
              <button type="button" className="archive-page-active">1</button>
              <button type="button" disabled>›</button>
            </div>
          </footer>
        </div>

        <aside className="archival-details-column">
          {selectedJob && (
            <section className="archival-detail-card" key={selectedJob.id}>
              <div className="archival-detail-heading">
                <h2>Job details</h2>
                <div className="archive-detail-actions">
                  {['Ready to run', 'Verify failed'].includes(selectedJob.status) && (
                    <button type="button" className="archive-primary-button" onClick={() => runJob(selectedJob)}>
                      ▶ Run now
                    </button>
                  )}
                  {selectedJob.status === 'Delete pending' && (
                    <button type="button" className="archive-primary-button" onClick={() => confirmDelete(selectedJob)}>
                      Approve delete
                    </button>
                  )}
                  <button
                    type="button"
                    className="archive-secondary-button"
                    onClick={() => setModal('edit')}
                    disabled={selectedJob.status === 'Running'}
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="archival-detail-title">
                <strong>{selectedJob.id}</strong>
                <span className={`archive-status ${statusClass(selectedJob.status)}`}>
                  {selectedJob.status === 'Running' ? `${selectedJob.phase} · ${selectedJob.progress}%` : selectedJob.status}
                </span>
              </div>
              <dl className="archival-detail-list">
                <div><dt>Object org</dt><dd>{selectedJob.object} · SF_PROD</dd></div>
                <div><dt>Criteria</dt><dd>{selectedJob.criteria}</dd></div>
                <div><dt>Destination</dt><dd className="archive-link">{destinationPath(selectedJob)}</dd></div>
                <div><dt>Format</dt><dd>Parquet (snappy) + manifest.json</dd></div>
                <div>
                  <dt>Encryption</dt>
                  <dd>{selectedJob.destination === 'AWS S3' ? 'SSE-KMS · alias/sf-archive' : 'Microsoft-managed keys'}</dd>
                </div>
                <div>
                  <dt>Storage tier</dt>
                  <dd>{selectedJob.destination === 'AWS S3' ? 'Standard → Glacier IR after 30 days' : 'Cool → Archive after 90 days'}</dd>
                </div>
                <div><dt>Retention</dt><dd>Object Lock · {selectedJob.retention} years</dd></div>
                <div><dt>Verification</dt><dd>Row count + SHA-256 per file</dd></div>
                <div><dt>Delete mode</dt><dd>Hard delete · after verify</dd></div>
              </dl>
            </section>
          )}

          <section className="archival-detail-card">
            <h2>Archive destinations</h2>
            {destinations.map((item) => (
              <div className="archival-destination-row" key={item.alias}>
                <span className={`destination-logo ${item.className || ''}`}>{item.logo}</span>
                <div><strong>{item.alias}</strong><small>{item.detail}</small></div>
                <span className="destination-ok">
                  {testingDestination === item.alias ? <Spinner /> : 'OK'}
                </span>
                <button
                  type="button"
                  className="archive-row-menu"
                  title="Test destination"
                  aria-label={`Test ${item.alias}`}
                  disabled={testingDestination === item.alias}
                  onClick={() => testDestination(item)}
                >
                  ↻
                </button>
              </div>
            ))}
            <a
              href="#connections"
              className="archival-manage-link"
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.('Connections');
              }}
            >
              Manage in Connections ↗
            </a>
          </section>
        </aside>
      </section>

      {(modal === 'new' || modal === 'edit') && (
        <JobFormModal
          job={modal === 'edit' ? selectedJob : null}
          onClose={() => setModal(null)}
          onSave={saveJob}
        />
      )}

      {modal === 'restore' && (
        <RestoreModal jobs={jobs} onClose={() => setModal(null)} onRestore={restore} />
      )}
    </div>
  );
}
