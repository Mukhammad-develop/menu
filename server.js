// Passenger (cPanel Node.js Selector) startup file.
// cPanel points the Node.js app at this file; it boots Next.js in production mode.
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const logFile = fs.createWriteStream(path.join(__dirname, 'error.log'), { flags: 'a' });
const originalError = console.error;
console.error = function (...args) {
  logFile.write(new Date().toISOString() + ' ' + args.map(a => typeof a === 'object' ? (a.stack || JSON.stringify(a)) : a).join(' ') + '\n');
  originalError.apply(console, args);
};

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
