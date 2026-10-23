
import { useState } from 'react';
import './Migration.css';

const initialObjects = [
  { name: 'User', source: 'LEGACY_CRM_PG.users', operation: 'Match on Email', depends: '—', mapping: 'Ready', result: '412 / 434 found' },
  { name: 'Account', source: 'customers', operation: 'Upsert · Legacy_Id__c', depends: 'User', mapping: '39 / 42', result: '18 failed' },
  { name: 'Contact', source: 'contacts', operation: 'Upsert · Legacy_Id__c', depends: 'Account', mapping: 'Ready', result: '402,113 ok' },
  { name: 'Opportunity', source: 'ERP_ORACLE.orders', operation: 'Upsert · ERP_Order__c', depends: 'Account, Contact', mapping: 'Ready', result: 'Source unreachable' },
  { name: 'OpportunityLineItem', source: 'ERP_ORACLE.order_lines', operation: 'Insert', depends: 'Opportunity, PricebookEntry', mapping: 'Draft', result: 'Not run' },
  { name: 'Case', source: 'tickets', operation: 'Upsert · Legacy_Id__c', depends: 'Account, Contact', mapping: 'Ready', result: 'Not run' },
  { name: 'Task', source: 'activities', operation: 'Insert', depends: 'Contact, Case · polymorphic', mapping: 'Review', result: 'Not run' },
  { name: 'Files', source: 'INBOUND_SHARE manifest', operation: 'Insert + link', depends: 'Account, Case', mapping: 'Ready', result: '14 unmatched' },
];

const environments = ['DEV01', 'QA', 'UAT', 'PROD'];

const results = [
  ['User', 'OK', 'OK', '22', '—'],
  ['Account', 'OK', 'OK', '18', '—'],
  ['Contact', 'OK', 'OK', 'OK', '—'],
  ['Opportunity', 'OK', 'Fail', '—', '—'],
  ['Opp. line item', '—', '—', '—', '—'],
  ['Case', 'OK', '—', '—', '—'],
  ['Task', '—', '—', '—', '—'],
  ['Files', 'OK', 'OK', '14', '—'],
];

