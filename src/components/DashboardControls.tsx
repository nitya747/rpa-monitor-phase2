import React, { useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';

interface DashboardControlsProps {
  showKPIs: boolean;
  onToggleKPIs: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
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
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onToggle,
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
    ? `All ${label}s`
    : `${selectedValues.size} ${label}${selectedValues.size > 1 ? 's' : ''}`;

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <button 
        type="button" 
        className="multi-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {triggerLabel}
      </button>
      {isOpen && (
        <div className="multi-select-dropdown-list">
          {options.map((opt) => {
            const isChecked = selectedValues.has(opt);
            return (
              <label key={opt} className="checkbox-label" style={{ padding: '0.3rem 0.5rem', whiteSpace: 'nowrap' }}>
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
  showGrid,
  onToggleGrid,
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
  const [status, setStatus] = useState(stateEngine.getFilters().status);
  
  const [industrySet, setIndustrySet] = useState<Set<string>>(stateEngine.getFilters().industry);
  const [deptSet, setDeptSet] = useState<Set<string>>(stateEngine.getFilters().department);
  const [typeSet, setTypeSet] = useState<Set<string>>(stateEngine.getFilters().automation_type);
  
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = stateEngine.subscribeStreamState((paused, count) => {
      setIsPaused(paused);
      setBufferCount(count);
    });
    return unsubscribe;
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

  const industries = ["Finance", "Healthcare", "Retail", "Logistics", "IT", "Manufacturing", "Telecom", "Energy"];
  const departments = ["Finance", "Operations", "HR", "IT", "Legal", "Sales", "Marketing", "Supply Chain"];
  const automationTypes = ["RPA", "Cognitive", "Chatbot", "Workflow", "AI Agent"];

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
            placeholder="Search Name, Company, Partner, Country..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filters */}
        <div className="filter-group" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <MultiSelectDropdown
            label="Industry"
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

          <select id="status-filter" value={status} onChange={handleStatusChange} style={{ minWidth: '130px' }}>
            <option value="">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="Failed">Failed</option>
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
          <div className="layout-config-container" ref={layoutDropdownRef}>
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
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={onToggleGrid}
                    />
                    <span>Show Grid Window</span>
                  </label>
                </div>
                <div className="layout-menu-section" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
