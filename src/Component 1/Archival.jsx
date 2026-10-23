
import { useMemo, useState } from 'react';
import './Archival.css';

const archiveJobs = [
  {
    id: 'ARC_TASK_5Y',
    object: 'Task',
    destination: 'AWS S3',
    records: '1,204,330',
    dataFreed: '2.3 GB',
    filesFreed: '—',
    lastRun: '12 Sep 2026, 10:24',
    status: 'Archived & deleted',
  },
  {
    id: 'ARC_EMAIL_4Y',
    object: 'EmailMessage',
    destination: 'Azure Blob',
    records: '688,902',
    dataFreed: '1.4 GB',
    filesFreed: '18.9 GB',
    lastRun: '2 Sep 2026, 08:11',
    status: 'Archived & deleted',
  },
  {
    id: 'ARC_OPP_LOST_5Y',
    object: 'Opportunity',
    destination: 'AWS S3',
    records: '16,102',
    dataFreed: '0.03 GB',
    filesFreed: '3.7 GB',
    lastRun: '20 Aug 2026, 14:50',
    status: 'Archived & deleted',
  },
  {
    id: 'ARC_LEAD_OLD',
    object: 'Lead',
    destination: 'Azure Blob',
    records: '96,410',
    dataFreed: '0.19 GB',
    filesFreed: '—',
    lastRun: '28 Aug 2026, 11:03',
    status: 'Delete pending',
  },
  {
    id: 'ARC_CASE_CLOSED_3Y',
    object: 'Case + 3 child objects',
    destination: 'AWS S3',
    records: '412,806',
    dataFreed: '1.6 GB',
    filesFreed: '38.6 GB',
    lastRun: '15 Aug 2026, 09:42',
    status: 'Ready to run',
  },
  {
    id: 'ARC_LOG_2022',
    object: 'Integration_Log__c',
    destination: 'AWS S3',
    records: '0',
    dataFreed: '—',
    filesFreed: '—',
    lastRun: '14 Aug 2026, 16:20',
    status: 'Verify failed',
  },
];

const summaryCards = [
  {
    label: 'Records Archived',
    value: '2,005,744',
    description: 'Across 4 completed jobs',
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

export default function Archival() {
  const [search, setSearch] = useState('');
  const [destination, setDestination] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedIds, setSelectedIds] = useState(['ARC_TASK_5Y']);
  const [selectedJobId, setSelectedJobId] = useState('ARC_TASK_5Y');

  const filteredJobs = useMemo(() => {
    return archiveJobs
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
    }, [search, destination, status, sortOrder]);

    const selectedJob =
        archiveJobs.find((job) => job.id === selectedJobId) || archiveJobs[0];

    const toggleSelectedJob = (jobId) => {
        setSelectedIds((previous) =>
        previous.includes(jobId)
            ? previous.filter((id) => id !== jobId)
            : [...previous, jobId]
        );
        setSelectedJobId(jobId);
    };

    const selectAllVisible = (checked) => {
        setSelectedIds((previous) => {
        const visibleIds = filteredJobs.map((job) => job.id);

        return checked
            ? [...new Set([...previous, ...visibleIds])]
            : previous.filter((id) => !visibleIds.includes(id));
        });
    };

    return (
    <div className="archival-page">
      <header className="archival-topbar">
        <div className="archival-search">
          <span>⌕</span>
          <input
            type="search"
            placeholder="Search jobs, connections, migration plans..."
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
          <button type="button" className="archive-secondary-button">
            Restore from archive
          </button>
          <button type="button" className="archive-primary-button">
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
            <h2>Archive jobs <span>(6)</span></h2>
           
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
            <option value="Archived & deleted">Archived &amp; deleted</option>
            <option value="Delete pending">Delete pending</option>
            <option value="Ready to run">Ready to run</option>
            <option value="Verify failed">Verify failed</option>
            </select>
            <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            >
            <option value="newest">Last run (newest)</option>
            <option value="oldest">Last run (oldest)</option>
            </select>
          </div>

          <div className="archival-table-scroll">
            <table className="archival-table">
              <thead>
                <tr>
                  <th></th>
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
                  <tr key={job.id}>
                    <td>
                      <input type="checkbox" aria-label={`Select ${job.id}`} />
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
                    <td>{job.records}</td>
                    <td>{job.dataFreed}</td>
                    <td>{job.filesFreed}</td>
                    <td>{job.lastRun}</td>
                    <td>
                      <span
                        className={`archive-status ${job.status
                          .toLowerCase()
                          .replaceAll(' ', '-')
                          .replace('&', 'and')}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="archive-row-menu"
                        aria-label={`Actions for ${job.id}`}
                      >
                        ⋯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="archival-table-footer">
            Showing 1–6 of 6 jobs
            <div>
              <button type="button" disabled>‹</button>
              <button type="button" className="archive-page-active">1</button>
              <button type="button" disabled>›</button>
            </div>
          </footer>
        </div>

        <aside className="archival-details-column">
          <section className="archival-detail-card">
            <div className="archival-detail-heading">
              <h2>Job details</h2>
              <button type="button" className="archive-secondary-button">
                Edit
              </button>
            </div>
            <div className="archival-detail-title">
              <strong>ARC_TASK_5Y</strong>
              <span className="archive-status archived-and-deleted">
                Archived &amp; deleted
              </span>
            </div>
            <dl className="archival-detail-list">
              <div><dt>Object org</dt><dd>Task · SF_PROD</dd></div>
              <div><dt>Criteria</dt><dd>IsClosed = true AND ActivityDate &lt; LAST_N_YEARS:5</dd></div>
              <div><dt>Destination</dt><dd className="archive-link">s3://acme-sf-archive/Task/2026-09-12/</dd></div>
              <div><dt>Format</dt><dd>Parquet (snappy) + manifest.json</dd></div>
              <div><dt>Encryption</dt><dd>SSE-KMS · alias/sf-archive</dd></div>
              <div><dt>Storage tier</dt><dd>Standard → Glacier IR after 30 days</dd></div>
              <div><dt>Retention</dt><dd>Object Lock · 7 years</dd></div>
              <div><dt>Verification</dt><dd>Row count + SHA-256 per file</dd></div>
              <div><dt>Delete mode</dt><dd>Hard delete · after verify</dd></div>
            </dl>
          </section>

          <section className="archival-detail-card">
            <h2>Archive destinations</h2>
            <div className="archival-destination-row">
              <span className="destination-logo">AWS</span>
              <div><strong>ARCHIVE_S3</strong><small>acme-sf-archive · eu-west-1 · IAM role</small></div>
              <span className="destination-ok">OK</span>
              <button type="button" className="archive-row-menu">⋮</button>
            </div>
            <div className="archival-destination-row">
              <span className="destination-logo azure">AZ</span>
              <div><strong>ARCHIVE_AZ</strong><small>acmearchive/sf-archive · Cool tier</small></div>
              <span className="destination-ok">OK</span>
              <button type="button" className="archive-row-menu">⋮</button>
            </div>
            <a href="#connections" className="archival-manage-link">
              Manage in Connections ↗
            </a>
          </section>
        </aside>
      </section>
    </div>
  );
}
