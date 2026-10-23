
import { useCallback, useRef, useState } from 'react';
import { Spinner } from './ui/Feedback';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
import './Connection.css';

const initialConnections = [
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


const orgTypeToEnvironment = {
  Production: 'Production',
  Sandbox: 'Full sandbox',
  'Developer Sandbox': 'Developer sandbox',
  'Partial Sandbox': 'Partial sandbox',
};

// Simulated test outcome until a backend exists: the Oracle source is down,
// expired tokens stay expired, everything else answers.
function simulateTestResult(connection) {
  if (connection.alias === 'ERP_ORACLE') return 'Unreachable';
  if (connection.status === 'Token expired') return 'Token expired';
  if (connection.category === 'Files') return connection.status;
  return 'Connected';
}

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

function ConnectionsHeader({
  connections,
  onNewConnection,
  onTestAll,
  testingAll,
  onImport,
}) {
  const fileInputRef = useRef(null);

  const summaryCards = [
    { icon: '▤', value: connections.length, label: 'Total connections', color: 'blue' },
    {
      icon: '✓',
      value: connections.filter((item) => item.status === 'Connected').length,
      label: 'Connected',
      color: 'green',
    },
    {
      icon: '⚠',
      value: connections.filter((item) =>
        ['Token expired', 'Unreachable'].includes(item.status)
      ).length,
      label: 'Attention needed',
      color: 'orange',
    },
    {
      icon: '▣',
      value: connections.filter((item) => item.environment === 'Archive target').length,
      label: 'Archive targets',
      color: 'purple',
    },
  ];

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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImport(file);
              event.target.value = '';
            }}
          />

          <button
            type="button"
            className="button button-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <span>⇧</span> Import from file
          </button>

          <button
            type="button"
            className="button button-secondary"
            onClick={onTestAll}
            disabled={testingAll}
          >
            {testingAll ? <Spinner /> : <span>▷</span>}
            {testingAll ? 'Testing…' : 'Test all'}
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
  connections,
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

