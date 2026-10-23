
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

function ProjectMenu({ project, onClose, onToggleStatus, onDuplicate, onDelete }) {
  useCloseOnOutsideClick(true, onClose);
  return (
    <div className="project-options-menu ui-popup-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onToggleStatus}>
        {project.status === 'Completed' ? '↺ Reopen project' : '✓ Mark as completed'}
      </button>
      <button type="button" onClick={onDuplicate}>⧉ Duplicate</button>
      <button type="button" className="danger" onClick={onDelete}>✕ Delete project</button>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useProjects();
  const { notify, confirm } = useFeedback();
  const [menuProjectId, setMenuProjectId] = useState(null);
  const closeMenu = useCallback(() => setMenuProjectId(null), []);

  const toggleStatus = (project) => {
    const status = project.status === 'Completed' ? 'Active' : 'Completed';
    setProjects((previous) =>
      previous.map((item) => (item.id === project.id ? { ...item, status, updated: stamp() } : item))
    );
    notify(`${project.name} is now ${status.toLowerCase()}`, { type: 'success' });
  };

  const duplicateProject = (project) => {
    setProjects((previous) => [
      { ...project, id: Math.max(0, ...previous.map((item) => item.id || 0)) + 1, name: `${project.name} (copy)`, updated: stamp() },
      ...previous,
    ]);
    notify(`Duplicated ${project.name}`, { type: 'success' });
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

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'timeline') {
      result.sort((a, b) => a.timeline - b.timeline);
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
            <label className="projects-sort">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                aria-label="Sort projects"
              >
                <option value="recent">Recently added</option>
                <option value="name">Project name</option>
                <option value="timeline">Timeline</option>
              </select>
            </label>

            <button
              type="button"
              className="projects-add-button"
              onClick={() => {
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
                  <h2>{project.name}</h2>
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
                    project={project}
                    onClose={closeMenu}
                    onToggleStatus={() => { closeMenu(); toggleStatus(project); }}
                    onDuplicate={() => { closeMenu(); duplicateProject(project); }}
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
                <h2>New Project</h2>
                <p>Create a migration project and define its source and target.</p>
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
                Create Project
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
