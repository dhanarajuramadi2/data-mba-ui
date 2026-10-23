
import { useState } from 'react';
import './NewConnection.css';

const connectionTypes = [
  {
    id: 'Salesforce',
    icon: '☁',
    title: 'Salesforce',
    description: 'Connect a Salesforce production org or sandbox.',
    category: 'CRM',
  },
  {
    id: 'CSV / Excel',
    icon: '▦',
    title: 'CSV / Excel',
    description: 'Import records from CSV or Excel files.',
    category: 'Files',
  },
  {
    id: 'PostgreSQL',
    icon: '🐘',
    title: 'PostgreSQL',
    description: 'Connect to a PostgreSQL database.',
    category: 'Database',
  },
  {
    id: 'SQL Server',
    icon: '▤',
    title: 'SQL Server',
    description: 'Connect to Microsoft SQL Server.',
    category: 'Database',
  },
  {
    id: 'Oracle',
    icon: '◈',
    title: 'Oracle',
    description: 'Connect to an Oracle database.',
    category: 'Database',
  },
  {
    id: 'AWS S3',
    icon: '☁',
    title: 'AWS S3',
    description: 'Configure an Amazon S3 storage target.',
    category: 'Cloud storage',
  },
  {
    id: 'Azure Blob',
    icon: '▲',
    title: 'Azure Blob Storage',
    description: 'Configure an Azure Blob storage target.',
    category: 'Cloud storage',
  },
];

const initialForm = {
  name: '',
  environment: 'Production',
  endpoint: '',
  username: '',
  password: '',
  clientId: '',
  clientSecret: '',
  authMethod: 'OAuth 2.0',
  region: 'eu-west-1',
  bucket: '',
  file: null,
};

