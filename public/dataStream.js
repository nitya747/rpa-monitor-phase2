(function () {
  const industries = ["Finance", "Healthcare", "Retail", "Logistics", "IT", "Manufacturing", "Telecom", "Energy"];
  const automationTypes = ["RPA", "Cognitive", "Chatbot", "Workflow", "AI Agent"];
  const departments = ["Finance", "Operations", "HR", "IT", "Legal", "Sales", "Marketing", "Supply Chain"];
  const partners = ["Accenture", "Deloitte", "PwC", "EY", "Infosys", "Wipro"];
  const countries = ["USA", "India", "Germany", "UK", "Canada", "Australia", "Japan", "Brazil"];
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
    const dept = departments[i % departments.length];
    const partner = partners[i % partners.length];
    const country = countries[i % countries.length];
    const autoType = automationTypes[i % automationTypes.length];
    
    // Mostly healthy, some warning, few critical, few failed
    const rand = Math.random();
    const status = rand > 0.95 ? "Failed" : (rand > 0.85 ? "critical" : (rand > 0.70 ? "warning" : "healthy"));
    
    const robots = Math.floor(Math.random() * 15) + 1;
    const savings = Math.random() * 150000 + 5000;
    const budget = Math.random() * 80000 + 3000;
    
    // roi_percent is (savings - budget) / budget or randomized. 
    // Let's randomize around -0.2 to 4.5. Negative values trigger warnings.
    let roi = Math.random() * 4.5 - 0.2; 
    if (status === "Failed") {
      roi = -Math.random() * 0.5 - 0.05; // failed projects have negative ROI
    }

    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const startDate = `2024-${month}-${day}`;
    
    const hoursSaved = Math.floor(Math.random() * 5000) + 50;

    database.push({
      project_id: id,
      company_id: `CO-${String(1000 + (i % 150)).padStart(4, '0')}`,
      project_name: name,
      project_status: status,
      automation_type: autoType,
      robots_deployed: robots,
      annual_savings_usd: savings,
      budget_usd: budget,
      roi_percent: roi,
      start_date: startDate,
      employee_hours_saved: hoursSaved,
      department: dept,
      industry: industry,
      implementation_partner: partner,
      country: country,
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
        row.annual_savings_usd += Math.random() * 200 + 10;
        
        // Maybe change robots deployed
        if (Math.random() > 0.8) {
          row.robots_deployed = Math.max(1, row.robots_deployed + (Math.random() > 0.5 ? 1 : -1));
        }
        
        // Maybe change status
        if (Math.random() > 0.93) {
          const randStatus = Math.random();
          row.project_status = randStatus > 0.95 ? "Failed" : (randStatus > 0.85 ? "critical" : (randStatus > 0.70 ? "warning" : "healthy"));
          if (row.project_status === "Failed") {
            row.roi_percent = -Math.random() * 0.5 - 0.05;
          }
        }
        
        // Maybe change ROI slightly
        if (row.project_status !== "Failed" && Math.random() > 0.7) {
          row.roi_percent = Math.max(-0.5, row.roi_percent + (Math.random() * 0.2 - 0.1));
        }
        
        // Accumulate employee hours saved
        if (Math.random() > 0.5) {
          row.employee_hours_saved += Math.floor(Math.random() * 10) + 1;
        }

        row.last_updated = Date.now();
        
        batch.push({ ...row });
      }
      callback(batch);
    }, 200);
  };
})();
