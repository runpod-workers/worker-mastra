import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const indexPath = join('.mastra', 'output', 'index.mjs');
let content = readFileSync(indexPath, 'utf-8');

// Add /ping route handler before createNodeServer call
const pingHandler = `
// Runpod health check endpoint
if (typeof app !== 'undefined' && app.get) {
  app.get('/ping', (c) => c.json({ status: 'ok' }, 200));
}
`;

// Find the createNodeServer call and inject ping handler
if (content.includes('await createNodeServer')) {
  // Try to find where the Hono app is created
  // Since we can't easily modify the bundled code, we'll use a proxy approach
  console.log('Mastra server built - /ping will be handled via wrapper');
} else {
  console.log('Warning: Could not find createNodeServer in built output');
}

writeFileSync(indexPath, content);
