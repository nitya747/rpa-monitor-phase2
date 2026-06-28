import React, { useEffect, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { GlobalMetrics } from '../types';
import { formatCurrency } from '../utils/sanitizer';

export const KPIs: React.FC = () => {
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    totalRowsProcessed: 0,
    activeRobotsDeployed: 0,
    globalCumulativeSavings: 0,
    statusCounts: {
      healthy: 0,
      warning: 0,
      critical: 0,
      Failed: 0,
    },
  });

  useEffect(() => {
    const unsubscribe = stateEngine.subscribeSummary((newMetrics) => {
      setMetrics(newMetrics);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="kpi-container">
      <div className="kpi-card">
        <span className="kpi-title">Total Automations</span>
        <span className="kpi-value">{metrics.totalRowsProcessed}</span>
        <span className="kpi-subtitle">Monitored pipelines</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-title">Active Robots</span>
        <span className="kpi-value glow-amber">{metrics.activeRobotsDeployed}</span>
        <span className="kpi-subtitle">Deployed in production</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-title">Cumulative Savings</span>
        <span className="kpi-value glow-green">{formatCurrency(metrics.globalCumulativeSavings)}</span>
        <span className="kpi-subtitle">Estimated financial ROI</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-title">System Health</span>
        <div className="status-breakdown" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span className="status-badge badge-healthy" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--status-healthy-glow)', color: 'var(--status-healthy)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.8rem', fontWeight: 600 }}>
            {metrics.statusCounts.healthy} Healthy
          </span>
          <span className="status-badge badge-warning" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--status-warning-glow)', color: 'var(--status-warning)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem', fontWeight: 600 }}>
            {metrics.statusCounts.warning} Warning
          </span>
          <span className="status-badge badge-critical" style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', background: 'var(--status-critical-glow)', color: 'var(--status-critical)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.8rem', fontWeight: 600 }}>
            {metrics.statusCounts.critical} Critical
          </span>
          <span className="status-badge badge-Failed">
            {metrics.statusCounts.Failed || 0} Failed
          </span>
        </div>
        <span className="kpi-subtitle" style={{ marginTop: 'auto' }}>Pipeline status distribution</span>
      </div>
    </div>
  );
};
