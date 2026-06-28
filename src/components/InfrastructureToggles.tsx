import React from 'react';

interface InfrastructureTogglesProps {
  anomalyMode: boolean;
  aggressiveCadence: boolean;
  loadBalancerOpt: boolean;
  autoRecoveryMode: boolean;
  onToggleAnomaly: () => void;
  onToggleCadence: () => void;
  onToggleLoadBalancer: () => void;
  onToggleAutoRecovery: () => void;
}

export const InfrastructureToggles: React.FC<InfrastructureTogglesProps> = ({
  anomalyMode,
  aggressiveCadence,
  loadBalancerOpt,
  autoRecoveryMode,
  onToggleAnomaly,
  onToggleCadence,
  onToggleLoadBalancer,
  onToggleAutoRecovery,
}) => {
  return (
    <div className="card toggles-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="toggles-card-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-muted)' }}>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <h3 className="toggles-title">Infrastructure Toggles</h3>
      </div>
      
      <div className="toggles-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-16)', flex: 1, marginTop: 'var(--space-16)' }}>
        {/* Toggle 1: High-Anomaly Injection Mode */}
        <div className="toggle-switch-row-custom">
          <div className="toggle-info">
            <span className="toggle-label-main">High-Anomaly Injection Mode</span>
            <span className="toggle-label-sub">Inject synthetic anomalies for system validation</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={anomalyMode} 
              onChange={onToggleAnomaly} 
            />
            <span className="slider"></span>
          </label>
        </div>
        
        {/* Toggle 2: Aggressive Cadence (100ms Tick) */}
        <div className="toggle-switch-row-custom">
          <div className="toggle-info">
            <span className="toggle-label-main">Aggressive Cadence (100ms Tick)</span>
            <span className="toggle-label-sub">Increase polling & execution frequency</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={aggressiveCadence} 
              onChange={onToggleCadence} 
            />
            <span className="slider"></span>
          </label>
        </div>
        
        {/* Toggle 3: Load Balancer Optimization */}
        <div className="toggle-switch-row-custom">
          <div className="toggle-info">
            <span className="toggle-label-main">Load Balancer Optimization</span>
            <span className="toggle-label-sub">Dynamically optimize load distribution</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={loadBalancerOpt} 
              onChange={onToggleLoadBalancer} 
            />
            <span className="slider"></span>
          </label>
        </div>
        
        {/* Toggle 4: Auto Recovery Mode */}
        <div className="toggle-switch-row-custom">
          <div className="toggle-info">
            <span className="toggle-label-main">Auto Recovery Mode</span>
            <span className="toggle-label-sub">Automatically recover failed pipelines</span>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={autoRecoveryMode} 
              onChange={onToggleAutoRecovery} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};
