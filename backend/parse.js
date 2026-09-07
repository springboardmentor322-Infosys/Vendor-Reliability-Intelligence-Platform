const fs = require('fs');
const dash = JSON.parse(fs.readFileSync('out.json', 'utf8'));
console.log('Keys of Dash:', Object.keys(dash));
console.log('KPIs:', Object.keys(dash.kpis || {}));
console.log('cat:', dash.spend_by_category);
console.log('monthly:', dash.monthly_spend);
