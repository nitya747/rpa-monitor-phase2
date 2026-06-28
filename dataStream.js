/**
 * ============================================================================
 * OFFICIAL HACKATHON TELEMETRY PIPELINE ENGINE (dataStream.js)
 * ============================================================================
 * * HACKATHON PARTICIPANT INSTRUCTIONS:
 * * 1. FILE LOCATION (CRITICAL FOR DEPLOYMENT):
 * - Put your rpa_database_2026.csv file into your project's PUBLIC folder.
 * • React (Vite / Create React App): /public/rpa_database_2026.csv
 * • Next.js (App or Pages Router): /public/rpa_database_2026.csv
 * - This allows the native Fetch API to resolve the file path correctly both 
 * locally and on cloud deployments (Vercel, Netlify, GitHub Pages).
 * * 2. INTEGRATION INTO SCRIPT TAG:
 * - Load this script in your application root:
 * • React (Vite): Add <script src="/dataStream.js"></script> in index.html.
 * • Next.js: Use the Next.js Script Component in your root layout:
 * <Script src="/dataStream.js" strategy="beforeInteractive" />
 * * 3. REACT / NEXT.JS STATE HOOK EXAMPLE:
 * Inside your high-performance grid component, initialize it like this:
 * * useEffect(() => {
 * if (typeof window !== 'undefined' && window.initializeRpaStream) {
 * window.initializeRpaStream((incomingBatch) => {
 * // FAST STATE ENGINE INTEGRATION
 * YOUR_STATE_ENGINE.process(incomingBatch); 
 * }, '/rpa_database_2026.csv');
 * }
 * }, []);
 * * ============================================================================
 */

(function() {
  let memoryPool = [];
  let subscribers = [];
  let isInitialized = false;
  let isFetching = false;

  const randomRange = (min, max) => Math.random() * (max - min) + min;

  const mapStatus = (csvStatus, roiFraction) => {
    if (roiFraction < 0) return 'Failed';
    if (csvStatus === 'Completed') return 'healthy';
    if (csvStatus === 'Planned') return 'healthy';
    if (csvStatus === 'Active') {
      if (roiFraction < 0.2) return 'critical';
      if (roiFraction < 0.6) return 'warning';
      return 'healthy';
    }
    return 'healthy';
  };

  /**
   * Native, highly-optimized CSV Parser
   * Formats the static vendor spreadsheet matrix into a high-performance memory array.
   */
  const parseCSV = (csvText) => {
    console.log("⚡ [Pipeline Engine] Parsing Official Hackathon CSV into Memory Pool...");
    const lines = csvText.trim().split('\n');
    
    // Auto-detect comma or tab separation based on the headers
    const headers = lines[0].split('\t').length > lines[0].split(',').length 
      ? lines[0].split('\t').map(h => h.trim().replace('\r', '')) 
      : lines[0].split(',').map(h => h.trim().replace('\r', ''));
    
    const parsedData = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Handle both standard CSV and TSV clean strings
      const values = lines[i].includes('\t') ? lines[i].split('\t') : lines[i].split(','); 
      
      if (values.length === headers.length) {
        let rowObject = {};
        
        headers.forEach((header, index) => {
          let val = values[index].trim();
          
          // Cast values to strict types for proper sorting and mathematical operations
          if (['robots_deployed', 'budget_usd', 'annual_savings_usd', 'employee_hours_saved'].includes(header)) {
            rowObject[header] = parseInt(val, 10) || 0;
          } else if (header === 'roi_percent') {
            rowObject[header] = (parseFloat(val) || 0.00) / 100; // Store as fraction (e.g. 1.584 for 158.4%)
          } else {
            rowObject[header] = val; // Metadata strings (Yes/No, Country, URLs)
          }
        });
        
        rowObject.internal_uid = rowObject.project_id || `uid-row-${i}`;
        rowObject.last_updated = Date.now();
        rowObject.csv_project_status = rowObject.project_status; // store original status
        rowObject.project_status = mapStatus(rowObject.project_status, rowObject.roi_percent);

        parsedData.push(rowObject);
      }
    }
    return parsedData;
  };

  /**
   * Global Stream Initialization Hook
   * Exposed to the window scope to anchor directly to custom front-end viewports.
   */
  window.initializeRpaStream = async function(callback, csvUrl = '/automation_projects.csv') {
    if (typeof callback !== 'function') {
      console.error("❌ [Pipeline Error] initializeRpaStream requires a callback function execution loop.");
      return;
    }

    subscribers.push(callback);

    // If already loaded and streaming, send baseline data instantly to the new subscriber
    if (isInitialized) {
      setTimeout(() => {
        callback(memoryPool);
      }, 50);
      return;
    }

    if (isFetching) {
      return;
    }
    isFetching = true;

    try {
      console.log(`📦 [Pipeline Engine] Fetching schema baseline from target destination: ${csvUrl}`);
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP network error! status: ${response.status}`);
      }

      const csvText = await response.text();
      memoryPool = parseCSV(csvText);
      isInitialized = true;
      isFetching = false;
      
      console.log(`✅ [Pipeline Engine] Successfully mapped ${memoryPool.length} rows directly into RAM.`);
      console.log("🚀 [Pipeline Engine] Starting high-frequency 200ms background execution firehose...");

      // Send initial baseline to all current subscribers
      subscribers.forEach(sub => sub(memoryPool));

      // Telemetry firehose tick rate matching strict hackathon runtime constraints
      setInterval(() => {
        if (memoryPool.length === 0) return;

        // Fluctuates an active cluster of records every cycle (5 to 50 updates per tick)
        const batchSize = Math.floor(randomRange(5, 50)); 
        const incomingBatch = [];

        for (let i = 0; i < batchSize; i++) {
          const targetIndex = Math.floor(randomRange(0, memoryPool.length));
          const row = { ...memoryPool[targetIndex] }; // Shallow clone to decouple references

          const isAnomaly = Math.random() > 0.95; // 5% chance of critical macro shifts
          
          if (isAnomaly) {
            // Massive macro volatility injection
            row.annual_savings_usd += Math.floor(randomRange(-50000, 50000));
            row.robots_deployed += Math.floor(randomRange(-2, 2));
            row.roi_percent = parseFloat((row.annual_savings_usd / row.budget_usd).toFixed(4));
          } else {
            // High-frequency standard operational telemetry noise
            row.annual_savings_usd += Math.floor(randomRange(-5000, 10000));
            row.robots_deployed += Math.max(-1, Math.min(2, Math.floor(randomRange(-1, 2))));
            row.roi_percent = parseFloat((row.annual_savings_usd / row.budget_usd).toFixed(4));
          }

          // Strict downstream constraints: sanitize limits before pushing to components
          row.annual_savings_usd = Math.max(0, row.annual_savings_usd);
          row.robots_deployed = Math.max(1, row.robots_deployed);
          row.project_status = mapStatus(row.csv_project_status, row.roi_percent);
          row.last_updated = Date.now();

          // Reflect metrics mutation in state cache
          memoryPool[targetIndex] = row;
          incomingBatch.push(row);
        }

        // Blast payload batch array to client-side callback system
        subscribers.forEach(sub => sub(incomingBatch));
      }, 200);

    } catch (error) {
      isFetching = false;
      console.error("❌ [Pipeline Critical Crash] Could not initialize telemetry stream:", error);
      console.error("👉 Fix Checklist: Verify server configuration, absolute path constraints, or check if the asset is missing inside your root public/ directory.");
    }
  };
})();