import React, { useEffect, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { GlobalMetrics } from '../types';
import { formatCurrency } from '../utils/sanitizer';

interface KPIsProps {
  onViewAllHealth?: () => void;
}

export const KPIs: React.FC<KPIsProps> = ({ onViewAllHealth }) => {
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
    <div className="kpis-grid">
      {/* 1. Total Automations */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-icon-box automations-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4M8 8h8" />
            </svg>
          </div>
          <span className="kpi-label">Total Automations</span>
        </div>
        <span className="kpi-number">{metrics.totalRowsProcessed.toLocaleString()}</span>
        <span className="kpi-footer-text">Monitored pipelines</span>
        <div className="kpi-trend-badge">
          <span className="trend-text-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            12.5%
          </span>
          <span className="trend-subtext">vs last 24h</span>
        </div>
      </div>

      {/* 2. Active Robots */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-icon-box robots-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <span className="kpi-label">Active Robots</span>
        </div>
        <span className="kpi-number">{metrics.activeRobotsDeployed.toLocaleString()}</span>
        <span className="kpi-footer-text">Deployed in production</span>
        <div className="kpi-trend-badge">
          <span className="trend-text-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            8.3%
          </span>
          <span className="trend-subtext">vs last 24h</span>
        </div>
      </div>

      {/* 3. Cumulative Savings */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <div className="kpi-icon-box savings-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="kpi-label">Cumulative Savings</span>
        </div>
        <span className="kpi-number savings-number">
          {formatCurrency(metrics.globalCumulativeSavings).split('.')[0]}
        </span>
        <span className="kpi-footer-text">Estimated financial ROI</span>
        <div className="kpi-trend-badge">
          <span className="trend-text-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            15.7%
          </span>
          <span className="trend-subtext">vs last 24h</span>
        </div>
      </div>

      {/* 4. System Health */}
      <div className="kpi-card system-health-card">
        <div className="kpi-card-header health-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <div className="kpi-icon-box health-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <span className="kpi-label" style={{ textTransform: 'none', fontWeight: 600, fontSize: '13.5px', color: 'var(--color-heading)' }}>System Health</span>
          </div>
          <button 
            type="button" 
            className="view-all-link" 
            onClick={onViewAllHealth}
            style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
          >
            View all
          </button>
        </div>

        <div className="health-status-list">
          {/* Healthy Row */}
          <div className="health-status-row healthy-row">
            <div className="health-status-left">
              <div className="health-status-dot-box healthy-dot-box">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <span className="health-status-value">{metrics.statusCounts.healthy.toLocaleString()}</span>
            </div>
            <span className="health-status-name">Healthy</span>
          </div>

          {/* Warning Row */}
          <div className="health-status-row warning-row">
            <div className="health-status-left">
              <div className="health-status-dot-box warning-dot-box">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z" />
                </svg>
              </div>
              <span className="health-status-value">{metrics.statusCounts.warning.toLocaleString()}</span>
            </div>
            <span className="health-status-name">Warning</span>
          </div>

          {/* Critical Row */}
          <div className="health-status-row critical-row">
            <div className="health-status-left">
              <div className="health-status-dot-box critical-dot-box">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </div>
              <span className="health-status-value">{metrics.statusCounts.critical.toLocaleString()}</span>
            </div>
            <span className="health-status-name">Critical</span>
          </div>

          {/* Failed Row */}
          <div className="health-status-row failed-row">
            <div className="health-status-left">
              <div className="health-status-dot-box failed-dot-box">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </div>
              <span className="health-status-value">{metrics.statusCounts.Failed.toLocaleString()}</span>
            </div>
            <span className="health-status-name">Failed</span>
          </div>
        </div>

        <span className="kpi-footer-text" style={{ marginTop: 'auto', paddingTop: 'var(--space-8)' }}>Pipeline status distribution</span>
      </div>
    </div>
  );
};
