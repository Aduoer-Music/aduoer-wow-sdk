import fs from 'node:fs';
import path from 'node:path';
import { openApiDocument } from './openapi';

const output = path.resolve(process.cwd(), 'openapi.json');
fs.writeFileSync(output, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
