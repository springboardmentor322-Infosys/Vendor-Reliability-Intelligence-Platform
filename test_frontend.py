import urllib.request

try:
    res = urllib.request.urlopen("http://127.0.0.1:8081")
    if res.status == 200:
        print("Angular Frontend is ALIVE on 8081!")
except Exception as e:
    print(f"FAILED: {e}")
