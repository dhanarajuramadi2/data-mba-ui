
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'data-mba-projects';

const initialProjects = [
  {
    id: 1,
    name: 'test',
    owner: 'Rahul Sharma',
    source: 'Source Org',
    target: 'Target Org',
    status: 'Active',
    timeline: 10,
    priority: 'Medium',
    updated: '10/21/2026, 6:25 PM',
  },
  {
    id: 2,
    name: 'Testing from agent',
    owner: 'Priya Reddy',
    source: 'source',
    target: 'target',
    status: 'Active',
    timeline: 8,
    priority: 'Medium',
    updated: '4/29/2026, 10:22 AM',
  },
  {
    id: 3,
    name: 'Change Healthcare Acquisition',
    owner: 'Shivanand U',
    source: 'Change Healthcare Source',
    target: 'UnitedHealth Group Target',
    status: 'Active',
    timeline: 5,
    priority: 'Medium',
    updated: '4/21/2026, 9:28 AM',
  },
  {
    id: 4,
    name: 'Data migration',
    owner: 'Sneha Patel',
    source: 'Source Connection',
    target: 'Target Connection',
    status: 'Active',
    timeline: 10,
    priority: 'Medium',
    updated: '4/19/2026, 2:40 PM',
  },
  {
    id: 5,
    name: 'DeepHealth migration',
    owner: 'Shivanand U',
    source: 'Source Connection',
    target: 'Target Connection',
    status: 'Active',
    timeline: 16,
    priority: 'High',
    updated: '',
  },
  {
    id: 6,
    name: 'Legacy CRM Consolidation',
    owner: 'Shivanand U',
    source: 'Legacy CRM',
    target: 'Salesforce',
    status: 'Planning',
    timeline: 10,
    priority: 'Medium',
    updated: '',
  },
];

function readProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialProjects;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialProjects));
    return initialProjects;
  } catch {
    return initialProjects;
  }
}

export function useProjects() {
  const [projects, setProjectsState] = useState(readProjects);

  const setProjects = useCallback((value) => {
    setProjectsState((previous) => {
      const next =
        typeof value === 'function' ? value(previous) : value;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event('data-mba-projects-updated'));
      } catch (error) {
        console.error('Unable to save projects:', error);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const refreshProjects = () => {
      setProjectsState(readProjects());
    };

    window.addEventListener(
      'data-mba-projects-updated',
      refreshProjects
    );
    window.addEventListener('storage', refreshProjects);

    return () => {
      window.removeEventListener(
        'data-mba-projects-updated',
        refreshProjects
      );
      window.removeEventListener('storage', refreshProjects);
    };
  }, []);

  return [projects, setProjects];
}
