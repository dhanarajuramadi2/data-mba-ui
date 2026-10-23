import { useState } from 'react';
import { useFeedback } from './ui/feedbackContext';

const mappings = [
  { source: 'United States', rows: '88,410', target: 'US', status: 'mapped' },
  { source: 'U.S.A.', rows: '12,033', target: 'Suggest US', status: 'suggest' },
  { source: 'United Kingdom', rows: '9,812', target: 'GB', status: 'mapped' },
  { source: 'UK', rows: '4,110', target: 'Suggest GB', status: 'suggest' },
  { source: 'India', rows: '7,201', target: 'IN', status: 'mapped' },
  { source: 'Deutschland', rows: '1,044', target: 'Suggest DE', status: 'suggest' },
  { source: 'Atlantis', rows: '3', target: 'No match', status: 'error' },
  { source: '(blank)', rows: '7,372', target: 'Leave null', status: 'neutral' },
];

export default function PicklistValueMapping({ selectedColumn = 'country' }) {
  const { notify } = useFeedback();
  const [accepted, setAccepted] = useState({});
  const [created, setCreated] = useState(false);
  const [showRows, setShowRows] = useState(false);

  const isPicklist = ['country', 'industry', 'status'].includes(selectedColumn);

  return (
    <aside className="picklist-mapping-panel">
      <div className="picklist-panel-heading">
        <span className="picklist-panel-icon">▤</span>
        <div>
          <small>{isPicklist ? 'Picklist value set' : 'Column details'}</small>
          <strong>
            {selectedColumn === 'country'
              ? 'country → BillingCountryCode'
              : selectedColumn === 'industry'
                ? 'industry → Industry'
                : selectedColumn === 'status'
                  ? 'status → Status'
                  : `${selectedColumn} · Profile details`}
          </strong>
          <p>
            {isPicklist
              ? 'Target uses Salesforce picklists (ISO codes)'
              : 'Review column profiling results and data quality findings'}
          </p>
        </div>
      </div>

      {isPicklist ? (
        <>
          <div className="picklist-table-heading">
            <span>Source value</span>
            <span>Rows</span>
            <span>Target</span>
          </div>

          <div className="picklist-values">
            {mappings.map((item) => (
              <div className="picklist-value-row" key={item.source}>
                <span>{item.source}</span>
                <span>{item.rows}</span>
                <button
                  type="button"
                  className={`picklist-target ${item.status}`}
                  onClick={() =>
                    {
                      setCreated(false);
                      setAccepted((previous) => ({
                        ...previous,
                        [item.source]: !previous[item.source],
                      }));
                    }
                  }
                >
                  {accepted[item.source] ? 'Accepted' : item.target}
                </button>
              </div>
            ))}
          </div>

          <p className="picklist-panel-note">
            Accepting suggestions creates a reusable value map the migration job can apply.
          </p>
        </>
      ) : (
        <div className="picklist-column-details">
          <p>Selected column: <strong>{selectedColumn}</strong></p>
          <p>Review the column’s type, completeness, format, and finding in the table.</p>
        </div>
      )}

      <div className="picklist-panel-actions">
        <button
          type="button"
          className="picklist-create-button"
          onClick={() => {
            if (!isPicklist) {
              notify('Value maps are for picklist columns', {
                type: 'info',
                message: 'Pick country, industry or status to build one.',
              });
              return;
            }
            const suggestions = mappings.filter((item) => item.status === 'suggest');
            const pending = suggestions.filter((item) => !accepted[item.source]);
            const unmatched = mappings.filter((item) => item.status === 'error').length;
            setAccepted((previous) => ({
              ...previous,
              ...Object.fromEntries(suggestions.map((item) => [item.source, true])),
            }));
            setCreated(true);
            notify(`Value map created · ${selectedColumn}`, {
              type: unmatched ? 'warning' : 'success',
              message: `${mappings.length - unmatched} values mapped${pending.length ? ` (${pending.length} suggestions auto-accepted)` : ''}${unmatched ? ` · ${unmatched} with no match` : ''}.`,
            });
          }}
        >
          {created ? '✓ Value map saved' : 'Create value map'}
        </button>

        <button
          type="button"
          className="picklist-view-button"
          onClick={() => setShowRows((previous) => !previous)}
        >
          {showRows ? 'Hide rows' : 'View rows'}
        </button>
      </div>

      {showRows && (
        <div className="picklist-rows-preview">
          <strong>Sample rows</strong>
          <p>Showing sample source records for {selectedColumn}.</p>
          <p>Connect this panel to your data source to display actual records.</p>
        </div>
      )}
    </aside>
  );
}