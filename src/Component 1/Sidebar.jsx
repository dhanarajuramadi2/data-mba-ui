import { useEffect, useRef, useState } from 'react';
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

// How long the mouse must rest on an item before its screen opens. Long enough
// that sweeping the pointer across the sidebar does not switch screens.
const HOVER_OPEN_DELAY = 300;

function SidebarItem({ icon, label, active = false, onClick, onPointerEnter, onPointerLeave }) {
  return (
    <button
      type="button"
      className={`sidebar-item ${active ? 'active' : ''}`}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span className="sidebar-item-icon">{icon}</span>
      <span className="sidebar-item-label">{label}</span>
    </button>
  );
}

export default function Sidebar({ activeScreen, onNavigate }) {
  const [projectsOpen, setProjectsOpen] = useState(
    projectItems.some((item) => item.label === activeScreen)
  );
  const hoverTimer = useRef(null);

  function cancelHover() {
    clearTimeout(hoverTimer.current);
  }

  // Like the Bitrix24 menu: resting the mouse on an item shows its screen.
  // Touch and pen have no hover, so they keep tap-to-open.
  function hoverToOpen(open) {
    return {
      onPointerEnter: (event) => {
        if (event.pointerType !== 'mouse') return;
        cancelHover();
        hoverTimer.current = setTimeout(open, HOVER_OPEN_DELAY);
      },
      onPointerLeave: cancelHover,
    };
  }

  useEffect(() => cancelHover, []);

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

      <nav className="sidebar-navigation">
        <SidebarItem
          icon="⌂"
          label="Home"
          active={activeScreen === 'Home'}
          onClick={() => {
            cancelHover();
            onNavigate('Home');
          }}
          {...hoverToOpen(() => onNavigate('Home'))}
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
          cancelHover();
          setProjectsOpen((open) => !open);
          onNavigate('Projects');
        }}
        {...hoverToOpen(() => {
          setProjectsOpen(true);
          onNavigate('Projects');
        })}
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
            onClick={() => {
              cancelHover();
              onNavigate(item.label);
            }}
            {...hoverToOpen(() => onNavigate(item.label))}
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
