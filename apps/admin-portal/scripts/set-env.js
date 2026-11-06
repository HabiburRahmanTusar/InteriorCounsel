const fs = require('fs');
const path = require('path');

const apiBaseUrl = process.env.API_BASE_URL || 'https://attendly-akxa.onrender.com/api';
const targetPath = path.resolve(__dirname, '../src/environments/environment.prod.ts');

const content = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
};
`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log(`[set-env] environment.prod.ts configured with apiBaseUrl: ${apiBaseUrl}`);

