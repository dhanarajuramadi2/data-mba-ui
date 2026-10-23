
import { useEffect, useState } from 'react';
import './DataProfiling.css';

export default function DataProfiling() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [sourceType, setSourceType] = useState('Salesforce');
  const [showDetails, setShowDetails] = useState(false);

  const [name, setName] = useState('');
  const [sourceConnection, setSourceConnection] = useState('');
  const [objectName, setObjectName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [showRunPrompt, setShowRunPrompt] = useState(false);

  
  const [savedProfiles, setSavedProfiles] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('dataProfilingProfiles') || '[]'
      );
    } catch {
      return [];
    }
  });

  const [showSavedList, setShowSavedList] = useState(true);

  useEffect(() => {
    localStorage.setItem(
      'dataProfilingProfiles',
      JSON.stringify(savedProfiles)
    );
  }, [savedProfiles]);

  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileResults, setShowProfileResults] = useState(false);
  const currentProfileResults = selectedProfile?.profileResults;

  
  const profileColumns = {
    Account: [
      ['Name', 'Text', 'Text', '98.5%', 'Account name'],
      ['AccountNumber', 'Text(40)', 'Text', '82%', 'Alphanumeric'],
      ['Industry', 'Picklist', 'Picklist', '64.3%', 'Industry values'],
      ['Phone', 'Phone', 'Phone', '72.1%', 'Mixed formats'],
      ['BillingCountry', 'Text', 'Picklist', '96%', 'Country values'],
      ['AnnualRevenue', 'Currency', 'Currency', '58.9%', 'Numeric values'],
    ],
    Contact: [
      ['FirstName', 'Text(40)', 'Text', '95%', 'First name'],
      ['LastName', 'Text(80)', 'Text', '99%', 'Last name'],
      ['Email', 'Email', 'Email', '87.6%', 'Invalid email candidates'],
      ['Phone', 'Phone', 'Phone', '72.1%', 'Mixed formats'],
      ['AccountId', 'Reference', 'Lookup', '91%', 'Account relationship'],
      ['MailingCountry', 'Text', 'Picklist', '84%', 'Country values'],
    ],
    Lead: [
      ['FirstName', 'Text(40)', 'Text', '89%', 'First name'],
      ['LastName', 'Text(80)', 'Text', '98%', 'Last name'],
      ['Company', 'Text(255)', 'Text', '96%', 'Company name'],
      ['Email', 'Email', 'Email', '81%', 'Invalid email candidates'],
      ['Status', 'Picklist', 'Picklist', '100%', 'Lead status values'],
      ['LeadSource', 'Picklist', 'Picklist', '76%', 'Lead source values'],
    ],
    Opportunity: [
      ['Name', 'Text(120)', 'Text', '99%', 'Opportunity name'],
      ['StageName', 'Picklist', 'Picklist', '100%', 'Stage values'],
      ['Amount', 'Currency', 'Currency', '78%', 'Numeric values'],
      ['CloseDate', 'Date', 'Date', '96%', 'Date format'],
      ['AccountId', 'Reference', 'Lookup', '92%', 'Account relationship'],
      ['Probability', 'Percent', 'Numeric', '88%', 'Percentage values'],
    ],
    Case: [
      ['CaseNumber', 'Auto Number', 'Text', '100%', 'Unique identifier'],
      ['Subject', 'Text(255)', 'Text', '96%', 'Case subject'],
      ['Status', 'Picklist', 'Picklist', '100%', 'Case status values'],
      ['Priority', 'Picklist', 'Picklist', '98%', 'Priority values'],
      ['Origin', 'Picklist', 'Picklist', '94%', 'Case origin values'],
      ['AccountId', 'Reference', 'Lookup', '82%', 'Account relationship'],
    ],
  };



  
  const handleNew = () => {
    setShowNewForm(true);
    setShowDetails(false);
    setShowSavedList(true);
    setSourceType('Salesforce');
    setName('');
    setSourceConnection('');
    setObjectName('');
    setCsvFile(null);
  };


  const handleNext = () => {
    setShowDetails(true);
  };

  const handleBack = () => {
    setShowDetails(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name.');
      return;
    }

    if (sourceType === 'Salesforce' && (!sourceConnection || !objectName)) {
      alert('Please select a source connection and table/object.');
      return;
    }

    if (sourceType === 'CSV' && !csvFile) {
      alert('Please upload a CSV file.');
      return;
    }


    const newProfile = {
      id: `DP-${Date.now()}`,
      name: name.trim(),
      sourceType,
      sourceConnection:
        sourceType === 'Salesforce' ? sourceConnection : csvFile.name,
      objectName: sourceType === 'Salesforce' ? objectName : csvFile.name,
      createdAt: new Date().toLocaleString(),
      status: 'Saved',
      profiled: false,
      profileResults: null,
    };

    setSavedProfiles((previousProfiles) => [
      ...previousProfiles,
      newProfile,
    ]);

    setShowNewForm(false);
    setShowDetails(false);
    setShowSavedList(true);
  };

  
  
  const handleRunProfile = () => {
    if (!selectedProfile) return;

    // Generate the profile details for this record.
    const columns = profileColumns[selectedProfile.objectName] || [];

    const profileResults = {
      rows: 184302,
      columnCount: columns.length,
      completeness: '81.4%',
      duplicateCandidates: 2318,
      columnsWithIssues: 7,
      columns,
      profiledAt: new Date().toISOString(),
    };

    const updatedProfile = {
      ...selectedProfile,
      profiled: true,
      status: 'Profiled',
      profileResults,
    };

    // Save the results against this specific record.
    setSavedProfiles((previousProfiles) =>
      previousProfiles.map((profile) =>
        profile.id === selectedProfile.id ? updatedProfile : profile
      )
    );

    setSelectedProfile(updatedProfile);
    setShowRunPrompt(false);
    setShowProfileResults(true);
  };



  return (
    <main className="data-profiling-page">
      <header className="data-profiling-header">
        <h1 className="data-profiling-title">Data Profiling</h1>

        <button
          type="button"
          className="data-profiling-new-button"
          onClick={handleNew}
        >
          + New
        </button>
      </header>

      {showSavedList && !showNewForm && !showRunPrompt && !showProfileResults && (
      <section className="data-profiling-records">
        <div className="data-profiling-list-header">
          <div>
            <h2>Recently Viewed</h2>
            <p>{savedProfiles.length} items</p>
          </div>
        </div>

        <div className="data-profiling-records-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source Type</th>
                <th>Source Connection / File</th>
                <th>Table / Object</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {savedProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <button
                      type="button"
                      className="data-profiling-record-link"
                      
                    onClick={() => {
                      setSelectedProfile(profile);
                      setShowProfileResults(
                        Boolean(profile.profiled && profile.profileResults)
                      );
                      setShowRunPrompt(
                        !(profile.profiled && profile.profileResults)
                      );
                      setShowNewForm(false);
                      setShowSavedList(false);
                    }}

                    >
                      {profile.name}
                    </button>
                  </td>
                  <td>{profile.sourceType === 'CSV' ? 'File (CSV)' : 'Salesforce'}</td>
                  <td>{profile.sourceConnection}</td>
                  <td>{profile.objectName}</td>
                  <td>
                    <span className="data-profiling-status">
                      {profile.status}
                    </span>
                  </td>
                  <td>{profile.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )}

      {showNewForm && (
        <section className="data-profiling-form">
          <div className="data-profiling-form-header">
            <h2>{showDetails ? 'New Data Profiling' : 'Select Source Type'}</h2>

            <button
              type="button"
              className="data-profiling-close-button"
              onClick={() => setShowNewForm(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {!showDetails ? (
            <>
              <p className="data-profiling-description">
                Select the source for your profiling task.
              </p>

              <div className="data-profiling-radio-options">
                <label className="data-profiling-radio-card">
                  <input
                    type="radio"
                    name="sourceType"
                    value="Salesforce"
                    checked={sourceType === 'Salesforce'}
                    onChange={() => setSourceType('Salesforce')}
                  />

                  <span>
                    <strong>Salesforce</strong>
                    <small>Profile data from a Salesforce connection</small>
                  </span>
                </label>

                <label className="data-profiling-radio-card">
                  <input
                    type="radio"
                    name="sourceType"
                    value="CSV"
                    checked={sourceType === 'CSV'}
                    onChange={() => setSourceType('CSV')}
                  />

                  <span>
                    <strong>File (CSV)</strong>
                    <small>Profile data from an uploaded CSV file</small>
                  </span>
                </label>
              </div>

              <div className="data-profiling-form-actions">
                <button
                  type="button"
                  className="data-profiling-cancel-button"
                  onClick={() => setShowNewForm(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="data-profiling-next-button"
                  onClick={handleNext}
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="data-profiling-description">
                Enter the details for your {sourceType === 'CSV' ? 'CSV file' : 'Salesforce'} profiling task.
              </p>

              <div className="data-profiling-fields">
                <label className="data-profiling-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter profiling name"
                  />
                </label>

                {sourceType === 'Salesforce' ? (
                  <>
                    <label className="data-profiling-field">
                      <span>Source connection</span>
                      <select
                        value={sourceConnection}
                        onChange={(event) => setSourceConnection(event.target.value)}
                      >
                        <option value="">Select connection</option>
                        <option value="LEGACY_CRM_PG">LEGACY_CRM_PG</option>
                        <option value="ERP_ORACLE">ERP_ORACLE</option>
                        <option value="DW_MSSQL">DW_MSSQL</option>
                      </select>
                    </label>

                    <label className="data-profiling-field">
                      <span>Table / Object / File</span>
                      <select
                        value={objectName}
                        onChange={(event) => setObjectName(event.target.value)}
                      >
                        <option value="">Select table/object</option>
                        <option value="Account">Account</option>
                        <option value="Contact">Contact</option>
                        <option value="Lead">Lead</option>
                        <option value="Opportunity">Opportunity</option>
                        <option value="Case">Case</option>
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="data-profiling-field">
                    <span>Upload file (CSV)</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setCsvFile(event.target.files?.[0] ?? null)
                      }
                    />
                    {csvFile && (
                      <small className="data-profiling-file-name">
                        Selected: {csvFile.name}
                      </small>
                    )}
                  </label>
                )}
              </div>

              <div className="data-profiling-form-actions">
                <button
                  type="button"
                  className="data-profiling-cancel-button"
                  onClick={handleBack}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  className="data-profiling-next-button"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </section>
      )}
      
    {showRunPrompt && selectedProfile && (
      <section className="data-profiling-run-prompt">
        <h2>{selectedProfile.name}</h2>
        <p>
          Ready to profile {selectedProfile.objectName}?
          Click Run profile to view the profiling results.
        </p>
        <div className="data-profiling-form-actions">
          <button
            type="button"
            className="data-profiling-cancel-button"
            onClick={() => setShowRunPrompt(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="data-profiling-next-button"
            onClick={handleRunProfile}
          >
            Run profile
          </button>
        </div>
      </section>
    )}

    {showProfileResults && selectedProfile && (
      <section className="data-profile-results">
        <div className="data-profile-results-header">
          <div>
            <h2>{selectedProfile.name}</h2>
            <p>
              {selectedProfile.sourceType === 'CSV'
                ? 'File (CSV)'
                : 'Salesforce'}{' '}
              · {selectedProfile.objectName}
            </p>
          </div>
          <button
            type="button"
            className="data-profiling-next-button"
            onClick={() => {
              setShowProfileResults(false);
              setShowSavedList(true);
              setSelectedProfile(null);
            }}
          >
            Back to records
          </button>
        </div>

        
        <div className="data-profile-summary">
          <div>
            <span>ROWS</span>
            <strong>
              {currentProfileResults?.rows?.toLocaleString() ?? '—'}
            </strong>
          </div>

          <div>
            <span>COLUMNS</span>
            <strong>{currentProfileResults?.columnCount ?? 0}</strong>
          </div>

          <div>
            <span>AVG. COMPLETENESS</span>
            <strong>{currentProfileResults?.completeness ?? '—'}</strong>
          </div>

          <div>
            <span>DUPLICATE CANDIDATES</span>
            <strong>
              {currentProfileResults?.duplicateCandidates?.toLocaleString() ?? '—'}
            </strong>
          </div>

          <div>
            <span>COLUMNS WITH ISSUES</span>
            <strong>{currentProfileResults?.columnsWithIssues ?? 0}</strong>
          </div>
        </div>


        <div className="data-profile-table-card">
          <h3>
            {selectedProfile.objectName} field profile
            ({currentProfileResults?.columns?.length || 0} columns)
          </h3>

          <div className="data-profile-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Declared type</th>
                  <th>Inferred type</th>
                  <th>Populated</th>
                  <th>Format / pattern</th>
                  <th>Finding</th>
                </tr>
              </thead>
              <tbody>
               {(currentProfileResults?.columns || []).map(
                  (column) => (
                    <tr key={column[0]}>
                      <td>{column[0]}</td>
                      <td>{column[1]}</td>
                      <td>{column[2]}</td>
                      <td>{column[3]}</td>
                      <td>{column[4]}</td>
                      <td>
                        {column[3] === '100%' ? 'OK' : 'Review values'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    )}

    </main>
  );
}