import React, { useEffect, useState } from 'react';
import { KPIs } from './components/KPIs';
import { VirtualizedGrid } from './components/VirtualizedGrid';
import { DashboardControls } from './components/DashboardControls';
import { DepartmentChart } from './components/DepartmentChart';
import { InfrastructureToggles } from './components/InfrastructureToggles';
import { stateEngine } from './state/StateEngine';
import { OverlayDashboard } from './components/OverlayDashboard';

// Declare window extension for TypeScript
declare global {
  interface Window {
    initializeRpaStream: (callback: (batch: any[]) => void) => void;
  }
}

const App: React.FC = () => {
  const [streamActive, setStreamActive] = useState(false);
  
  // Layout visibility states
  const [showKPIs, setShowKPIs] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showToggles, setShowToggles] = useState(true);

  // High density columns visibility
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    project_id: true,
    company_id: true,
    project_name: true,
    department: true,
    industry: true,
    automation_type: true,
    project_status: true,
    robots_deployed: true,
    budget_usd: true,
    annual_savings_usd: true,
    roi_percent: true,
    employee_hours_saved: true,
    implementation_partner: true,
    country: true,
    last_updated: true,
  });

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rpa_monitor_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.showKPIs === 'boolean') setShowKPIs(parsed.showKPIs);
        if (typeof parsed.showGrid === 'boolean') setShowGrid(parsed.showGrid);
        if (typeof parsed.showChart === 'boolean') setShowChart(parsed.showChart);
        if (typeof parsed.showToggles === 'boolean') setShowToggles(parsed.showToggles);
        
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
  const saveLayout = (
    updatedKPIs: boolean,
    updatedGrid: boolean,
    updatedChart: boolean,
    updatedToggles: boolean,
    updatedColumns: { [key: string]: boolean }
  ) => {
    try {
      localStorage.setItem(
        'rpa_monitor_layout',
        JSON.stringify({ 
          showKPIs: updatedKPIs, 
          showGrid: updatedGrid,
          showChart: updatedChart,
          showToggles: updatedToggles,
          visibleColumns: updatedColumns 
        })
      );
    } catch (e) {
      console.error('Failed to save layout to localStorage:', e);
    }
  };

  const handleToggleKPIs = () => {
    const nextVal = !showKPIs;
    setShowKPIs(nextVal);
    saveLayout(nextVal, showGrid, showChart, showToggles, visibleColumns);
  };

  const handleToggleGrid = () => {
    const nextVal = !showGrid;
    setShowGrid(nextVal);
    saveLayout(showKPIs, nextVal, showChart, showToggles, visibleColumns);
  };

  const handleToggleChart = () => {
    const nextVal = !showChart;
    setShowChart(nextVal);
    saveLayout(showKPIs, showGrid, nextVal, showToggles, visibleColumns);
  };

  const handleToggleToggles = () => {
    const nextVal = !showToggles;
    setShowToggles(nextVal);
    saveLayout(showKPIs, showGrid, showChart, nextVal, visibleColumns);
  };

  const handleToggleColumn = (colId: string) => {
    const nextCols = {
      ...visibleColumns,
      [colId]: !visibleColumns[colId],
    };
    setVisibleColumns(nextCols);
    saveLayout(showKPIs, showGrid, showChart, showToggles, nextCols);
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
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
        showChart={showChart}
        onToggleChart={handleToggleChart}
        showToggles={showToggles}
        onToggleToggles={handleToggleToggles}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
      />

      {/* KPI Dashboard Grid */}
      {showKPIs && <KPIs />}

      {/* Auxiliary Panels: Analytics & Mock Toggles */}
      {(showChart || showToggles) && (
        <div className="panels-grid">
          {showChart && <DepartmentChart />}
          {showToggles && <InfrastructureToggles />}
        </div>
      )}

      {/* High-Performance Custom Virtualized DOM Grid */}
      {showGrid && <VirtualizedGrid visibleColumns={visibleColumns} />}

      {/* Frozen Telemetry Overlay Dashboard */}
      <OverlayDashboard />
    </div>
  );

};

export default App;
