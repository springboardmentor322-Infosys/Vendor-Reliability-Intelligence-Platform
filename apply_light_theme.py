import os
import glob
import re

css_to_inject = """
        /* Premium Light Theme Override */
        .light body { 
            background-color: #f8fafc; /* Soft slate-50 */
            color: #0f172a; 
        }
        .light .glass-panel, .light .glass-widget {
            background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7)) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            border-top: 1px solid rgba(255, 255, 255, 1) !important;
            border-left: 1px solid rgba(255, 255, 255, 1) !important;
            border-right: 1px solid rgba(255, 255, 255, 0.4) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 20px 40px -12px rgba(100, 116, 139, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.8) !important;
        }
        .light h1, .light h2, .light h3, .light .text-white { color: #0f172a !important; }
        .light p, .light .text-tertiary-fixed-dim { color: #475569 !important; }
        .light .bg-\\[\\#1e293b\\] { 
            background-color: #ffffff !important; 
            color: #0f172a !important; 
            border-color: #cbd5e1 !important;
        }
        .light table th, .light table td {
            border-color: #e2e8f0 !important;
        }
        .light .border-white\\/5, .light .border-white\\/10, .light .border-white\\/20 {
            border-color: #cbd5e1 !important;
        }
        .light .bg-white\\/5 {
            background-color: rgba(241, 245, 249, 0.8) !important;
        }
        .light .text-slate-400 {
            color: #64748b !important;
        }
"""

frontend_dir = r"C:\Users\user\OneDrive\Desktop\Kruthi\infosy\VendorIntel\frontend"

for filepath in glob.glob(os.path.join(frontend_dir, "*.html")):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Change to light mode
    content = content.replace('<html class="dark"', '<html class="light"')

    # Inject CSS if not already there
    if "/* Premium Light Theme Override */" not in content:
        # Find </style> and inject before it
        content = content.replace("</style>", css_to_inject + "\n</style>")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Light theme applied to all HTML files.")
