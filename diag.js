async function diag() {
    const res = await fetch('http://localhost:3002/api/read-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: "admin@visualdesigne.com",
            password: "***REMOVIDO***",
            folder: "INBOX"
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
diag();
