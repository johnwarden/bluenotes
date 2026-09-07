'use strict'

/*
 * Zod 3.25 is a dual ESM/CJS package. Webpack prefers the ESM build
 * (`index.js`), whose default export is the `z` namespace (has `.string`,
 * no `.z`). CJS dependents such as `@atproto/oauth-types` then do
 * `require("zod").z.string()` at module init and throw
 * `Cannot read properties of undefined (reading 'string')` before React
 * mounts.
 *
 * This shim loads the CJS entry and re-exports both the named `z` (for
 * `import {z} from 'zod'`) and `exports.z` (for `require("zod").z`).
 */

/** @type {typeof import('zod') & {z: typeof import('zod')}} */
const zodCjs = require('../node_modules/zod/index.cjs')

exports.__esModule = true
exports.z = zodCjs.z
exports.default = zodCjs.z

for (const key of Object.keys(zodCjs)) {
  if (key === 'default' || key === 'z' || key === '__esModule') {
    continue
  }
  exports[key] = zodCjs[key]
}
