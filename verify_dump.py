import os
import subprocess

dump_path = 'vendor_db.dump'

try:
    size = os.path.getsize(dump_path)
    with open('dump_size.txt', 'w') as f:
        f.write(str(size))

    # verify with docker
    # using absolute path mapping
    abs_path = os.path.abspath(dump_path).replace("\\", "/")
    cmd = f'docker run --rm -v "{abs_path}:/vendor_db.dump" postgres:15-alpine pg_restore -l /vendor_db.dump'
    output = subprocess.check_output(cmd, shell=True)
    with open('restore_check.txt', 'wb') as f:
        f.write(output)
except Exception as e:
    with open('restore_error.txt', 'w') as f:
        f.write(str(e))
