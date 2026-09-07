import sys

file_path = r'd:\\Vendor Reliability Intelligence Platform\\frontend\\src\\app\\features\\finance\\finance-overview.component.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('return \\ (\\%);', "return val + ' (' + pct + '%)';")
text = text.replace('          },\n        };\n        \n        const monthly', "        }\n      }\n    };\n    \n    const monthly")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("done")
