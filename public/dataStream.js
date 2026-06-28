(function () {
  const industries = ["Finance", "Healthcare", "Retail", "Logistics", "IT", "Manufacturing", "Telecom", "Energy"];
  const statuses = ["healthy", "warning", "critical"];
  const projectNames = [
    "Invoice Processing Bot", "Customer Onboarding Auto", "Sales Ledger Syncer",
    "Inventory Reconciliation", "Claim Validator", "Payroll Automator",
    "Data Migrator Pro", "Compliance Reporter", "IT Helpdesk Assister",
    "PO Generator", "Vendor Portal Scraper", "Feedback Analyzer",
    "Logistics Dispatcher", "CRM Updater", "Billing Auditor"
  ];

  // Generate initial database of 600 rows
  const database = [];
  for (let i = 1; i <= 600; i++) {
    const id = `PRJ-${String(i).padStart(4, '0')}`;
    const name = `${projectNames[i % projectNames.length]} ${Math.ceil(i / projectNames.length)}`;
    const industry = industries[i % industries.length];
    // Mostly healthy, some warning, few critical
    const rand = Math.random();
    const status = rand > 0.9 ? "critical" : (rand > 0.75 ? "warning" : "healthy");
    const robots = Math.floor(Math.random() * 15) + 1;
    const savings = Math.random() * 150000 + 5000;
    const roi = Math.random() * 4 + 0.5; // 50% to 450%
    database.push({
      project_id: id,
      project_name: name,
      industry: industry,
      status: status,
      robots_deployed: robots,
      cumulative_savings: savings,
      roi: roi,
      last_updated: Date.now()
    });
  }

  window.initializeRpaStream = function (callback) {
    if (typeof callback !== 'function') {
      console.error('Callback must be a function');
      return;
    }

    // Send initial baseline batch
    setTimeout(() => {
      callback(database);
    }, 100);

    // Then start streaming updates every 200ms
    setInterval(() => {
      const batchSize = Math.floor(Math.random() * 10) + 1; // 1 to 10 rows updated
      const batch = [];
      for (let i = 0; i < batchSize; i++) {
        const index = Math.floor(Math.random() * database.length);
        const row = database[index];
        
        // Modulate fields:
        // Accumulate savings
        row.cumulative_savings += Math.random() * 200 + 10;
        // Maybe change robots deployed
        if (Math.random() > 0.8) {
          row.robots_deployed = Math.max(1, row.robots_deployed + (Math.random() > 0.5 ? 1 : -1));
        }
        // Maybe change status
        if (Math.random() > 0.95) {
          row.status = statuses[Math.floor(Math.random() * statuses.length)];
        }
        // Maybe change ROI slightly
        if (Math.random() > 0.7) {
          row.roi = Math.max(0.1, row.roi + (Math.random() * 0.2 - 0.1));
        }
        row.last_updated = Date.now();
        
        batch.push({ ...row });
      }
      callback(batch);
    }, 200);
  };
})();
