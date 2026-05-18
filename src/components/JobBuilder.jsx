import React, { useState } from 'react';

export default function JobBuilder({ currentOperation, onAddOperation, onClear, operations }) {
  const [jobName, setJobName] = useState('');
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      const stored = localStorage.getItem('drilling-jobs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  function handleSaveJob() {
    if (!jobName || operations.length === 0) return;
    const job = {
      id: Date.now().toString(),
      name: jobName,
      createdAt: new Date().toISOString(),
      operations: [...operations],
    };
    const updated = [...savedJobs, job];
    setSavedJobs(updated);
    localStorage.setItem('drilling-jobs', JSON.stringify(updated));
    setJobName('');
  }

  function handleLoadJob(job) {
    onClear();
    job.operations.forEach(op => onAddOperation(op));
  }

  function handleDeleteJob(id) {
    const updated = savedJobs.filter(j => j.id !== id);
    setSavedJobs(updated);
    localStorage.setItem('drilling-jobs', JSON.stringify(updated));
  }

  return (
    <div className="job-builder">
      <h3>Job Operations ({operations.length})</h3>

      {operations.length > 0 && (
        <div className="operation-list">
          {operations.map((op, i) => (
            <div key={i} className="operation-item">
              <span className="op-number">{i + 1}</span>
              <span className="op-details">
                {op.profile} → {op.face} → {op.holes?.length || 0} holes
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="job-actions">
        <button
          className="btn-control btn-add"
          onClick={() => currentOperation && onAddOperation(currentOperation)}
          disabled={!currentOperation}
        >
          Add Operation
        </button>
        <button
          className="btn-control btn-clear"
          onClick={onClear}
          disabled={operations.length === 0}
        >
          Clear All
        </button>
      </div>

      {/* Save job */}
      <div className="save-job-section">
        <label htmlFor="job-name-input">Job Name</label>
        <div className="save-job-row">
          <input
            id="job-name-input"
            type="text"
            className="select"
            placeholder="Enter job name..."
            value={jobName}
            onChange={e => setJobName(e.target.value)}
          />
          <button
            className="btn-control btn-add"
            onClick={handleSaveJob}
            disabled={!jobName || operations.length === 0}
          >
            Save Job
          </button>
        </div>
      </div>

      {/* Saved jobs */}
      <div className="saved-jobs">
        <h4>Saved Jobs</h4>
        {savedJobs.length === 0 ? (
          <p className="no-jobs">No saved jobs</p>
        ) : (
          <ul className="job-list">
            {savedJobs.map(job => (
              <li key={job.id} className="saved-job-item">
                <div className="job-info">
                  <span className="job-name">{job.name}</span>
                  <span className="job-date">{new Date(job.createdAt).toLocaleDateString()}</span>
                  <span className="job-ops">{job.operations.length} operations</span>
                </div>
                <div className="job-actions-small">
                  <button className="btn-small" onClick={() => handleLoadJob(job)}>Load</button>
                  <button className="btn-small btn-delete" onClick={() => handleDeleteJob(job.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
