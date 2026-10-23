
import { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Spinner } from './ui/Feedback';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
import JobLibraryHeader from './JobLibraryHeader';
import JobLibraryFilters from './JobLibraryFilters';
import JobLibraryDetails from './JobLibraryDetails';

const initialJobs = [
  {
    id: 1,
    name: 'MIG_ACCOUNT_LEGACY',
    description: 'Account migration',
    type: 'Migration',
    object: 'Account',
    version: 'v7',
    lastRun: 'UAT · 09:58',
    lastRunDate: '12 Sep 2026',
    result: '18 failed',
    resultType: 'error',
  },
  {
    id: 2,
    name: 'MIG_CONTACT_LEGACY',
    description: 'Contact migration',
    type: 'Migration',
    object: 'Contact',
    version: 'v4',
    lastRun: 'UAT · yesterday',
    lastRunDate: '',
    result: '402,113 ok',
    resultType: 'success',
  },
  {
    id: 3,
    name: 'MIG_OPPTY_ERP',
    description: 'Opportunity migration',
    type: 'Migration',
    object: 'Opportunity',
    version: 'v2',
    lastRun: 'QA · 3 days ago',
    lastRunDate: '',
    result: 'Source unreachable',
    resultType: 'error',
  },
  {
    id: 4,
    name: 'ARC_CASE_CLOSED_3Y',
    description: 'Archive old cases',
    type: 'Archival',
    object: 'Case',
    version: 'v3',
    lastRun: 'Validated only',
    lastRunDate: '',
    result: 'Not run',
    resultType: 'neutral',
  },
  {
    id: 5,
    name: 'ARC_TASK_5Y',
    description: 'Archive old tasks',
    type: 'Archival',
    object: 'Task',
    version: 'v1',
    lastRun: 'PROD · 12 Sep',
    lastRunDate: '',
    result: 'Archived & verified',
    resultType: 'success',
  },
  {
    id: 6,
    name: 'EXT_CASE_FILES_2023',
    description: 'Extract case files',
    type: 'Files',
    object: 'ContentVersion',
    version: 'v1',
    lastRun: 'PROD · 20 Sep',
    lastRunDate: '',
    result: '8,902 files',
    resultType: 'info',
  },
  {
    id: 7,
    name: 'MIG_CONTRACT_PDFS',
    description: 'Extract contract PDFs',
    type: 'Files',
    object: 'ContentVersion',
    version: 'v2',
    lastRun: 'UAT · 21 Sep',
    lastRunDate: '',
    result: '14 unmatched',
    resultType: 'warning',
  },
  {
    id: 8,
    name: 'PRF_CUSTOMERS',
    description: 'Profile customers',
    type: 'Profile',
    object: 'customers',
    version: 'v1',
    lastRun: 'today · 09:42',
    lastRunDate: '',
    result: 'Complete',
    resultType: 'success',
  },
  {
    id: 9,
    name: 'MIG_ACCOUNT_NEW',
    description: 'New account migration',
    type: 'Migration',
    object: 'Account',
    version: 'v1',
    lastRun: 'Not run',
    lastRunDate: '',
    result: 'Not run',
    resultType: 'neutral',
  },
];

const jobTypes = ['Migration', 'Archival', 'Files', 'Profile'];
const profiles = ['DEV01', 'QA', 'UAT', 'PROD'];
const typePrefix = { Migration: 'MIG', Archival: 'ARC', Files: 'EXT', Profile: 'PRF' };

