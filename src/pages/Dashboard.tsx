import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import StatCard from '@/components/widgets/StatCard';
import DonutChart from '@/components/widgets/DonutChart';
import LineChartCard from '@/components/widgets/LineChartCard';
import BarChartCard from '@/components/widgets/BarChartCard';
import GaugeChart from '@/components/widgets/GaugeChart';
import AlertsPanel from '@/components/widgets/AlertsPanel';
import { RiskBadge, ScorePill, StatusBadge } from '@/components/widgets/Badge';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import { compactCurrency, currency, riskColor } from '@/lib/format';
import { reliabilityScores } from '@/data/mock';
import {
  Building2, ShoppingCart, FileText, ShieldAlert, DollarSign,
  PackageCheck, TrendingUp, ClipboardCheck, Users, AlertTriangle } from
'lucide-react';
import type { PurchaseOrder, Vendor } from '@/data/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export default function Dashboard() {
  const { vendors, purchaseOrders, contracts, procurements, notifications, currentUser } = useApp();
  if (!currentUser) return null;
  const role = currentUser.role;

  // Shared analytics
  const riskDist = (['Low', 'Medium', 'High', 'Critical'] as const).map((r) => ({
    name: r,
    value: vendors.filter((v) => v.riskLevel === r).length,
    color: riskColor(r)
  }));
  const avgScore = vendors.length ?
  Math.round(vendors.reduce((s, v) => s + v.reliabilityScore, 0) / vendors.length) :
  0;

  const spendByMonth = MONTHS.map((m, i) => ({
    name: m,
    spend: Math.round(180000 + Math.sin(i) * 40000 + i * 22000),
    orders: 6 + Math.round(Math.abs(Math.sin(i + 1)) * 8)
  }));

  const perfTrend = MONTHS.map((m, i) => {
    const scoresThisMonth = reliabilityScores.filter((s) => Number(s.date.slice(5, 7)) === i + 1);
    const avg = scoresThisMonth.length ?
    Math.round(scoresThisMonth.reduce((a, b) => a + b.score, 0) / scoresThisMonth.length) :
    0;
    return { name: m, reliability: avg };
  });

  const spendByCategory = Array.from(new Set(vendors.map((v) => v.category))).map((cat) => ({
    name: cat,
    spend: vendors.filter((v) => v.category === cat).reduce((s, v) => s + v.totalSpend, 0)
  }));

  const topVendors = [...vendors].sort((a, b) => b.reliabilityScore - a.reliabilityScore).slice(0, 5);
  const spendByVendor = topVendors.map((v) => ({ name: v.name.split(' ')[0], spend: v.totalSpend }));

  const totalSpend = vendors.reduce((s, v) => s + v.totalSpend, 0);
  const activeContracts = contracts.filter((c) => c.status === 'Active').length;
  const expiring = contracts.filter((c) => c.status === 'Expiring').length;
  const highRisk = vendors.filter((v) => v.riskLevel === 'High' || v.riskLevel === 'Critical').length;
  const pendingReq = procurements.filter((p) => p.status === 'Pending').length;
  const openPOs = purchaseOrders.filter((p) => p.status === 'Ordered').length;

  const poColumns: Column<PurchaseOrder>[] = [
  { key: 'poNumber', header: 'PO #', render: (r) => <span data-ev-id="ev_b45405db7e" className="font-semibold text-gray-800">{r.poNumber}</span> },
  { key: 'vendor', header: 'Vendor', render: (r) => vendors.find((v) => v.id === r.vendorId)?.name ?? '—' },
  { key: 'amount', header: 'Amount', render: (r) => currency(r.amount) },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }];

  const vendorCols: Column<Vendor>[] = [
  { key: 'name', header: 'Vendor', render: (r) => <span data-ev-id="ev_4a34697fa0" className="font-semibold text-gray-800">{r.name}</span> },
  { key: 'reliabilityScore', header: 'Reliability', render: (r) => <ScorePill score={r.reliabilityScore} /> },
  { key: 'riskLevel', header: 'Risk', render: (r) => <RiskBadge risk={r.riskLevel} /> }];


  const RiskDonut =
  <Card title="Reliability Risk Distribution" subtitle="Vendors grouped by risk level">
			<DonutChart data={riskDist} centerValue={String(vendors.length)} centerLabel="Vendors" />
		</Card>;

  const PerfTrend =
  <Card title="Reliability Trend" subtitle="Average score across all vendors">
			<LineChartCard data={perfTrend} series={[{ key: 'reliability', color: '#1a237e', label: 'Avg Reliability' }]} area />
		</Card>;

  const SpendTrend =
  <Card title="Spend Over Time" subtitle="Monthly procurement spend">
			<LineChartCard data={spendByMonth} series={[{ key: 'spend', color: '#2196f3', label: 'Spend ($)' }]} area />
		</Card>;

  const CategorySpend =
  <Card title="Spend by Category">
			<BarChartCard data={spendByCategory} series={[{ key: 'spend', color: '#3949ab', label: 'Spend' }]} layout="vertical" height={280} />
		</Card>;

  const VendorSpend =
  <Card title="Top Vendors by Spend">
			<BarChartCard data={spendByVendor} series={[{ key: 'spend', color: '#1a237e', label: 'Spend' }]} height={280} />
		</Card>;

  const Alerts =
  <Card title="Alerts & Notifications">
			<AlertsPanel items={notifications.slice(0, 4)} />
		</Card>;


  // VENDOR PORTAL (self-service)
  if (role === 'vendor') {
    const me = vendors.find((v) => v.id === currentUser.vendorId);
    const myPOs = purchaseOrders.filter((p) => p.vendorId === currentUser.vendorId);
    const myContracts = contracts.filter((c) => c.vendorId === currentUser.vendorId);
    const myTrend = reliabilityScores.
    filter((s) => s.vendorId === currentUser.vendorId).
    map((s) => ({ name: MONTHS[Number(s.date.slice(5, 7)) - 1], reliability: s.score }));
    return (
      <div data-ev-id="ev_6a502561b4">
				<PageHeader title="Vendor Portal" subtitle={me?.name} />
				<div data-ev-id="ev_efea0f8fbd" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard label="My Reliability" value={me?.reliabilityScore ?? 0} icon={TrendingUp} accent={riskColor(me?.riskLevel ?? 'Medium')} />
					<StatCard label="My Purchase Orders" value={myPOs.length} icon={ShoppingCart} accent="#2196f3" />
					<StatCard label="Active Contracts" value={myContracts.filter((c) => c.status === 'Active').length} icon={FileText} accent="#4caf50" />
					<StatCard label="Total Business" value={compactCurrency(me?.totalSpend ?? 0)} icon={DollarSign} accent="#1a237e" />
				</div>
				<div data-ev-id="ev_31fe2773ef" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<Card title="My Reliability Score"><GaugeChart score={me?.reliabilityScore ?? 0} /></Card>
					<div data-ev-id="ev_d611504042" className="lg:col-span-2">
						<Card title="My Reliability Trend"><LineChartCard data={myTrend} series={[{ key: 'reliability', color: '#1a237e', label: 'Reliability' }]} area /></Card>
					</div>
				</div>
				<div data-ev-id="ev_36e19f97b3" className="mt-4">
					<Card title="My Purchase Orders"><DataTable columns={poColumns} rows={myPOs} searchable={false} /></Card>
				</div>
			</div>);

  }

  // Role-specific stat rows
  const statRow = () => {
    switch (role) {
      case 'procurement':
        return (
          <>
						<StatCard label="Active Vendors" value={vendors.filter((v) => v.status === 'Approved').length} icon={Building2} accent="#1a237e" delta={4} />
						<StatCard label="Pending Requests" value={pendingReq} icon={ClipboardCheck} accent="#ff9800" hint="Awaiting approval" />
						<StatCard label="Open Purchase Orders" value={openPOs} icon={ShoppingCart} accent="#2196f3" delta={7} />
						<StatCard label="Total Spend" value={compactCurrency(totalSpend)} icon={DollarSign} accent="#4caf50" delta={12} />
					</>);

      case 'scm':
        return (
          <>
						<StatCard label="Avg Reliability" value={avgScore} icon={TrendingUp} accent="#1a237e" delta={3} />
						<StatCard label="High / Critical Risk" value={highRisk} icon={ShieldAlert} accent="#f44336" hint="Needs attention" />
						<StatCard label="Deliveries Tracked" value={purchaseOrders.filter((p) => p.status === 'Delivered').length} icon={PackageCheck} accent="#4caf50" delta={5} />
						<StatCard label="Vendors Monitored" value={vendors.length} icon={Building2} accent="#2196f3" />
					</>);

      case 'finance':
        return (
          <>
						<StatCard label="Total Spend" value={compactCurrency(totalSpend)} icon={DollarSign} accent="#1a237e" delta={12} />
						<StatCard label="Contract Value" value={compactCurrency(contracts.reduce((s, c) => s + c.value, 0))} icon={FileText} accent="#2196f3" />
						<StatCard label="Active Contracts" value={activeContracts} icon={ClipboardCheck} accent="#4caf50" />
						<StatCard label="Avg PO Value" value={compactCurrency(totalSpend / Math.max(1, purchaseOrders.length))} icon={ShoppingCart} accent="#ff9800" />
					</>);

      case 'auditor':
        return (
          <>
						<StatCard label="Vendors Audited" value={vendors.length} icon={Building2} accent="#1a237e" />
						<StatCard label="High Risk Flags" value={highRisk} icon={AlertTriangle} accent="#f44336" />
						<StatCard label="Expiring Contracts" value={expiring} icon={FileText} accent="#ff9800" />
						<StatCard label="Records Reviewed" value={purchaseOrders.length + contracts.length} icon={ClipboardCheck} accent="#2196f3" />
					</>);

      default: // admin
        return (
          <>
						<StatCard label="Total Vendors" value={vendors.length} icon={Building2} accent="#1a237e" delta={6} />
						<StatCard label="Avg Reliability" value={avgScore} icon={TrendingUp} accent="#4caf50" delta={3} />
						<StatCard label="High / Critical Risk" value={highRisk} icon={ShieldAlert} accent="#f44336" hint="Requires review" />
						<StatCard label="Total Spend" value={compactCurrency(totalSpend)} icon={DollarSign} accent="#2196f3" delta={12} />
					</>);

    }
  };

  return (
    <div data-ev-id="ev_0a05edb28a">
			<PageHeader
        title="Dashboard"
        subtitle="Live vendor reliability & procurement analytics"
        action={<span data-ev-id="ev_014c14905f" className="inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"><Users className="h-4 w-4" /> {vendors.length} vendors monitored</span>} />


			<div data-ev-id="ev_8dd5b44a6d" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{statRow()}</div>

			{/* Charts vary a little by role for uniqueness */}
			<div data-ev-id="ev_b6cf48cdf7" className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
				{role === 'finance' ? SpendTrend : PerfTrend}
				{RiskDonut}
			</div>

			<div data-ev-id="ev_c0b4e258dc" className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
				{role === 'finance' || role === 'admin' ? CategorySpend : SpendTrend}
				{VendorSpend}
			</div>

			<div data-ev-id="ev_31553e9d59" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div data-ev-id="ev_b3a49a4398" className="lg:col-span-2">
					<Card title={role === 'scm' || role === 'auditor' ? 'Vendor Reliability Watchlist' : 'Recent Purchase Orders'}>
						{role === 'scm' || role === 'auditor' ?
            <DataTable columns={vendorCols} rows={[...vendors].sort((a, b) => a.reliabilityScore - b.reliabilityScore).slice(0, 6)} searchable={false} /> :

            <DataTable columns={poColumns} rows={purchaseOrders.slice(0, 6)} searchable={false} />
            }
					</Card>
				</div>
				{Alerts}
			</div>
		</div>);

}