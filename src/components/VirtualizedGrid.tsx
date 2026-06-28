import React, { useCallback, useEffect, useRef, useState } from 'react';
import { stateEngine } from '../state/StateEngine';
import type { RpaRow } from '../types';
import { formatCurrency, formatPercent } from '../utils/sanitizer';

const ROW_HEIGHT = 48; // px per row
const VIEWPORT_HEIGHT = 500; // px height of visible scroll container

export const VirtualizedGrid: React.FC = () => {
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
    status: HTMLSpanElement;
    updated: HTMLSpanElement;
  }[]>([]);

  const [totalRows, setTotalRows] = useState(0);
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
        if (cells.id.textContent !== data.project_id) {
          cells.id.textContent = data.project_id;
        }
        if (cells.name.textContent !== data.project_name) {
          cells.name.textContent = data.project_name;
        }
        if (cells.industry.textContent !== data.industry) {
          cells.industry.textContent = data.industry;
        }
        
        const robotsStr = data.robots_deployed.toString();
        if (cells.robots.textContent !== robotsStr) {
          cells.robots.textContent = robotsStr;
        }

        const savingsStr = formatCurrency(data.cumulative_savings);
        if (cells.savings.textContent !== savingsStr) {
          cells.savings.textContent = savingsStr;
        }

        const roiStr = formatPercent(data.roi);
        if (cells.roi.textContent !== roiStr) {
          cells.roi.textContent = roiStr;
        }

        if (cells.status.textContent !== data.status) {
          cells.status.textContent = data.status;
          cells.status.className = `cell-status status-${data.status}`;
        }

        const updatedStr = new Date(data.last_updated).toLocaleTimeString();
        if (cells.updated.textContent !== updatedStr) {
          cells.updated.textContent = updatedStr;
        }
      } else {
        // Out of bounds, hide row
        rowEl.style.display = 'none';
      }
    }
  }, [visibleCount]);

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

  return (
    <div className="grid-wrapper">
      {/* Grid Headers */}
      <div className="grid-header">
        <span className="col-id">Project ID</span>
        <span className="col-name">Name</span>
        <span className="col-industry">Industry</span>
        <span className="col-robots text-right">Robots</span>
        <span className="col-savings text-right">Savings</span>
        <span className="col-roi text-right">ROI</span>
        <span className="col-status">Status</span>
        <span className="col-updated">Last Updated</span>
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
                const status = el.querySelector('.col-status') as HTMLSpanElement;
                const updated = el.querySelector('.col-updated') as HTMLSpanElement;

                cellElementsRef.current[index] = {
                  id,
                  name,
                  industry,
                  robots,
                  savings,
                  roi,
                  status,
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
