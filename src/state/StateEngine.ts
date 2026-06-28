import type { RpaRow, GlobalMetrics, SummarySubscriber, GridSubscriber } from '../types';

class RpaStateEngine {
  private rows: Map<string, RpaRow> = new Map();
  private rowIds: string[] = []; // maintain stable insertion order or sort order
  private metrics: GlobalMetrics = {
    totalRowsProcessed: 0,
    activeRobotsDeployed: 0,
    globalCumulativeSavings: 0,
  };

  private summarySubscribers: Set<SummarySubscriber> = new Set();
  private gridSubscribers: Set<GridSubscriber> = new Set();

  public getRowsCount(): number {
    return this.rowIds.length;
  }

  public getMetrics(): GlobalMetrics {
    return { ...this.metrics };
  }

  public subscribeSummary(callback: SummarySubscriber): () => void {
    this.summarySubscribers.add(callback);
    // Trigger initially
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

  public applyBatch(batch: RpaRow[]): void {
    let summaryChanged = false;
    let gridChanged = false;

    batch.forEach((newRow) => {
      const existingRow = this.rows.get(newRow.project_id);

      if (existingRow) {
        // Subtract old values from cumulative metrics
        this.metrics.activeRobotsDeployed -= existingRow.robots_deployed;
        this.metrics.globalCumulativeSavings -= existingRow.cumulative_savings;

        // Add new values
        this.metrics.activeRobotsDeployed += newRow.robots_deployed;
        this.metrics.globalCumulativeSavings += newRow.cumulative_savings;

        // Update row
        this.rows.set(newRow.project_id, newRow);
        summaryChanged = true;
        gridChanged = true;
      } else {
        // New row addition
        this.metrics.totalRowsProcessed += 1;
        this.metrics.activeRobotsDeployed += newRow.robots_deployed;
        this.metrics.globalCumulativeSavings += newRow.cumulative_savings;

        this.rows.set(newRow.project_id, newRow);
        this.rowIds.push(newRow.project_id);
        
        summaryChanged = true;
        gridChanged = true;
      }
    });

    if (summaryChanged) {
      this.notifySummary();
    }
    if (gridChanged) {
      this.notifyGrid();
    }
  }

  public getVisibleSlice(startIndex: number, count: number): RpaRow[] {
    const end = Math.min(startIndex + count, this.rowIds.length);
    const slice: RpaRow[] = [];
    for (let i = startIndex; i < end; i++) {
      const row = this.rows.get(this.rowIds[i]);
      if (row) {
        slice.push(row);
      }
    }
    return slice;
  }

  private notifySummary(): void {
    const currentMetrics = { ...this.metrics };
    this.summarySubscribers.forEach((sub) => {
      try {
        sub(currentMetrics);
      } catch (e) {
        console.error('Error in summary subscriber:', e);
      }
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
