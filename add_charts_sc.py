import os

file_path = r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\supply_chain_dashboard.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                });
            }'''

chart_js = '''                });
            }

            // Fetch and render charts dynamically
            const chartData = await fetch('http://127.0.0.1:8000/api/dashboard/charts').then(res => res.json());

            const trendCtx = document.getElementById('trendChart');
            if (trendCtx) {
                new Chart(trendCtx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: chartData.trend_labels,
                        datasets: [
                            {
                                label: 'Supply Reliability',
                                data: chartData.reliability_data,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Delivery Quality',
                                data: chartData.quality_data,
                                borderColor: '#8b5cf6',
                                backgroundColor: 'transparent',
                                borderDash: [5, 5],
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: '#94a3b8' } }
                        },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                        }
                    }
                });
            }

            const riskCtx = document.getElementById('riskChart');
            if (riskCtx) {
                new Chart(riskCtx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Low Risk', 'Moderate Risk', 'High Risk'],
                        datasets: [{
                            data: [
                                chartData.risk_distribution.Low,
                                chartData.risk_distribution.Moderate,
                                chartData.risk_distribution.High
                            ],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '75%',
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20 } }
                        }
                    }
                });
            }'''

content = content.replace(target, chart_js)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added charts to supply chain dashboard")
