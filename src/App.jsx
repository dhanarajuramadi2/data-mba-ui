
import { useState } from 'react';
import Sidebar from './Component 1/Sidebar';
import { FeedbackProvider } from './Component 1/ui/Feedback';
import './App.css';

import Connection from './Component 1/Connection';
import JobLibrary from './Component 1/JobLibrary';
import DataProfiling from './Component 1/DataProfiling';
import Migration from './Component 1/Migration';
import RunMonitor from './Component 1/RunMonitor';
import Reconciliation from './Component 1/Reconciliation';
import Files from './Component 1/Files';
import Home from './Component 1/Home';
import Projects from './Component 1/Projects';
import Archival from './Component 1/Archival';

function renderScreen(activeScreen, onNavigate) {
  switch (activeScreen) {
    case 'Projects':
      return <Projects />;
    case 'Files':
      return <Files />;
    case 'Reconciliation':
      return <Reconciliation />;
    case 'Run Monitor':
      return <RunMonitor />;
    case 'Migration':
      return <Migration onNavigate={onNavigate} />;
    case 'Job Library':
      return <JobLibrary />;
    case 'Data Profiling':
      return <DataProfiling />;
    case 'Archival':
      return <Archival onNavigate={onNavigate} />;
    case 'Connections':
      return <Connection />;
    default:
      return <Home onNavigate={onNavigate} />;
  }
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState('Home');

  return (
    <FeedbackProvider>
      <div className="app-shell">
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
        />

        <main className="main-content">
          {/* key replays the fade-in animation each time the screen changes */}
          <div key={activeScreen} className="screen-enter">
            {renderScreen(activeScreen, setActiveScreen)}
          </div>
        </main>
      </div>
    </FeedbackProvider>
  );
}
