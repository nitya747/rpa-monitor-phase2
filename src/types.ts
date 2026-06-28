export interface RpaRow {
  project_id: string;
  company_id: string;
  project_name: string;
  project_status: 'healthy' | 'warning' | 'critical' | 'Failed';
  automation_type: string;
  robots_deployed: number;
  annual_savings_usd: number;
  budget_usd: number;
  roi_percent: number; // percentage value (e.g. 1.25 for 125%, can be negative e.g. -0.15)
  start_date: string;
  employee_hours_saved: number;
  department: string;
  industry: string;
  implementation_partner: string;
  country: string;
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
    Failed: number;
  };
}

export type SummarySubscriber = (metrics: GlobalMetrics) => void;
export type GridSubscriber = () => void;
export type StreamStateSubscriber = (isPaused: boolean, bufferCount: number, isOverlayOpen: boolean) => void;
