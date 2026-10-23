import { useCallback, useState } from 'react';
import { useCloseOnOutsideClick } from './ui/feedbackContext';

const resultOptions = [
  { value: 'all', label: 'All results' },
  { value: 'error', label: 'Failed' },
  { value: 'warning', label: 'Warnings' },
  { value: 'success', label: 'Succeeded' },
  { value: 'neutral', label: 'Not run' },
];


export default function JobLibraryFilters({
  activeFilter,
  setActiveFilter,
  search,
  setSearch,
  resultFilter,
  setResultFilter,
  jobs,
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useCloseOnOutsideClick(open, close);
  const filters = ['All', 'Migration', 'Archival', 'Files', 'Profile'];

  const getCount = (filter) =>
    filter === 'All'
      ? jobs.length
      : jobs.filter((job) => job.type === filter).length;

  return (
    <div className="job-library-filters">
      <div className="job-library-filter-tabs">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`job-library-filter-tab ${
              activeFilter === filter ? 'selected' : ''
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
            <span>{getCount(filter)}</span>
          </button>
        ))}
      </div>

      <div className="job-library-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search jobs..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search jobs"
        />
      </div>

      <div className="job-filter-settings-wrap">
        <button
          type="button"
          className={`job-library-filter-settings ${resultFilter !== 'all' ? 'active' : ''}`}
          aria-label="Filter by result"
          aria-expanded={open}
          title="Filter by result"
          onClick={() => setOpen((value) => !value)}
        >
          ☷
          {resultFilter !== 'all' && <span className="job-filter-dot" />}
        </button>

        {open && (
          <div className="job-row-menu job-filter-menu ui-popup-menu">
            {resultOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={resultFilter === option.value ? 'active' : ''}
                onClick={() => {
                  setResultFilter(option.value);
                  setOpen(false);
                }}
              >
                {resultFilter === option.value ? '✓ ' : ''}{option.label}
                <span>
                  {option.value === 'all'
                    ? jobs.length
                    : jobs.filter((job) => job.resultType === option.value).length}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
