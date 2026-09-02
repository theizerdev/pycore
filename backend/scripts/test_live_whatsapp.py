import httpx

client = httpx.Client(base_url='http://127.0.0.1:8000/api/v1')
r_login = client.post('/auth/login', json={'email': 'admin@pycore.com', 'password': 'Admin1234*'})
token = r_login.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# Status
r_status = client.get('/integraciones/whatsapp/status', headers=headers)
print('STATUS REAL CONTRA API:', r_status.status_code, r_status.json())

# Diagnostic
r_diag = client.get('/integraciones/whatsapp/diagnostic', headers=headers)
print('DIAGNOSTIC REAL:', r_diag.status_code, r_diag.json())

# Check Number
r_chk = client.post('/integraciones/whatsapp/check-number', json={'phone': '5213223050980'}, headers=headers)
print('CHECK NUMBER REAL:', r_chk.status_code, r_chk.json())
