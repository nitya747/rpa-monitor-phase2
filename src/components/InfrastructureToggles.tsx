import React, { useState } from 'react';

export const InfrastructureToggles: React.FC = () => {
  const [anomalyRate, setAnomalyRate] = useState(true);
  const [streamSpeed, setStreamSpeed] = useState(false);
  const [serverNodes, setServerNodes] = useState(true);
  const [debugLogs, setDebugLogs] = useState(false);

  return (
    <div className="panel-card toggles-panel">
      <h3 className="panel-title">Infrastructure Toggles</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div className="toggle-switch-row">
          <span className="toggle-switch-label">High-Anomaly Injection Mode</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={anomalyRate} 
              onChange={() => setAnomalyRate(!anomalyRate)} 
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="toggle-switch-row">
          <span className="toggle-switch-label">Aggressive Cadence (100ms Tick)</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={streamSpeed} 
              onChange={() => setStreamSpeed(!streamSpeed)} 
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="toggle-switch-row">
          <span className="toggle-switch-label">Load Balancer Optimization</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={serverNodes} 
              onChange={() => setServerNodes(!serverNodes)} 
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="toggle-switch-row">
          <span className="toggle-switch-label">Telemetry Debug Console Out</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={debugLogs} 
              onChange={() => setDebugLogs(!debugLogs)} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Simulated Nodes: 4 Active</span>
        <span>Gateway: Connected</span>
      </div>
    </div>
  );
};
