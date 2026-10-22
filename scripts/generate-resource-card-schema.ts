import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resourceCardJsonSchema } from '../src/lib/resource-card';

const directory = path.join(process.cwd(), 'contracts');
mkdirSync(directory, { recursive: true });
const schema = resourceCardJsonSchema();
writeFileSync(path.join(directory, 'resource-card.v1.schema.json'), `${JSON.stringify(schema, null, 2)}\n`);