// Simulated result for a run, by job type.
function simulateRun(job, profile) {
  if (job.name === 'MIG_OPPTY_ERP') return { result: 'Source unreachable', resultType: 'error' };
  const rows = 500 + Math.floor(Math.random() * 300000);
  if (job.type === 'Archival') return { result: 'Archived & verified', resultType: 'success' };
  if (job.type === 'Files') {
    const unmatched = Math.random() < 0.4 ? Math.floor(Math.random() * 20) + 1 : 0;
    return unmatched
      ? { result: `${unmatched} unmatched`, resultType: 'warning' }
      : { result: `${rows.toLocaleString('en-US')} files`, resultType: 'info' };
  }
  if (job.type === 'Profile') return { result: 'Complete', resultType: 'success' };
  const failed = profile === 'PROD' ? 0 : Math.random() < 0.35 ? Math.floor(Math.random() * 40) + 1 : 0;
  return failed
    ? { result: `${failed} failed`, resultType: 'error' }
    : { result: `${rows.toLocaleString('en-US')} ok`, resultType: 'success' };
}

const bumpVersion = (version) => version.replace(/\d+/, (n) => Number(n) + 1);

function JobFormModal({ job, onClose, onSave }) {
  const [form, setForm] = useState({
    name: job?.name || '',
    type: job?.type || 'Migration',
    object: job?.object || '',
    description: job?.description || '',
  });
  const [error, setError] = useState('');
  const set = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setError('');
  };

  const suggestedName = `${typePrefix[form.type]}_${(form.object || 'OBJECT').toUpperCase().replace(/\W+/g, '_')}`;

  const submit = () => {
    if (!form.object.trim()) return setError('Object is required.');
    onSave({ ...form, name: (form.name.trim() || suggestedName).toUpperCase().replace(/\s+/g, '_') });
  };

  return (
    <Modal
      title={job ? `Edit ${job.name}` : 'New job'}
      subtitle={job ? `Saving creates ${bumpVersion(job.version)}.` : 'Jobs are portable: connections come from the run profile.'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ui-button secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="ui-button primary" onClick={submit}>{job ? 'Save new version' : 'Create job'}</button>
        </>
      }
    >
      <div className="ui-field">
        <span>Job type</span>
        <div className="job-type-picker">
          {jobTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={form.type === type ? 'active' : ''}
              disabled={Boolean(job)}
              onClick={() => setForm((previous) => ({ ...previous, type }))}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="ui-field-grid">
        <label className="ui-field">
          <span>Object *</span>
          <input value={form.object} onChange={set('object')} placeholder="e.g. Account" />
        </label>
        <label className="ui-field">
          <span>Job name</span>
          <input value={form.name} onChange={set('name')} placeholder={suggestedName} />
        </label>
      </div>
      <label className="ui-field">
        <span>Description</span>
        <input value={form.description} onChange={set('description')} placeholder="What does this job do?" />
      </label>
      {error && <p className="ui-field-error">{error}</p>}
    </Modal>
  );
}

