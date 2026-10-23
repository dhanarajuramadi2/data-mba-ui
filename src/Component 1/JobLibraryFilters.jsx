
export default function JobLibraryFilters({
  activeFilter,
  setActiveFilter,
  search,
  setSearch,
  jobs,
}) {
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

      <button
        type="button"
        className="job-library-filter-settings"
        aria-label="Filter settings"
        onClick={() => alert('Advanced filters will be added later')}
      >
        ☷
      </button>
    </div>
  );
}
