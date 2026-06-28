import React, { useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';

interface DashboardControlsProps {
  showKPIs: boolean;
  onToggleKPIs: () => void;
  showChart: boolean;
  onToggleChart: () => void;
  showToggles: boolean;
  onToggleToggles: () => void;
  visibleColumns: { [key: string]: boolean };
  onToggleColumn: (colId: string) => void;
}

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: Set<string>;
  onToggle: (value: string, checked: boolean) => void;
  pluralLabel?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onToggle,
  pluralLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const triggerLabel = selectedValues.size === 0
    ? `All ${pluralLabel || label + 's'}`
    : `${selectedValues.size} Selected`;

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <button 
        type="button" 
        className="multi-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{triggerLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px', color: 'var(--color-muted)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="multi-select-dropdown-list">
          {options.map((opt) => {
            const isChecked = selectedValues.has(opt);
            return (
              <label key={opt} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  onChange={(e) => onToggle(opt, e.target.checked)} 
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  showKPIs,
  onToggleKPIs,
  showChart,
  onToggleChart,
  showToggles,
  onToggleToggles,
  visibleColumns,
  onToggleColumn,
}) => {
  const [search, setSearch] = useState(stateEngine.getSearchQuery());
  const [isPaused, setIsPaused] = useState(stateEngine.getPaused());
  const [bufferCount, setBufferCount] = useState(stateEngine.getBufferCount());
  const [isOverlayOpen, setIsOverlayOpen] = useState(stateEngine.getOverlayOpen());
  const [status, setStatus] = useState(stateEngine.getFilters().status);
  
  const [industrySet, setIndustrySet] = useState<Set<string>>(stateEngine.getFilters().industry);
  const [deptSet, setDeptSet] = useState<Set<string>>(stateEngine.getFilters().department);
  const [typeSet, setTypeSet] = useState<Set<string>>(stateEngine.getFilters().automation_type);

  const [industries, setIndustries] = useState<string[]>(stateEngine.getUniqueIndustries());
  const [departments, setDepartments] = useState<string[]>(stateEngine.getUniqueDepartments());
  const [automationTypes, setAutomationTypes] = useState<string[]>(stateEngine.getUniqueTypes());
  
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeStream = stateEngine.subscribeStreamState((paused, count, overlayOpen) => {
      setIsPaused(paused);
      setBufferCount(count);
      setIsOverlayOpen(overlayOpen);
    });

    const updateLists = () => {
      setIndustries(stateEngine.getUniqueIndustries());
      setDepartments(stateEngine.getUniqueDepartments());
      setAutomationTypes(stateEngine.getUniqueTypes());
    };

    updateLists();
    const unsubscribeGrid = stateEngine.subscribeGrid(updateLists);

    return () => {
      unsubscribeStream();
      unsubscribeGrid();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(e.target as Node)) {
        setShowLayoutMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    stateEngine.setSearch(val);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStatus(val);
    stateEngine.setStatusFilter(val);
  };

  const handleToggleIndustry = (val: string, isChecked: boolean) => {
    stateEngine.toggleFilter('industry', val, isChecked);
    setIndustrySet(stateEngine.getFilters().industry);
  };

  const handleToggleDept = (val: string, isChecked: boolean) => {
    stateEngine.toggleFilter('department', val, isChecked);
    setDeptSet(stateEngine.getFilters().department);
  };

  const handleToggleType = (val: string, isChecked: boolean) => {
    stateEngine.toggleFilter('automation_type', val, isChecked);
    setTypeSet(stateEngine.getFilters().automation_type);
  };

  const handleTogglePause = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    stateEngine.setPaused(newPaused);
  };

  const columnsList = [
    { id: 'project_id', label: 'ID' },
    { id: 'company_id', label: 'Co ID' },
    { id: 'project_name', label: 'Name' },
    { id: 'department', label: 'Department' },
    { id: 'industry', label: 'Industry' },
    { id: 'automation_type', label: 'Automation Type' },
    { id: 'project_status', label: 'Status' },
    { id: 'robots_deployed', label: 'Robots' },
    { id: 'budget_usd', label: 'Budget' },
    { id: 'annual_savings_usd', label: 'Annual Savings' },
    { id: 'roi_percent', label: 'ROI %' },
    { id: 'employee_hours_saved', label: 'Hours Saved' },
    { id: 'implementation_partner', label: 'Partner' },
    { id: 'country', label: 'Country' },
    { id: 'last_updated', label: 'Last Updated' },
  ];

  return (
    <div className="controls-panel">
      {/* Row 1: Search + Date selector + Auto refresh */}
      <div className="controls-row-top">
        {/* Search Input */}
        <div className="input-search-container">
          <svg className="input-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="fuzzy-search-input"
            className="input-text"
            type="text"
            placeholder="Search Name, Company, Partner, Country..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Date Selector + Auto Refresh */}
        <div className="controls-row-top-right">
          <div className="date-selector-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: 'var(--color-muted)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Last 24 Hours</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px', color: 'var(--color-muted)' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <div className="auto-refresh-indicator">
            <span style={{ fontSize: '13px', color: 'var(--color-body)', fontWeight: 500 }}>Auto refresh</span>
            <span className="refresh-dot"></span>
          </div>
        </div>
      </div>

      {/* Row 2: Filter Selects + Pause + Layout */}
      <div className="controls-row-bottom">
        <div className="controls-row-bottom-left">
          <MultiSelectDropdown
            label="Industry"
            pluralLabel="Industrys"
            options={industries}
            selectedValues={industrySet}
            onToggle={handleToggleIndustry}
          />

          <MultiSelectDropdown
            label="Department"
            options={departments}
            selectedValues={deptSet}
            onToggle={handleToggleDept}
          />

          <MultiSelectDropdown
            label="Type"
            options={automationTypes}
            selectedValues={typeSet}
            onToggle={handleToggleType}
          />

          <div className="select-filter-container">
            <select 
              id="status-filter" 
              className="select-filter" 
              value={status} 
              onChange={handleStatusChange}
            >
              <option value="">All Statuses</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="controls-row-bottom-right">
          {/* Pause Button */}
          <button
            id="stream-pause-play-btn"
            className="btn btn-control-outline"
            onClick={handleTogglePause}
          >
            {isPaused ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--color-success)' }}>
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Play {bufferCount > 0 ? `(${bufferCount})` : ''}</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                  <line x1="18" y1="4" x2="18" y2="20" />
                  <line x1="6" y1="4" x2="6" y2="20" />
                </svg>
                <span>Pause</span>
              </>
            )}
          </button>

          {isPaused && !isOverlayOpen && (
            <button
              id="stream-show-overlay-btn"
              className="btn btn-control-outline"
              onClick={() => stateEngine.setOverlayOpen(true)}
              style={{ borderColor: 'var(--primary-500)', color: 'var(--primary-600)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>View Analytics</span>
            </button>
          )}

          {/* Layout Button */}
          <div className="layout-config-container" ref={layoutDropdownRef}>
            <button
              id="layout-panel-toggle-btn"
              className="btn btn-control-outline"
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="9" y1="9" x2="21" y2="9" />
              </svg>
              <span>Layout</span>
            </button>

            {showLayoutMenu && (
              <div className="layout-menu">
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
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showChart}
                      onChange={onToggleChart}
                    />
                    <span>Show Department Chart</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showToggles}
                      onChange={onToggleToggles}
                    />
                    <span>Show Infrastructure Toggles</span>
                  </label>
                </div>
                <div className="layout-menu-section" style={{ maxHeight: '180px', overflowY: 'auto' }}>
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
