import type { RpaRow, GlobalMetrics, SummarySubscriber, GridSubscriber, StreamStateSubscriber } from '../types';

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

class RpaStateEngine {
  private rows: Map<string, RpaRow> = new Map();
  private rowIds: string[] = []; // maintain stable insertion order
  private filteredRowIds: string[] = []; // active visible/sorted/filtered row IDs
  private lastUpdatedIds: Set<string> = new Set();
  
  private metrics: GlobalMetrics = {
    totalRowsProcessed: 0,
    activeRobotsDeployed: 0,
    globalCumulativeSavings: 0,
    statusCounts: {
      healthy: 0,
      warning: 0,
      critical: 0,
      Failed: 0,
    },
  };

  // Buffering / Pause-Play state
  private isPaused: boolean = false;
  private isOverlayOpen: boolean = false;
  private bufferQueue: RpaRow[] = [];

  // Sort & Filter state
  private searchQuery: string = '';
  private filters = {
    industry: new Set<string>(),
    department: new Set<string>(),
    automation_type: new Set<string>(),
    status: '', // single select project_status
  };
  private sortState: { field: keyof RpaRow; direction: 'asc' | 'desc' }[] = [];

  // Unique filter values collected from data stream
  private uniqueDepartments: Set<string> = new Set();
  private uniqueIndustries: Set<string> = new Set();
  private uniqueTypes: Set<string> = new Set();

  private cachedDepartments: string[] = [];
  private cachedIndustries: string[] = [];
  private cachedTypes: string[] = [];

  private summarySubscribers: Set<SummarySubscriber> = new Set();
  private gridSubscribers: Set<GridSubscriber> = new Set();
  private streamStateSubscribers: Set<StreamStateSubscriber> = new Set();
  private summaryAnimationFrameId: number | null = null;

  public getRowsCount(): number {
    return this.filteredRowIds.length;
  }

  public getMetrics(): GlobalMetrics {
    return { ...this.metrics };
  }

  public getLastUpdatedIds(): Set<string> {
    return this.lastUpdatedIds;
  }

  public subscribeSummary(callback: SummarySubscriber): () => void {
    this.summarySubscribers.add(callback);
    callback({ ...this.metrics });
    return () => {
      this.summarySubscribers.delete(callback);
    };
  }

  public subscribeGrid(callback: GridSubscriber): () => void {
    this.gridSubscribers.add(callback);
    return () => {
      this.gridSubscribers.delete(callback);
    };
  }

  public subscribeStreamState(callback: StreamStateSubscriber): () => void {
    this.streamStateSubscribers.add(callback);
    callback(this.isPaused, this.bufferQueue.length, this.isOverlayOpen);
    return () => {
      this.streamStateSubscribers.delete(callback);
    };
  }

  private notifyStreamState(): void {
    const isPaused = this.isPaused;
    const bufferCount = this.bufferQueue.length;
    const isOverlayOpen = this.isOverlayOpen;
    this.streamStateSubscribers.forEach((sub) => {
      try {
        sub(isPaused, bufferCount, isOverlayOpen);
      } catch (e) {
        console.error('Error in stream state subscriber:', e);
      }
    });
  }

  // Set Pause/Play state
  public setPaused(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    this.isOverlayOpen = paused; // auto-open overlay when pausing, auto-close when resuming
    this.notifyStreamState();
    if (!this.isPaused && this.bufferQueue.length > 0) {
      const pending = [...this.bufferQueue];
      this.bufferQueue = [];
      this.ingestBatch(pending);
    }
  }

  public setOverlayOpen(open: boolean): void {
    if (this.isOverlayOpen === open) return;
    this.isOverlayOpen = open;
    this.notifyStreamState();
  }

