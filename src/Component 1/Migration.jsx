import { useCallback, useState } from 'react';
import { Modal, Spinner } from './ui/Feedback';
import { ComboBox } from './ui/ComboBox';
import { useCloseOnOutsideClick, useFeedback } from './ui/feedbackContext';
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

// Last result per object, one value per environment (DEV01, QA, UAT, PROD).
const initialResults = {
  User: ['OK', 'OK', '22', '—'],
  Account: ['OK', 'OK', '18', '—'],
  Contact: ['OK', 'OK', 'OK', '—'],
  Opportunity: ['OK', 'Fail', '—', '—'],
  OpportunityLineItem: ['—', '—', '—', '—'],
  Case: ['OK', '—', '—', '—'],
  Task: ['—', '—', '—', '—'],
  Files: ['OK', 'OK', '14', '—'],
};

const operations = ['Insert', 'Update', 'Upsert · Legacy_Id__c', 'Delete', 'Match on Email'];

// Target fields used by the mapping editor. Required fields must be mapped before the object is Ready.
const targetFields = [
  { name: 'Legacy_Id__c', required: true },
  { name: 'Name', required: true },
  { name: 'OwnerId', required: true, hint: 'Lookup · User by Email' },
  { name: 'CreatedDate', required: false, hint: 'Needs "Set Audit Fields"' },
  { name: 'Status__c', required: false, hint: 'Picklist' },
  { name: 'Description', required: false },
  { name: 'Phone', required: false },
];

const sourceColumns = ['id', 'name', 'owner_email', 'created_at', 'status', 'notes', 'phone_number', 'region'];

const autoMatches = {
  Legacy_Id__c: 'id',
  Name: 'name',
  OwnerId: 'owner_email',
  CreatedDate: 'created_at',
  Status__c: 'status',
  Description: 'notes',
  Phone: 'phone_number',
};

const pillClass = (value) =>
  value === 'Ready'
    ? 'success'
    : value === 'Draft' || value === 'Review'
      ? 'neutral'
      : 'warning';

const resultClass = (value) =>
  value.includes('failed') || value === 'Source unreachable'
    ? 'danger'
    : value.includes('ok')
      ? 'success'
      : value === 'Not run' || value.startsWith('Skipped')
        ? 'neutral'
        : value === 'Running…' || value === 'Queued'
          ? 'running'
          : 'warning';

const chipClass = (value) =>
  value === 'OK' ? 'success' : value === 'Fail' ? 'danger' : /^\d+$/.test(value) ? 'warning' : 'neutral';

