import json

file_path = r"d:\Vendor Reliability Intelligence Platform\frontend\package.json"
with open(file_path, "r", encoding="utf-8") as f:
    pkg = json.load(f)

pkg["scripts"]["start"] = "ng serve --port 8081"

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(pkg, f, indent=2)

print("Updated package.json to port 8081")
