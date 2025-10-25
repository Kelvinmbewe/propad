import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { createConfig } from '../../eslint.config.mjs';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default createConfig(tsconfigRootDir);