function ObjectModal({ existingNames, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', source: '', operation: 'Upsert · Legacy_Id__c', depends: [] });
  const [error, setError] = useState('');

  const submit = () => {
    const name = form.name.trim();
    if (!name) return setError('Object name is required.');
    if (existingNames.includes(name)) return setError(`${name} is already in the plan.`);
    onSave({
      name,
      source: form.source.trim() || 'Not configured',
      operation: form.operation,
      depends: form.depends.length ? form.depends.join(', ') : '—',
      mapping: 'Draft',
      result: 'Not run',
    });
  };

  const toggleDepend = (name) =>
    setForm((previous) => ({
      ...previous,
      depends: previous.depends.includes(name)
        ? previous.depends.filter((item) => item !== name)
        : [...previous.depends, name],
    }));

  return (
    <Modal
      title="Add object to plan"
      subtitle="The object is added at the end of the load order. Drag it to change the order."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ui-button secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="ui-button primary" onClick={submit}>Add object</button>
        </>
      }
    >
      <div className="ui-field-grid">
        <label className="ui-field">
          <span>Salesforce object *</span>
          <ComboBox
            value={form.name}
            placeholder="e.g. Asset"
            options={['Asset', 'Contract', 'Event', 'Lead', 'Order', 'Product2', 'Quote']}
            onChange={(name) => { setForm((previous) => ({ ...previous, name })); setError(''); }}
          />
        </label>
        <label className="ui-field">
          <span>Source table</span>
          <input
            value={form.source}
            placeholder="LEGACY_CRM_PG.assets"
            onChange={(event) => setForm({ ...form, source: event.target.value })}
          />
        </label>
      </div>

      <div className="ui-field">
        <span>Operation</span>
        <div className="migration-segmented">
          {operations.slice(0, 4).map((item) => (
            <button
              type="button"
              key={item}
              className={form.operation === item ? 'active' : ''}
              onClick={() => setForm({ ...form, operation: item })}
            >
              {item.split(' ·')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="ui-field">
        <span>Depends on (loaded first)</span>
        <div className="migration-chip-picker">
          {existingNames.map((name) => (
            <button
              type="button"
              key={name}
              className={form.depends.includes(name) ? 'active' : ''}
              onClick={() => toggleDepend(name)}
            >
              {form.depends.includes(name) ? '✓ ' : ''}{name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="ui-field-error">{error}</p>}
    </Modal>
  );
}

function MappingModal({ object, onClose, onSave }) {
  const [mapping, setMapping] = useState(() => {
    if (object.mapping === 'Ready') return { ...autoMatches };
    if (object.mapping === 'Draft') return {};
    return { Legacy_Id__c: 'id', Name: 'name', Status__c: 'status' };
  });

  const missing = targetFields.filter((field) => field.required && !mapping[field.name]);
  const mappedCount = targetFields.filter((field) => mapping[field.name]).length;

  return (
    <Modal
      size="large"
      title={`Mapping · ${object.source} → ${object.name}`}
      subtitle={`${object.operation} · ${mappedCount} of ${targetFields.length} fields mapped`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="ui-button secondary migration-automap"
            onClick={() => setMapping({ ...autoMatches, ...mapping })}
          >
            ✦ Auto-map by name
          </button>
          <button type="button" className="ui-button secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="ui-button primary"
            onClick={() => onSave(missing.length ? 'Review' : 'Ready', mappedCount)}
          >
            Save mapping
          </button>
        </>
      }
    >
      {missing.length > 0 ? (
        <p className="migration-mapping-alert">
          ! {missing.length} required field{missing.length === 1 ? '' : 's'} not mapped: {missing.map((field) => field.name).join(', ')}
        </p>
      ) : (
        <p className="migration-mapping-alert ok">✓ All required fields are mapped.</p>
      )}

      <div className="migration-mapping-wrap">
        <table className="migration-mapping-table">
          <thead>
            <tr><th>Target field</th><th></th><th>Source column</th><th>Preview</th></tr>
          </thead>
          <tbody>
            {targetFields.map((field) => {
              const value = mapping[field.name] || '';
              const invalid = field.required && !value;
              return (
                <tr key={field.name} className={invalid ? 'invalid' : ''}>
                  <td>
                    <strong>{field.name}</strong>
                    {field.required && <b className="migration-required">Required</b>}
                    {field.hint && <small>{field.hint}</small>}
                  </td>
                  <td className="migration-mapping-arrow">←</td>
                  <td>
                    <select
                      value={value}
                      onChange={(event) =>
                        setMapping((previous) => ({ ...previous, [field.name]: event.target.value }))
                      }
                    >
                      <option value="">— Not mapped —</option>
                      {sourceColumns.map((column) => (
                        <option key={column} value={column}>{column}</option>
                      ))}
                    </select>
                  </td>
                  <td className="migration-preview-cell">
                    {value ? `${value} = ${value === 'id' ? 'C1004821' : value === 'name' ? 'ACME Industrial' : value === 'owner_email' ? 'r.sharma@acme.com' : '…'}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function RowMenu({ onClose, onView, onMapping, onRemove }) {
  useCloseOnOutsideClick(true, onClose);
  return (
    <div className="migration-row-menu ui-popup-menu" onClick={(event) => event.stopPropagation()}>
      <button onClick={onView}>View object</button>
      <button onClick={onMapping}>Configure mapping</button>
      <button className="danger" onClick={onRemove}>Remove object</button>
    </div>
  );
}

// Simulated per-object outcome for a plan run.
function simulateOutcome(item) {
  if (item.mapping === 'Draft') return { result: 'Skipped · mapping draft', chip: '—' };
  if (item.source.startsWith('ERP_ORACLE')) return { result: 'Source unreachable', chip: 'Fail' };
  if (item.mapping === 'Review' || /^\d+ \/ \d+$/.test(item.mapping)) {
    const failed = 5 + Math.floor(Math.random() * 30);
    return { result: `${failed} failed`, chip: String(failed) };
  }
  const ok = 1000 + Math.floor(Math.random() * 400000);
  return { result: `${ok.toLocaleString('en-US')} ok`, chip: 'OK' };
}

export default function Migration({ onNavigate }) {
  const { notify, confirm } = useFeedback();
  const [environment, setEnvironment] = useState('UAT');
  const [search, setSearch] = useState('');
  const [objects, setObjects] = useState(initialObjects);
  const [results, setResults] = useState(initialResults);
  const [selectedObject, setSelectedObject] = useState('Account');
  const [menuObject, setMenuObject] = useState('');
  const [checks, setChecks] = useState([false, false]);
  const [modal, setModal] = useState(null); // { type: 'add' } | { type: 'mapping', object }
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [running, setRunning] = useState(false);

  const closeMenu = useCallback(() => setMenuObject(''), []);
  const envIndex = environments.indexOf(environment);

  const visibleObjects = objects.filter((item) =>
    `${item.name} ${item.source} ${item.operation}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const updateObject = (name, changes) =>
    setObjects((previous) => previous.map((item) => (item.name === name ? { ...item, ...changes } : item)));

  // Returns the name of an object that would load before one of its dependencies, if any.
  function findOrderProblem(list) {
    for (let index = 0; index < list.length; index += 1) {
      const deps = list[index].depends.split(/,|·/).map((dep) => dep.trim());
      const late = deps.find((dep) => list.findIndex((item) => item.name === dep) > index);
      if (late) return `${list[index].name} depends on ${late}`;
    }
    return null;
  }

  function moveObject(from, to) {
    if (from === to || from < 0 || to < 0 || to >= objects.length) return;
    const next = [...objects];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    const problem = findOrderProblem(next);
    if (problem) {
      notify('Load order blocked', {
        type: 'error',
        message: `${problem}, so it can't load first.`,
      });
      return;
    }
    setObjects(next);
    notify(`${moved.name} moved to position ${to + 1}`, { type: 'success', duration: 2200 });
  }

  const exportPlan = () => {
    const plan = { plan: 'PLAN_LEGACY_CRM', environment, exportedAt: new Date().toISOString(), objects };
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'PLAN_LEGACY_CRM.json';
    link.click();
    URL.revokeObjectURL(url);
    notify('Plan exported', { type: 'success', message: 'PLAN_LEGACY_CRM.json · connections and secrets excluded.' });
  };

  const runPlan = async () => {
    if (environment === 'PROD') {
      if (!checks.every(Boolean)) {
        notify('Complete the PROD checklist first', {
          type: 'warning',
          message: 'Tick every item under "Before running in PROD".',
        });
        return;
      }
      const ok = await confirm({
        title: 'Run plan in PROD?',
        message: `This writes ${objects.length} objects to SF_PROD. UAT reconciliation is still open for some objects.`,
        confirmLabel: 'Run in PROD',
        danger: true,
      });
      if (!ok) return;
    }

    setRunning(true);
    const order = [...objects];
    setObjects((previous) => previous.map((item) => ({ ...item, result: 'Queued' })));
    notify(`Plan started in ${environment}`, { message: `${order.length} objects in load order.` });

    let failures = 0;
    for (const item of order) {
      updateObject(item.name, { result: 'Running…' });
      setSelectedObject(item.name);
      await new Promise((resolve) => window.setTimeout(resolve, 700 + Math.random() * 600));
      const outcome = simulateOutcome(item);
      if (outcome.chip !== 'OK') failures += 1;
      updateObject(item.name, { result: outcome.result });
      setResults((previous) => {
        const row = [...(previous[item.name] || ['—', '—', '—', '—'])];
        row[envIndex] = outcome.chip;
        return { ...previous, [item.name]: row };
      });
    }

    setRunning(false);
    notify(`Plan finished in ${environment}`, {
      type: failures ? 'warning' : 'success',
      message: failures
        ? `${order.length - failures} objects loaded · ${failures} need attention.`
        : 'Every object loaded.',
      duration: 6000,
    });
  };

  const removeObject = async (item) => {
    const dependants = objects.filter((obj) => obj.depends.includes(item.name)).map((obj) => obj.name);
    const ok = await confirm({
      title: `Remove ${item.name} from the plan?`,
      message: dependants.length
        ? `${dependants.join(', ')} depend${dependants.length === 1 ? 's' : ''} on ${item.name} and may fail without it.`
        : 'The mapping is deleted with it.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setObjects((previous) => previous.filter((obj) => obj.name !== item.name));
    notify(`${item.name} removed`);
  };

  return (
    <div className="migration-page">
      <header className="migration-topbar">
        <label className="migration-global-search">
          <span>⌕</span>
          <input
            placeholder="Search objects in this plan..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="migration-user">
        </div>
      </header>

      <section className="migration-heading">
        <div>
          <p className="migration-breadcrumb">Migration plans　›　 PLAN_LEGACY_CRM · {objects.length} objects</p>
          <h1>Legacy CRM → Salesforce</h1>
          <p>Objects, load order and mappings are shared by every environment. A profile only swaps connections and batch size.</p>
        </div>
        <div className="migration-heading-actions">
          <button onClick={exportPlan}>♧ Export plan</button>
          <button onClick={() => setModal({ type: 'add' })} disabled={running}>＋ Add object</button>
          <button className="migration-primary" onClick={runPlan} disabled={running}>
            {running ? <><Spinner /> Running in {environment}…</> : <>▶ Run plan in {environment}</>}
          </button>
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
              disabled={running}
            >
              {item === 'PROD' && <span className="migration-prod-dot" />}
              {item}
            </button>
          ))}
        </div>
        {running && (
          <button type="button" className="migration-monitor-link" onClick={() => onNavigate?.('Run Monitor')}>
            Open Run Monitor →
          </button>
        )}
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
                  const canDrag = !running && !search;
                  return (
                    <tr
                      key={item.name}
                      className={[
                        selectedObject === item.name ? 'selected' : '',
                        dragIndex === index ? 'migration-dragging' : '',
                        dropIndex === index && dragIndex !== index ? 'migration-drop-target' : '',
                      ].join(' ')}
                      onClick={() => setSelectedObject(item.name)}
                      draggable={canDrag}
                      onDragStart={(event) => {
                        setDragIndex(index);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(event) => {
                        if (dragIndex === null) return;
                        event.preventDefault();
                        setDropIndex(index);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        moveObject(dragIndex, index);
                        setDragIndex(null);
                        setDropIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDropIndex(null);
                      }}
                    >
                      <td className="migration-reorder">
                        <button
                          title={canDrag ? 'Drag to reorder · click to move up' : 'Clear search to reorder'}
                          disabled={!canDrag}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveObject(index, index - 1);
                          }}
                        >
                          ⠿
                        </button>
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <strong
                          className="migration-link"
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ type: 'mapping', object: item });
                          }}
                        >
                          {item.name}
                        </strong>
                        <small>{item.source}</small>
                      </td>
                      <td>{item.operation}</td>
                      <td>{item.depends}</td>
                      <td>
                        <button
                          type="button"
                          className={`migration-pill migration-pill-button ${pillClass(item.mapping)}`}
                          title="Configure mapping"
                          onClick={(event) => {
                            event.stopPropagation();
                            setModal({ type: 'mapping', object: item });
                          }}
                        >
                          {item.mapping}
                        </button>
                      </td>
                      <td>
                        <span className={`migration-pill ${resultClass(item.result)}`}>
                          {item.result === 'Running…' && <Spinner />} {item.result}
                        </span>
                      </td>
                      <td className="migration-menu-cell">
                        <button onClick={(event) => {
                          event.stopPropagation();
                          setMenuObject(menuObject === item.name ? '' : item.name);
                        }}>⋮</button>
                        {menuObject === item.name && (
                          <RowMenu
                            onClose={closeMenu}
                            onView={() => { setSelectedObject(item.name); closeMenu(); }}
                            onMapping={() => { setModal({ type: 'mapping', object: item }); closeMenu(); }}
                            onRemove={() => { closeMenu(); removeObject(item); }}
                          />
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
              <thead><tr><th>Object</th>{environments.map((env) => <th key={env} className={env === environment ? 'active' : ''}>{env}</th>)}</tr></thead>
              <tbody>
                {objects.map((item) => {
                  const row = results[item.name] || ['—', '—', '—', '—'];
                  return (
                    <tr key={item.name} className={selectedObject === item.name ? 'selected' : ''}>
                      <td>{item.name === 'OpportunityLineItem' ? 'Opp. line item' : item.name}</td>
                      {row.map((value, index) => (
                        <td key={environments[index]}>
                          <span className={`migration-result-chip ${chipClass(value)}`}>{value}</span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className={`migration-side-card migration-prod-checks ${environment === 'PROD' ? 'highlight' : ''}`}>
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

      {modal?.type === 'add' && (
        <ObjectModal
          existingNames={objects.map((item) => item.name)}
          onClose={() => setModal(null)}
          onSave={(object) => {
            setObjects((previous) => [...previous, object]);
            setSelectedObject(object.name);
            setModal(null);
            notify(`${object.name} added`, { type: 'success', message: 'Configure its mapping before running the plan.' });
          }}
        />
      )}

      {modal?.type === 'mapping' && (
        <MappingModal
          object={modal.object}
          onClose={() => setModal(null)}
          onSave={(status, mappedCount) => {
            updateObject(modal.object.name, { mapping: status });
            setModal(null);
            notify(`Mapping saved · ${modal.object.name}`, {
              type: status === 'Ready' ? 'success' : 'warning',
              message: status === 'Ready'
                ? `${mappedCount} fields mapped. Ready to run.`
                : 'Some required fields are still unmapped. Marked for review.',
            });
          }}
        />
      )}
    </div>
  );
}
