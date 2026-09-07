import urllib.request
try:
    res = urllib.request.urlopen("http://localhost:8081")
    if res.status == 200:
        print("ALIVE")
except Exception as e:
    print(f"FAILED: {e}")
