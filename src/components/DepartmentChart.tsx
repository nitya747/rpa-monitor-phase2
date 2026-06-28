import React, { useEffect, useState } from 'react';
import { stateEngine } from '../state/StateEngine';

interface DepartmentData {
  department: string;
  robots: number;
  savings: number;
}

export const DepartmentChart: React.FC = () => {
  const [data, setData] = useState<DepartmentData[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      const allRows = stateEngine.getVisibleSlice(0, stateEngine.getRowsCount());
      const groups: { [key: string]: { robots: number; savings: number } } = {};

      allRows.forEach((row) => {
        const dept = row.department || 'Other';
        if (!groups[dept]) {
          groups[dept] = { robots: 0, savings: 0 };
        }
        groups[dept].robots += row.robots_deployed || 0;
        groups[dept].savings += row.annual_savings_usd || 0;
      });

      const formatted = Object.keys(groups).map((key) => ({
        department: key,
        robots: groups[key].robots,
        savings: groups[key].savings,
      })).sort((a, b) => b.robots - a.robots);

      setData(formatted);
    };

    const unsubscribe = stateEngine.subscribeGrid(updateMetrics);
    updateMetrics(); // initial compute

    return unsubscribe;
  }, []);

  const maxRobots = Math.max(...data.map((d) => d.robots), 1);

  return (
    <div className="panel-card chart-panel">
      <h3 className="panel-title">Department Analytics Chart</h3>
      {data.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No data available
        </div>
      ) : (
        <div className="chart-container-inner">
          {data.slice(0, 6).map((item) => {
            const pct = (item.robots / maxRobots) * 100;
            // Limit height to 120px max for rendering
            const barHeight = Math.max((pct * 120) / 100, 5);
            return (
              <div key={item.department} className="chart-bar-group">
                <span className="chart-value">{item.robots}</span>
                <div 
                  className="chart-bar-rect" 
                  style={{ height: `${barHeight}px` }}
                  title={`${item.department}: ${item.robots} robots deployed`}
                ></div>
                <span className="chart-label">{item.department}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
