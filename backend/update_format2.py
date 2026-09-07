import os
import glob
import re

directory = r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\finance'
files = glob.glob(os.path.join(directory, '*.component.ts'))
files.append(r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\dashboard\\components\\finance-dashboard\\finance-dashboard.component.ts')

new_func = '''    formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }'''

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()

    original = text
    # Replace usages in templates and code
    text = re.sub(r'\bfmt\(', 'formatMillions(', text)
    text = re.sub(r'this\.formatLakh\(', 'this.formatMillions(', text)
    
    # regex for func replacement: matches "fmt(...) { ... }" or "formatLakh(...) { ... }"
    text = re.sub(r'fmt\s*\([^)]*\)\s*(?::\s*string)?\s*\{[\s\S]*?(?=\n\s*(?:}$|private|public|@|constructor|[a-zA-Z]+\s*\())', new_func + '\n', text)
    text = re.sub(r'formatLakh\s*\([^)]*\)\s*(?::\s*string)?\s*\{[\s\S]*?(?=\n\s*(?:}$|private|public|@|constructor|[a-zA-Z]+\s*\())', new_func + '\n', text)
    
    if text != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Updated {os.path.basename(fpath)}")

print("done")
