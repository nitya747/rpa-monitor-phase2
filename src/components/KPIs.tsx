import React, { useEffect, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { GlobalMetrics } from '../types';
import { formatCurrency } from '../utils/sanitizer';

export const KPIs: React.FC = () => {
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    totalRowsProcessed: 0,
    activeRobotsDeployed: 0,
    globalCumulativeSavings: 0,
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
    </div>
  );
};
