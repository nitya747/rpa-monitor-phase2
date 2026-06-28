import { stateEngine } from '../state/StateEngine';
import type { RpaRow } from '../types';

export type ExportStatus = 'loading' | 'success' | 'error';
export type ExportCallback = (status: ExportStatus, message: string) => void;

// Define headers for the CSV in stable, logical sequence matching the original sheet
const CSV_HEADERS = [
  'project_id',
  'company_id',
  'project_name',
  'start_date',
  'completion_date',
  'project_status',
  'automation_type',
  'robots_deployed',
  'budget_usd',
  'annual_savings_usd',
  'roi_percent',
  'department',
  'implementation_partner',
  'country',
  'industry',
  'employee_hours_saved',
  'ai_enabled',
  'cloud_deployment',
  'last_updated'
];

/**
 * Creates inline Web Worker code as a string.
 * This runs in a separate background thread to format and build the CSV content,
 * ensuring the high-frequency telemetry feed and UI rendering do not freeze.
 */
const getWorkerCode = (): string => {
  return `
    self.onmessage = function(e) {
      const { rows, headers } = e.data;
      
      const escapeCsvValue = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        // Clean carriages and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\\n') || str.includes('\\r')) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      try {
        // Build header row
        let csvContent = headers.join(',') + '\\n';
        
        // Loop through all rows and serialize
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const line = headers.map(h => {
            let val = row[h];
            
            // Format specific values for output compatibility
            if (h === 'roi_percent') {
              // Convert decimal fraction back to percentage value (e.g. 0.854 -> 85.4)
              val = typeof val === 'number' ? (val * 100).toFixed(2) : '0.00';
            } else if (h === 'last_updated') {
              // Format timestamp into ISO string for CSV representation
              val = typeof val === 'number' ? new Date(val).toISOString() : '';
            } else if (h === 'completion_date') {
              // Gracefully handle undefined or null completion dates
              val = val || '';
            }
            
            return escapeCsvValue(val);
          }).join(',');
          
          csvContent += line + '\\n';
        }
        
        self.postMessage({ success: true, csvContent });
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    };
  `;
};

/**
 * Triggers the client-side snapshot export using a Web Worker.
 */
export const triggerSnapshotExport = (onProgress: ExportCallback): void => {
  const rows = stateEngine.getFilteredRows();
  
  if (rows.length === 0) {
    onProgress('error', 'No active rows match the current filters.');
    return;
  }

  onProgress('loading', `Preparing to compile ${rows.length.toLocaleString()} rows...`);

  let worker: Worker | null = null;
  let objectUrl: string | null = null;

  try {
    const workerBlob = new Blob([getWorkerCode()], { type: 'application/javascript' });
    objectUrl = URL.createObjectURL(workerBlob);
    worker = new Worker(objectUrl);

    worker.onmessage = (e) => {
      const { success, csvContent, error } = e.data;

      if (success) {
        try {
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          
          const now = new Date();
          const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '');
          link.href = downloadUrl;
          link.download = `rpa_snapshot_${timestamp}.csv`;
          
          document.body.appendChild(link);
          link.click();
          
          // Clean up DOM and URL resources
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
          }, 100);

          onProgress('success', `Successfully exported ${rows.length.toLocaleString()} records to CSV.`);
        } catch (downloadErr: any) {
          onProgress('error', `Failed to initiate file download: ${downloadErr.message}`);
        }
      } else {
        onProgress('error', `Compilation error: ${error}`);
      }

      // Cleanup worker
      if (worker) {
        worker.terminate();
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    worker.onerror = (err) => {
      onProgress('error', `Worker execution failed: ${err.message}`);
      if (worker) {
        worker.terminate();
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    // Begin compilation in Web Worker thread
    worker.postMessage({ rows, headers: CSV_HEADERS });

  } catch (err: any) {
    onProgress('error', `Could not initialize background compiler: ${err.message}`);
    if (worker) {
      worker.terminate();
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};
