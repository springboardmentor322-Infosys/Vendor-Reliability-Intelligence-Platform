
    let globalVendorsData = [];
    let trendChartInstance = null;
    let riskChartInstance = null;

    async function loadDashboardData() {
        try {
            const resVendors = await fetch('http://127.0.0.1:8000/api/vendors');
            const vendors = await resVendors.json();
            globalVendorsData = vendors;

            const total = vendors.length;
            const reliable = vendors.filter(v => v.approval_status === 'Approved' || v.approval_status === 'Active').length;
            const highRisk = vendors.filter(v => v.risk_level === 'High').length;
            const avgRating = total ? (vendors.reduce((acc, v) => acc + v.rating, 0) / total).toFixed(1) : 0;
            const avgDelivery = total ? (vendors.reduce((acc, v) => acc + v.delivery_rate, 0) / total).toFixed(1) : 0;

            document.getElementById('kpi-total-vendors').innerText = total;
            document.getElementById('kpi-reliable-vendors').innerText = reliable;
            document.getElementById('kpi-high-risk').innerText = highRisk;
            document.getElementById('kpi-avg-rating').innerText = avgRating + ' / 5';
            document.getElementById('kpi-ontime-delivery').innerText = avgDelivery + '%';

            const resContracts = await fetch('http://127.0.0.1:8000/api/contracts');
            const contracts = await resContracts.json();
            document.getElementById('kpi-active-contracts').innerText = contracts.length;

            const tbody = document.getElementById('top-vendors-body');
            tbody.innerHTML = '';
            vendors.sort((a, b) => b.rating - a.rating);
            vendors.slice(0, 5).forEach((v, index) => {
                let statusClass = (v.approval_status === 'Approved' || v.approval_status === 'Active') ? 'text-emerald-400 bg-emerald-500/20' : (v.approval_status === 'Rejected' || v.approval_status === 'Suspended' ? 'text-rose-400 bg-rose-500/20' : 'text-amber-400 bg-amber-500/20');
                tbody.innerHTML += `
                <tr class="hover:bg-white/5 light:hover:bg-slate-50 transition-colors">
                        <td class="p-3.5 font-black text-white dark:text-white light:text-slate-900">#${index + 1}</td>
                        <td class="p-3.5 font-bold flex items-center gap-2"><span class="material-symbols-outlined text-[16px] text-blue-400">storefront</span> ${v.company_name}</td>
                        <td class="p-3.5 font-mono-data text-amber-400 light:text-amber-600">${parseFloat(v.rating).toFixed(1)} <span class="material-symbols-outlined text-[10px]">star</span></td>
                        <td class="p-3.5"><span class="px-2 py-0.5 rounded ${statusClass} text-[10px] font-bold">${v.approval_status}</span></td>
                    </tr>
                `;
            });
            
            // Fetch and render charts data
            const resCharts = await fetch('http://127.0.0.1:8000/api/dashboard/charts');
            const charts = await resCharts.json();
            renderCharts(charts);

        } catch (e) {
            console.error('Failed to load dashboard data:', e);
        }
    }

    function openViewReportsModal() {
        document.getElementById('view-reports-modal').classList.remove('hidden');
    }

    function openRiskAnalysisModal() {
        document.getElementById('risk-analysis-modal').classList.remove('hidden');
    }

    function openSettingsModal() {
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    // --- Audit Log Drawer Logic ---
    function openAuditLogDrawer() {
        document.getElementById('audit-drawer').classList.remove('translate-x-full');
        loadAuditLogs();
    }

    function closeAuditLogDrawer() {
        document.getElementById('audit-drawer').classList.add('translate-x-full');
    }

    async function loadAuditLogs() {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('http://127.0.0.1:8000/api/audit_logs', {
                headers: { 'Authorization': `Bearer ${ token }` }
            });
            const logs = await res.json();
            const container = document.getElementById('audit-logs-container');
            container.innerHTML = '';
            
            logs.forEach(log => {
                let icon = 'info';
                let color = 'text-blue-400';
                if(log.action.includes('CREATE')) { icon = 'add_circle'; color = 'text-emerald-400'; }
                if(log.action.includes('UPDATE')) { icon = 'edit'; color = 'text-amber-400'; }
                if(log.action.includes('DELETE')) { icon = 'delete'; color = 'text-rose-400'; }
                
                container.innerHTML += `
            <div class="p-3 border-l-2 border-white/20 hover:border-purple-500 transition-colors bg-[#1e293b] rounded-r-xl">
                        <div class="flex gap-2 items-start mb-1">
                            <span class="material-symbols-outlined ${color} text-sm mt-0.5">${icon}</span>
                            <div>
                                <p class="text-xs font-bold text-white">${log.action} on ${log.entity_type}</p>
                                <p class="text-[10px] text-tertiary-fixed-dim font-mono-data mt-1">By User #${log.user_id} | ${new Date(log.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-400 mt-2 bg-black/20 p-2 rounded">${log.details || ''}</p>
                    </div>
                `;
            });
        } catch(e) {
            console.error("Failed to load audit logs", e);
        }
    }

    function exportCSV() {
        if (!globalVendorsData || globalVendorsData.length === 0) {
            alert('No vendor data available to export.');
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Company Name,Email,Status,Risk Level,Rating\r\n";
        globalVendorsData.forEach(function(v) {
            let row = `${ v.company_name },${ v.contact_email },${ v.status || v.approval_status },${ v.risk_level },${ v.rating }`;
            csvContent += row + "\r\n";
        });
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Vendor_Report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function renderCharts(data) {
        Chart.defaults.color = '#b7c8e1';
        Chart.defaults.font.family = "'Inter', sans-serif";
        
        // Trend Chart
        const ctxTrend = document.getElementById('trendChart');
        if(ctxTrend) {
            if (trendChartInstance) trendChartInstance.destroy();
            trendChartInstance = new Chart(ctxTrend.getContext('2d'), {
                type: 'line',
                data: {
                    labels: data.trend_labels,
                    datasets: [
                        {
                            label: 'Avg Reliability',
                            data: data.reliability_data,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Avg Quality',
                            data: data.quality_data,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: { y: { min: 60, max: 100 } }
                }
            });
        }

        // Risk Chart
        const ctxRisk = document.getElementById('riskChart');
        if(ctxRisk) {
            if (riskChartInstance) riskChartInstance.destroy();
            riskChartInstance = new Chart(ctxRisk.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
                    datasets: [{
                        data: [data.risk_distribution.Low, data.risk_distribution.Moderate, data.risk_distribution.High],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }
    