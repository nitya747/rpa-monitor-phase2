import React, { useCallback, useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { RpaRow } from '../types';
import { formatCurrency, formatPercent } from '../utils/sanitizer';

const ROW_HEIGHT = 48; // px per row
const VIEWPORT_HEIGHT = 400; // px height of visible scroll container
const ROWS_PER_PAGE = 50; // page size

interface VirtualizedGridProps {
  visibleColumns: { [key: string]: boolean };
}

export const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({ visibleColumns }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  
  // Keep references to row DOM elements and their cells for direct mutation
  const rowElementsRef = useRef<HTMLDivElement[]>([]);
  const cellElementsRef = useRef<{
    checkbox: HTMLInputElement;
    id: HTMLSpanElement;
    company: HTMLSpanElement;
    name: HTMLSpanElement;
    dept: HTMLSpanElement;
    industry: HTMLSpanElement;
    type: HTMLSpanElement;
    statusCol: HTMLSpanElement;
    statusCell: HTMLSpanElement;
    statusText: HTMLSpanElement;
    robots: HTMLSpanElement;
    budget: HTMLSpanElement;
    savings: HTMLSpanElement;
    roi: HTMLSpanElement;
    hours: HTMLSpanElement;
    partner: HTMLSpanElement;
    country: HTMLSpanElement;
    updated: HTMLSpanElement;
  }[]>([]);

  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortState, setSortState] = useState(stateEngine.getSortState());
  const lastScrollTop = useRef(-1);
  const animationFrameId = useRef<number | null>(null);

  // Compute number of rows needed in the pool
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 3; // buffer rows

  const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE) || 1;
  const startIndexGlobal = (currentPage - 1) * ROWS_PER_PAGE;

  // Imperatively update the text content and position of row elements in the viewport
  const updateViewport = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    
    // Determine current start index relative to page
    const startIndexLocal = Math.floor(scrollTop / ROW_HEIGHT);
    const startIndex = startIndexGlobal + startIndexLocal;
    
    const sliceCount = Math.min(visibleCount, Math.max(0, ROWS_PER_PAGE - startIndexLocal));
    const slice = stateEngine.getVisibleSlice(startIndex, sliceCount);

    const updateCell = (
      cell: HTMLSpanElement | undefined,
      visible: boolean,
      text: string,
      className?: string
    ) => {
      if (!cell) return;
      if (!visible) {
        cell.style.display = 'none';
      } else {
        cell.style.display = '';
        if (cell.textContent !== text) {
          cell.textContent = text;
        }
        if (className !== undefined && cell.className !== className) {
          cell.className = className;
        }
      }
    };

    for (let i = 0; i < visibleCount; i++) {
      const rowEl = rowElementsRef.current[i];
      const cells = cellElementsRef.current[i];
      if (!rowEl || !cells) continue;

      const dataIndexLocal = startIndexLocal + i;
      const dataIndexGlobalCur = startIndexGlobal + dataIndexLocal;
      const data: RpaRow | undefined = slice[i];

      // Stay within page limits and total row count
      if (data && dataIndexLocal < ROWS_PER_PAGE && dataIndexGlobalCur < stateEngine.getRowsCount()) {
        // Position row absolutely inside the scroll container
        rowEl.style.transform = `translateY(${dataIndexLocal * ROW_HEIGHT}px)`;
        rowEl.style.display = 'flex';

        // Retrieve properties supporting both schemas
        const status = data.project_status || (data as any).status || 'healthy';
        const savings = data.annual_savings_usd !== undefined ? data.annual_savings_usd : ((data as any).cumulative_savings || 0);
        const roi = data.roi_percent !== undefined ? data.roi_percent : ((data as any).roi || 0);
        const budget = data.budget_usd !== undefined ? data.budget_usd : 0;
        const hours = data.employee_hours_saved !== undefined ? data.employee_hours_saved : 0;

        // Checkbox mutation
        if (cells.checkbox) {
          cells.checkbox.checked = selectedRows.has(data.project_id);
          cells.checkbox.setAttribute('data-project-id', data.project_id);
        }

        // Mutate contents directly (bypassing React render tree)
        updateCell(cells.id, visibleColumns.project_id, data.project_id);
        updateCell(cells.company, visibleColumns.company_id, data.company_id || '');
        updateCell(cells.name, visibleColumns.project_name, data.project_name);
        updateCell(cells.dept, visibleColumns.department, data.department || '');
        updateCell(cells.industry, visibleColumns.industry, data.industry);
        updateCell(cells.type, visibleColumns.automation_type, data.automation_type || '');
        updateCell(cells.robots, visibleColumns.robots_deployed, data.robots_deployed.toString());
        updateCell(cells.budget, visibleColumns.budget_usd, formatCurrency(budget));
        updateCell(cells.savings, visibleColumns.annual_savings_usd, formatCurrency(savings));
        updateCell(cells.roi, visibleColumns.roi_percent, formatPercent(roi));
        updateCell(cells.hours, visibleColumns.employee_hours_saved, hours.toLocaleString());
        updateCell(cells.partner, visibleColumns.implementation_partner, data.implementation_partner || '');
        updateCell(cells.country, visibleColumns.country, data.country || '');
        
        if (!visibleColumns.project_status) {
          cells.statusCol.style.display = 'none';
        } else {
          cells.statusCol.style.display = '';
          const displayStatus = status === 'Failed' ? 'critical' : status;
          cells.statusCell.className = `cell-status status-${displayStatus}`;
          if (cells.statusText.textContent !== status) {
            cells.statusText.textContent = status;
          }
        }
        
        updateCell(cells.updated, visibleColumns.last_updated, new Date(data.last_updated).toLocaleTimeString());

        // Warning alerts & Cell Flashing on update (memory-leak free)
        const isRecentlyUpdated = stateEngine.getLastUpdatedIds().has(data.project_id);
        if (isRecentlyUpdated) {
          let flashClass = 'flash-healthy';
          if (status === 'Failed' || roi < 0) {
            flashClass = 'flash-critical';
          } else if (status === 'critical') {
            flashClass = 'flash-critical';
          } else if (status === 'warning') {
            flashClass = 'flash-warning';
          }
          
          if ((rowEl as any)._cleanupFlash) {
            (rowEl as any)._cleanupFlash();
          }

          rowEl.classList.remove('flash-critical', 'flash-warning', 'flash-healthy');
          void rowEl.offsetWidth; // trigger reflow
          rowEl.classList.add(flashClass);

          const onAnimationEnd = () => {
            rowEl.classList.remove(flashClass);
            rowEl.removeEventListener('animationend', onAnimationEnd);
            (rowEl as any)._cleanupFlash = null;
          };
          rowEl.addEventListener('animationend', onAnimationEnd);
          (rowEl as any)._cleanupFlash = () => {
            rowEl.removeEventListener('animationend', onAnimationEnd);
            rowEl.classList.remove(flashClass);
          };
        } else {
          if ((rowEl as any)._cleanupFlash) {
            (rowEl as any)._cleanupFlash();
          }
        }
      } else {
        // Out of bounds or beyond page limit, hide row
        rowEl.style.display = 'none';
        if ((rowEl as any)._cleanupFlash) {
          (rowEl as any)._cleanupFlash();
        }
      }
    }
  }, [visibleCount, visibleColumns, startIndexGlobal, selectedRows]);

  // Handle scroll events throttled to requestAnimationFrame
  const onScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    if (Math.abs(scrollTop - lastScrollTop.current) > 2) {
      lastScrollTop.current = scrollTop;
      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(() => {
          updateViewport();
          animationFrameId.current = null;
        });
      }
    }
  };

  useEffect(() => {
    // Subscribe to state updates
    const unsubscribe = stateEngine.subscribeGrid(() => {
      const count = stateEngine.getRowsCount();
      setTotalRows(count);
      setSortState(stateEngine.getSortState());
      
      // Schedule viewport update
      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(() => {
          updateViewport();
          animationFrameId.current = null;
        });
      }
    });

    // Trigger initial viewport update
    setTotalRows(stateEngine.getRowsCount());
    setSortState(stateEngine.getSortState());
    updateViewport();

    return () => {
      unsubscribe();
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updateViewport]);

  // Update spacer height when row count or page changes
  useEffect(() => {
    if (spacerRef.current) {
      const localCount = Math.min(ROWS_PER_PAGE, Math.max(0, totalRows - startIndexGlobal));
      spacerRef.current.style.height = `${localCount * ROW_HEIGHT}px`;
    }
    // Scroll container to top when page changes
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    updateViewport();
  }, [totalRows, currentPage, startIndexGlobal, updateViewport]);

  const handleHeaderClick = (field: keyof RpaRow, e: React.MouseEvent) => {
    stateEngine.setSort(field, e.shiftKey);
  };

  // Row selection handler using Event Delegation (avoids memory leaks in virtualized elements)
  const handleCheckboxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains('row-checkbox-input')) {
      const projectId = target.getAttribute('data-project-id');
      if (projectId) {
        const isChecked = (target as HTMLInputElement).checked;
        setSelectedRows((prev) => {
          const next = new Set(prev);
          if (isChecked) {
            next.add(projectId);
          } else {
            next.delete(projectId);
          }
          return next;
        });
      }
    }
  };

  // Toggle selection for all visible items on the current page
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const pageRows = stateEngine.getVisibleSlice(startIndexGlobal, ROWS_PER_PAGE);
    
    setSelectedRows((prev) => {
      const next = new Set(prev);
      pageRows.forEach((row) => {
        if (isChecked) {
          next.add(row.project_id);
        } else {
          next.delete(row.project_id);
        }
      });
      return next;
    });
  };

  // Check if all rows on the current page are selected
  const isPageAllSelected = () => {
    const pageRows = stateEngine.getVisibleSlice(startIndexGlobal, ROWS_PER_PAGE);
    if (pageRows.length === 0) return false;
    return pageRows.every((row) => selectedRows.has(row.project_id));
  };

  const renderSortIndicator = (field: keyof RpaRow) => {
    const index = sortState.findIndex((s) => s.field === field);
    if (index === -1) return null;
    const sort = sortState[index];
    const arrow = sort.direction === 'asc' ? ' ▲' : ' ▼';
    const priority = sortState.length > 1 ? ` (${index + 1})` : '';
    return <span className="sort-arrow">{arrow}{priority}</span>;
  };

  return (
    <div className="grid-wrapper">
      {/* Grid Headers */}
      <div className="grid-header">
        <span style={{ width: '4%', minWidth: '45px' }}>
          <input 
            type="checkbox" 
            checked={isPageAllSelected()} 
            onChange={handleToggleSelectAll} 
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary-600)' }}
          />
        </span>
        {visibleColumns.project_id && (
          <span className="col-id clickable" onClick={(e) => handleHeaderClick('project_id', e)}>
            ID{renderSortIndicator('project_id')}
          </span>
        )}
        {visibleColumns.company_id && (
          <span className="col-company clickable" onClick={(e) => handleHeaderClick('company_id', e)}>
            Co ID{renderSortIndicator('company_id')}
          </span>
        )}
        {visibleColumns.project_name && (
          <span className="col-name clickable" onClick={(e) => handleHeaderClick('project_name', e)}>
            Name{renderSortIndicator('project_name')}
          </span>
        )}
        {visibleColumns.department && (
          <span className="col-dept clickable" onClick={(e) => handleHeaderClick('department', e)}>
            Dept{renderSortIndicator('department')}
          </span>
        )}
        {visibleColumns.industry && (
          <span className="col-industry clickable" onClick={(e) => handleHeaderClick('industry', e)}>
            Industry{renderSortIndicator('industry')}
          </span>
        )}
        {visibleColumns.automation_type && (
          <span className="col-type clickable" onClick={(e) => handleHeaderClick('automation_type', e)}>
            Type{renderSortIndicator('automation_type')}
          </span>
        )}
        {visibleColumns.project_status && (
          <span className="col-status clickable" onClick={(e) => handleHeaderClick('project_status', e)}>
            Status{renderSortIndicator('project_status')}
          </span>
        )}
        {visibleColumns.robots_deployed && (
          <span className="col-robots text-right clickable" onClick={(e) => handleHeaderClick('robots_deployed', e)}>
            Robots{renderSortIndicator('robots_deployed')}
          </span>
        )}
        {visibleColumns.budget_usd && (
          <span className="col-budget text-right clickable" onClick={(e) => handleHeaderClick('budget_usd', e)}>
            Budget{renderSortIndicator('budget_usd')}
          </span>
        )}
        {visibleColumns.annual_savings_usd && (
          <span className="col-savings text-right clickable" onClick={(e) => handleHeaderClick('annual_savings_usd', e)}>
            Savings{renderSortIndicator('annual_savings_usd')}
          </span>
        )}
        {visibleColumns.roi_percent && (
          <span className="col-roi text-right clickable" onClick={(e) => handleHeaderClick('roi_percent', e)}>
            ROI{renderSortIndicator('roi_percent')}
          </span>
        )}
        {visibleColumns.employee_hours_saved && (
          <span className="col-hours text-right clickable" onClick={(e) => handleHeaderClick('employee_hours_saved', e)}>
            Hours{renderSortIndicator('employee_hours_saved')}
          </span>
        )}
        {visibleColumns.implementation_partner && (
          <span className="col-partner clickable" onClick={(e) => handleHeaderClick('implementation_partner', e)}>
            Partner{renderSortIndicator('implementation_partner')}
          </span>
        )}
        {visibleColumns.country && (
          <span className="col-country clickable" onClick={(e) => handleHeaderClick('country', e)}>
            Country{renderSortIndicator('country')}
          </span>
        )}
        {visibleColumns.last_updated && (
          <span className="col-updated clickable" onClick={(e) => handleHeaderClick('last_updated', e)}>
            Updated{renderSortIndicator('last_updated')}
          </span>
        )}
      </div>

      {/* Grid Viewport */}
      <div 
        className="grid-container" 
        ref={containerRef}
        onScroll={onScroll}
        onClick={handleCheckboxClick}
        style={{ height: `${VIEWPORT_HEIGHT}px` }}
      >
        {/* Tall spacer setting scroll bar */}
        <div className="grid-spacer" ref={spacerRef}></div>

        {/* Pool of row DOM elements */}
        {Array.from({ length: visibleCount }).map((_, index) => (
          <div
            key={index}
            className="grid-row"
            style={{ height: `${ROW_HEIGHT}px` }}
            ref={(el) => {
              if (el) {
                rowElementsRef.current[index] = el;
                // Query and cache cells on mount
                const checkbox = el.querySelector('.row-checkbox-input') as HTMLInputElement;
                const id = el.querySelector('.col-id') as HTMLSpanElement;
                const company = el.querySelector('.col-company') as HTMLSpanElement;
                const name = el.querySelector('.col-name') as HTMLSpanElement;
                const dept = el.querySelector('.col-dept') as HTMLSpanElement;
                const industry = el.querySelector('.col-industry') as HTMLSpanElement;
                const type = el.querySelector('.col-type') as HTMLSpanElement;
                const statusCol = el.querySelector('.col-status') as HTMLSpanElement;
                const statusCell = el.querySelector('.cell-status') as HTMLSpanElement;
                const statusText = el.querySelector('.status-text') as HTMLSpanElement;
                const robots = el.querySelector('.col-robots') as HTMLSpanElement;
                const budget = el.querySelector('.col-budget') as HTMLSpanElement;
                const savings = el.querySelector('.col-savings') as HTMLSpanElement;
                const roi = el.querySelector('.col-roi') as HTMLSpanElement;
                const hours = el.querySelector('.col-hours') as HTMLSpanElement;
                const partner = el.querySelector('.col-partner') as HTMLSpanElement;
                const country = el.querySelector('.col-country') as HTMLSpanElement;
                const updated = el.querySelector('.col-updated') as HTMLSpanElement;

                cellElementsRef.current[index] = {
                  checkbox,
                  id,
                  company,
                  name,
                  dept,
                  industry,
                  type,
                  statusCol,
                  statusCell,
                  statusText,
                  robots,
                  budget,
                  savings,
                  roi,
                  hours,
                  partner,
                  country,
                  updated
                };
              }
            }}
          >
            <span style={{ width: '4%', minWidth: '45px' }}>
              <input 
                type="checkbox" 
                className="row-checkbox-input" 
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-600)' }}
              />
            </span>
            <span className="col-id font-mono"></span>
            <span className="col-company font-mono"></span>
            <span className="col-name"></span>
            <span className="col-dept"></span>
            <span className="col-industry"></span>
            <span className="col-type"></span>
            <span className="col-status">
              <span className="cell-status">
                <span style={{ fontSize: '9px', marginRight: '4px' }}>●</span>
                <span className="status-text"></span>
              </span>
            </span>
            <span className="col-robots text-right font-mono"></span>
            <span className="col-budget text-right font-mono"></span>
            <span className="col-savings text-right font-mono"></span>
            <span className="col-roi text-right font-mono"></span>
            <span className="col-hours text-right font-mono"></span>
            <span className="col-partner"></span>
            <span className="col-country"></span>
            <span className="col-updated font-mono text-muted"></span>
          </div>
        ))}
      </div>

      {/* Grid Pagination Footer */}
      <div 
        style={{ 
          height: '56px', 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 var(--space-24)',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
          Showing <strong style={{ color: 'var(--color-heading)' }}>{Math.min(startIndexGlobal + 1, totalRows)}</strong> to{' '}
          <strong style={{ color: 'var(--color-heading)' }}>
            {Math.min(startIndexGlobal + ROWS_PER_PAGE, totalRows)}
          </strong> of{' '}
          <strong style={{ color: 'var(--color-heading)' }}>{totalRows}</strong> items
          {selectedRows.size > 0 && ` (${selectedRows.size} selected)`}
        </span>
        
        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              // Simple pagination slice around current page
              let pageNum = i + 1;
              if (currentPage > 3 && totalPages > 5) {
                pageNum = currentPage - 3 + i;
                if (pageNum + (4 - i) > totalPages) {
                  pageNum = totalPages - 4 + i;
                }
              }
              
              return (
                <button
                  key={pageNum}
                  className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ minWidth: '32px', padding: 0 }}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
