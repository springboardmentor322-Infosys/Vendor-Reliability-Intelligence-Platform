import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\scratch\\chrome_profile_inv';

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
  console.log("Tokens ready:", Boolean(tokens.finance), Boolean(tokens.procurement));

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9339',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1550,1100',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const newTabRes = await fetch('http://127.0.0.1:9339/json/new?about:blank', { method: 'PUT' });
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
    // 1. TEST FINANCE OFFICER INVOICES VIEW
    // ==========================================
    console.log("\n==========================================");
    console.log(">>> TESTING FINANCE OFFICER INVOICES VIEW <<<");
    console.log("==========================================");

    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/invoices.html' });
    await new Promise(r => setTimeout(r, 1500));

    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem("access_token", "${tokens.finance}");
        localStorage.setItem("user_role", "Finance Officer");
        localStorage.setItem("user_name", "Finance Officer");
      `
    });

    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/invoices.html' });
    await new Promise(r => setTimeout(r, 2500));

    const finAudit = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const headers = Array.from(document.querySelectorAll("#invoiceTable thead th")).map(th => th.textContent.trim());
        const rows = document.querySelectorAll("#invoiceTable tbody tr");
        const firstRowCells = rows.length > 0 ? Array.from(rows[0].querySelectorAll("td")).map(td => td.textContent.trim()) : [];
        const actionButtons = Array.from(document.querySelectorAll("#invoiceTable tbody button")).map(b => ({
          text: b.textContent.trim(),
          action: b.dataset.action,
          id: b.dataset.id
        }));

        const overdueBadges = Array.from(document.querySelectorAll("#invoiceTable tbody .badge-poor")).filter(b => b.textContent.includes("Overdue")).length;
        const settledBadges = Array.from(document.querySelectorAll("#invoiceTable tbody td")).filter(td => td.textContent.includes("Settled")).length;

        const kpis = {
          total: document.getElementById("kpiTotalInvoices")?.textContent.trim(),
          paid: document.getElementById("kpiPaidInvoices")?.textContent.trim(),
          pending: document.getElementById("kpiPendingInvoices")?.textContent.trim(),
          value: document.getElementById("kpiLedgerValue")?.textContent.trim()
        };

        return JSON.stringify({
          headersCount: headers.length,
          headers,
          rowsCount: rows.length,
          firstRowCellCount: firstRowCells.length,
          firstRowCells,
          actionButtonsCount: actionButtons.length,
          actionButtonsSample: actionButtons.slice(0, 5),
          overdueBadgesCount: overdueBadges,
          settledBadgesCount: settledBadges,
          kpis
        });
      })()`
    });

    const parsedFinAudit = JSON.parse(finAudit.result?.result?.value || "{}");
    console.log("Finance Officer Audit Result:", JSON.stringify(parsedFinAudit, null, 2));

    // Capture desktop screenshot
    const screenshotFin = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\finance_invoices_desktop.png', Buffer.from(screenshotFin.result.data, 'base64'));
    console.log("Finance Officer desktop screenshot saved: finance_invoices_desktop.png");

    // Scroll to table and capture table screenshot
    await send('Runtime.evaluate', { expression: 'document.querySelector(".table-card").scrollIntoView();' });
    await new Promise(r => setTimeout(r, 1000));
    const screenshotFinTable = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\finance_invoices_table.png', Buffer.from(screenshotFinTable.result.data, 'base64'));
    console.log("Finance Officer table screenshot saved: finance_invoices_table.png");

    // ==========================================
    // 2. TEST PROCUREMENT MANAGER VIEW (READ-ONLY INVOICES)
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

    await send('Page.navigate', { url: 'http://127.0.0.1:5500/frontend/invoices.html' });
    await new Promise(r => setTimeout(r, 2500));

    const procAudit = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const actionButtons = Array.from(document.querySelectorAll("#invoiceTable tbody button"));
        const rows = document.querySelectorAll("#invoiceTable tbody tr");
        const financeActionsText = Array.from(document.querySelectorAll("#invoiceTable tbody tr td:last-child")).map(td => td.textContent.trim());

        return JSON.stringify({
          actionButtonsCount: actionButtons.length,
          rowsCount: rows.length,
          financeActionsTextSample: financeActionsText.slice(0, 5)
        });
      })()`
    });

    const parsedProcAudit = JSON.parse(procAudit.result?.result?.value || "{}");
    console.log("Procurement Manager Audit Result:", JSON.stringify(parsedProcAudit, null, 2));

    const screenshotProc = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:\\Users\\Dell\\.gemini\\antigravity\\brain\\989c9f60-c2ba-46ab-af5d-4118660db288\\procurement_invoices_desktop.png', Buffer.from(screenshotProc.result.data, 'base64'));
    console.log("Procurement Manager screenshot saved: procurement_invoices_desktop.png");

    console.log("\nConsole Errors Logged:", consoleErrors);

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    chrome.kill();
  }
}

run();
