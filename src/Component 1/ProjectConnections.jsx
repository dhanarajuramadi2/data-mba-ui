import { useState } from 'react';
import { useProjects } from './projectsStore';
import { useFeedback } from './ui/feedbackContext';
import './ProjectConnections.css';

const STORAGE_KEY = 'data-mba-project-connections';
const ORG_TYPES = ['Production', 'Sandbox', 'Developer'];
const defaultLink = { orgType: 'Production', authorized: false, authorizedAt: '' };

function readLinks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function OrgCard({ role, name, owner, link, onChange, onAuthorize }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="pc-org-card">
      <header className="pc-org-header">
        <div className="pc-org-title">
          <h2>{name || 'Not configured'}</h2>
          <span className={`pc-role ${role.toLowerCase()}`}>{role}</span>
        </div>
        <button
          type="button"
          className={`pc-toggle ${open ? 'open' : ''}`}
          aria-label={open ? `Collapse ${role}` : `Expand ${role}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          ▾
        </button>
      </header>

      {open && (
        <div className="pc-org-body">
          <div className="pc-row">
            <span>Created By</span>
            <strong>{owner}</strong>
          </div>

          <div className="pc-row">
            <span>Org Type</span>
            <select
              value={link.orgType}
              onChange={(event) => onChange({ orgType: event.target.value })}
              aria-label={`${role} org type`}
            >
              {ORG_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="pc-row">
            <span>Authentication Status</span>
            <strong className={`pc-auth ${link.authorized ? 'ok' : 'pending'}`}>
              <i aria-hidden="true" />
              {link.authorized ? 'Authorized' : 'Not authorized'}
            </strong>
          </div>

          {link.authorized && link.authorizedAt && (
            <div className="pc-row">
              <span>Authorized On</span>
              <strong>{link.authorizedAt}</strong>
            </div>
          )}

          <div className="pc-actions">
            <button
              type="button"
              className={link.authorized ? 'pc-button secondary' : 'pc-button primary'}
              disabled={!name}
              onClick={onAuthorize}
            >
              {link.authorized ? 'Revoke access' : 'Authorize'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ProjectConnections({ projectId, onBack }) {
  const [projects] = useProjects();
  const { notify } = useFeedback();
  const [links, setLinks] = useState(readLinks);
  const project = projects.find((item) => item.id === projectId);

  const linkFor = (role) => ({ ...defaultLink, ...links[projectId]?.[role] });

  const updateLink = (role, patch) => {
    setLinks((previous) => {
      const next = {
        ...previous,
        [projectId]: {
          ...previous[projectId],
          [role]: { ...defaultLink, ...previous[projectId]?.[role], ...patch },
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Unable to save project connections:', error);
      }
      return next;
    });
  };

  const toggleAuthorization = (role, orgName) => {
    const authorize = !linkFor(role).authorized;
    updateLink(role, {
      authorized: authorize,
      authorizedAt: authorize ? new Date().toLocaleString('en-US') : '',
    });
    notify(authorize ? `${orgName} authorized` : `${orgName} access revoked`, {
      type: authorize ? 'success' : 'info',
    });
  };

  if (!project) {
    return (
      <div className="pc-page">
        <button type="button" className="pc-back" onClick={onBack}>← Back to projects</button>
        <p className="pc-missing">This project no longer exists.</p>
      </div>
    );
  }

  const ready = linkFor('Source').authorized && linkFor('Target').authorized;

  return (
    <div className="pc-page">
      <button type="button" className="pc-back" onClick={onBack}>← Back to projects</button>

      <header className="pc-header">
        <h1>Connection Management</h1>
        <p>Manage the source and target org connections for: {project.name}</p>
      </header>

      <section className="pc-details">
        <div className="pc-details-top">
          <div>
            <span className="pc-eyebrow">Project details</span>
            <h2>{project.name}</h2>
          </div>
          <span className={`pc-status ${project.status.toLowerCase().replace(/\s+/g, '-')}`}>
            {project.status}
          </span>
        </div>

        <div className="pc-details-grid">
          <div>
            <span>Source</span>
            <strong>{project.source || 'Not configured'}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{project.target || 'Not configured'}</strong>
          </div>
          <div>
            <span>Timeline</span>
            <strong>{project.timeline} days</strong>
          </div>
          <div>
            <span>Owner</span>
            <strong>{project.owner}</strong>
          </div>
        </div>
      </section>

      <div className={`pc-ready ${ready ? 'ready' : ''}`} role="status">
        {ready
          ? 'Source and target are both authorized. This project is ready to run.'
          : 'Authorize both the source and the target org before running this project.'}
      </div>

      <div className="pc-orgs">
        <OrgCard
          role="Source"
          name={project.source}
          owner={project.owner}
          link={linkFor('Source')}
          onChange={(patch) => updateLink('Source', patch)}
          onAuthorize={() => toggleAuthorization('Source', project.source)}
        />
        <OrgCard
          role="Target"
          name={project.target}
          owner={project.owner}
          link={linkFor('Target')}
          onChange={(patch) => updateLink('Target', patch)}
          onAuthorize={() => toggleAuthorization('Target', project.target)}
        />
      </div>
    </div>
  );
}
