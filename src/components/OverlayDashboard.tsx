import React, { useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import { formatCurrency, formatPercent } from '../utils/sanitizer';
import Chart from 'chart.js/auto';

export const OverlayDashboard: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
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

  // Keep track of Chart.js instances to destroy them properly
  const deptChartInstance = useRef<Chart | null>(null);
  const statusChartInstance = useRef<Chart | null>(null);
  const industryChartInstance = useRef<Chart | null>(null);

  // Subscribe to stream state (paused/play, buffer count)
  useEffect(() => {
    const unsubscribe = stateEngine.subscribeStreamState((paused, count, overlayOpen) => {
      setIsPaused(paused);
      setBufferCount(count);
      setIsOverlayOpen(overlayOpen);
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
    if (isPaused && isOverlayOpen) {
      computeAggregations();
      const unsubscribe = stateEngine.subscribeGrid(computeAggregations);
      return unsubscribe;
    }
  }, [isPaused, isOverlayOpen]);

  // Handle Chart.js drawing
  useEffect(() => {
    if (!isPaused || !isOverlayOpen || !showAnalytics) {
      destroyAllCharts();
      return;
    }

    const allRows = stateEngine.getVisibleSlice(0, stateEngine.getRowsCount());
    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#94A3B8' : '#64748B';
    const gridLineColor = isDark ? '#334155' : '#E2E8F0';
    const tooltipBg = isDark ? '#1E293B' : '#FFFFFF';
    const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
    const tooltipTitle = isDark ? '#F8FAFC' : '#0F172A';
    const tooltipBody = isDark ? '#E2E8F0' : '#334155';

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
      const ctx = deptChartRef.current.getContext('2d');
      if (ctx) {
        if (deptChartInstance.current) {
          deptChartInstance.current.destroy();
        }
        deptChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: deptLabels,
            datasets: [
              {
                label: 'Total Budget ($)',
                data: deptBudgets,
                backgroundColor: '#0891B2', // Info Blue
                borderColor: '#0891B2',
                borderWidth: 1,
                borderRadius: 4,
              },
              {
                label: 'Annual Savings ($)',
                data: deptSavings,
                backgroundColor: '#0D9488', // Teal 600
                borderColor: '#0D9488',
                borderWidth: 1,
                borderRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: labelColor,
                  font: { family: 'var(--font-primary)' }
                }
              },
              tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: tooltipTitle,
                bodyColor: tooltipBody,
                titleFont: { family: 'var(--font-primary)', weight: 600 },
                bodyFont: { family: 'var(--font-primary)' },
                callbacks: {
                  label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw as number)}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: labelColor, font: { family: 'var(--font-primary)' } },
                border: { color: gridLineColor }
              },
              y: {
                grid: { color: gridLineColor },
                ticks: {
                  color: labelColor,
                  font: { family: 'var(--font-mono)' },
                  callback: (val) => `$${(Number(val) / 1000).toFixed(0)}k`
                },
                border: { display: false }
              }
            }
          }
        });
      }
    }

    // Render Status Distribution Chart (Doughnut Chart)
    if (statusChartRef.current) {
      const ctx = statusChartRef.current.getContext('2d');
      if (ctx) {
        if (statusChartInstance.current) {
          statusChartInstance.current.destroy();
        }
        statusChartInstance.current = new Chart(ctx, {
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
                '#16A34A', // healthy (green)
                '#F59E0B', // warning (amber)
                '#DC2626', // critical (red)
                '#991B1B', // failed (dark red)
              ],
              borderWidth: 2,
              borderColor: isDark ? '#1E293B' : '#FFFFFF',
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: labelColor,
                  font: { family: 'var(--font-primary)' }
                }
              },
              tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: tooltipTitle,
                bodyColor: tooltipBody,
                titleFont: { family: 'var(--font-primary)', weight: 600 },
                bodyFont: { family: 'var(--font-primary)' }
              }
            }
          }
        });
      }
    }

    // Render Industry Savings Chart (Horizontal Bar Chart)
    if (industryChartRef.current) {
      const ctx = industryChartRef.current.getContext('2d');
      if (ctx) {
        if (industryChartInstance.current) {
          industryChartInstance.current.destroy();
        }
        industryChartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: indLabels,
            datasets: [{
              label: 'Savings ($)',
              data: indSavings,
              backgroundColor: '#14B8A6', // Teal 500
              borderColor: '#14B8A6',
              borderWidth: 1,
              borderRadius: 4,
              barThickness: 16
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: tooltipTitle,
                bodyColor: tooltipBody,
                titleFont: { family: 'var(--font-primary)', weight: 600 },
                bodyFont: { family: 'var(--font-primary)' },
                callbacks: {
                  label: (context) => `Savings: ${formatCurrency(context.raw as number)}`
                }
              }
            },
            scales: {
              x: {
                grid: { color: gridLineColor },
                ticks: {
                  color: labelColor,
                  font: { family: 'var(--font-mono)' },
                  callback: (val) => `$${(Number(val) / 1000).toFixed(0)}k`
                },
                border: { display: false }
              },
              y: {
                grid: { display: false },
                ticks: { color: labelColor, font: { family: 'var(--font-primary)' } },
                border: { color: gridLineColor }
              }
            }
          }
        });
      }
    }

    return () => {
      destroyAllCharts();
    };
  }, [isPaused, isOverlayOpen, showAnalytics, aggregations.totalProjects, aggregations.statusCounts]);

  // Handle theme changes dynamically by updating chart options in place
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!isPaused || !isOverlayOpen || !showAnalytics) return;
      const isDark = document.body.classList.contains('dark-mode');
      const labelColor = isDark ? '#94A3B8' : '#64748B';
      const gridLineColor = isDark ? '#334155' : '#E2E8F0';
      const tooltipBg = isDark ? '#1E293B' : '#FFFFFF';
      const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
      const tooltipTitle = isDark ? '#F8FAFC' : '#0F172A';
      const tooltipBody = isDark ? '#E2E8F0' : '#334155';

      // 1. Update Department Chart
      if (deptChartInstance.current) {
        const chart = deptChartInstance.current;
        const scaleX = chart.options.scales?.x as any;
        const scaleY = chart.options.scales?.y as any;
        if (scaleX?.ticks) scaleX.ticks.color = labelColor;
        if (scaleX?.border) scaleX.border.color = gridLineColor;
        if (scaleY?.ticks) scaleY.ticks.color = labelColor;
        if (scaleY?.grid) scaleY.grid.color = gridLineColor;
        if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = labelColor;
        if (chart.options.plugins?.tooltip) {
          chart.options.plugins.tooltip.backgroundColor = tooltipBg;
          chart.options.plugins.tooltip.borderColor = tooltipBorder;
          chart.options.plugins.tooltip.titleColor = tooltipTitle;
          chart.options.plugins.tooltip.bodyColor = tooltipBody;
        }
        chart.update();
      }

      // 2. Update Status Chart
      if (statusChartInstance.current) {
        const chart = statusChartInstance.current;
        if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = labelColor;
        if (chart.data.datasets?.[0]) chart.data.datasets[0].borderColor = isDark ? '#1E293B' : '#FFFFFF';
        if (chart.options.plugins?.tooltip) {
          chart.options.plugins.tooltip.backgroundColor = tooltipBg;
          chart.options.plugins.tooltip.borderColor = tooltipBorder;
          chart.options.plugins.tooltip.titleColor = tooltipTitle;
          chart.options.plugins.tooltip.bodyColor = tooltipBody;
        }
        chart.update();
      }

      // 3. Update Industry Chart
      if (industryChartInstance.current) {
        const chart = industryChartInstance.current;
        const scaleX = chart.options.scales?.x as any;
        const scaleY = chart.options.scales?.y as any;
        if (scaleX?.ticks) scaleX.ticks.color = labelColor;
        if (scaleX?.grid) scaleX.grid.color = gridLineColor;
        if (scaleY?.ticks) scaleY.ticks.color = labelColor;
        if (scaleY?.border) scaleY.border.color = gridLineColor;
        if (chart.options.plugins?.tooltip) {
          chart.options.plugins.tooltip.backgroundColor = tooltipBg;
          chart.options.plugins.tooltip.borderColor = tooltipBorder;
          chart.options.plugins.tooltip.titleColor = tooltipTitle;
          chart.options.plugins.tooltip.bodyColor = tooltipBody;
        }
        chart.update();
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [isPaused, isOverlayOpen, showAnalytics]);

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

  if (!isPaused || !isOverlayOpen) return null;

  return (
    <div className="frozen-overlay">
      <div className="frozen-overlay-content">
        
        {/* Close Button */}
        <button 
          className="overlay-close-btn"
          onClick={() => stateEngine.setOverlayOpen(false)}
          title="Back to Dashboard"
          aria-label="Close analytics overlay"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header Section */}
        <div className="frozen-overlay-header">
          <div className="status-badge-container">
            <span className="pulse-dot"></span>
            <span className="frozen-header-tag">TELEMETRY STREAM FROZEN</span>
          </div>
          <h2>Offline Analytics Dashboard</h2>
          <p className="frozen-subtitle">
            Analyzing snapshot buffer with <strong style={{ color: 'var(--color-heading)' }}>{aggregations.totalProjects}</strong> active projects. 
            {bufferCount > 0 && <span className="buffered-notice"> {bufferCount} incoming records queued in background buffer.</span>}
          </p>
        </div>

        {/* Action Controls */}
        <div className="frozen-actions-row">
          <div className="analytics-toggle-container">
            <span className="toggle-switch-label" style={{ fontWeight: 600 }}>Show Chart Analytics</span>
            <label className="switch">
              <input 
                id="analytics-view-toggle"
                type="checkbox" 
                checked={showAnalytics}
                onChange={(e) => setShowAnalytics(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
            <button 
              id="overlay-dismiss-btn" 
              className="btn btn-secondary" 
              onClick={() => stateEngine.setOverlayOpen(false)}
            >
              <span>Back to Dashboard</span>
            </button>

            <button 
              id="overlay-resume-btn" 
              className="btn btn-primary" 
              onClick={handleResumeStream}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ marginRight: '4px' }}>
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Resume Live Stream</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body Container */}
        <div className="frozen-overlay-body">
          {/* Aggregated KPI Metrics Grid */}
          <div className="overlay-kpis-grid">
            <div className="overlay-kpi-card">
              <span className="card-label">Active Projects</span>
              <span className="card-value">{aggregations.totalProjects}</span>
              <span className="card-subtext">Filtered subset</span>
            </div>
            <div className="overlay-kpi-card">
              <span className="card-label">Aggregated Budget</span>
              <span className="card-value">
                {formatCurrency(aggregations.totalBudget).split('.')[0]}
              </span>
              <span className="card-subtext">Capital allocation</span>
            </div>
            <div className="overlay-kpi-card">
              <span className="card-label">Annual Savings</span>
              <span className="card-value" style={{ color: 'var(--color-success)' }}>
                {formatCurrency(aggregations.totalSavings).split('.')[0]}
              </span>
              <span className="card-subtext">Financial return</span>
            </div>
            <div className="overlay-kpi-card">
              <span className="card-label">Net Return (ROI)</span>
              <span className="card-value" style={{ color: aggregations.netRoi >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {formatPercent(aggregations.netRoi)}
              </span>
              <span className="card-subtext">Savings / budget</span>
            </div>
            <div className="overlay-kpi-card">
              <span className="card-label">Robots Deployed</span>
              <span className="card-value">{aggregations.totalRobots}</span>
              <span className="card-subtext">Automated runners</span>
            </div>
            <div className="overlay-kpi-card">
              <span className="card-label">FTE Hours Liberated</span>
              <span className="card-value">{(aggregations.totalHoursSaved).toLocaleString()}</span>
              <span className="card-subtext">Work hours saved</span>
            </div>
          </div>

          {/* Dynamically Generated Analytics Panel using Chart.js */}
          {showAnalytics && (
            <div className="overlay-analytics-panel">
              <div className="analytics-chart-card span-12">
                <h4>Department Telemetry Comparison</h4>
                <p className="chart-description">Comparing allocated budget vs estimated savings by department</p>
                <div className="chart-canvas-wrapper" style={{ position: 'relative', height: '250px' }}>
                  <canvas ref={deptChartRef}></canvas>
                </div>
              </div>
              
              <div className="analytics-chart-card span-6">
                <h4>System Status Ratio</h4>
                <p className="chart-description">Distribution of project run states</p>
                <div className="chart-canvas-wrapper" style={{ position: 'relative', height: '250px' }}>
                  <canvas ref={statusChartRef}></canvas>
                </div>
              </div>
              
              <div className="analytics-chart-card span-6">
                <h4>Top 5 Savings by Industry</h4>
                <p className="chart-description">Highest performing industries ranked by annual savings</p>
                <div className="chart-canvas-wrapper" style={{ position: 'relative', height: '250px' }}>
                  <canvas ref={industryChartRef}></canvas>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
