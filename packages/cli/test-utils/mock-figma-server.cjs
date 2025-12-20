const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const mockTokens = fs.readFileSync(path.join(__dirname, 'mock-tokens.json'), 'utf8');

const server = http.createServer((req, res) => {
  console.log(`Mock Figma API received request: ${req.method} ${req.url}`);

  res.setHeader('Content-Type', 'application/json');

  // This is the URL the FigmaClient will call for sync
  if (req.url.startsWith('/v1/files/test-file-id/nodes?ids=1:1')) {
    const response = {
      nodes: {
        '1:1': {
          document: {
            sharedPluginData: {
              'io.synkio.token-vault': {
                // The data from the plugin is the stringified version of the flat tokens object
                data: JSON.stringify(JSON.parse(mockTokens)),
              },
            },
          },
        },
      },
    };
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }

  // Handle the validation call
  if (req.url === '/v1/files/test-file-id') {
      res.writeHead(200);
      res.end(JSON.stringify({name: "Test File"}));
      return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ err: 'Not found' }));
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Mock Figma API server listening on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});
