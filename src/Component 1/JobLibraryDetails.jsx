
import { useState } from 'react';
import { useFeedback } from './ui/feedbackContext';

export default function JobLibraryDetails({ job, onRunWithProfile }) {
  const { notify } = useFeedback();
  const [format, setFormat] = useState('JSON');
  const [tab, setTab] = useState('Definition');
  const [copied, setCopied] = useState(false);

  if (!job) {
    return (
      <aside className="job-details-panel job-details-empty">
        <p>Select a job to view its definition and details.</p>
      </aside>
    );
  }

  const definition = {
    job: job.name,
    schemaVersion: '1.3',
    type: job.type.toLowerCase(),
    source: {
      connection: '${profile.source}',
      table: 'public.customers',
    },
    target: {
      connection: '${profile.target}',
      object: job.object,
      operation: 'upsert',
      externalId: 'Legacy_Id__c',
      api: 'bulk2',
      batchSize: '${profile.batch}',
    },
    resolveByName: {
      RecordTypeId: 'Customer',
      OwnerId: 'User.Email',
    },
    mappings: [
      {
        from: 'phone',
        to: 'Phone',
        steps: ['e164'],
      },
      {
        from: 'country',
        to: 'BillingCountryCode',
      },
    ],
  };

  const jsonText = JSON.stringify(definition, null, 2);

  const xmlText = `<job name="${job.name}" schemaVersion="1.3" type="${job.type.toLowerCase()}">
  <source connection="\${profile.source}" table="public.customers" />
  <target connection="\${profile.target}" object="${job.object}" operation="upsert" externalId="Legacy_Id__c" />
  <settings api="bulk2" batchSize="\${profile.batch}" />
</job>`;

  const codeText = format === 'JSON' ? jsonText : xmlText;

  const copyDefinition = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify('Copy is unavailable', { type: 'warning', message: 'Select the definition text and copy it manually.' });
    }
  };

  return (
    <aside className="job-details-panel">
      <div className="job-details-heading">
        <div>
          <h2>{job.name}.{job.version}</h2>
          <p>{job.type} job for {job.object} data</p>
        </div>

        <div className="job-format-toggle">
          {['JSON', 'XML'].map((item) => (
            <button
              key={item}
              type="button"
              className={format === item ? 'active' : ''}
              onClick={() => {
                setFormat(item);
                setCopied(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="job-details-tabs">
        {['Definition', 'Details'].map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Definition' ? (
        <div className="job-definition-code">
          <div className="job-code-toolbar">
            <span>{format}</span>
            <button type="button" onClick={copyDefinition}>
              {copied ? 'Copied!' : '▢ Copy'}
            </button>
          </div>

          <pre>
            <code>{codeText}</code>
          </pre>
        </div>
      ) : (
        <div className="job-details-metadata">
          <div>
            <span>Job name</span>
            <strong>{job.name}</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{job.type}</strong>
          </div>
          <div>
            <span>Object</span>
            <strong>{job.object}</strong>
          </div>
          <div>
            <span>Version</span>
            <strong>{job.version}</strong>
          </div>
          <div>
            <span>Last run</span>
            <strong>{job.lastRun}</strong>
          </div>
          <div>
            <span>Result</span>
            <strong>{job.result}</strong>
          </div>
        </div>
      )}

      <div className="job-definition-notices">
        <div>
          <span className="notice-badge safe">Safe</span>
          <span>No tokens, passwords or org-specific IDs are written.</span>
        </div>
        <div>
          <span className="notice-badge portable">Portable</span>
          <span>Record types and users resolve by name in each org.</span>
        </div>
      </div>

      <div className="job-details-actions">
        <button
          type="button"
          className="job-run-profile-button"
          onClick={() => onRunWithProfile(job)}
          disabled={job.result === 'Running…'}
        >
          ▷ Run with profile...
        </button>

        <button
          type="button"
          className="job-save-file-button"
          onClick={() => {
            const blob = new Blob([codeText], {
              type: format === 'JSON' ? 'application/json' : 'application/xml',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${job.name}.${format.toLowerCase()}`;
            link.click();
            URL.revokeObjectURL(url);
            notify(`Saved ${job.name}.${format.toLowerCase()}`, { type: 'success' });
          }}
        >
          Save {format} file
        </button>
      </div>
    </aside>
  );
}