export default function NewConnection({ onBack, onSave }) {
  const [selectedType, setSelectedType] = useState('');
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState('choose');
  const [message, setMessage] = useState('');

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  };

  const selectType = (type) => {
    setSelectedType(type);
    setForm({
      ...initialForm,
      name: type === 'Salesforce' ? 'SF_' : '',
    });
    setMessage('');
    setStep('configure');
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage('Enter a connection name.');
      return;
    }

    if (
      selectedType !== 'CSV / Excel' &&
      !form.endpoint.trim() &&
      !['AWS S3', 'Azure Blob'].includes(selectedType)
    ) {
      setMessage('Enter the connection endpoint or URL.');
      return;
    }

    if (selectedType === 'CSV / Excel' && !form.file) {
      setMessage('Choose a CSV or Excel file.');
      return;
    }

    if (selectedType === 'AWS S3' && !form.bucket.trim()) {
      setMessage('Enter the S3 bucket name.');
      return;
    }

    if (selectedType === 'Azure Blob' && !form.bucket.trim()) {
      setMessage('Enter the storage account or container.');
      return;
    }

    const connection = {
      ...form,
      type: selectedType,
    };

    if (onSave) {
      onSave(connection);
    } else {
      setMessage(
        'Configuration validated in the UI. Connect a backend to save and test this connection.'
      );
    }
  };

  const isDatabase = [
    'PostgreSQL',
    'SQL Server',
    'Oracle',
  ].includes(selectedType);

  return (
    <div className="new-connection-page">
      <div className="nc-breadcrumb">
        <button type="button" onClick={onBack}>
          ← Connections
        </button>
        <span>/</span>
        <span>New connection</span>
      </div>

      <header className="nc-header">
        <div>
          <div className="nc-eyebrow">DATA SOURCES & TARGETS</div>
          <h1>{step === 'choose' ? 'New connection' : `Configure ${selectedType}`}</h1>
          <p>
            {step === 'choose'
              ? 'Choose the system or storage location you want to connect to.'
              : 'Enter the connection details to configure this source or target.'}
          </p>
        </div>
        <button className="nc-button nc-secondary" type="button" onClick={onBack}>
          Cancel
        </button>
      </header>

      {step === 'choose' ? (
        <>
          <div className="nc-section-heading">
            <h2>Choose connection type</h2>
            <span>7 connection types</span>
          </div>

          <div className="nc-type-grid">
            {connectionTypes.map((type) => (
              <button
                className="nc-type-card"
                key={type.id}
                type="button"
                onClick={() => selectType(type.id)}
              >
                <span className={`nc-type-icon nc-icon-${type.category.toLowerCase().replace(' ', '-')}`}>
                  {type.icon}
                </span>
                <span className="nc-type-category">{type.category}</span>
                <strong>{type.title}</strong>
                <span className="nc-type-description">
                  {type.description}
                </span>
                <span className="nc-card-action">
                  Configure connection <span>→</span>
                </span>
              </button>
            ))}
          </div>

          <div className="nc-security-note">
            <span>♧</span>
            <div>
              <strong>Your credentials stay protected</strong>
              <p>
                Store secrets securely in your backend or a secrets manager.
                Never expose production credentials in frontend code.
              </p>
            </div>
          </div>
        </>
      ) : (
        <form className="nc-config-layout" onSubmit={handleSave}>
          <section className="nc-form-card">
            <div className="nc-form-title">
              <span className="nc-type-icon">
                {connectionTypes.find((item) => item.id === selectedType)?.icon}
              </span>
              <div>
                <h2>{selectedType}</h2>
                <p>Connection configuration</p>
              </div>
              <button
                type="button"
                className="nc-text-button"
                onClick={() => setStep('choose')}
              >
                Change type
              </button>
            </div>

            <div className="nc-form-section">
              <h3>General information</h3>
              <div className="nc-field">
                <label htmlFor="nc-name">Connection name *</label>
                <input
                  id="nc-name"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g. SF_PROD"
                  required
                />
                <small>A unique name used to identify this connection.</small>
              </div>

              {selectedType !== 'CSV / Excel' && (
                <div className="nc-field">
                  <label htmlFor="nc-environment">Environment</label>
                  <select
                    id="nc-environment"
                    value={form.environment}
                    onChange={(e) => updateForm('environment', e.target.value)}
                  >
                    <option>Production</option>
                    <option>Sandbox</option>
                    <option>Development</option>
                    <option>Testing</option>
                    <option>Source</option>
                    <option>Archive target</option>
                  </select>
                </div>
              )}
            </div>

            {selectedType === 'Salesforce' && (
              <div className="nc-form-section">
                <h3>Salesforce details</h3>

                <div className="nc-field">
                  <label htmlFor="nc-endpoint">Instance URL *</label>
                  <input
                    id="nc-endpoint"
                    type="url"
                    value={form.endpoint}
                    onChange={(e) => updateForm('endpoint', e.target.value)}
                    placeholder="https://your-domain.my.salesforce.com"
                    required
                  />
                </div>

                <div className="nc-field">
                  <label htmlFor="nc-auth">Authentication method</label>
                  <select
                    id="nc-auth"
                    value={form.authMethod}
                    onChange={(e) => updateForm('authMethod', e.target.value)}
                  >
                    <option>OAuth 2.0</option>
                    <option>OAuth 2.0 JWT</option>
                  </select>
                </div>

                <div className="nc-field">
                  <label htmlFor="nc-client-id">Client ID</label>
                  <input
                    id="nc-client-id"
                    value={form.clientId}
                    onChange={(e) => updateForm('clientId', e.target.value)}
                    placeholder="Connected app client ID"
                  />
                </div>

                <div className="nc-field">
                  <label htmlFor="nc-client-secret">Client secret</label>
                  <input
                    id="nc-client-secret"
                    type="password"
                    autoComplete="new-password"
                    value={form.clientSecret}
                    onChange={(e) => updateForm('clientSecret', e.target.value)}
                    placeholder="Enter securely"
                  />
                </div>
              </div>
            )}

            {isDatabase && (
              <div className="nc-form-section">
                <h3>Database details</h3>

                <div className="nc-field">
                  <label htmlFor="nc-endpoint">Host and port *</label>
                  <input
                    id="nc-endpoint"
                    value={form.endpoint}
                    onChange={(e) => updateForm('endpoint', e.target.value)}
                    placeholder={
                      selectedType === 'PostgreSQL'
                        ? 'db.example.com:5432/database'
                        : selectedType === 'SQL Server'
                          ? 'db.example.com:1433/database'
                          : 'db.example.com:1521/service'
                    }
                    required
                  />
                </div>

                <div className="nc-field">
                  <label htmlFor="nc-username">Username</label>
                  <input
                    id="nc-username"
                    value={form.username}
                    onChange={(e) => updateForm('username', e.target.value)}
                    placeholder="Database username"
                    autoComplete="off"
                  />
                </div>

                <div className="nc-field">
                  <label htmlFor="nc-password">Password</label>
                  <input
                    id="nc-password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="Enter securely"
                  />
                </div>
              </div>
            )}

            {selectedType === 'CSV / Excel' && (
              <div className="nc-form-section">
                <h3>Upload file</h3>
                <div className="nc-field">
                  <label htmlFor="nc-file">CSV or Excel file *</label>
                  <input
                    id="nc-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) =>
                      updateForm('file', e.target.files?.[0] || null)
                    }
                    required
                  />
                  <small>Supported formats: CSV, XLSX and XLS.</small>
                </div>
                {form.file && (
                  <div className="nc-file-selected">
                    Selected file: {form.file.name}
                  </div>
                )}
              </div>
            )}

            {selectedType === 'AWS S3' && (
              <div className="nc-form-section">
                <h3>AWS S3 details</h3>
                <div className="nc-field">
                  <label htmlFor="nc-bucket">Bucket name *</label>
                  <input
                    id="nc-bucket"
                    value={form.bucket}
                    onChange={(e) => updateForm('bucket', e.target.value)}
                    placeholder="my-archive-bucket"
                    required
                  />
                </div>
                <div className="nc-field">
                  <label htmlFor="nc-region">AWS region</label>
                  <select
                    id="nc-region"
                    value={form.region}
                    onChange={(e) => updateForm('region', e.target.value)}
                  >
                    <option value="eu-west-1">Europe (Ireland)</option>
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                  </select>
                </div>
              </div>
            )}

            {selectedType === 'Azure Blob' && (
              <div className="nc-form-section">
                <h3>Azure Blob details</h3>
                <div className="nc-field">
                  <label htmlFor="nc-bucket">Storage account or container *</label>
                  <input
                    id="nc-bucket"
                    value={form.bucket}
                    onChange={(e) => updateForm('bucket', e.target.value)}
                    placeholder="account/container"
                    required
                  />
                </div>
                <div className="nc-field">
                  <label htmlFor="nc-endpoint">Blob endpoint URL</label>
                  <input
                    id="nc-endpoint"
                    type="url"
                    value={form.endpoint}
                    onChange={(e) => updateForm('endpoint', e.target.value)}
                    placeholder="https://account.blob.core.windows.net"
                  />
                </div>
              </div>
            )}

            {message && (
              <div className="nc-message" role="status">
                {message}
              </div>
            )}

            <div className="nc-form-actions">
              <button
                className="nc-button nc-secondary"
                type="button"
                onClick={() => setStep('choose')}
              >
                Back
              </button>
              <button className="nc-button nc-primary" type="submit">
                Save configuration
              </button>
            </div>
          </section>

          <aside className="nc-side-note">
            <h3>Before you continue</h3>
            <p>
              Confirm the endpoint, environment, and access method with your
              administrator.
            </p>
            <div className="nc-check-item">✓ Use a dedicated service account</div>
            <div className="nc-check-item">✓ Apply least-privilege access</div>
            <div className="nc-check-item">✓ Keep secrets out of source code</div>
            <div className="nc-note-warning">
              Saving currently validates the form in the UI. A backend
              integration is required to securely store credentials and test
              the actual connection.
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
