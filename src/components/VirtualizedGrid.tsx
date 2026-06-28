import React, { useCallback, useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { RpaRow } from '../types';
import { formatCurrency, formatPercent } from '../utils/sanitizer';

const ROW_HEIGHT = 48; // px per row
const VIEWPORT_HEIGHT = 500; // px height of visible scroll container

interface VirtualizedGridProps {
  visibleColumns: { [key: string]: boolean };
}

export const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({ visibleColumns }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  
  // Keep references to row DOM elements and their cells for direct mutation
  const rowElementsRef = useRef<HTMLDivElement[]>([]);
  const cellElementsRef = useRef<{
    id: HTMLSpanElement;
    name: HTMLSpanElement;
    industry: HTMLSpanElement;
    robots: HTMLSpanElement;
    savings: HTMLSpanElement;
    roi: HTMLSpanElement;
    statusCol: HTMLSpanElement;
    statusCell: HTMLSpanElement;
    updated: HTMLSpanElement;
  }[]>([]);

  const [totalRows, setTotalRows] = useState(0);
  const [sortState, setSortState] = useState(stateEngine.getSortState());
  const lastScrollTop = useRef(-1);
  const animationFrameId = useRef<number | null>(null);

  // Compute number of rows needed in the pool
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 3; // buffer rows

  // Imperatively update the text content and position of row elements in the viewport
  const updateViewport = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    
    // Determine current start index
    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const slice = stateEngine.getVisibleSlice(startIndex, visibleCount);

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

      const dataIndex = startIndex + i;
      const data: RpaRow | undefined = slice[i];

      if (data && dataIndex < stateEngine.getRowsCount()) {
        // Position row absolutely inside the scroll container
        rowEl.style.transform = `translateY(${dataIndex * ROW_HEIGHT}px)`;
        rowEl.style.display = 'flex';

        // Mutate contents directly (bypassing React render tree)
        updateCell(cells.id, visibleColumns.project_id, data.project_id);
        updateCell(cells.name, visibleColumns.project_name, data.project_name);
        updateCell(cells.industry, visibleColumns.industry, data.industry);
        updateCell(cells.robots, visibleColumns.robots_deployed, data.robots_deployed.toString());
        updateCell(cells.savings, visibleColumns.cumulative_savings, formatCurrency(data.cumulative_savings));
        updateCell(cells.roi, visibleColumns.roi, formatPercent(data.roi));
        
        if (!visibleColumns.status) {
          cells.statusCol.style.display = 'none';
        } else {
          cells.statusCol.style.display = '';
          updateCell(cells.statusCell, true, data.status, `cell-status status-${data.status}`);
        }
        
        updateCell(cells.updated, visibleColumns.last_updated, new Date(data.last_updated).toLocaleTimeString());

        // Cell Flashing on update (memory-leak free)
        const isRecentlyUpdated = stateEngine.getLastUpdatedIds().has(data.project_id);
        if (isRecentlyUpdated) {
          const flashClass = data.status === 'critical' 
            ? 'flash-critical' 
            : (data.status === 'warning' ? 'flash-warning' : 'flash-healthy');
          
          // First, run any active cleanup to remove old listener/class cleanly
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
        // Out of bounds, hide row
        rowEl.style.display = 'none';
        if ((rowEl as any)._cleanupFlash) {
          (rowEl as any)._cleanupFlash();
        }
      }
    }
  }, [visibleCount, visibleColumns]);

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

  // Update spacer height when row count changes
  useEffect(() => {
    if (spacerRef.current) {
      spacerRef.current.style.height = `${totalRows * ROW_HEIGHT}px`;
    }
  }, [totalRows]);

  const handleHeaderClick = (field: keyof RpaRow, e: React.MouseEvent) => {
    stateEngine.setSort(field, e.shiftKey);
  };

  const renderSortIndicator = (field: keyof RpaRow) => {
    const index = sortState.findIndex((s) => s.field === field);
    if (index === -1) return null;
    const sort = sortState[index];
    const arrow = sort.direction === 'asc' ? ' ▲' : ' ▼';
    const priority = sortState.length > 1 ? ` (${index + 1})` : '';
    return <span className="sort-arrow font-mono">{arrow}{priority}</span>;
  };

  return (
    <div className="grid-wrapper">
      {/* Grid Headers */}
      <div className="grid-header">
        {visibleColumns.project_id && (
          <span className="col-id clickable" onClick={(e) => handleHeaderClick('project_id', e)}>
            Project ID{renderSortIndicator('project_id')}
          </span>
        )}
        {visibleColumns.project_name && (
          <span className="col-name clickable" onClick={(e) => handleHeaderClick('project_name', e)}>
            Name{renderSortIndicator('project_name')}
          </span>
        )}
        {visibleColumns.industry && (
          <span className="col-industry clickable" onClick={(e) => handleHeaderClick('industry', e)}>
            Industry{renderSortIndicator('industry')}
          </span>
        )}
        {visibleColumns.robots_deployed && (
          <span className="col-robots text-right clickable" onClick={(e) => handleHeaderClick('robots_deployed', e)}>
            Robots{renderSortIndicator('robots_deployed')}
          </span>
        )}
        {visibleColumns.cumulative_savings && (
          <span className="col-savings text-right clickable" onClick={(e) => handleHeaderClick('cumulative_savings', e)}>
            Savings{renderSortIndicator('cumulative_savings')}
          </span>
        )}
        {visibleColumns.roi && (
          <span className="col-roi text-right clickable" onClick={(e) => handleHeaderClick('roi', e)}>
            ROI{renderSortIndicator('roi')}
          </span>
        )}
        {visibleColumns.status && (
          <span className="col-status clickable" onClick={(e) => handleHeaderClick('status', e)}>
            Status{renderSortIndicator('status')}
          </span>
        )}
        {visibleColumns.last_updated && (
          <span className="col-updated clickable" onClick={(e) => handleHeaderClick('last_updated', e)}>
            Last Updated{renderSortIndicator('last_updated')}
          </span>
        )}
      </div>

      {/* Grid Viewport */}
      <div 
        className="grid-container" 
        ref={containerRef}
        onScroll={onScroll}
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
                const id = el.querySelector('.col-id') as HTMLSpanElement;
                const name = el.querySelector('.col-name') as HTMLSpanElement;
                const industry = el.querySelector('.col-industry') as HTMLSpanElement;
                const robots = el.querySelector('.col-robots') as HTMLSpanElement;
                const savings = el.querySelector('.col-savings') as HTMLSpanElement;
                const roi = el.querySelector('.col-roi') as HTMLSpanElement;
                const statusCol = el.querySelector('.col-status') as HTMLSpanElement;
                const statusCell = el.querySelector('.cell-status') as HTMLSpanElement;
                const updated = el.querySelector('.col-updated') as HTMLSpanElement;

                cellElementsRef.current[index] = {
                  id,
                  name,
                  industry,
                  robots,
                  savings,
                  roi,
                  statusCol,
                  statusCell,
                  updated
                };
              }
            }}
          >
            <span className="col-id font-mono"></span>
            <span className="col-name text-semibold"></span>
            <span className="col-industry"></span>
            <span className="col-robots text-right font-mono"></span>
            <span className="col-savings text-right font-mono"></span>
            <span className="col-roi text-right font-mono"></span>
            <span className="col-status"><span className="cell-status"></span></span>
            <span className="col-updated font-mono text-muted"></span>
          </div>
        ))}
      </div>
    </div>
  );
};