function RunProfileModal({ job, onClose, onRun }) {
  const [profile, setProfile] = useState('UAT');
  const [batchSize, setBatchSize] = useState('10000');
  const [validateOnly, setValidateOnly] = useState(false);

  return (
    <Modal
      size="small"
      title={`Run ${job.name}`}
      subtitle="The profile supplies the source and target connections."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ui-button secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={`ui-button ${profile === 'PROD' && !validateOnly ? 'danger' : 'primary'}`}
            onClick={() => onRun(profile, { batchSize, validateOnly })}
          >
            {validateOnly ? 'Validate' : `Run in ${profile}`}
          </button>
        </>
      }
    >
      <div className="ui-field">
        <span>Profile</span>
        <div className="job-type-picker">
          {profiles.map((item) => (
            <button key={item} type="button" className={profile === item ? 'active' : ''} onClick={() => setProfile(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      <label className="ui-field">
        <span>Batch size</span>
        <select value={batchSize} onChange={(event) => setBatchSize(event.target.value)}>
          {['2000', '5000', '10000'].map((size) => <option key={size} value={size}>{Number(size).toLocaleString('en-US')} rows</option>)}
        </select>
      </label>
      <label className="job-checkbox-line">
        <input type="checkbox" checked={validateOnly} onChange={(event) => setValidateOnly(event.target.checked)} />
        Validate only (no records written)
      </label>
      {profile === 'PROD' && !validateOnly && (
        <p className="ui-field-error">This writes to SF_PROD.</p>
      )}
    </Modal>
  );
}

function RowMenu({ job, onClose, onView, onEdit, onRun, onDuplicate, onDelete }) {
  useCloseOnOutsideClick(true, onClose);
  const running = job.result === 'Running…';
  return (
    <div className="job-row-menu ui-popup-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onView}>View details</button>
      <button type="button" onClick={onEdit} disabled={running}>Edit job</button>
      <button type="button" onClick={onRun} disabled={running}>Run job</button>
      <button type="button" onClick={onDuplicate}>Duplicate</button>
      <button type="button" className="danger" onClick={onDelete} disabled={running}>Delete</button>
    </div>
  );
}

export default function JobLibrary() {
  const { notify, confirm } = useFeedback();
  const [jobs, setJobs] = useState(initialJobs);
  const [modal, setModal] = useState(null); // { type: 'new' | 'edit' | 'run', job? }
  const [resultFilter, setResultFilter] = useState('all');
  const [flashId, setFlashId] = useState(null);
  const importRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(1);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 8;

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesFilter =
        (activeFilter === 'All' || job.type === activeFilter) &&
        (resultFilter === 'all' || job.resultType === resultFilter);

      const matchesSearch = [
        job.name,
        job.description,
        job.type,
        job.object,
        job.version,
        job.lastRun,
        job.result,
      ].some((value) => value.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [jobs, activeFilter, resultFilter, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredJobs.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleJobs = filteredJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) ||
    visibleJobs[0] ||
    filteredJobs[0];

  const changeFilter = (filter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  const updateJob = (id, changes) =>
    setJobs((previous) => previous.map((job) => (job.id === id ? { ...job, ...changes } : job)));

  const focusJob = (id) => {
    setSelectedJobId(id);
    setFlashId(id);
    window.setTimeout(() => setFlashId(null), 1600);
  };

  const nextId = () => Math.max(0, ...jobs.map((job) => job.id)) + 1;

  const runJob = (job, profile = 'UAT', { validateOnly = false } = {}) => {
    setModal(null);
    updateJob(job.id, { result: 'Running…', resultType: 'info', lastRun: `${profile} · now`, lastRunDate: '' });
    focusJob(job.id);
    notify(`${job.name} started`, { message: `${validateOnly ? 'Validating' : 'Running'} with the ${profile} profile.` });

    window.setTimeout(() => {
      const outcome = validateOnly
        ? { result: 'Validated', resultType: 'success' }
        : simulateRun(job, profile);
      updateJob(job.id, { ...outcome, lastRun: `${profile} · just now` });
      notify(`${job.name}: ${outcome.result}`, {
        type: outcome.resultType === 'error' ? 'error' : outcome.resultType === 'warning' ? 'warning' : 'success',
        message: `${profile} profile${validateOnly ? ' · validate only' : ''}.`,
      });
    }, 1600 + Math.random() * 1600);
  };

  const saveJob = (form) => {
    if (modal.type === 'edit') {
      const version = bumpVersion(modal.job.version);
      updateJob(modal.job.id, { ...form, version });
      focusJob(modal.job.id);
      notify(`${form.name} saved as ${version}`, { type: 'success' });
    } else {
      if (jobs.some((job) => job.name === form.name)) {
        notify(`${form.name} already exists`, { type: 'error', message: 'Choose another job name.' });
        return;
      }
      const id = nextId();
      setJobs((previous) => [
        {
          id,
          ...form,
          description: form.description || `${form.type} job for ${form.object}`,
          version: 'v1',
          lastRun: 'Not run',
          lastRunDate: '',
          result: 'Not run',
          resultType: 'neutral',
        },
        ...previous,
      ]);
      setActiveFilter('All');
      setResultFilter('all');
      setSearch('');
      setPage(1);
      focusJob(id);
      notify(`${form.name} created`, { type: 'success', message: 'Use "Run with profile…" to try it.' });
    }
    setModal(null);
  };

  const duplicateJob = (job) => {
    let name = `${job.name}_COPY`;
    let counter = 2;
    while (jobs.some((item) => item.name === name)) {
      name = `${job.name}_COPY${counter}`;
      counter += 1;
    }
    const id = nextId();
    setJobs((previous) => {
      const index = previous.findIndex((item) => item.id === job.id);
      const next = [...previous];
      next.splice(index + 1, 0, { ...job, id, name, version: 'v1', lastRun: 'Not run', lastRunDate: '', result: 'Not run', resultType: 'neutral' });
      return next;
    });
    focusJob(id);
    notify(`Duplicated as ${name}`, { type: 'success' });
  };

  const deleteJob = async (job) => {
    const ok = await confirm({
      title: `Delete ${job.name}?`,
      message: 'All versions of this job definition are removed. Run history is kept.',
      confirmLabel: 'Delete job',
      danger: true,
    });
    if (!ok) return;
    setJobs((previous) => previous.filter((item) => item.id !== job.id));
    notify(`${job.name} deleted`);
  };

  const importJobs = async (file) => {
    try {
      const text = await file.text();
      let imported = [];
      if (file.name.toLowerCase().endsWith('.xml')) {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        imported = [...doc.querySelectorAll('job')].map((node) => ({
          name: node.getAttribute('name'),
          type: (node.getAttribute('type') || 'migration').replace(/^./, (c) => c.toUpperCase()),
          object: node.querySelector('target')?.getAttribute('object') || '—',
        }));
      } else {
        const parsed = JSON.parse(text);
        imported = (Array.isArray(parsed) ? parsed : [parsed]).map((item) => ({
          name: item.job || item.name,
          type: (item.type || 'migration').replace(/^./, (c) => c.toUpperCase()),
          object: item.target?.object || item.object || '—',
        }));
      }
      imported = imported.filter((item) => item.name && !jobs.some((job) => job.name === item.name));
      if (!imported.length) {
        notify('No new jobs found', { type: 'warning', message: 'The file has no job definitions, or they already exist.' });
        return;
      }
      let id = nextId();
      setJobs((previous) => [
        ...imported.map((item) => ({
          id: id++,
          ...item,
          type: jobTypes.includes(item.type) ? item.type : 'Migration',
          description: `Imported from ${file.name}`,
          version: 'v1',
          lastRun: 'Not run',
          lastRunDate: '',
          result: 'Not run',
          resultType: 'neutral',
        })),
        ...previous,
      ]);
      notify(`Imported ${imported.length} job${imported.length === 1 ? '' : 's'}`, { type: 'success', message: file.name });
    } catch {
      notify('Could not read file', { type: 'error', message: 'Choose a valid job JSON or XML file.' });
    }
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedJobId(visibleJobs[0]?.id ?? null);
    } else {
      setSelectedJobId(null);
    }
  };

  return (
    <div className="job-library-page">
      <input
        ref={importRef}
        type="file"
        accept=".json,.xml,application/json,application/xml"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importJobs(file);
          event.target.value = '';
        }}
      />
      <JobLibraryHeader
        onImport={() => importRef.current?.click()}
        onNewJob={() => setModal({ type: 'new' })}
      />

      <div className="job-library-content">
        <JobLibraryFilters
          activeFilter={activeFilter}
          setActiveFilter={changeFilter}
          search={search}
          setSearch={changeSearch}
          resultFilter={resultFilter}
          setResultFilter={(value) => {
            setResultFilter(value);
            setPage(1);
          }}
          jobs={jobs}
        />

       <div className="job-library-workspace">
         <section className="job-library-table-card">
          <div className="job-library-table-scroll">
            <table className="job-library-table">
              <thead>
                <tr>
                  <th className="job-checkbox-column">
                    <input
                      type="checkbox"
                      aria-label="Select first job on this page"
                      checked={
                        visibleJobs.length > 0 &&
                        visibleJobs.some(
                          (job) => job.id === selectedJobId
                        )
                      }
                      onChange={(event) =>
                        toggleAll(event.target.checked)
                      }
                    />
                  </th>
                  <th>Job name <span>↕</span></th>
                  <th>Type</th>
                  <th>Object</th>
                  <th>Version</th>
                  <th>Last run <span>↕</span></th>
                  <th>Result <span>↕</span></th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleJobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`${selectedJob?.id === job.id ? 'job-selected-row' : ''} ${flashId === job.id ? 'ui-row-flash' : ''}`}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${job.name}`}
                        checked={selectedJobId === job.id}
                        onChange={() => setSelectedJobId(job.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>

                    <td>
                      <div className="job-name-cell">
                        <strong>{job.name}</strong>
                        <span>{job.description}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`job-type-icon ${job.type.toLowerCase()}`}>
                        {job.type === 'Migration'
                          ? '⇄'
                          : job.type === 'Archival'
                            ? '▣'
                            : job.type === 'Files'
                              ? '▯'
                              : '▥'}
                      </span>
                      <span className="job-type-label">{job.type}</span>
                    </td>

                    <td>{job.object}</td>
                    <td>{job.version}</td>

                    <td>
                      <div className="job-last-run">
                        <span>{job.lastRun}</span>
                        {job.lastRunDate && (
                          <small>{job.lastRunDate}</small>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`job-result-badge ${job.resultType}`}
                      >
                        {job.result === 'Running…' && <Spinner />} {job.result}
                      </span>
                    </td>

                    <td className="job-actions-cell">
                      <button
                        type="button"
                        className="job-row-menu-button"
                        aria-label={`Actions for ${job.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId(
                            openMenuId === job.id ? null : job.id
                          );
                        }}
                      >
                        ⋯
                      </button>

                      {openMenuId === job.id && (
                        <RowMenu
                          job={job}
                          onClose={closeMenu}
                          onView={() => { setSelectedJobId(job.id); closeMenu(); }}
                          onEdit={() => { closeMenu(); setModal({ type: 'edit', job }); }}
                          onRun={() => { closeMenu(); setModal({ type: 'run', job }); }}
                          onDuplicate={() => { closeMenu(); duplicateJob(job); }}
                          onDelete={() => { closeMenu(); deleteJob(job); }}
                        />
                      )}
                    </td>
                  </tr>
                ))}

                {visibleJobs.length === 0 && (
                  <tr>
                    <td colSpan="8" className="job-empty-state">
                      No jobs found. Try another category or search term.{' '}
                      <button
                        type="button"
                        className="job-clear-filters"
                        onClick={() => {
                          changeFilter('All');
                          changeSearch('');
                          setResultFilter('all');
                        }}
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="job-library-pagination">
            <span>
              Showing{' '}
              {filteredJobs.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
              –
              {Math.min(currentPage * pageSize, filteredJobs.length)} of{' '}
              {filteredJobs.length} jobs
            </span>

            <div className="job-pagination-controls">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Previous page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index + 1}
                  type="button"
                  className={
                    currentPage === index + 1 ? 'current-page' : ''
                  }
                  onClick={() => setPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Next page"
              >
                ›
              </button>
           
            </div>
          </div>
          </section>

          <JobLibraryDetails
            key={selectedJob?.id}
            job={selectedJob}
            onRunWithProfile={(job) => setModal({ type: 'run', job })}
          />
        </div>
      </div>

      {(modal?.type === 'new' || modal?.type === 'edit') && (
        <JobFormModal job={modal.job} onClose={() => setModal(null)} onSave={saveJob} />
      )}

      {modal?.type === 'run' && (
        <RunProfileModal
          job={modal.job}
          onClose={() => setModal(null)}
          onRun={(profile, options) => runJob(modal.job, profile, options)}
        />
      )}

    </div>
  );
}
