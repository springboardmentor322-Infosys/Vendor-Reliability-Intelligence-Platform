import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\scratch\\chrome_profile_po';

// First, get tokens from backend
async function getTokens() {
  const finRes = await fetch('http://127.0.0.1:8000/login', {
    method: 'POST',
    body: new URLSearchParams({ email: 'finance@vendoriq.com', password: 'Finance@123' })
  });
  const finData = await finRes.json();

  const procRes = await fetch('http://127.0.0.1:8000/login', {
    method: 'POST',
    body: new URLSearchParams({ email: 'procurement@vendoriq.com', password: 'Procurement@123' })
  });
  const procData = await procRes.json();

  return {
    finance: finData.access_token,
    procurement: procData.access_token
  };
}

async function run() {
  const tokens = await getTokens();
  console.log("Finance Token obtained:", Boolean(tokens.finance));
  console.log("Procurement Token obtained:", Boolean(tokens.procurement));

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9338',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1500,1050',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const newTabRes = await fetch('http://127.0.0.1:9338/json/new?about:blank', { method: 'PUT' });
    const tabData = await newTabRes.json();

    const ws = new WebSocket(tabData.webSocketDebuggerUrl);
    let id = 1;
    const pending = new Map();
    const consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails.text + ' ' + msg.params.exceptionDetails.exception?.description);
      }
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };

    await new Promise(r => ws.onopen = r);

    function send(method, params = {}) {
      return new Promise(resolve => {
        const msgId = id++;
        pending.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    // ==========================================
    // 1. TEST FINANCE OFFICER UI
    // ==========================================
    console.log("\n==========================================");
    console.log(">>> TESTING FINANCE OFFICER VIEW <<<");
    console.log("==========================================");

    // Seed localStorage on 127.0.0.1:5500 domain
    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/purchase-orders.html' });
    await new Promise(r => setTimeout(r, 1500));

    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem("access_token", "${tokens.finance}");
        localStorage.setItem("user_role", "Finance Officer");
        localStorage.setItem("user_name", "Finance Officer");
      `
    });

    // Reload page with seeded credentials
    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/purchase-orders.html' });
    await new Promise(r => setTimeout(r, 2500));

    const finAudit = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const formContainer = document.querySelector(".form-container");
        const formComputedDisplay = formContainer ? window.getComputedStyle(formContainer).display : 'missing';
        const saveBtn = document.getElementById("save-po-btn");
        const saveBtnComputedDisplay = saveBtn ? window.getComputedStyle(saveBtn).display : 'missing';

        const headers = Array.from(document.querySelectorAll("#purchaseTable thead th")).map(th => th.textContent.trim());
        const actionHeaders = headers.filter(h => h.includes("Action"));

        const rows = document.querySelectorAll("#purchaseTable tbody tr");
        const firstRowCells = rows.length > 0 ? Array.from(rows[0].querySelectorAll("td")).map(td => td.textContent.trim()) : [];
        const actionButtons = Array.from(document.querySelectorAll("#purchaseTable tbody button"));

        const tableTitle = document.querySelector(".table-header-title h3")?.textContent.trim();
        const pageDesc = document.querySelector("body > div:first-child p")?.textContent.trim();

        return JSON.stringify({
          formComputedDisplay,
          saveBtnComputedDisplay,
          headersCount: headers.length,
          headers,
          hasActionHeader: actionHeaders.length > 0,
          rowsCount: rows.length,
          firstRowCellCount: firstRowCells.length,
          firstRowCells,
          actionButtonsCount: actionButtons.length,
          tableTitle,
          pageDesc
        });
      })()`
    });

    const parsedFinAudit = JSON.parse(finAudit.result?.result?.value || "{}");
    console.log("Finance Officer Audit Result:", JSON.stringify(parsedFinAudit, null, 2));

    // Scroll to table and capture table screenshot for Finance Officer
    await send('Runtime.evaluate', { expression: 'document.querySelector(".table-card").scrollIntoView();' });
    await new Promise(r => setTimeout(r, 1000));
    const screenshotFinTable = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\finance_purchase_orders_table.png', Buffer.from(screenshotFinTable.result.data, 'base64'));
    console.log("Finance Officer table screenshot saved: finance_purchase_orders_table.png");

    // ==========================================
    // 2. TEST PROCUREMENT MANAGER UI
    // ==========================================
    console.log("\n==========================================");
    console.log(">>> TESTING PROCUREMENT MANAGER VIEW <<<");
    console.log("==========================================");

    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem("access_token", "${tokens.procurement}");
        localStorage.setItem("user_role", "Procurement Manager");
        localStorage.setItem("user_name", "Procurement Manager");
      `
    });

    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/purchase-orders.html' });
    await new Promise(r => setTimeout(r, 2500));

    const procAudit = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const formContainer = document.querySelector(".form-container");
        const formComputedDisplay = formContainer ? window.getComputedStyle(formContainer).display : 'missing';
        const saveBtn = document.getElementById("save-po-btn");
        const saveBtnComputedDisplay = saveBtn ? window.getComputedStyle(saveBtn).display : 'missing';

        const headers = Array.from(document.querySelectorAll("#purchaseTable thead th")).map(th => th.textContent.trim());
        const actionHeaders = headers.filter(h => h.includes("Action"));

        const rows = document.querySelectorAll("#purchaseTable tbody tr");
        const firstRowCells = rows.length > 0 ? Array.from(rows[0].querySelectorAll("td")).map(td => td.textContent.trim()) : [];
        const actionButtons = Array.from(document.querySelectorAll("#purchaseTable tbody button"));

        return JSON.stringify({
          formComputedDisplay,
          saveBtnComputedDisplay,
          headersCount: headers.length,
          headers,
          hasActionHeader: actionHeaders.length > 0,
          rowsCount: rows.length,
          firstRowCellCount: firstRowCells.length,
          actionButtonsCount: actionButtons.length
        });
      })()`
    });

    const parsedProcAudit = JSON.parse(procAudit.result?.result?.value || "{}");
    console.log("Procurement Manager Audit Result:", JSON.stringify(parsedProcAudit, null, 2));

    // Scroll to table and capture table screenshot for Procurement Manager
    await send('Runtime.evaluate', { expression: 'document.querySelector(".table-card").scrollIntoView();' });
    await new Promise(r => setTimeout(r, 1000));
    const screenshotProcTable = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\procurement_purchase_orders_table.png', Buffer.from(screenshotProcTable.result.data, 'base64'));
    console.log("Procurement Manager table screenshot saved: procurement_purchase_orders_table.png");

    console.log("\nConsole Errors Logged:", consoleErrors);

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    chrome.kill();
  }
}

run();
