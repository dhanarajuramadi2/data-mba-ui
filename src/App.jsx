
import { useState } from 'react';
import Sidebar from './Component 1/Sidebar';
import './App.css';


import Connection from './Component 1/Connection';
import NewConnection from './Component 1/NewConnection';
import JobLibrary from './Component 1/JobLibrary';
import DataProfiling from './Component 1/DataProfiling';
import Migration from './Component 1/Migration';
import RunMonitor from './Component 1/RunMonitor';
import Reconciliation from './Component 1/Reconciliation';
import Files from './Component 1/Files';
import Home from './Component 1/Home';
import Projects from './Component 1/Projects';
import Archival from './Component 1/Archival';

export default function App() {
 const [activeScreen, setActiveScreen] = useState('Home');

  return (
    <div className="app-shell">
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
      />


    
      
      <main className="main-content">
        {activeScreen === 'Home' ? (
          <Home onNavigate={setActiveScreen} />
        ) : activeScreen === 'Projects' ? (
          <Projects />
        ) : activeScreen === 'Files' ? (
          <Files />
        ) : activeScreen === 'Reconciliation' ? (
          <Reconciliation />
        ) : activeScreen === 'Run Monitor' ? (
          <RunMonitor />
        ) : activeScreen === 'Migration' ? (
          <Migration />
        ) : activeScreen === 'Job Library' ? (
          <JobLibrary />
        ) : activeScreen === 'Data Profiling' ? (
          <DataProfiling />
        ) : activeScreen === 'Archival' ? (
          <Archival />
        ) : activeScreen === 'Connections' ? (
          <Connection />
        ) : (
          <Home onNavigate={setActiveScreen} />
        )}
      </main>


    </div>
  );
}
