import React, { useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import { formatCurrency, formatPercent } from '../utils/sanitizer';
import Chart from 'chart.js/auto';

export const OverlayDashboard: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [bufferCount, setBufferCount] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Local state for aggregated metrics
  const [aggregations, setAggregations] = useState({
    totalProjects: 0,
    totalBudget: 0,
    totalSavings: 0,
    netRoi: 0,
    totalRobots: 0,
    totalHoursSaved: 0,
    statusCounts: {
      healthy: 0,
      warning: 0,
      critical: 0,
      Failed: 0,
    }
  });

  // Canvas Refs for Chart.js
  const deptChartRef = useRef<HTMLCanvasElement | null>(null);
  const statusChartRef = useRef<HTMLCanvasElement | null>(null);
  const industryChartRef = useRef<HTMLCanvasElement | null>(null);

  // Keep track of Chart instances to destroy them properly
  const deptChartInstance = useRef<Chart | null>(null);
  const statusChartInstance = useRef<Chart | null>(null);
  const industryChartInstance = useRef<Chart | null>(null);

  // Subscribe to stream state (paused/play, buffer count)
  useEffect(() => {
    const unsubscribe = stateEngine.subscribeStreamState((paused, count) => {
      setIsPaused(paused);
      setBufferCount(count);
    });
    return unsubscribe;
  }, []);

  // Compute aggregations when paused or when grid updates (filters/search change data)
  const computeAggregations = () => {
    const allRows = stateEngine.getVisibleSlice(0, stateEngine.getRowsCount());
    
    let totalBudget = 0;
    let totalSavings = 0;
    let totalRobots = 0;
    let totalHoursSaved = 0;
    const statusCounts = {
      healthy: 0,
      warning: 0,
      critical: 0,
      Failed: 0,
    };

    allRows.forEach((row) => {
      totalBudget += row.budget_usd || 0;
      totalSavings += row.annual_savings_usd || 0;
      totalRobots += row.robots_deployed || 0;
      totalHoursSaved += row.employee_hours_saved || 0;

      const status = row.project_status || 'healthy';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    const netRoi = totalBudget > 0 ? (totalSavings / totalBudget) : 0;

    setAggregations({
      totalProjects: allRows.length,
      totalBudget,
      totalSavings,
      netRoi,
      totalRobots,
      totalHoursSaved,
      statusCounts,
    });
  };

  // Re-run aggregations on grid updates (which trigger when sorting/filtering changes)
  useEffect(() => {
    if (isPaused) {
      computeAggregations();
      const unsubscribe = stateEngine.subscribeGrid(computeAggregations);
      return unsubscribe;
    }
  }, [isPaused]);

  // Handle Chart.js drawing
  useEffect(() => {
    if (!isPaused || !showAnalytics) {
      // Destroy charts if we hide analytics or stream is unpaused
      destroyAllCharts();
      return;
    }

    const allRows = stateEngine.getVisibleSlice(0, stateEngine.getRowsCount());

    // 1. Prepare Department Data
    const deptGroups: { [key: string]: { budget: number; savings: number } } = {};
    allRows.forEach(row => {
      const dept = row.department || 'Other';
      if (!deptGroups[dept]) {
        deptGroups[dept] = { budget: 0, savings: 0 };
      }
      deptGroups[dept].budget += row.budget_usd || 0;
      deptGroups[dept].savings += row.annual_savings_usd || 0;
    });

    const deptLabels = Object.keys(deptGroups);
    const deptBudgets = deptLabels.map(d => deptGroups[d].budget);
    const deptSavings = deptLabels.map(d => deptGroups[d].savings);

    // 2. Prepare Industry Data (Top 5 by Savings)
    const indGroups: { [key: string]: number } = {};
    allRows.forEach(row => {
      const ind = row.industry || 'Other';
      indGroups[ind] = (indGroups[ind] || 0) + (row.annual_savings_usd || 0);
    });
    const sortedIndustries = Object.entries(indGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const indLabels = sortedIndustries.map(([name]) => name);
    const indSavings = sortedIndustries.map(([_, val]) => val);

    // Render Department Chart (Bar Chart)
    if (deptChartRef.current) {
      if (deptChartInstance.current) {
        deptChartInstance.current.destroy();
      }
      deptChartInstance.current = new Chart(deptChartRef.current, {
        type: 'bar',
        data: {
          labels: deptLabels,
          datasets: [
            {
              label: 'Total Budget ($)',
              data: deptBudgets,
              backgroundColor: 'rgba(56, 189, 248, 0.6)', // light blue
              borderColor: 'rgba(56, 189, 248, 1)',
              borderWidth: 1,
            },
            {
              label: 'Annual Savings ($)',
              data: deptSavings,
              backgroundColor: 'rgba(16, 185, 129, 0.6)', // green
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 1,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#f3f4f6', font: { family: 'Inter' } }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.dataset.label}: $${(context.raw as number).toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#9ca3af' }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#9ca3af',
                callback: (val) => `$${Number(val).toLocaleString()}`
              }
            }
          }
        }
      });
    }

    // Render Status Distribution Chart (Doughnut Chart)
    if (statusChartRef.current) {
      if (statusChartInstance.current) {
        statusChartInstance.current.destroy();
      }
      statusChartInstance.current = new Chart(statusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Healthy', 'Warning', 'Critical', 'Failed'],
          datasets: [{
            data: [
              aggregations.statusCounts.healthy,
              aggregations.statusCounts.warning,
              aggregations.statusCounts.critical,
              aggregations.statusCounts.Failed,
            ],
            backgroundColor: [
              '#10b981', // healthy (green)
              '#f59e0b', // warning (amber)
              '#ef4444', // critical (red)
              '#7f1d1d', // failed (dark red)
            ],
            borderWidth: 2,
            borderColor: '#0b1329',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#f3f4f6', font: { family: 'Inter' } }
            }
          }
        }
      });
    }

    // Render Industry Savings Chart (Horizontal Bar Chart)
    if (industryChartRef.current) {
      if (industryChartInstance.current) {
        industryChartInstance.current.destroy();
      }
      industryChartInstance.current = new Chart(industryChartRef.current, {
        type: 'bar',
        data: {
          labels: indLabels,
          datasets: [{
            label: 'Savings ($)',
            data: indSavings,
            backgroundColor: 'rgba(245, 158, 11, 0.6)', // amber
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 1,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `Savings: $${(context.raw as number).toLocaleString()}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#9ca3af',
                callback: (val) => `$${Number(val).toLocaleString()}`
              }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#9ca3af' }
            }
          }
        }
      });
    }

    return () => {
      destroyAllCharts();
    };
  }, [isPaused, showAnalytics, aggregations.totalProjects, aggregations.statusCounts]);

  const destroyAllCharts = () => {
    if (deptChartInstance.current) {
      deptChartInstance.current.destroy();
      deptChartInstance.current = null;
    }
    if (statusChartInstance.current) {
      statusChartInstance.current.destroy();
      statusChartInstance.current = null;
    }
    if (industryChartInstance.current) {
      industryChartInstance.current.destroy();
      industryChartInstance.current = null;
    }
  };

  const handleResumeStream = () => {
    stateEngine.setPaused(false);
  };

  if (!isPaused) return null;

  return (
    <div className="frozen-overlay">
      <div className="frozen-overlay-content">
        
        {/* Header Section */}
        <div className="frozen-overlay-header">
          <div className="status-badge-container">
            <span className="pulse-dot"></span>
            <span className="frozen-header-tag">TELEMETRY STREAM FROZEN</span>
          </div>
          <h2>Offline Analytics Dashboard</h2>
          <p className="frozen-subtitle">
            Analyzing snapshot buffer ({aggregations.totalProjects} active projects matching current workspace filters). 
            {bufferCount > 0 && <span className="buffered-notice"> {bufferCount} incoming records queued in buffer.</span>}
          </p>
        </div>

        {/* Action Controls */}
        <div className="frozen-actions-row">
          <div className="analytics-toggle-container">
            <span className="toggle-label">Analytics View</span>
            <label className="switch">
              <input 
                id="analytics-view-toggle"
                type="checkbox" 
                checked={showAnalytics}
                onChange={(e) => setShowAnalytics(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <button 
            id="overlay-resume-btn" 
            className="btn-resume-stream" 
            onClick={handleResumeStream}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Resume Stream</span>
          </button>
        </div>

        {/* Aggregated KPI Metrics Grid */}
        <div className="overlay-kpis-grid">
          <div className="overlay-kpi-card">
            <span className="card-label">Active Projects</span>
            <span className="card-value">{aggregations.totalProjects}</span>
            <span className="card-subtext">Filtered database subset</span>
          </div>
          <div className="overlay-kpi-card">
            <span className="card-label">Aggregated Budget</span>
            <span className="card-value">{formatCurrency(aggregations.totalBudget)}</span>
            <span className="card-subtext">Sum of allocated capital</span>
          </div>
          <div className="overlay-kpi-card">
            <span className="card-label">Annual Savings</span>
            <span className="card-value glow-green">{formatCurrency(aggregations.totalSavings)}</span>
            <span className="card-subtext">Sum of financial return</span>
          </div>
          <div className="overlay-kpi-card">
            <span className="card-label">Net Return (ROI)</span>
            <span className="card-value glow-amber">{formatPercent(aggregations.netRoi)}</span>
            <span className="card-subtext">Savings divided by budget</span>
          </div>
          <div className="overlay-kpi-card">
            <span className="card-label">Robots Deployed</span>
            <span className="card-value">{aggregations.totalRobots}</span>
            <span className="card-subtext">Sum of automated runners</span>
          </div>
          <div className="overlay-kpi-card">
            <span className="card-label">FTE Hours Liberated</span>
            <span className="card-value">{(aggregations.totalHoursSaved).toLocaleString()} hrs</span>
            <span className="card-subtext">Employee work time saved</span>
          </div>
        </div>

        {/* Dynamically Generated Analytics Panel using Chart.js */}
        {showAnalytics && (
          <div className="overlay-analytics-panel fade-in-bottom">
            <div className="analytics-chart-card double-width">
              <h4>Department Telemetry Comparison</h4>
              <p className="chart-description">Comparing allocated budget vs estimated savings by department</p>
              <div className="chart-canvas-wrapper">
                <canvas ref={deptChartRef}></canvas>
              </div>
            </div>
            <div className="analytics-chart-card">
              <h4>System Status Ratio</h4>
              <p className="chart-description">Distribution of project run states</p>
              <div className="chart-canvas-wrapper">
                <canvas ref={statusChartRef}></canvas>
              </div>
            </div>
            <div className="analytics-chart-card double-width">
              <h4>Top 5 Savings by Industry</h4>
              <p className="chart-description">Highest performing industries ranked by annual savings</p>
              <div className="chart-canvas-wrapper">
                <canvas ref={industryChartRef}></canvas>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
