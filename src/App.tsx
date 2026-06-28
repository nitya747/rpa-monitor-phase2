import React, { useEffect, useState } from 'react';
import { KPIs } from './components/KPIs';
import { VirtualizedGrid } from './components/VirtualizedGrid';
import { DashboardControls } from './components/DashboardControls';
import { stateEngine } from './state/StateEngine';

// Declare window extension for TypeScript
declare global {
  interface Window {
    initializeRpaStream: (callback: (batch: any[]) => void) => void;
  }
}

const App: React.FC = () => {
  const [streamActive, setStreamActive] = useState(false);
  const [showKPIs, setShowKPIs] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    project_id: true,
    project_name: true,
    industry: true,
    robots_deployed: true,
    cumulative_savings: true,
    roi: true,
    status: true,
    last_updated: true,
  });

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rpa_monitor_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.showKPIs === 'boolean') {
          setShowKPIs(parsed.showKPIs);
        }
        if (parsed.visibleColumns) {
          setVisibleColumns((prev) => ({
            ...prev,
            ...parsed.visibleColumns,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load layout from localStorage:', e);
    }
  }, []);

  // Save layout helper
  const saveLayout = (updatedKPIs: boolean, updatedColumns: { [key: string]: boolean }) => {
    try {
      localStorage.setItem(
        'rpa_monitor_layout',
        JSON.stringify({ showKPIs: updatedKPIs, visibleColumns: updatedColumns })
      );
    } catch (e) {
      console.error('Failed to save layout to localStorage:', e);
    }
  };

  const handleToggleKPIs = () => {
    const nextVal = !showKPIs;
    setShowKPIs(nextVal);
    saveLayout(nextVal, visibleColumns);
  };

  const handleToggleColumn = (colId: string) => {
    const nextCols = {
      ...visibleColumns,
      [colId]: !visibleColumns[colId],
    };
    setVisibleColumns(nextCols);
    saveLayout(showKPIs, nextCols);
  };

  useEffect(() => {
    if (typeof window.initializeRpaStream === 'function') {
      window.initializeRpaStream((batch) => {
        stateEngine.applyBatch(batch);
        setStreamActive(true);
      });
    } else {
      console.error('RPA Stream initializer (window.initializeRpaStream) not found.');
    }
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">High-Density Enterprise RPA Monitor</h1>
        <p className="app-subtitle">
          Real-time telemetry stream {streamActive ? (
            <span style={{ color: '#10b981', fontWeight: 600 }}>● Active</span>
          ) : (
            <span style={{ color: '#ef4444', fontWeight: 600 }}>○ Connecting...</span>
          )}
        </p>
      </header>

      {/* Controls & Filter Panel */}
      <DashboardControls
        showKPIs={showKPIs}
        onToggleKPIs={handleToggleKPIs}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
      />

      {/* KPI Dashboard Grid */}
      {showKPIs && <KPIs />}

      {/* High-Performance Custom Virtualized DOM Grid */}
      <VirtualizedGrid visibleColumns={visibleColumns} />
    </div>
  );
};

export default App;
