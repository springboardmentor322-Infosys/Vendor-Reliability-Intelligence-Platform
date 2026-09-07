cd "d:\Vendor Reliability Intelligence Platform\frontend"
npx tsc -p tsconfig.app.json --noEmit 2> tsc_err.txt > tsc_out.txt
echo True > tsc_code.txt
