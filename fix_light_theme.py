import os
import glob

# Find all html files
html_files = glob.glob(r'c:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend\*.html')

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # If this file has the light theme CSS block
    if '.light h1' in content:
        # Add CSS to override text-white/40 and text-white/70 in light mode
        if '.light .text-white\\/40' not in content:
            replacement = """.light h1, .light h2, .light h3, .light h4, .light h5, .light h6, .light .text-white { 
            color: #0f172a !important; 
        }
        .light .text-white\\/40, .light .text-white\\/70 {
            color: #64748b !important;
        }"""
            content = content.replace(".light h1, .light h2, .light h3, .light h4, .light h5, .light h6, .light .text-white { \n            color: #0f172a !important; \n        }", replacement)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Fixed light mode empty state text in " + os.path.basename(file_path))
