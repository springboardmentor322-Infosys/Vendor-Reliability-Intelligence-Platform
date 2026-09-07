const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/auth/login',
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const token = JSON.parse(body).access_token;
    http.get({
      hostname: 'localhost',
      port: 8000,
      path: '/analytics/dashboard/finance',
      headers: {'Authorization': 'Bearer ' + token}
    }, res2 => {
      let b = '';
      res2.on('data', d => b += d);
      res2.on('end', () => console.log(b));
    });
  });
});
req.write(JSON.stringify({email:'finance_officer@example.com', password:'password123', role_name:'Finance Officer'}));
req.end();