  public getOverlayOpen(): boolean {
    return this.isOverlayOpen;
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public getBufferCount(): number {
    return this.bufferQueue.length;
  }

  // Set sorting field
  public setSort(field: keyof RpaRow, isMulti: boolean): void {
    const existingIndex = this.sortState.findIndex((s) => s.field === field);

    if (isMulti) {
      if (existingIndex > -1) {
        const current = this.sortState[existingIndex];
        if (current.direction === 'asc') {
          current.direction = 'desc';
        } else {
          this.sortState.splice(existingIndex, 1);
        }
      } else {
        this.sortState.push({ field, direction: 'asc' });
      }
    } else {
      if (existingIndex > -1) {
        const current = this.sortState[existingIndex];
        if (current.direction === 'asc') {
          current.direction = 'desc';
          this.sortState = [current];
        } else {
          this.sortState = [];
        }
      } else {
        this.sortState = [{ field, direction: 'asc' }];
      }
    }

    this.recomputeIndex();
    this.notifyGrid();
  }

  public getSortState(): { field: keyof RpaRow; direction: 'asc' | 'desc' }[] {
    return [...this.sortState];
  }

  // Set filters (multi-select supports check state)
  public toggleFilter(type: 'industry' | 'department' | 'automation_type', value: string, isChecked: boolean): void {
    const filterSet = this.filters[type];
    if (isChecked) {
      filterSet.add(value);
    } else {
      filterSet.delete(value);
    }
    this.recomputeIndex();
    this.notifyGrid();
  }

  public setStatusFilter(status: string): void {
    this.filters.status = status;
    this.recomputeIndex();
    this.notifyGrid();
  }

  public getFilters() {
    return {
      industry: new Set(this.filters.industry),
      department: new Set(this.filters.department),
      automation_type: new Set(this.filters.automation_type),
      status: this.filters.status,
    };
  }

  // Set search query
  public setSearch(query: string): void {
    this.searchQuery = query;
    this.recomputeIndex();
    this.notifyGrid();
  }

  public getSearchQuery(): string {
    return this.searchQuery;
  }

  // Ingest incoming batches
  public applyBatch(batch: RpaRow[]): void {
    if (this.isPaused) {
      this.bufferQueue.push(...batch);
      this.notifyStreamState();
      return;
    }
    this.ingestBatch(batch);
  }

  private ingestBatch(batch: RpaRow[]): void {
    let summaryChanged = false;
    let gridChanged = false;
    let listsChanged = false;

    this.lastUpdatedIds.clear();

    batch.forEach((newRow) => {
      this.lastUpdatedIds.add(newRow.project_id);
      const existingRow = this.rows.get(newRow.project_id);

      // Support old and new schema fields gracefully
      const newSavings = newRow.annual_savings_usd !== undefined ? newRow.annual_savings_usd : ((newRow as any).cumulative_savings || 0);
      const newStatus = newRow.project_status || (newRow as any).status || 'healthy';

      // Track unique filter fields
      if (newRow.department) {
        const oldSize = this.uniqueDepartments.size;
        this.uniqueDepartments.add(newRow.department);
        if (this.uniqueDepartments.size !== oldSize) {
          listsChanged = true;
        }
      }
      if (newRow.industry) {
        const oldSize = this.uniqueIndustries.size;
        this.uniqueIndustries.add(newRow.industry);
        if (this.uniqueIndustries.size !== oldSize) {
          listsChanged = true;
        }
      }
      if (newRow.automation_type) {
        const oldSize = this.uniqueTypes.size;
        this.uniqueTypes.add(newRow.automation_type);
        if (this.uniqueTypes.size !== oldSize) {
          listsChanged = true;
        }
      }

      if (existingRow) {
        const oldSavings = existingRow.annual_savings_usd !== undefined ? existingRow.annual_savings_usd : (existingRow as any).cumulative_savings || 0;
        const oldStatus = existingRow.project_status || (existingRow as any).status || 'healthy';

        this.metrics.activeRobotsDeployed -= existingRow.robots_deployed;
        this.metrics.globalCumulativeSavings -= oldSavings;

        this.metrics.activeRobotsDeployed += newRow.robots_deployed;
        this.metrics.globalCumulativeSavings += newSavings;

        // Incrementally update status counts
        this.metrics.statusCounts[oldStatus]--;
        this.metrics.statusCounts[newStatus]++;

        this.rows.set(newRow.project_id, newRow);
        summaryChanged = true;
        gridChanged = true;
      } else {
        this.metrics.totalRowsProcessed += 1;
        this.metrics.activeRobotsDeployed += newRow.robots_deployed;
        this.metrics.globalCumulativeSavings += newSavings;

        // Incrementally update status counts
        this.metrics.statusCounts[newStatus]++;

        this.rows.set(newRow.project_id, newRow);
        this.rowIds.push(newRow.project_id);
        
        summaryChanged = true;
        gridChanged = true;
      }
    });

    if (listsChanged) {
      this.cachedDepartments = Array.from(this.uniqueDepartments).sort();
      this.cachedIndustries = Array.from(this.uniqueIndustries).sort();
      this.cachedTypes = Array.from(this.uniqueTypes).sort();
    }

    if (gridChanged) {
      this.recomputeIndex();
    }

    if (summaryChanged) {
      this.notifySummary();
    }
    if (gridChanged) {
      this.notifyGrid();
    }
  }

  // Core slice retrieval
  public getVisibleSlice(startIndex: number, count: number): RpaRow[] {
    const end = Math.min(startIndex + count, this.filteredRowIds.length);
    const slice: RpaRow[] = [];
    for (let i = startIndex; i < end; i++) {
      const row = this.rows.get(this.filteredRowIds[i]);
      if (row) {
        slice.push(row);
      }
    }
    return slice;
  }

  // Recompute filtering, search, and sorting indices
  public recomputeIndex(): void {
    let result = [...this.rowIds];

    // 1. Apply Filters & Search
    const hasFilters = 
      this.filters.industry.size > 0 || 
      this.filters.department.size > 0 || 
      this.filters.automation_type.size > 0 || 
      this.filters.status || 
      this.searchQuery;

    if (hasFilters) {
      const queryTokens = this.searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

      result = result.filter((id) => {
        const row = this.rows.get(id);
        if (!row) return false;

        const rowIndustry = row.industry || '';
        const rowDept = row.department || '';
        const rowAutoType = row.automation_type || '';
        const rowStatus = row.project_status || (row as any).status || 'healthy';

        if (this.filters.industry.size > 0 && !this.filters.industry.has(rowIndustry)) {
          return false;
        }
        if (this.filters.department.size > 0 && !this.filters.department.has(rowDept)) {
          return false;
        }
        if (this.filters.automation_type.size > 0 && !this.filters.automation_type.has(rowAutoType)) {
          return false;
        }
        if (this.filters.status && rowStatus !== this.filters.status) {
          return false;
        }

        if (queryTokens.length > 0) {
          // Search project_name, company_id, implementation_partner, and country
          const pName = row.project_name || '';
          const cId = row.company_id || '';
          const partner = row.implementation_partner || '';
          const country = row.country || '';
          
          const searchableText = `${pName} ${cId} ${partner} ${country}`.toLowerCase();
          for (const token of queryTokens) {
            if (!searchableText.includes(token)) {
              return false;
            }
          }
        }

        return true;
      });
    }

    // 2. Apply Multi-Column Sorting
    if (this.sortState.length > 0) {
      // Pre-map rows to bypass expensive Map lookups inside the sort loop
      const rowsToSort: RpaRow[] = [];
      for (let i = 0; i < result.length; i++) {
        const r = this.rows.get(result[i]);
        if (r) {
          rowsToSort.push(r);
        }
      }

      rowsToSort.sort((a, b) => {
        for (let i = 0; i < this.sortState.length; i++) {
          const sort = this.sortState[i];
          const field = sort.field;
          const dir = sort.direction === 'asc' ? 1 : -1;

          let valA = a[field];
          let valB = b[field];

          // Fallbacks for compatibility
          if (field === 'roi_percent') {
            if (valA === undefined) valA = (a as any).roi;
            if (valB === undefined) valB = (b as any).roi;
          }
          if (field === 'annual_savings_usd') {
            if (valA === undefined) valA = (a as any).cumulative_savings;
            if (valB === undefined) valB = (b as any).cumulative_savings;
          }

          if (valA === undefined || valB === undefined) continue;

          if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = collator.compare(valA, valB);
            if (cmp !== 0) return cmp * dir;
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            if (valA !== valB) {
              return (valA - valB) * dir;
            }
          }
        }
        return 0;
      });

      result = rowsToSort.map((r) => r.project_id);
    }

    this.filteredRowIds = result;
  }

