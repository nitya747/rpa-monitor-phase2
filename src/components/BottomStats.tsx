import React, { useEffect, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { GlobalMetrics } from '../types';

export const BottomStats: React.FC = () => {
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

  const [avgTime, setAvgTime] = useState(512);

  useEffect(() => {
    const unsubscribe = stateEngine.subscribeSummary((newMetrics) => {
      setMetrics(newMetrics);
    });

    // Simulate minor fluctuations in average execution time around 512ms
    const interval = setInterval(() => {
      setAvgTime((prev) => {
        const change = Math.floor(Math.random() * 7) - 3; // -3 to +3 ms
        const next = prev + change;
        return Math.max(490, Math.min(next, 530));
      });
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const totalStatusCount =
    metrics.statusCounts.healthy +
    metrics.statusCounts.warning +
    metrics.statusCounts.critical +
    metrics.statusCounts.Failed;

  const successPercent =
    totalStatusCount > 0 ? (metrics.statusCounts.healthy / totalStatusCount) * 100 : 98.72;

  // Let's compute Executions Today dynamically based on totalRowsProcessed
  // Scaled to look realistic (e.g. 50,000 processed rows scales to ~3.42M executions)
  const executionsToday = ((metrics.totalRowsProcessed * 68.4) / 1000).toFixed(2);

  // Let's compute Data Throughput dynamically based on activeRobotsDeployed
  // Scaled to look realistic (e.g. ~1.2M active robots scales to ~2.34 TB throughput)
  const dataThroughput = ((metrics.activeRobotsDeployed * 1.83) / 1000000).toFixed(2);

  return (
    <div className="bottom-stats-grid">
      {/* 1. Executions Today */}
      <div className="bottom-stat-card">
        <div className="stat-card-left">
          <div className="stat-card-icon executions-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="trend-badge-bottom">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            9.4%
          </span>
        </div>
        <div className="stat-card-right">
          <div className="stat-label">Executions Today</div>
          <span className="stat-value">{executionsToday}M</span>
          <div className="stat-subtext">Total executions</div>
        </div>
      </div>

      {/* 2. Success Rate */}
      <div className="bottom-stat-card">
        <div className="stat-card-left">
          <div className="stat-card-icon success-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="trend-badge-bottom">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            1.2%
          </span>
        </div>
        <div className="stat-card-right">
          <div className="stat-label">Success Rate</div>
          <span className="stat-value">{successPercent.toFixed(2)}%</span>
          <div className="stat-subtext">Successful executions</div>
        </div>
      </div>

      {/* 3. Avg. Execution Time */}
      <div className="bottom-stat-card">
        <div className="stat-card-left">
          <div className="stat-card-icon time-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className="trend-badge-bottom">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            6.8%
          </span>
        </div>
        <div className="stat-card-right">
          <div className="stat-label">Avg. Execution Time</div>
          <span className="stat-value">{avgTime} ms</span>
          <div className="stat-subtext">Average time</div>
        </div>
      </div>

      {/* 4. Data Throughput */}
      <div className="bottom-stat-card">
        <div className="stat-card-left">
          <div className="stat-card-icon throughput-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <span className="trend-badge-bottom">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            14.6%
          </span>
        </div>
        <div className="stat-card-right">
          <div className="stat-label">Data Throughput</div>
          <span className="stat-value">{dataThroughput} TB</span>
          <div className="stat-subtext">Processed data</div>
        </div>
      </div>
    </div>
  );
};
