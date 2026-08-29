import os
import re

files = [
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\dashboard.html',
    r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\auditor_dashboard.html'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the AI Insights grid block
    target_start = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans"'
    target_end = '<!-- End Main Dashboard Content -->'
    
    # We want to replace the div containing the static insights with one that has an ID so we can inject into it
    pattern = re.compile(r'(<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-sans">)(.*?)(</section>)', re.DOTALL)
    
    replacement = r'\1\n<div id="ai-insights-container" class="contents">\n<p class="text-xs text-slate-400 italic">Generating live AI insights...</p>\n</div>\n</div>\n\3'
    
    new_content = pattern.sub(replacement, content)
    
    js_inject = '''
<script>
async function loadAIInsights() {
    try {
        const res = await fetch('http://127.0.0.1:8000/api/intelligence/insights');
        if (res.ok) {
            const insights = await res.json();
            const container = document.getElementById('ai-insights-container');
            if (container) {
                container.innerHTML = '';
                insights.forEach(insight => {
                    container.innerHTML += `
                        <div class="glass-widget p-3.5 rounded-xl border-l-2 border-${insight.color}-400">
                            <p class="text-white dark:text-white light:text-slate-800 font-medium">${insight.message}</p>
                        </div>
                    `;
                });
            }
        }
    } catch(e) { console.error(e); }
}
document.addEventListener('DOMContentLoaded', loadAIInsights);
</script>
</body>'''
    
    new_content = new_content.replace('</body>', js_inject)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated " + file_path)
