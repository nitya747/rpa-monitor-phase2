import type { RpaRow, GlobalMetrics, SummarySubscriber, GridSubscriber, StreamStateSubscriber } from '../types';

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
    },
  };

  // Buffering / Pause-Play state
  private isPaused: boolean = false;
  private bufferQueue: RpaRow[] = [];

  // Sort & Filter state
  private searchQuery: string = '';
  private filters = {
    industry: '',
    status: '',
  };
  private sortState: { field: keyof RpaRow; direction: 'asc' | 'desc' }[] = [];

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
    callback(this.isPaused, this.bufferQueue.length);
    return () => {
      this.streamStateSubscribers.delete(callback);
    };
  }

  private notifyStreamState(): void {
    const isPaused = this.isPaused;
    const bufferCount = this.bufferQueue.length;
    this.streamStateSubscribers.forEach((sub) => {
      try {
        sub(isPaused, bufferCount);
      } catch (e) {
        console.error('Error in stream state subscriber:', e);
      }
    });
  }

  // Set Pause/Play state
  public setPaused(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    this.notifyStreamState();
    if (!this.isPaused && this.bufferQueue.length > 0) {
      const pending = [...this.bufferQueue];
      this.bufferQueue = [];
      this.ingestBatch(pending);
    }
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

  // Set filters
  public setFilter(type: 'industry' | 'status', value: string): void {
    this.filters[type] = value;
    this.recomputeIndex();
    this.notifyGrid();
  }

  public getFilters(): { industry: string; status: string } {
    return { ...this.filters };
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
      this.notifyStreamState(); // notify stream state subscribers of new buffer count
      return;
    }
    this.ingestBatch(batch);
  }

  private ingestBatch(batch: RpaRow[]): void {
    let summaryChanged = false;
    let gridChanged = false;

    this.lastUpdatedIds.clear();

    batch.forEach((newRow) => {
      this.lastUpdatedIds.add(newRow.project_id);
      const existingRow = this.rows.get(newRow.project_id);

      if (existingRow) {
        this.metrics.activeRobotsDeployed -= existingRow.robots_deployed;
        this.metrics.globalCumulativeSavings -= existingRow.cumulative_savings;

        this.metrics.activeRobotsDeployed += newRow.robots_deployed;
        this.metrics.globalCumulativeSavings += newRow.cumulative_savings;

        // Incrementally update status counts
        this.metrics.statusCounts[existingRow.status]--;
        this.metrics.statusCounts[newRow.status]++;

        this.rows.set(newRow.project_id, newRow);
        summaryChanged = true;
        gridChanged = true;
      } else {
        this.metrics.totalRowsProcessed += 1;
        this.metrics.activeRobotsDeployed += newRow.robots_deployed;
        this.metrics.globalCumulativeSavings += newRow.cumulative_savings;

        // Incrementally update status counts
        this.metrics.statusCounts[newRow.status]++;

        this.rows.set(newRow.project_id, newRow);
        this.rowIds.push(newRow.project_id);
        
        summaryChanged = true;
        gridChanged = true;
      }
    });

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

    // 1. Apply Industry & Status Filters & Search
    if (this.filters.industry || this.filters.status || this.searchQuery) {
      const queryTokens = this.searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

      result = result.filter((id) => {
        const row = this.rows.get(id);
        if (!row) return false;

        if (this.filters.industry && row.industry !== this.filters.industry) {
          return false;
        }
        if (this.filters.status && row.status !== this.filters.status) {
          return false;
        }

        if (queryTokens.length > 0) {
          const searchableText = `${row.project_id} ${row.project_name} ${row.industry} ${row.status}`.toLowerCase();
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
      result.sort((aId, bId) => {
        const a = this.rows.get(aId);
        const b = this.rows.get(bId);
        if (!a || !b) return 0;

        for (const sort of this.sortState) {
          const field = sort.field;
          const dir = sort.direction === 'asc' ? 1 : -1;

          const valA = a[field];
          const valB = b[field];

          if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
            if (cmp !== 0) return cmp * dir;
          } else if (typeof valA === 'number' && typeof valB === 'number') {
            if (valA !== valB) {
              return (valA - valB) * dir;
            }
          }
        }
        return 0;
      });
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
}

export const stateEngine = new RpaStateEngine();
export type { RpaStateEngine };
