import { createServer } from 'http';
const port = 4111;
const server = createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(port, () => console.log(`Test on ${port}`));