function StatusBadge({ status, busy }) {
  if (busy) {
    return (
      <span className="status-badge status-testing">
        <Spinner />
        {busy}
      </span>
    );
  }

  let className = 'status-connected';

  if (status === 'Token expired') {
    className = 'status-warning';
  } else if (status === 'Unreachable') {
    className = 'status-error';
  } else if (status === 'Not tested') {
    className = 'status-neutral';
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
  flash,
  busy,
  onSelect,
  menuOpen,
  onToggleMenu,
  onTest,
  onEdit,
  onClone,
  onDelete,
  onReauth,
}) {
  return (
    <tr
      className={`${selected ? 'selected-row' : ''} ${flash ? 'ui-row-flash' : ''}`}
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
          <StatusBadge status={connection.status} busy={busy} />

          {connection.status === 'Token expired' && !busy && (
            <button
              className="reauth-link"
              onClick={(event) => {
                event.stopPropagation();
                onReauth();
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
            onToggleMenu();
          }}
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="row-action-menu ui-popup-menu">
            <button onClick={onSelect}>View details</button>
            <button onClick={onTest} disabled={Boolean(busy)}>
              Test connection
            </button>
            <button onClick={onEdit}>Edit connection</button>
            <button onClick={onClone}>Clone</button>
            <button className="row-action-danger" onClick={onDelete}>
              Delete
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

function SelectedConnectionPanel({
  connection,
  busy,
  lastTested,
  onTest,
  onEdit,
  onClone,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useCloseOnOutsideClick(menuOpen, closeMenu);

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

        <div className="panel-more-wrap">
          <button
            className="panel-more-button"
            aria-label="More connection options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="row-action-menu panel-more-menu ui-popup-menu">
              <button onClick={onEdit}>Edit connection</button>
              <button onClick={onClone}>Clone</button>
              <button className="row-action-danger" onClick={onDelete}>
                Delete
              </button>
            </div>
          )}
        </div>
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
          onClick={onTest}
          disabled={Boolean(busy)}
          title={lastTested ? `Last tested ${lastTested}` : 'Not tested in this session'}
        >
          {busy ? <Spinner /> : '▷'} {busy ? 'Testing…' : 'Test'}
        </button>

        <button
          className="button button-secondary"
          onClick={onEdit}
        >
          ✎ Edit
        </button>

        <button
          className="button button-secondary clone-button"
          onClick={onClone}
        >
          ▢ Clone to another org
        </button>
      </div>

      {!isConnected && !busy && (
        <p className="details-warning">
          This connection requires attention: {connection.status}.
        </p>
      )}
    </aside>
  );
}

function NewConnectionModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    project: 'Change Healthcare Acquisition',
    status: 'Active',
    name: initial?.alias || '',
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

    const credentialsMissing =
      !isEdit && (!form.username.trim() || !form.password.trim());

    if (!form.name.trim() || credentialsMissing) {
      setError(
        isEdit
          ? 'Please enter the connection name.'
          : 'Please enter the connection name, username, and password.'
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
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <form
        className="connection-modal"
        onSubmit={handleSubmit}
      >
        <header className="connection-modal-header">
          <h2>{isEdit ? `Edit ${initial.alias}` : 'New Connection'}</h2>

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
                  autoFocus
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
                  Username {!isEdit && <b>*</b>}
                </span>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Enter username'}
                  autoComplete="username"
                  required={!isEdit}
                />
              </label>

              <label className="connection-field">
                <span>
                  Password {!isEdit && <b>*</b>}
                </span>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                  autoComplete="new-password"
                  required={!isEdit}
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
            {isEdit ? 'Save changes' : 'Save & test connection'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Connection() {
  const { notify, confirm } = useFeedback();

  const [connections, setConnections] = useState(initialConnections);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAlias, setSelectedAlias] = useState('SF_UAT');
  const [openMenu, setOpenMenu] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', connection }
  const [busy, setBusy] = useState({}); // alias -> 'Testing…' | 'Signing in…'
  const [lastTested, setLastTested] = useState({});
  const [flashAlias, setFlashAlias] = useState(null);

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  useCloseOnOutsideClick(Boolean(openMenu), closeMenu);

  const updateConnection = (alias, changes) => {
    setConnections((previous) =>
      previous.map((item) => (item.alias === alias ? { ...item, ...changes } : item))
    );
  };

  const highlight = (alias) => {
    setSelectedAlias(alias);
    setFlashAlias(alias);
    window.setTimeout(() => setFlashAlias(null), 1600);
  };

  const runTest = (connection, { quiet = false } = {}) =>
    new Promise((resolve) => {
      setBusy((previous) => ({ ...previous, [connection.alias]: 'Testing…' }));

      window.setTimeout(() => {
        const result = simulateTestResult(connection);
        updateConnection(connection.alias, { status: result });
        setLastTested((previous) => ({ ...previous, [connection.alias]: `${timeNow()} · ${result}` }));
        setBusy((previous) => {
          const next = { ...previous };
          delete next[connection.alias];
          return next;
        });

        if (!quiet) {
          if (result === 'Unreachable') {
            notify(`${connection.alias} is unreachable`, {
              type: 'error',
              message: `Could not open a session to ${connection.endpoint}. Check the host, port and firewall.`,
            });
          } else if (result === 'Token expired') {
            notify(`${connection.alias}: token expired`, {
              type: 'warning',
              message: 'Re-authenticate to refresh the OAuth token.',
            });
          } else {
            notify(`${connection.alias} connected`, {
              type: 'success',
              message: `Responded in ${120 + Math.floor(Math.random() * 300)} ms.`,
            });
          }
        }

        resolve(result);
      }, 900 + Math.random() * 900);
    });

  const testAll = async () => {
    const results = await Promise.all(
      connections.map((connection) => runTest(connection, { quiet: true }))
    );
    const failed = results.filter((result) => ['Unreachable', 'Token expired'].includes(result)).length;

    notify(`Tested ${results.length} connections`, {
      type: failed ? 'warning' : 'success',
      message: failed
        ? `${results.length - failed} passed · ${failed} need attention.`
        : 'All connections responded.',
    });
  };

  const reauthenticate = (connection) => {
    setBusy((previous) => ({ ...previous, [connection.alias]: 'Signing in…' }));
    window.setTimeout(() => {
      updateConnection(connection.alias, { status: 'Connected' });
      setBusy((previous) => {
        const next = { ...previous };
        delete next[connection.alias];
        return next;
      });
      setLastTested((previous) => ({ ...previous, [connection.alias]: `${timeNow()} · Connected` }));
      notify(`${connection.alias} re-authenticated`, {
        type: 'success',
        message: 'A fresh OAuth token was issued.',
      });
    }, 1400);
  };

  const uniqueAlias = (base) => {
    let alias = base;
    let counter = 2;
    while (connections.some((item) => item.alias === alias)) {
      alias = `${base}_${counter}`;
      counter += 1;
    }
    return alias;
  };

  const cloneConnection = (connection) => {
    const alias = uniqueAlias(`${connection.alias}_COPY`);
    setConnections((previous) => {
      const index = previous.findIndex((item) => item.alias === connection.alias);
      const next = [...previous];
      next.splice(index + 1, 0, { ...connection, alias, status: 'Not tested' });
      return next;
    });
    highlight(alias);
    notify(`Cloned as ${alias}`, {
      type: 'success',
      message: 'Credentials were not copied. Edit the clone to sign in.',
    });
  };

  const deleteConnection = async (connection) => {
    const isProd = connection.environment === 'Production';
    const confirmed = await confirm({
      title: `Delete ${connection.alias}?`,
      message: isProd
        ? 'This is a production connection. Jobs and migration plans that use it will stop working until you pick another connection.'
        : 'Jobs and migration plans that use this connection will need a new one.',
      confirmLabel: 'Delete connection',
      danger: true,
    });
    if (!confirmed) return;

    setConnections((previous) => previous.filter((item) => item.alias !== connection.alias));
    if (selectedAlias === connection.alias) setSelectedAlias(null);
    notify(`${connection.alias} deleted`, { type: 'info' });
  };

  const saveConnection = (form) => {
    if (modal?.mode === 'edit') {
      const original = modal.connection;
      const alias = form.name.trim();
      if (alias !== original.alias && connections.some((item) => item.alias === alias)) {
        notify(`${alias} already exists`, { type: 'error', message: 'Choose a different connection name.' });
        return;
      }
      setConnections((previous) =>
        previous.map((item) => (item.alias === original.alias ? { ...item, alias } : item))
      );
      setModal(null);
      highlight(alias);
      notify('Connection updated', { type: 'success', message: alias });
      return;
    }

    const alias = uniqueAlias(form.name.trim().toUpperCase().replace(/\s+/g, '_'));
    const isProd = form.orgType === 'Production';
    const newConnection = {
      alias,
      type: 'Salesforce',
      environment: orgTypeToEnvironment[form.orgType] || form.orgType,
      endpoint: isProd ? 'login.salesforce.com' : 'test.salesforce.com',
      auth: 'Username / password',
      status: 'Not tested',
      category: 'Salesforce',
      icon: '☁',
      color: 'salesforce',
    };

    setConnections((previous) => [newConnection, ...previous]);
    setActiveFilter('All');
    setSearch('');
    setModal(null);
    highlight(alias);
    runTest(newConnection);
  };

  const importConnections = async (file) => {
    try {
      const parsed = JSON.parse(await file.text());
      const list = (Array.isArray(parsed) ? parsed : [parsed]).filter((item) => item?.alias);

      if (!list.length) {
        notify('Nothing to import', {
          type: 'warning',
          message: 'The file must contain connection objects with an "alias" field.',
        });
        return;
      }

      const existing = new Set(connections.map((item) => item.alias));
      const added = list
        .filter((item) => !existing.has(item.alias))
        .map((item) => ({
          type: 'Salesforce',
          environment: 'Source',
          endpoint: '—',
          auth: '—',
          category: 'Salesforce',
          icon: '☁',
          color: 'salesforce',
          ...item,
          status: 'Not tested',
        }));

      setConnections((previous) => [...added, ...previous]);
      notify(`Imported ${added.length} connection${added.length === 1 ? '' : 's'}`, {
        type: 'success',
        message:
          list.length > added.length
            ? `${list.length - added.length} skipped because the alias already exists.`
            : 'Run "Test all" to check them.',
      });
    } catch {
      notify('Could not read file', { type: 'error', message: 'Choose a valid JSON file.' });
    }
  };

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

  const selectedConnection = connections.find((item) => item.alias === selectedAlias);

  const actionsFor = (connection) => ({
    onTest: () => {
      setOpenMenu(null);
      runTest(connection);
    },
    onEdit: () => {
      setOpenMenu(null);
      setModal({ mode: 'edit', connection });
    },
    onClone: () => {
      setOpenMenu(null);
      cloneConnection(connection);
    },
    onDelete: () => {
      setOpenMenu(null);
      deleteConnection(connection);
    },
  });

  return (
    <div className="connections-page">
      <ConnectionsHeader
        connections={connections}
        onNewConnection={() => setModal({ mode: 'create' })}
        onTestAll={testAll}
        testingAll={Object.keys(busy).length > 0}
        onImport={importConnections}
      />
      <FilterBar
        connections={connections}
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
                      flash={flashAlias === connection.alias}
                      busy={busy[connection.alias]}
                      onSelect={() => {
                        setOpenMenu(null);
                        setSelectedAlias(connection.alias);
                      }}
                      menuOpen={openMenu === connection.alias}
                      onToggleMenu={() =>
                        setOpenMenu(openMenu === connection.alias ? null : connection.alias)
                      }
                      onReauth={() => reauthenticate(connection)}
                      {...actionsFor(connection)}
                    />
                  ))}

                  {filteredConnections.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-table">
                        No connections match your filters.{' '}
                        <button
                          type="button"
                          className="reauth-link"
                          onClick={() => {
                            setSearch('');
                            setActiveFilter('All');
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
          </section>

          <InfoBanner />
        </div>

        <SelectedConnectionPanel
          key={selectedAlias}
          connection={selectedConnection}
          busy={selectedConnection && busy[selectedConnection.alias]}
          lastTested={selectedConnection && lastTested[selectedConnection.alias]}
          {...(selectedConnection ? actionsFor(selectedConnection) : {})}
        />
      </div>

      {modal && (
        <NewConnectionModal
          initial={modal.mode === 'edit' ? modal.connection : null}
          onClose={() => setModal(null)}
          onSave={saveConnection}
        />
      )}
    </div>
  );
}
