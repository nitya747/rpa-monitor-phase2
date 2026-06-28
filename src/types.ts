export interface RpaRow {
  project_id: string;
  project_name: string;
  industry: string;
  status: 'healthy' | 'warning' | 'critical';
  robots_deployed: number;
  cumulative_savings: number;
  roi: number; // percentage value (e.g. 1.25 for 125%)
  last_updated: number;
}

export interface GlobalMetrics {
  totalRowsProcessed: number;
  activeRobotsDeployed: number;
  globalCumulativeSavings: number;
  statusCounts: {
    healthy: number;
    warning: number;
    critical: number;
  };
}

export type SummarySubscriber = (metrics: GlobalMetrics) => void;
export type GridSubscriber = () => void;
export type StreamStateSubscriber = (isPaused: boolean, bufferCount: number) => void;
