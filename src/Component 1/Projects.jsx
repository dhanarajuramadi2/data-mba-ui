
import { useCallback, useMemo, useState } from 'react';
import { useProjects } from './projectsStore';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
import './Projects.css';

const emptyForm = {
  name: '',
  source: '',
  target: '',
  status: 'Active',
  timeline: '10',
  priority: 'Medium',
};

const stamp = () => new Date().toLocaleString('en-US');

const priorityRank = { Low: 0, Medium: 1, High: 2, Critical: 3 };

const sortOptions = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'priorityHigh', label: 'Priority: High → Low' },
  { value: 'priorityLow', label: 'Priority: Low → High' },
];

function ProjectMenu({ onClose, onEdit, onDelete }) {
  useCloseOnOutsideClick(true, onClose);
  return (
    <div className="project-options-menu ui-popup-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onEdit}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Edit
      </button>
      <button type="button" className="danger" onClick={onDelete}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 5v6m4-6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Delete
      </button>
    </div>
  );
}

export default function Projects({ onOpenProject }) {
  const [projects, setProjects] = useProjects();
  const { notify, confirm } = useFeedback();
  const [menuProjectId, setMenuProjectId] = useState(null);
  const closeMenu = useCallback(() => setMenuProjectId(null), []);

  const [editingId, setEditingId] = useState(null);

  const editProject = (project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      source: project.source || '',
      target: project.target || '',
      status: project.status,
      timeline: String(project.timeline),
      priority: project.priority,
    });
    setError('');
    setShowModal(true);
  };

  const deleteProject = async (project) => {
    const ok = await confirm({
      title: `Delete ${project.name}?`,
      message: 'The project is removed from this workspace.',
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (!ok) return;
    setProjects((previous) => previous.filter((item) => item.id !== project.id));
    notify(`${project.name} deleted`);
  };
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const closeSort = useCallback(() => setSortOpen(false), []);
  useCloseOnOutsideClick(sortOpen, closeSort);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = projects.filter((project) =>
      [
        project.name,
        project.owner,
        project.source,
        project.target,
        project.status,
        project.priority,
      ].some((value) => value.toLowerCase().includes(query))
    );

    const rank = (project) => priorityRank[project.priority] ?? 1;

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'priorityHigh') {
      result.sort((a, b) => rank(b) - rank(a));
    } else if (sortBy === 'priorityLow') {
      result.sort((a, b) => rank(a) - rank(b));
    }

    return result;
  }, [projects, search, sortBy]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
  }

 
    function createProject(event) {
    event.preventDefault();

    if (!form.name.trim()) {
        setError('Project name is required.');
        return;
    }

    if (!form.source.trim() || !form.target.trim()) {
        setError('Please enter both the source and target org.');
        return;
    }

    if (editingId !== null) {
        setProjects((previous) =>
          previous.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  name: form.name.trim(),
                  source: form.source.trim(),
                  target: form.target.trim(),
                  status: form.status,
                  timeline: Number(form.timeline),
                  priority: form.priority,
                  updated: stamp(),
                }
              : item
          )
        );
        notify(`${form.name.trim()} updated`, { type: 'success' });
        setEditingId(null);
        setForm(emptyForm);
        setError('');
        setShowModal(false);
        return;
    }

    const newProject = {
        id: Date.now(),
        name: form.name.trim(),
        owner: 'Current User',
        source: form.source.trim(),
        target: form.target.trim(),
        status: form.status,
        timeline: Number(form.timeline),
        priority: form.priority,
        updated: new Date().toLocaleString(),
    };

    setProjects((previous) => [newProject, ...previous]);

    setSearch('');
    setSortBy('recent');
    setForm(emptyForm);
    setError('');
    setShowModal(false);
    }


  return (
    <div className="projects-page">
      <section className="projects-panel">
        <header className="projects-header">
          <div>
            <h1>Migration Projects</h1>
            <p>Manage your migration and consolidation projects.</p>
          </div>
        </header>

        <div className="projects-toolbar">
          <label className="projects-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search projects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search projects"
            />
          </label>

          <div className="projects-toolbar-actions">
            <div className="projects-sort-wrap">
              <button
                type="button"
                className={`projects-sort ${sortOpen ? 'open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((open) => !open)}
              >
                <span>Sort</span>
                <svg className="projects-sort-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M2 4h12M4 8h8M6.5 12h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {sortOpen && (
                <div className="projects-sort-menu ui-popup-menu" role="menu">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sortBy === option.value}
                      className={sortBy === option.value ? 'active' : ''}
                      onClick={() => setSortBy(sortBy === option.value ? 'recent' : option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="projects-add-button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setError('');
                setShowModal(true);
              }}
              aria-label="Create new project"
              title="Create new project"
            >
              +
            </button>
          </div>
        </div>

        <div className="projects-list">
          {visibleProjects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-top">
                <div>
                  <h2>
                    <button
                      type="button"
                      className="project-title-link"
                      title="View source and target connections"
                      onClick={() => onOpenProject?.(project.id)}
                    >
                      {project.name}
                    </button>
                  </h2>
                  <p className="project-owner">
                    <span aria-hidden="true">♙</span>
                    {project.owner}
                  </p>
                </div>

                <button
                  type="button"
                  className="project-menu-button"
                  title="Project options"
                  aria-label={`Options for ${project.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuProjectId(menuProjectId === project.id ? null : project.id);
                  }}
                >
                  ⋮
                </button>
                {menuProjectId === project.id && (
                  <ProjectMenu
                    onClose={closeMenu}
                    onEdit={() => { closeMenu(); editProject(project); }}
                    onDelete={() => { closeMenu(); deleteProject(project); }}
                  />
                )}
              </div>

              <div className="project-metadata">
                <div className="project-metadata-item">
                  <span>Source Org</span>
                  <strong>{project.source || 'Not configured'}</strong>
                </div>

                <div className="project-metadata-item">
                  <span>Target Org</span>
                  <strong>{project.target || 'Not configured'}</strong>
                </div>

                <div className="project-metadata-item">
                  <span>Status</span>
                  <strong>
                    <span
                      className={`project-status ${project.status
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {project.status}
                    </span>
                  </strong>
                </div>

                <div className="project-metadata-item">
                  <span>Timeline</span>
                  <strong className="project-timeline">
                    <span aria-hidden="true">▦</span>
                    {project.timeline} days
                  </strong>
                </div>

                <div className="project-metadata-item">
                  <span>Priority</span>
                  <strong>
                    <span
                      className={`project-priority ${project.priority.toLowerCase()}`}
                    >
                      {project.priority}
                    </span>
                  </strong>
                </div>
              </div>
            </article>
          ))}

          {visibleProjects.length === 0 && (
            <div className="projects-empty">
              <span>⌕</span>
              <h2>No projects found</h2>
              <p>Try a different search or create a new project.</p>
            </div>
          )}
        </div>

        <footer className="projects-footer">
          Showing {visibleProjects.length} of {projects.length} projects
        </footer>
      </section>

      {showModal && (
        <div
          className="project-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <form className="project-modal" onSubmit={createProject}>
            <header className="project-modal-header">
              <div>
                <h2>{editingId !== null ? 'Edit Project' : 'New Project'}</h2>
                <p>
                  {editingId !== null
                    ? 'Update the project details.'
                    : 'Create a migration project and define its source and target.'}
                </p>
              </div>

              <button
                type="button"
                className="project-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="project-modal-body">
              <h3>Project Details</h3>

              <div className="project-form-grid">
                <label className="project-field project-field-full">
                  <span>Project Name <b>*</b></span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter project name"
                    autoFocus
                    required
                  />
                </label>

                <label className="project-field">
                  <span>Source Org <b>*</b></span>
                  <input
                    name="source"
                    value={form.source}
                    onChange={updateField}
                    placeholder="e.g. Legacy CRM"
                    required
                  />
                </label>

                <label className="project-field">
                  <span>Target Org <b>*</b></span>
                  <input
                    name="target"
                    value={form.target}
                    onChange={updateField}
                    placeholder="e.g. Salesforce"
                    required
                  />
                </label>

                <label className="project-field">
                  <span>Status</span>
                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                  >
                    <option>Active</option>
                    <option>Planning</option>
                    <option>On Hold</option>
                    <option>Completed</option>
                  </select>
                </label>

                <label className="project-field">
                  <span>Timeline (days)</span>
                  <input
                    type="number"
                    name="timeline"
                    min="1"
                    value={form.timeline}
                    onChange={updateField}
                    required
                  />
                </label>

                <label className="project-field">
                  <span>Priority</span>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={updateField}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </label>
              </div>

              {error && (
                <p className="project-form-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <footer className="project-modal-footer">
              <button
                type="button"
                className="project-cancel-button"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button type="submit" className="project-save-button">
                {editingId !== null ? 'Save Changes' : 'Create Project'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