export default function Migration() {
  const [environment, setEnvironment] = useState('UAT');
  const [search, setSearch] = useState('');
  const [objects, setObjects] = useState(initialObjects);
  const [selectedObject, setSelectedObject] = useState('Account');
  const [menuObject, setMenuObject] = useState('');
  const [checks, setChecks] = useState([true, true]);

  const visibleObjects = objects.filter((item) =>
    `${item.name} ${item.source} ${item.operation}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  function moveObject(index, direction) {
    setObjects((previous) => {
      const next = [...previous];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return previous;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  return (
    <div className="migration-page">
      <header className="migration-topbar">
        <label className="migration-global-search">
          <span>⌕</span>
          <input placeholder="Search jobs, connections, migration plans..." />
        </label>
        <div className="migration-user">
        </div>
      </header>

      <section className="migration-heading">
        <div>
          <p className="migration-breadcrumb">Migration plans　›　 PLAN_LEGACY_CRM · 8 objects</p>
          <h1>Legacy CRM → Salesforce</h1>
          <p>Objects, load order and mappings are shared by every environment. A profile only swaps connections and batch size.</p>
        </div>
        <div className="migration-heading-actions">
          <button onClick={() => alert('Export plan requested')}>♧ Export plan</button>
          <button onClick={() => {
            const name = window.prompt('Enter the new object name');
            if (name?.trim()) {
              setObjects((previous) => [...previous, {
                name: name.trim(),
                source: 'Not configured',
                operation: 'Upsert',
                depends: '—',
                mapping: 'Draft',
                result: 'Not run',
              }]);
            }
          }}>＋ Add object</button>
          <button className="migration-primary" onClick={() => alert(`Run plan requested in ${environment}`)}>▶ Run plan in {environment}</button>
        </div>
      </section>

      <section className="migration-environment">
        <strong>Run against</strong>
        <div className="migration-environment-tabs">
          {environments.map((item) => (
            <button
              key={item}
              className={environment === item ? 'active' : ''}
              onClick={() => setEnvironment(item)}
            >
              {item === 'PROD' && <span className="migration-prod-dot" />}
              {item}
            </button>
          ))}
        </div>
      </section>

      <div className="migration-content">
        <section className="migration-objects-card">
          <div className="migration-card-heading">
            <h2>Objects in plan ({objects.length})</h2>
            <label className="migration-object-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search objects..."
              />
            </label>
          </div>

          <div className="migration-table-wrap">
            <table className="migration-table">
              <thead>
                <tr>
                  <th></th><th>#</th><th>Object · source</th>
                  <th>Operation</th><th>Depends on</th>
                  <th>Mapping</th><th>Last run · {environment}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visibleObjects.map((item) => {
                  const index = objects.findIndex((obj) => obj.name === item.name);
                  return (
                    <tr
                      key={`${item.name}-${index}`}
                      className={selectedObject === item.name ? 'selected' : ''}
                      onClick={() => setSelectedObject(item.name)}
                    >
                      <td className="migration-reorder">
                        <button title="Move up" onClick={(event) => {
                          event.stopPropagation();
                          moveObject(index, -1);
                        }}>⠿</button>
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <strong className={['Account', 'Files'].includes(item.name) ? 'migration-link' : ''}>{item.name}</strong>
                        <small>{item.source}</small>
                      </td>
                      <td>{item.operation}</td>
                      <td>{item.depends}</td>
                      <td><span className={`migration-pill ${item.mapping === 'Ready' ? 'success' : item.mapping === 'Draft' || item.mapping === 'Review' ? 'neutral' : 'warning'}`}>{item.mapping}</span></td>
                      <td><span className={`migration-pill ${item.result.includes('failed') || item.result === 'Source unreachable' ? 'danger' : item.result.includes('ok') ? 'success' : item.result === 'Not run' ? 'neutral' : 'warning'}`}>{item.result}</span></td>
                      <td className="migration-menu-cell">
                        <button onClick={(event) => {
                          event.stopPropagation();
                          setMenuObject(menuObject === item.name ? '' : item.name);
                        }}>⋮</button>
                        {menuObject === item.name && (
                          <div className="migration-row-menu">
                            <button onClick={() => { setSelectedObject(item.name); setMenuObject(''); }}>View object</button>
                            <button onClick={() => { alert(`Configure mapping for ${item.name}`); setMenuObject(''); }}>Configure mapping</button>
                            <button onClick={() => {
                              setObjects((previous) => previous.filter((obj) => obj.name !== item.name));
                              setMenuObject('');
                            }}>Remove object</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleObjects.length === 0 && (
                  <tr><td colSpan={8} className="migration-empty">No objects found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="migration-info">
            <span>i</span>
            Drag rows to reorder. The app blocks an order that loads a child before its parent, and runs independent objects in parallel.
          </div>
        </section>

        <aside className="migration-side-panels">
          <section className="migration-side-card">
            <h2>Last result by environment</h2>
            <table className="migration-results-table">
              <thead><tr><th>Object</th>{environments.map((env) => <th key={env}>{env}</th>)}</tr></thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row[0]}>
                    {row.map((value, index) => (
                      <td key={index}>
                        {index === 0 ? value : (
                          <span className={`migration-result-chip ${value === 'OK' ? 'success' : value === 'Fail' ? 'danger' : /^\d+$/.test(value) ? 'warning' : 'neutral'}`}>
                            {value}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="migration-side-card migration-prod-checks">
            <h2>Before running in PROD</h2>
            <p><span className="migration-check open">Open</span> UAT reconciliation signed off for every object</p>
            <p><span className="migration-check done">Done</span> Mappings unchanged since the UAT run (v7)</p>
            {[
              'Back up affected PROD records before loading',
              'Run outside business hours',
            ].map((label, index) => (
              <label key={label}>
                <input
                  type="checkbox"
                  checked={checks[index]}
                  onChange={() => setChecks((previous) => previous.map((value, i) => i === index ? !value : value))}
                />
                {label}
              </label>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
