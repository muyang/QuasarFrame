import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { resourceCardJsonSchema } from '../src/lib/resource-card';
import { photoMediaCardJsonSchema } from '../src/lib/media-card';

const directory = path.join(process.cwd(), 'contracts');
mkdirSync(directory, { recursive: true });
const schema = resourceCardJsonSchema();
writeFileSync(path.join(directory, 'resource-card.v1.schema.json'), `${JSON.stringify(schema, null, 2)}\n`);
writeFileSync(path.join(directory, 'media-card.v1.schema.json'), `${JSON.stringify(photoMediaCardJsonSchema(), null, 2)}\n`);
