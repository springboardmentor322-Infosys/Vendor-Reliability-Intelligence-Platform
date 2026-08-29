import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button from '@/components/widgets/Button';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { currency } from '@/lib/format';

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r) => headers.map((h) => `"${String(r[h] ?? '')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { vendors, purchaseOrders, contracts } = useApp();

  const reports = [
  {
    title: 'Vendors Report',
    desc: `${vendors.length} vendors · reliability, risk & spend`,
    accent: '#1a237e',
    data: () => vendors.map((v) => ({
      Name: v.name, Category: v.category, Status: v.status,
      Reliability: v.reliabilityScore, Risk: v.riskLevel, Country: v.country,
      TotalSpend: v.totalSpend
    }))
  },
  {
    title: 'Purchase Orders Report',
    desc: `${purchaseOrders.length} POs · ${currency(purchaseOrders.reduce((s, p) => s + p.amount, 0))} total`,
    accent: '#2196f3',
    data: () => purchaseOrders.map((p) => ({
      PO: p.poNumber, Vendor: vendors.find((v) => v.id === p.vendorId)?.name ?? '',
      Amount: p.amount, Status: p.status, Ordered: p.orderDate, Expected: p.expectedDate
    }))
  },
  {
    title: 'Contracts Report',
    desc: `${contracts.length} contracts · ${currency(contracts.reduce((s, c) => s + c.value, 0))} value`,
    accent: '#4caf50',
    data: () => contracts.map((c) => ({
      Title: c.title, Vendor: vendors.find((v) => v.id === c.vendorId)?.name ?? '',
      Value: c.value, Status: c.status, Start: c.startDate, End: c.endDate
    }))
  }];


  const printReport = (title: string, data: Record<string, unknown>[]) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const headers = data.length ? Object.keys(data[0]) : [];
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:Inter,sans-serif;padding:32px;color:#333}h1{color:#1a237e}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1a237e;color:#fff;text-align:left;padding:8px;font-size:12px}td{padding:8px;border-bottom:1px solid #eee;font-size:13px}</style></head><body><h1>VendorIQ — ${title}</h1><p>Generated ${new Date().toLocaleString()}</p><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${data.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div data-ev-id="ev_4adf454cbe">
			<PageHeader title="Reports" subtitle="Export vendor, PO & contract data (Excel/CSV + PDF)" />
			<div data-ev-id="ev_aaa2681ab4" className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{reports.map((r) =>
        <Card key={r.title} accent={r.accent}>
						<div data-ev-id="ev_f7402a6113" className="flex flex-col gap-4">
							<div data-ev-id="ev_60c1b25cac" className="flex items-start justify-between">
								<div data-ev-id="ev_ff2b020966">
									<h3 data-ev-id="ev_b62a5db6b0" className="font-semibold text-gray-800">{r.title}</h3>
									<p data-ev-id="ev_6dbfe87c6e" className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
								</div>
								<div data-ev-id="ev_936cd05cd7" className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${r.accent}18`, color: r.accent }}>
									<Download className="h-5 w-5" />
								</div>
							</div>
							<div data-ev-id="ev_33bf2630c3" className="flex gap-2">
								<Button variant="outline" className="flex-1" onClick={() => download(`${r.title.replace(/\s/g, '-')}.csv`, toCSV(r.data()))}>
									<FileSpreadsheet className="h-4 w-4" /> Excel
								</Button>
								<Button variant="outline" className="flex-1" onClick={() => printReport(r.title, r.data())}>
									<FileText className="h-4 w-4" /> PDF
								</Button>
							</div>
						</div>
					</Card>
        )}
			</div>
		</div>);

}