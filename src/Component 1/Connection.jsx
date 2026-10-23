
import { useState } from 'react';
import './Connection.css';

const summaryCards = [
  { icon: '▤', value: '10', label: 'Total connections', color: 'blue' },
  { icon: '✓', value: '7', label: 'Connected', color: 'green' },
  { icon: '⚠', value: '1', label: 'Attention needed', color: 'orange' },
  { icon: '▣', value: '2', label: 'Archive targets', color: 'purple' },
];

const connections = [
  {
    alias: 'SF_PROD',
    type: 'Salesforce',
    environment: 'Production',
    endpoint: 'acme.my.salesforce.com',
    auth: 'OAuth 2.0 JWT',
    status: 'Connected',
    category: 'Salesforce',
    icon: '☁',
    color: 'salesforce',
  },
  {
    alias: 'SF_UAT',
    type: 'Salesforce',
    environment: 'Full sandbox',
    endpoint: 'acme--uat.sandbox.my.salesforce.com',
    auth: 'OAuth web flow',
    status: 'Connected',
    category: 'Salesforce',
    icon: '☁',
    color: 'salesforce',
  },
  {
    alias: 'SF_QA',
    type: 'Salesforce',
    environment: 'Partial sandbox',
    endpoint: 'acme--qa.sandbox.my.salesforce.com',
    auth: 'OAuth web flow',
    status: 'Token expired',
    category: 'Salesforce',
    icon: '☁',
    color: 'salesforce',
  },
  {
    alias: 'SF_DEV01',
    type: 'Salesforce',
    environment: 'Developer sandbox',
    endpoint: 'acme--dev01.sandbox.my.salesforce.com',
    auth: 'OAuth web flow',
    status: 'Connected',
    category: 'Salesforce',
    icon: '☁',
    color: 'salesforce',
  },
  {
    alias: 'LEGACY_CRM_PG',
    type: 'PostgreSQL 15',
    environment: 'Source',
    endpoint: 'pg-legacy.internal:5432/crm',
    auth: 'User / password',
    status: 'Connected',
    category: 'Database',
    icon: '🐘',
    color: 'postgres',
  },
  {
    alias: 'ERP_ORACLE',
    type: 'Oracle 19c',
    environment: 'Source',
    endpoint: 'erp-db:1521/ORCLPDB',
    auth: 'Oracle wallet',
    status: 'Unreachable',
    category: 'Database',
    icon: '▱',
    color: 'oracle',
  },
  {
    alias: 'DW_MSSQL',
    type: 'SQL Server 2022',
    environment: 'Source / archive',
    endpoint: 'dw.internal:1433/archive',
    auth: 'Windows auth',
    status: 'Connected',
    category: 'Database',
    icon: '▧',
    color: 'mssql',
  },
  {
    alias: 'ARCHIVE_S3',
    type: 'AWS S3',
    environment: 'Archive target',
    endpoint: 's3://acme-sf-archive · eu-west-1',
    auth: 'IAM role',
    status: 'Connected',
    category: 'Cloud storage',
    icon: 'aws',
    color: 'aws',
  },
  {
    alias: 'ARCHIVE_AZ',
    type: 'Azure Blob',
    environment: 'Archive target',
    endpoint: 'acmearchive/sf-archive',
    auth: 'Managed identity',
    status: 'Connected',
    category: 'Cloud storage',
    icon: '▲',
    color: 'azure',
  },
  {
    alias: 'INBOUND_SHARE',
    type: 'File system',
    environment: 'Source',
    endpoint: '/Volumes/migration/inbound',
    auth: '—',
    status: 'CSV · XLSX',
    category: 'Files',
    icon: '♧',
    color: 'file',
  },
];

const filters = [
  { label: 'All', category: 'All' },
  { label: 'Salesforce', category: 'Salesforce' },
  { label: 'Database', category: 'Database' },
  { label: 'Cloud storage', category: 'Cloud storage' },
  { label: 'Files', category: 'Files' },
];

function SummaryCard({ icon, value, label, color }) {
  return (
    <div className={`summary-card ${color}`}>
      <div className="summary-icon">{icon}</div>
      <div className="summary-details">
        <h2>{value}</h2>
        <p>{label}</p>
      </div>
    </div>
  );
}

