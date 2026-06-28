import React, { useEffect, useState } from 'react';
import { stateEngine } from '../state/StateEngine';

interface DashboardControlsProps {
  showKPIs: boolean;
  onToggleKPIs: () => void;
  visibleColumns: { [key: string]: boolean };
  onToggleColumn: (colId: string) => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  showKPIs,
  onToggleKPIs,
  visibleColumns,
  onToggleColumn,
}) => {
  const [search, setSearch] = useState(stateEngine.getSearchQuery());
  const [industry, setIndustry] = useState(stateEngine.getFilters().industry);
  const [status, setStatus] = useState(stateEngine.getFilters().status);
  const [isPaused, setIsPaused] = useState(stateEngine.getPaused());
  const [bufferCount, setBufferCount] = useState(stateEngine.getBufferCount());
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = stateEngine.subscribeStreamState((paused, count) => {
      setIsPaused(paused);
      setBufferCount(count);
    });
    return unsubscribe;
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    stateEngine.setSearch(val);
  };

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setIndustry(val);
    stateEngine.setFilter('industry', val);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatus(val);
    stateEngine.setFilter('status', val);
  };

  const handleTogglePause = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    stateEngine.setPaused(newPaused);
  };

  const industries = ["Finance", "Healthcare", "Retail", "Logistics", "IT", "Manufacturing", "Telecom", "Energy"];
  const columnsList = [
    { id: 'project_id', label: 'Project ID' },
    { id: 'project_name', label: 'Name' },
    { id: 'industry', label: 'Industry' },
    { id: 'robots_deployed', label: 'Robots' },
    { id: 'cumulative_savings', label: 'Savings' },
    { id: 'roi', label: 'ROI' },
    { id: 'status', label: 'Status' },
    { id: 'last_updated', label: 'Last Updated' },
  ];

  return (
    <div className="controls-panel">
      <div className="controls-row">
        {/* Search Input */}
        <div className="search-box">
          <svg className="icon-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="fuzzy-search-input"
            type="text"
            placeholder="Search Project ID, Name, Industry..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filters */}
        <div className="filter-group">
          <select id="industry-filter" value={industry} onChange={handleIndustryChange}>
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>

          <select id="status-filter" value={status} onChange={handleStatusChange}>
            <option value="">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Pause/Play Stream Control */}
        <div className="stream-controls">
          <button
            id="stream-pause-play-btn"
            className={`btn-pause-play ${isPaused ? 'paused' : 'running'}`}
            onClick={handleTogglePause}
          >
            {isPaused ? (
              <>
                <svg className="icon-play" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Play {bufferCount > 0 && `(${bufferCount} buffered)`}</span>
              </>
            ) : (
              <>
                <svg className="icon-pause" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Layout Persistence Configuration button */}
          <div className="layout-config-container">
            <button
              id="layout-panel-toggle-btn"
              className="btn-layout"
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
              <span>Layout</span>
            </button>

            {showLayoutMenu && (
              <div className="layout-menu dropdown-menu">
                <div className="layout-menu-section">
                  <span className="layout-menu-title">Panel Visibility</span>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showKPIs}
                      onChange={onToggleKPIs}
                    />
                    <span>Show KPIs Panel</span>
                  </label>
                </div>
                <div className="layout-menu-section">
                  <span className="layout-menu-title">Visible Columns</span>
                  {columnsList.map((col) => (
                    <label key={col.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.id]}
                        onChange={() => onToggleColumn(col.id)}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
