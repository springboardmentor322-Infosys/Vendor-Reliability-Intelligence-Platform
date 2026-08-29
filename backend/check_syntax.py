import sys
import traceback

try:
    import main
    print("MAIN IMPORT OK")
except Exception as e:
    print("MAIN IMPORT FAILED")
    traceback.print_exc()
