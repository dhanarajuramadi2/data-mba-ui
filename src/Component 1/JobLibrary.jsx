
import { useMemo, useState } from 'react';
import JobLibraryHeader from './JobLibraryHeader';
import JobLibraryFilters from './JobLibraryFilters';
import JobLibraryDetails from './JobLibraryDetails';

const jobs = [
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

export default function JobLibrary() {
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
        activeFilter === 'All' || job.type === activeFilter;

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
  }, [activeFilter, search]);

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

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedJobId(visibleJobs[0]?.id ?? null);
    } else {
      setSelectedJobId(null);
    }
  };

  return (
    <div className="job-library-page">
      <JobLibraryHeader
        onImport={() => alert('Import XML / JSON clicked')}
        onNewJob={() => alert('New job clicked')}
      />

      <div className="job-library-content">
        <JobLibraryFilters
          activeFilter={activeFilter}
          setActiveFilter={changeFilter}
          search={search}
          setSearch={changeSearch}
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
                    className={
                      selectedJob?.id === job.id
                        ? 'job-selected-row'
                        : ''
                    }
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
                        {job.result}
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
                        <div className="job-row-menu">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedJobId(job.id);
                              setOpenMenuId(null);
                            }}
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(null);
                              alert(`Edit ${job.name}`);
                            }}
                          >
                            Edit job
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(null);
                              alert(`Run ${job.name}`);
                            }}
                          >
                            Run job
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {visibleJobs.length === 0 && (
                  <tr>
                    <td colSpan="8" className="job-empty-state">
                      No jobs found. Try another category or search term.
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

          <JobLibraryDetails job={selectedJob} />
        </div>
      </div>

    </div>
  );
}
