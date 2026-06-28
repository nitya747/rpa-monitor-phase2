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
    initializeRpaStream: (callback: (batch: any[]) => void, csvUrl?: string) => void;
  }
}

const App: React.FC = () => {
  const [streamActive, setStreamActive] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeNav, setActiveNav] = useState('overview'); // defaults to Overview matching design reference
  
  // Layout visibility states
  const [showKPIs, setShowKPIs] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showToggles, setShowToggles] = useState(true);

  // High density columns visibility
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    project_id: true,
    company_id: false,
    project_name: true,
    department: true,
    industry: true,
    automation_type: true,
    project_status: true,
    robots_deployed: true,
    budget_usd: true,
    annual_savings_usd: true,
    roi_percent: true,
    employee_hours_saved: false,
    implementation_partner: false,
    country: true,
    last_updated: true,
  });

  // Load layout and theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('rpa_monitor_theme') || 'light';
      setTheme(savedTheme as 'light' | 'dark');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      const saved = localStorage.getItem('rpa_monitor_layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.showKPIs === 'boolean') setShowKPIs(parsed.showKPIs);
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
      console.error('Failed to load configuration from localStorage:', e);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    try {
      localStorage.setItem('rpa_monitor_theme', nextTheme);
    } catch (e) {
      console.error('Failed to save theme state to localStorage:', e);
    }
  };

  // Save layout helper
  const saveLayout = (
    updatedKPIs: boolean,
    updatedChart: boolean,
    updatedToggles: boolean,
    updatedColumns: { [key: string]: boolean }
  ) => {
    try {
      localStorage.setItem(
        'rpa_monitor_layout',
        JSON.stringify({ 
          showKPIs: updatedKPIs, 
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
    saveLayout(nextVal, showChart, showToggles, visibleColumns);
  };

  const handleToggleChart = () => {
    const nextVal = !showChart;
    setShowChart(nextVal);
    saveLayout(showKPIs, nextVal, showToggles, visibleColumns);
  };

  const handleToggleToggles = () => {
    const nextVal = !showToggles;
    setShowToggles(nextVal);
    saveLayout(showKPIs, showChart, nextVal, visibleColumns);
  };

  const handleToggleColumn = (colId: string) => {
    const nextCols = {
      ...visibleColumns,
      [colId]: !visibleColumns[colId],
    };
    setVisibleColumns(nextCols);
    saveLayout(showKPIs, showChart, showToggles, nextCols);
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

  // List of all navigation items to render in the left sidebar
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    },
    {
      id: 'automations',
      label: 'Automations',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4M8 8h8" />
        </svg>
      )
    }
  ];

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-title">RPA Control Terminal</span>
            <span className="sidebar-subtitle">Enterprise Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div 
              key={item.id}
              className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Theme Switcher Toggle */}
          <div className="theme-toggle-row">
            <span style={{ fontWeight: 600 }}>Dark Mode</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* User Profile info matching reference image */}
          <div className="sidebar-profile">
            <div className="sidebar-avatar">AD</div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">Admin User</span>
              <span className="sidebar-profile-role">Super Admin</span>
            </div>
            <div className="profile-dropdown-arrow">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-muted)' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Container */}
      <main className="main-container">
        {/* Content Viewport */}
        <div className="content-viewport">
          {/* Render Header with Search & Controls */}
          <DashboardControls
            showKPIs={showKPIs}
            onToggleKPIs={handleToggleKPIs}
            showChart={showChart}
            onToggleChart={handleToggleChart}
            showToggles={showToggles}
            onToggleToggles={handleToggleToggles}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
          />
          {/* Active Navigation Selector Router */}
          {activeNav === 'overview' && (
            <>
              {/* Dynamic Telemetry Status Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <h2 className="dashboard-title">RPA Automation Telemetry</h2>
                  <p className="page-subtitle" style={{ fontSize: '13px', marginTop: '2px' }}>
                    System Status:{' '}
                    {streamActive ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>● Active Feed</span>
                    ) : (
                      <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>○ Connecting...</span>
                    )}
                  </p>
                </div>
                
                <div className="font-mono text-muted" style={{ fontSize: '12px' }}>
                  Tick Rate: <strong>200ms</strong>
                </div>
              </div>

              {/* 1. KPIs Section (Total Automations, Active Robots, Cumulative Savings, System Health) */}
              {showKPIs && <KPIs onViewAllHealth={() => setActiveNav('automations')} />}

              {/* 2. Middle Row: Chart & Toggles */}
              {(showChart || showToggles) && (
                <div className="grid-12">
                  {showChart && (
                    <div className="chart-panel-wrapper">
                      <DepartmentChart />
                    </div>
                  )}
                  {showToggles && (
                    <div className="toggles-panel-wrapper">
                      <InfrastructureToggles />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeNav === 'automations' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <h2 className="dashboard-title">Automation Pipelines Registry</h2>
                  <p className="page-subtitle" style={{ fontSize: '13px', marginTop: '2px' }}>
                    Double click rows to view detailed metadata overlay. Click column headers to sort.
                  </p>
                </div>
              </div>
              
              {/* High-Performance Custom Virtualized DOM Grid */}
              <VirtualizedGrid visibleColumns={visibleColumns} />
            </>
          )}

          {/* Fallback View for Non-Implemented Pages */}
          {activeNav !== 'overview' && activeNav !== 'automations' && (
            <div className="coming-soon-wrapper">
              <div className="coming-soon-card">
                <div className="coming-soon-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <h3>{navItems.find(n => n.id === activeNav)?.label} Control Console</h3>
                <p>Enterprise control module for managing and telemetry mapping of {navItems.find(n => n.id === activeNav)?.label.toLowerCase()} operations.</p>
                <div className="coming-soon-badge">Coming Soon</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Frozen Telemetry Overlay Dashboard */}
      <OverlayDashboard />
    </div>
  );
};

export default App;