  private notifySummary(): void {
    if (this.summaryAnimationFrameId !== null) {
      return;
    }
    this.summaryAnimationFrameId = requestAnimationFrame(() => {
      this.summaryAnimationFrameId = null;
      const currentMetrics = { ...this.metrics };
      this.summarySubscribers.forEach((sub) => {
        try {
          sub(currentMetrics);
        } catch (e) {
          console.error('Error in summary subscriber:', e);
        }
      });
    });
  }

  private notifyGrid(): void {
    this.gridSubscribers.forEach((sub) => {
      try {
        sub();
      } catch (e) {
        console.error('Error in grid subscriber:', e);
      }
    });
  }

  public getUniqueDepartments(): string[] {
    return this.cachedDepartments;
  }

  public getUniqueIndustries(): string[] {
    return this.cachedIndustries;
  }

  public getUniqueTypes(): string[] {
    return this.cachedTypes;
  }

  public getFilteredRows(): RpaRow[] {
    const result: RpaRow[] = [];
    for (let i = 0; i < this.filteredRowIds.length; i++) {
      const row = this.rows.get(this.filteredRowIds[i]);
      if (row) {
        result.push(row);
      }
    }
    return result;
  }
}

export const stateEngine = new RpaStateEngine();
export type { RpaStateEngine };
