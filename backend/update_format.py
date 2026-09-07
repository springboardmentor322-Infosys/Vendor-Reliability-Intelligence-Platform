import os
import glob

directory = r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\finance'
files = glob.glob(os.path.join(directory, '*.component.ts'))
files.append(r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\dashboard\\components\\finance-dashboard\\finance-dashboard.component.ts')

new_func = '''    formatMillions(n: number): string {
        if (!n) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
        return n.toFixed(0);
    }'''

old_func_lakh = '''    formatLakh(n: number): string {
        if (!n) return '0';
        if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
        if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
        return n.toLocaleString('en-IN');
    }'''

old_func_lakh2 = '''    formatLakh(n: number): string {
        if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
        if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
        return n.toFixed(0);
    }'''

old_func_fmt = '''    fmt(n: number) {
        if (!n) return '0';
        if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
        if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
        return Math.round(n).toLocaleString('en-IN');
    }'''

for fpath in files:
    with open(fpath, 'r', encoding='utf-8') as f:
        text = f.read()

    original = text
    text = text.replace('this.formatLakh(', 'this.formatMillions(')
    text = text.replace('this.fmt(', 'this.formatMillions(')
    text = text.replace('fmt(data', 'formatMillions(data')
    text = text.replace('fmt(v.amount', 'formatMillions(v.amount')
    text = text.replace('fmt(v.', 'formatMillions(v.')
    text = text.replace('fmt(k.', 'formatMillions(k.')

    text = text.replace(old_func_lakh, new_func)
    text = text.replace(old_func_lakh2, new_func)
    text = text.replace(old_func_fmt, new_func)

    # Replace any other variants of fmt
    if 'fmt(n: number)' in text and new_func not in text:
        # manual replace
        start = text.find('fmt(n: number)')
        if start != -1:
            end = text.find('}', start) + 1
            text = text[:start] + new_func + text[end:]

    if text != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Updated {fpath}")

print("done")