function ConnectionsHeader({ onNewConnection }) {
  return (
    <>
      <header className="connections-header">
        <div className="header-title">
          <h1>Connections</h1>
          <p>
            Manage credentials and endpoints used by migration
            and archival jobs.
          </p>
        </div>

        <div className="header-actions">
          <button className="button button-secondary">
            <span>⇧</span> Import from file
          </button>

          <button className="button button-secondary">
            <span>▷</span> Test all
          </button>

          <button
          type="button"
          className="button button-primary"
          onClick={() => onNewConnection()}
        >
          <span>＋</span> New connection
        </button>
        </div>
      </header>

      <section className="summary-grid">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>
    </>
  );
}

function FilterBar({
  activeFilter,
  setActiveFilter,
  search,
  setSearch,
}) {
  return (
    <div className="filter-bar">
      <div className="filter-tabs">
        {filters.map((filter) => {
          const count =
            filter.category === 'All'
              ? connections.length
              : connections.filter(
                  (item) => item.category === filter.category
                ).length;

          return (
            <button
              key={filter.category}
              className={`filter-tab ${
                activeFilter === filter.category ? 'selected' : ''
              }`}
              onClick={() => setActiveFilter(filter.category)}
            >
              {filter.label}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="connection-search">
        <span>⌕</span>
        <input
          type="search"
          placeholder="Search connections..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search connections"
        />
      </div>
    </div>
  );
}

function EnvironmentBadge({ environment }) {
  const classes = {
    Production: 'production',
    'Full sandbox': 'full-sandbox',
    'Partial sandbox': 'partial-sandbox',
    'Developer sandbox': 'developer-sandbox',
    Source: 'source',
    'Source / archive': 'source',
    'Archive target': 'archive-target',
  };

  return (
    <span className={`environment-badge ${classes[environment] || ''}`}>
      {environment}
    </span>
  );
}

function StatusBadge({ status }) {
  let className = 'status-connected';

  if (status === 'Token expired') {
    className = 'status-warning';
  } else if (status === 'Unreachable') {
    className = 'status-error';
  }

  return (
    <span className={`status-badge ${className}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function ProviderIcon({ connection }) {
  if (connection.color === 'salesforce') {
    return <span className="provider-salesforce">☁</span>;
  }

  return (
    <span className={`provider-icon ${connection.color}`}>
      {connection.icon}
    </span>
  );
}

function ConnectionRow({
  connection,
  selected,
  onSelect,
  openMenu,
  setOpenMenu,
}) {
  return (
    <tr
      className={selected ? 'selected-row' : ''}
      onClick={onSelect}
    >
      <td>
        <div className="connection-alias">
          <ProviderIcon connection={connection} />
          <strong>{connection.alias}</strong>
        </div>
      </td>

      <td>{connection.type}</td>

      <td>
        <EnvironmentBadge environment={connection.environment} />
      </td>

      <td>
        <span className="endpoint-text">{connection.endpoint}</span>
      </td>

      <td>
        <span className="auth-text">{connection.auth}</span>
      </td>

      <td>
        <div className="status-cell">
          <StatusBadge status={connection.status} />

          {connection.status === 'Token expired' && (
            <button
              className="reauth-link"
              onClick={(event) => {
                event.stopPropagation();
                alert(
                  `Re-authentication requested for ${connection.alias}`
                );
              }}
            >
              Re-authenticate
            </button>
          )}
        </div>
      </td>

      <td className="row-menu-cell">
        <button
          className="row-menu-button"
          aria-label={`Actions for ${connection.alias}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpenMenu(
              openMenu === connection.alias
                ? null
                : connection.alias
            );
          }}
        >
          ⋮
        </button>

        {openMenu === connection.alias && (
          <div className="row-action-menu">
            <button
              onClick={() => {
                setOpenMenu(null);
                onSelect();
              }}
            >
              View details
            </button>

            <button
              onClick={() => {
                setOpenMenu(null);
                alert(`Test requested for ${connection.alias}`);
              }}
            >
              Test connection
            </button>

            <button
              onClick={() => {
                setOpenMenu(null);
                alert(`Edit ${connection.alias}`);
              }}
            >
              Edit connection
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function InfoBanner() {
  return (
    <div className="connection-info-banner">
      <span className="info-icon">i</span>

      <div>
        <p>
          Production connections require a confirmation step before any
          write, delete or archive job.
        </p>

        <span>
          Connection files exported for teammates never include tokens
          or passwords.
        </span>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  value,
  total,
  percentage,
  color = 'blue',
}) {
  return (
    <div className="usage-item">
      <div className="usage-heading">
        <span>{label}</span>

        {total ? (
          <span>
            {value} / {total}
          </span>
        ) : (
          <span>{percentage}%</span>
        )}
      </div>

      <div className="usage-progress">
        <div
          className={`usage-progress-fill ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PermissionItem({ label, passed }) {
  return (
    <div className="permission-item">
      <span className={`permission-badge ${passed ? 'pass' : 'missing'}`}>
        <span>{passed ? '✓' : '!'}</span>
        {passed ? 'Pass' : 'Missing'}
      </span>

      <span className="permission-label">{label}</span>
    </div>
  );
}

function SelectedConnectionPanel({ connection }) {
  if (!connection) {
    return (
      <aside className="details-panel">
        <h3>No connection selected</h3>
        <p>Select a connection from the table to view its details.</p>
      </aside>
    );
  }

  const isSalesforce = connection.type === 'Salesforce';
  const isConnected = connection.status === 'Connected';

  return (
    <aside className="details-panel">
      <div className="details-header">
        <div>
          <span className="details-eyebrow">SELECTED CONNECTION</span>

          <div className="details-identity">
            <ProviderIcon connection={connection} />

            <div>
              <h2>{connection.alias}</h2>
              <span className="details-type">{connection.type}</span>
            </div>
          </div>

          <div className="details-tags">
            <EnvironmentBadge environment={connection.environment} />
            <span className="api-version">API v62.0</span>
          </div>
        </div>

        <button
          className="panel-more-button"
          aria-label="More connection options"
          onClick={() => alert(`More options for ${connection.alias}`)}
        >
          ⋯
        </button>
      </div>

      <section className="details-section">
        <h3>Overview</h3>

        <div className="overview-grid">
          <div className="overview-item">
            <span>Type</span>
            <strong>{connection.type}</strong>
          </div>

          <div className="overview-item">
            <span>Environment</span>
            <strong>{connection.environment}</strong>
          </div>

          <div className="overview-item full-width">
            <span>Endpoint</span>
            <strong>{connection.endpoint}</strong>
          </div>

          <div className="overview-item">
            <span>Org ID</span>
            <strong>
              {isSalesforce ? '00D5j00000XyZ1' : 'Not applicable'}
            </strong>
          </div>

          <div className="overview-item">
            <span>Integration user</span>
            <strong>
              {isSalesforce
                ? 'mba.integration@acme.com.uat'
                : connection.auth}
            </strong>
          </div>
        </div>
      </section>

      <section className="details-section">
        <h3>Usage and limits</h3>

        <UsageBar
          label="Daily API requests"
          value="158,420"
          total="1,000,000"
          percentage={16}
        />

        <UsageBar
          label="Bulk API batches (24 h)"
          value="380"
          total="15,000"
          percentage={3}
        />

        <UsageBar
          label="Data storage"
          percentage={68}
        />

        <UsageBar
          label="File storage"
          percentage={91}
          color="orange"
        />
      </section>

      <section className="details-section permissions-section">
        <h3>Permission checks</h3>

        <PermissionItem label="API Enabled" passed={isSalesforce} />

        <PermissionItem
          label="View All / Modify All Data"
          passed={isSalesforce}
        />

        <PermissionItem
          label="Set Audit Fields on Creation"
          passed={false}
        />

        <PermissionItem
          label="Bulk API Hard Delete"
          passed={false}
        />
      </section>

      <div className="details-actions">
        <button
          className="button button-secondary"
          onClick={() => alert(`Testing ${connection.alias}`)}
        >
          ▷ Test
        </button>

        <button
          className="button button-secondary"
          onClick={() => alert(`Editing ${connection.alias}`)}
        >
          ✎ Edit
        </button>

        <button
          className="button button-secondary clone-button"
          onClick={() =>
            alert(`Clone ${connection.alias} to another org`)
          }
        >
          ▢ Clone to another org
        </button>
      </div>

      {!isConnected && (
        <p className="details-warning">
          This connection requires attention: {connection.status}.
        </p>
      )}
    </aside>
  );
}

export default function Connection({ onNewConnection }) {
  
function NewConnectionModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    project: 'Change Healthcare Acquisition',
    status: 'Active',
    name: '',
    orgType: 'Sandbox',
    connectionType: 'Source',
    username: '',
    password: '',
    securityToken: '',
  });

  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.username.trim() ||
      !form.password.trim()
    ) {
      setError(
        'Please enter the connection name, username, and password.'
      );
      return;
    }

    onSave(form);
  }

  return (
    <div
      className="connection-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="connection-modal"
        onSubmit={handleSubmit}
      >
        <header className="connection-modal-header">
          <h2>New Connection</h2>

          <button
            type="button"
            className="connection-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </header>

        <div className="connection-modal-body">
          <section className="connection-form-section">
            <h3>Connection Details</h3>

            <div className="connection-form-grid">
              <label className="connection-field">
                <span>Migration Project</span>
                <input
                  name="project"
                  value={form.project}
                  onChange={handleChange}
                  placeholder="Enter migration project name"
                />
              </label>

              <label className="connection-field">
                <span>Status</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label className="connection-field">
                <span>
                  Connection Name <b>*</b>
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter connection name"
                  required
                />
              </label>

              <label className="connection-field">
                <span>
                  Org Type <b>*</b>
                </span>
                <select
                  name="orgType"
                  value={form.orgType}
                  onChange={handleChange}
                  required
                >
                  <option value="Production">Production</option>
                  <option value="Sandbox">Sandbox</option>
                  <option value="Developer Sandbox">
                    Developer Sandbox
                  </option>
                  <option value="Partial Sandbox">
                    Partial Sandbox
                  </option>
                </select>
              </label>

              <label className="connection-field">
                <span>Connection Type</span>
                <select
                  name="connectionType"
                  value={form.connectionType}
                  onChange={handleChange}
                >
                  <option value="Source">Source</option>
                  <option value="Target">Target</option>
                  <option value="Source / Target">
                    Source / Target
                  </option>
                  <option value="Archive Target">
                    Archive Target
                  </option>
                </select>
              </label>
            </div>
          </section>

          <section className="connection-form-section">
            <h3>User Credentials</h3>

            <div className="connection-form-grid">
              <label className="connection-field">
                <span>
                  Username <b>*</b>
                </span>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </label>

              <label className="connection-field">
                <span>
                  Password <b>*</b>
                </span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="connection-field connection-field-full">
                <span>Security Token</span>
                <input
                  type="password"
                  name="securityToken"
                  value={form.securityToken}
                  onChange={handleChange}
                  placeholder="Enter security token (if required)"
                  autoComplete="off"
                />
              </label>
            </div>

            <p className="connection-credentials-note">
              Credentials should be securely stored by your backend.
              Do not include passwords or tokens in exported connection files.
            </p>

            {error && (
              <p role="alert" className="connection-form-error">
                {error}
              </p>
            )}
          </section>
        </div>

        <footer className="connection-modal-footer">
          <button
            type="button"
            className="connection-modal-cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="connection-modal-save"
          >
            Save Connection
          </button>
        </footer>
      </form>
    </div>
  );
}

  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAlias, setSelectedAlias] = useState('SF_UAT');
  const [openMenu, setOpenMenu] = useState(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  const filteredConnections = connections.filter((connection) => {
    const matchesFilter =
      activeFilter === 'All' ||
      connection.category === activeFilter;

    const searchText = search.toLowerCase().trim();

    const matchesSearch =
      !searchText ||
      [
        connection.alias,
        connection.type,
        connection.environment,
        connection.endpoint,
        connection.auth,
        connection.status,
      ].some((value) =>
        value.toLowerCase().includes(searchText)
      );

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="connections-page">
      <ConnectionsHeader
        onNewConnection={() => setShowConnectionModal(true)}
      />
      <FilterBar
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        search={search}
        setSearch={setSearch}
      />

      <div className="connections-workspace">
        <div className="connections-main-column">
          <section className="connections-table-section">
            <div className="table-scroll">
              <table className="connections-table">
                <thead>
                  <tr>
                    <th>ALIAS</th>
                    <th>TYPE</th>
                    <th>ENVIRONMENT</th>
                    <th>ENDPOINT</th>
                    <th>AUTHENTICATION</th>
                    <th>STATUS</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>

                <tbody>
                  {filteredConnections.map((connection) => (
                    <ConnectionRow
                      key={connection.alias}
                      connection={connection}
                      selected={selectedAlias === connection.alias}
                      onSelect={() =>
                        setSelectedAlias(connection.alias)
                      }
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                    />
                  ))}

                  {filteredConnections.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-table">
                        No connections found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <InfoBanner />
        </div>

        <SelectedConnectionPanel
          connection={connections.find(
            (item) => item.alias === selectedAlias
          )}
        />
            </div>

      {showConnectionModal && (
        <NewConnectionModal
          onClose={() => setShowConnectionModal(false)}
          onSave={(form) => {
            console.log('New connection submitted:', {
              ...form,
              password: '[REDACTED]',
              securityToken: '[REDACTED]',
            });

            setShowConnectionModal(false);
            alert(
              'Form validated. Backend integration is required to save the connection.'
            );
          }}
        />
      )}
    </div>
  );
}
