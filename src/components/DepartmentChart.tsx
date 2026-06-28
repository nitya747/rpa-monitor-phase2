import React, { useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import Chart from 'chart.js/auto';

interface DepartmentData {
  department: string;
  executions: number;
}

export const DepartmentChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [data, setData] = useState<DepartmentData[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      const allRows = stateEngine.getVisibleSlice(0, stateEngine.getRowsCount());
      const groups: { [key: string]: number } = {};

      allRows.forEach((row) => {
        const dept = row.department || 'Other';
        if (!groups[dept]) {
          groups[dept] = 0;
        }
        // Calculate Executions dynamically scaled to robots_deployed (similar to the reference image)
        groups[dept] += (row.robots_deployed || 0) * 36;
      });

      const formatted = Object.keys(groups).map((key) => ({
        department: key,
        executions: groups[key],
      })).sort((a, b) => b.executions - a.executions);

      setData(formatted);
    };

    const unsubscribe = stateEngine.subscribeGrid(updateMetrics);
    updateMetrics(); // initial compute

    return unsubscribe;
  }, []);

  // Initialize and update Chart.js
  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const isDark = document.body.classList.contains('dark-mode');
    const labelColor = isDark ? '#94A3B8' : '#64748B';
    const gridLineColor = isDark ? '#334155' : '#E2E8F0';
    const tooltipBg = isDark ? '#1E293B' : '#FFFFFF';
    const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
    const tooltipTitle = isDark ? '#F8FAFC' : '#0F172A';
    const tooltipBody = isDark ? '#E2E8F0' : '#334155';

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Display top 6 departments as in reference image
    const displayData = data.slice(0, 6);
    const categories = displayData.map((d) => d.department);
    const executionsValues = displayData.map((d) => d.executions);

    // Custom inline plugin to draw values on top of bars
    const drawValuesPlugin = {
      id: 'drawValues',
      afterDatasetsDraw(chart: any) {
        const { ctx, data } = chart;
        ctx.save();
        ctx.font = 'bold 11px var(--font-primary)';
        ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#E2E8F0' : '#0F172A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        chart.getDatasetMeta(0).data.forEach((bar: any, index: number) => {
          const value = data.datasets[0].data[index];
          const formattedValue = Number(value).toLocaleString();
          ctx.fillText(formattedValue, bar.x, bar.y - 6);
        });
        ctx.restore();
      }
    };

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [
          {
            label: 'Automations Executed',
            data: executionsValues,
            backgroundColor: '#0D9488', // Teal 600
            borderColor: '#0D9488',
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 20,
          }
        ]
      },
      plugins: [drawValuesPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20 // pad top so values drawn above bars aren't cut off
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 8,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            titleFont: {
              family: 'var(--font-primary)',
              weight: 600,
              size: 13
            },
            bodyFont: {
              family: 'var(--font-primary)',
              size: 13
            },
            callbacks: {
              label: (context) => `Executed: ${Number(context.raw).toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: labelColor,
              font: {
                family: 'var(--font-primary)',
                size: 11,
                weight: 500
              }
            },
            border: {
              color: gridLineColor
            }
          },
          y: {
            grid: {
              color: gridLineColor
            },
            ticks: {
              color: labelColor,
              font: {
                family: 'var(--font-primary)',
                size: 11
              },
              callback: (val) => {
                const num = Number(val);
                return num >= 1000 ? `${(num / 1000).toFixed(0)}K` : num;
              }
            },
            border: {
              display: false
            }
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  // Handle theme changes dynamically by updating chart options in place
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (chartInstanceRef.current && data.length > 0) {
        const isDark = document.body.classList.contains('dark-mode');
        const labelColor = isDark ? '#94A3B8' : '#64748B';
        const gridLineColor = isDark ? '#334155' : '#E2E8F0';
        const tooltipBg = isDark ? '#1E293B' : '#FFFFFF';
        const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
        const tooltipTitle = isDark ? '#F8FAFC' : '#0F172A';
        const tooltipBody = isDark ? '#E2E8F0' : '#334155';
        
        const chart = chartInstanceRef.current;
        const scaleX = chart.options.scales?.x as any;
        const scaleY = chart.options.scales?.y as any;
        if (scaleX?.ticks) {
          scaleX.ticks.color = labelColor;
        }
        if (scaleX?.border) {
          scaleX.border.color = gridLineColor;
        }
        if (scaleY?.ticks) {
          scaleY.ticks.color = labelColor;
        }
        if (scaleY?.grid) {
          scaleY.grid.color = gridLineColor;
        }
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
  }, [data]);

  return (
    <div className="card chart-card" style={{ flex: 1, minWidth: 0 }}>
      <div className="chart-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h3 className="chart-title">Department Analytics Chart</h3>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-muted)', cursor: 'help' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="chart-period-selector">
          <span>Daily</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-muted)' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-muted)', fontSize: '0.875rem' }}>
          No data available
        </div>
      ) : (
        <>
          <div className="chart-canvas-container" style={{ position: 'relative', height: '200px', width: '100%' }}>
            <canvas ref={canvasRef}></canvas>
          </div>
          <div className="chart-legend-row">
            <span className="legend-badge"></span>
            <span className="legend-label">Automations Executed</span>
          </div>
        </>
      )}
    </div>
  );
};
