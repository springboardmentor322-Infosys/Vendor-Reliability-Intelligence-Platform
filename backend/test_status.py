import requests

def test():
    res = requests.post("http://127.0.0.1:8000/api/auth/login", json={"email": "admin@vendorintel.com", "password": "1234"})
    token = res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Let's get PRs first
    prs_res = requests.get("http://127.0.0.1:8000/api/procurement_requests", headers=headers)
    prs = prs_res.json()
    if not prs:
        print("No PRs found")
        return
        
    last_pr_id = prs[-1]["id"]
    print(f"Approving PR {last_pr_id}...")
    
    status_res = requests.put(
        f"http://127.0.0.1:8000/api/procurement_requests/{last_pr_id}/status", 
        json={"approval_status": "Approved"}, 
        headers=headers
    )
    print("Status:", status_res.status_code)
    print("Response:", status_res.text)

if __name__ == '__main__':
    test()
