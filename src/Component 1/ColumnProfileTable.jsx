
import { useMemo, useState } from 'react';


const columnsByObject = {
  Account: [
    { name: 'Name', declared: 'Text(255)', inferred: 'Text', populated: 100, distinct: '1,842', format: 'max len 120', finding: 'OK', tone: 'gray' },
    { name: 'AccountNumber', declared: 'Text(40)', inferred: 'Text', populated: 82, distinct: '1,510', format: 'alphanumeric', finding: 'Mixed formats', tone: 'orange' },
    { name: 'Industry', declared: 'Picklist', inferred: 'Picklist', populated: 76, distinct: '12', format: 'Salesforce picklist', finding: 'Review values', tone: 'orange' },
    { name: 'Phone', declared: 'Phone', inferred: 'Phone', populated: 72, distinct: '1,420', format: 'phone patterns', finding: 'Mixed formats', tone: 'orange' },
    { name: 'Website', declared: 'URL', inferred: 'URL', populated: 64, distinct: '1,100', format: 'https://', finding: 'Missing values', tone: 'orange' },
    { name: 'BillingCountry', declared: 'Text(80)', inferred: 'Text', populated: 96, distinct: '32', format: 'country names', finding: 'Review picklist', tone: 'red' },
  ],
  Contact: [
    { name: 'FirstName', declared: 'Text(40)', inferred: 'Text', populated: 92, distinct: '1,230', format: 'max len 35', finding: 'OK', tone: 'gray' },
    { name: 'LastName', declared: 'Text(80)', inferred: 'Text', populated: 100, distinct: '1,840', format: 'max len 70', finding: 'OK', tone: 'gray' },
    { name: 'Email', declared: 'Email', inferred: 'Email', populated: 87, distinct: '1,720', format: 'name@example.com', finding: 'Invalid emails', tone: 'orange' },
    { name: 'Phone', declared: 'Phone', inferred: 'Phone', populated: 72, distinct: '1,300', format: 'phone patterns', finding: 'Mixed formats', tone: 'orange' },
    { name: 'AccountId', declared: 'Lookup(Account)', inferred: 'Reference', populated: 94, distinct: '650', format: 'Salesforce ID', finding: 'Check references', tone: 'orange' },
  ],
  Lead: [
    { name: 'FirstName', declared: 'Text(40)', inferred: 'Text', populated: 86, distinct: '900', format: 'max len 35', finding: 'OK', tone: 'gray' },
    { name: 'LastName', declared: 'Text(80)', inferred: 'Text', populated: 100, distinct: '1,200', format: 'max len 70', finding: 'OK', tone: 'gray' },
    { name: 'Company', declared: 'Text(255)', inferred: 'Text', populated: 100, distinct: '1,100', format: 'max len 200', finding: 'OK', tone: 'gray' },
    { name: 'Email', declared: 'Email', inferred: 'Email', populated: 81, distinct: '1,050', format: 'name@example.com', finding: 'Invalid emails', tone: 'orange' },
    { name: 'Status', declared: 'Picklist', inferred: 'Picklist', populated: 100, distinct: '6', format: 'Lead status', finding: 'Coded values', tone: 'blue' },
  ],
  Opportunity: [
    { name: 'Name', declared: 'Text(120)', inferred: 'Text', populated: 100, distinct: '980', format: 'max len 100', finding: 'OK', tone: 'gray' },
    { name: 'StageName', declared: 'Picklist', inferred: 'Picklist', populated: 100, distinct: '8', format: 'Opportunity stages', finding: 'Coded values', tone: 'blue' },
    { name: 'Amount', declared: 'Currency', inferred: 'Currency', populated: 78, distinct: '810', format: 'decimal values', finding: 'Review amounts', tone: 'orange' },
    { name: 'CloseDate', declared: 'Date', inferred: 'Date', populated: 100, distinct: '240', format: 'YYYY-MM-DD', finding: 'Check dates', tone: 'orange' },
    { name: 'AccountId', declared: 'Lookup(Account)', inferred: 'Reference', populated: 95, distinct: '420', format: 'Salesforce ID', finding: 'Check references', tone: 'orange' },
  ],
  Case: [
    { name: 'CaseNumber', declared: 'Auto Number', inferred: 'Text', populated: 100, distinct: '1,840', format: 'numeric identifier', finding: 'Unique candidate', tone: 'green' },
    { name: 'Subject', declared: 'Text(255)', inferred: 'Text', populated: 98, distinct: '1,700', format: 'max len 180', finding: 'OK', tone: 'gray' },
    { name: 'Status', declared: 'Picklist', inferred: 'Picklist', populated: 100, distinct: '5', format: 'Case status', finding: 'Coded values', tone: 'blue' },
    { name: 'Priority', declared: 'Picklist', inferred: 'Picklist', populated: 100, distinct: '3', format: 'High/Medium/Low', finding: 'Coded values', tone: 'blue' },
    { name: 'ContactId', declared: 'Lookup(Contact)', inferred: 'Reference', populated: 82, distinct: '720', format: 'Salesforce ID', finding: 'Check references', tone: 'orange' },
  ],
};


  const pageSize = 10;

  export default function ColumnProfileTable({
    onSelectColumn,
    objectName = 'Account',
    recordId = '',
  }) {
  const columns = columnsByObject[objectName] || columnsByObject.Account;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedColumn, setSelectedColumn] = useState('country');

  const filteredColumns = useMemo(() => {
    const query = search.trim().toLowerCase();

    return columns.filter((column) =>
      [
        column.name,
        column.declared,
        column.inferred,
        column.format,
        column.finding,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [search]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredColumns.length / pageSize)
  );

  const visibleColumns = filteredColumns.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  return (
    <section className="column-profile-card">
      <div className="column-profile-heading">
        <div>
          <strong>{objectName} field profile</strong>
          <span> ({columns.length} columns)</span>
        </div>

        <label className="column-profile-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search columns..."
            aria-label="Search columns"
          />
        </label>
      </div>

      <div className="column-profile-table-scroll">
        <table className="column-profile-table">
          <thead>
            <tr>
              <th aria-label="Select column"></th>
              <th>Column ↕</th>
              <th>Declared type</th>
              <th>Inferred type</th>
              <th>Populated</th>
              <th>Distinct</th>
              <th>Format / pattern</th>
              <th>Finding</th>
              <th aria-label="Actions"></th>
            </tr>
          </thead>

          <tbody>
            {visibleColumns.map((column) => (
              <tr
                key={column.name}
                className={
                  selectedColumn === column.name ? 'selected' : ''
                }
               onClick={() => {
                setSelectedColumn(column.name);
                onSelectColumn?.(column.name);
                }}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${column.name}`}
                    checked={selectedColumn === column.name}
                    onChange={() => {
                        const nextColumn =
                        selectedColumn === column.name ? '' : column.name;

                        setSelectedColumn(nextColumn);
                        onSelectColumn?.(nextColumn);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    />
                </td>
                <td className="column-name">{column.name}</td>
                <td>{column.declared}</td>
                <td>{column.inferred}</td>
                <td>
                  <div className="population-cell">
                    <div className="population-track">
                      <div
                        className={`population-fill ${
                          column.populated < 70 ? 'low' : ''
                        }`}
                        style={{ width: `${column.populated}%` }}
                      />
                    </div>
                    <span>{column.populated}%</span>
                  </div>
                </td>
                <td>{column.distinct}</td>
                <td className="column-format">{column.format}</td>
                <td>
                  <span className={`finding-badge ${column.tone}`}>
                    {column.finding}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="column-row-menu"
                    aria-label={`Actions for ${column.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedColumn(column.name);
                      alert(`Actions for ${column.name}`);
                    }}
                  >
                    ⋮
                  </button>
                </td>
              </tr>
            ))}

            {visibleColumns.length === 0 && (
              <tr>
                <td colSpan={9} className="column-profile-empty">
                  No columns match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="column-profile-pagination">
        <span>
          Showing{' '}
          {filteredColumns.length === 0
            ? 0
            : (page - 1) * pageSize + 1}
          {' '}–{' '}
          {Math.min(page * pageSize, filteredColumns.length)}
          {' '}of {filteredColumns.length} columns
        </span>

        <div className="column-page-buttons">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ‹
          </button>

          {Array.from({ length: pageCount }, (_, index) => index + 1)
            .map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                className={page === pageNumber ? 'active' : ''}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

          <button
            type="button"
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
          >
            ›
          </button>
        </div>
      </footer>
    </section>
  );
}
