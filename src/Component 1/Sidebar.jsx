import { useState } from 'react';
import './Sidebar.css';

const projectItems = [
  { icon: '♙', label: 'Connections' },
  { icon: '▤', label: 'Job Library' },
  { icon: '♧', label: 'Data Profiling' },
  { icon: '⇄', label: 'Migration' },
  { icon: '∿', label: 'Run Monitor' },
  { icon: '⇄', label: 'Reconciliation' },
  { icon: '♧', label: 'Files' },
  { icon: '▣', label: 'Archival' },
];

function SidebarItem({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      className={`sidebar-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="sidebar-item-icon">{icon}</span>
      <span className="sidebar-item-label">{label}</span>
    </button>
  );
}

export default function Sidebar({ activeScreen, onNavigate, showBackToRecords = false, onBackToRecords }) {
  const [projectsOpen, setProjectsOpen] = useState(
    projectItems.some((item) => item.label === activeScreen)
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <span />
          <span />
          <span />
        </div>

        <div>
          <h2>Data MBA</h2>
          <p>Migration · Backup · Archival</p>
        </div>
      </div>

      {/* Shown while a Data Profiling record is open (see App.jsx) */}
      {showBackToRecords && (
        <button
          type="button"
          className="sidebar-back-button"
          onClick={onBackToRecords}
        >
          <span aria-hidden="true">←</span>
          Back to records
        </button>
      )}

      <nav className="sidebar-navigation">
        <SidebarItem
          icon="⌂"
          label="Home"
          active={activeScreen === 'Home'}
          onClick={() => onNavigate('Home')}
        />



      <button
        type="button"
        className={`sidebar-item projects-toggle ${
          activeScreen === 'Projects' ||
          projectItems.some((item) => item.label === activeScreen)
            ? 'active'
            : ''
        }`}
        aria-expanded={projectsOpen}
        onClick={() => {
          setProjectsOpen((open) => !open);
          onNavigate('Projects');
        }}
      >
        <span className="sidebar-item-icon">▣</span>
        <span className="sidebar-item-label">Projects</span>
        <span className={`projects-chevron ${projectsOpen ? 'open' : ''}`}>
          ▾
        </span>
      </button>



      <div
        className="projects-submenu"
        hidden={!projectsOpen}
      >
        {projectItems.map((item) => (
          <SidebarItem
            key={item.label}
            {...item}
            active={activeScreen === item.label}
            onClick={() => onNavigate(item.label)}
          />
        ))}
      </div>

      </nav>

      <div className="active-target">
        <p className="target-label">ACTIVE TARGET</p>

        <div className="target-name">
          <span className="online-dot" />
          <strong>SF_UAT · Full sandbox</strong>
        </div>

        <div className="target-usage">
          <span>Daily API requests</span>
          <span>16%</span>
        </div>

        <div className="usage-track">
          <div className="usage-fill" />
        </div>
      </div>
    </aside>
  );
}
