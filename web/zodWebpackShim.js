'use strict'

/*
 * Zod 3.25 is a dual ESM/CJS package. Webpack may expose either:
 *   1. the CJS module `{z, default, ...}` so `require("zod").z.string()` works
 *   2. the `z` namespace itself (has `.string` / `.unknown`, no `.z`)
 *
 * `@atproto/oauth-types` and `@atproto/common` CJS do `require("zod").z.*`
 * at module init. If `.z` is missing, the static SPA throws before React
 * mounts. Always export a real namespace on both `.z` and `.default`.
 */

/** @type {typeof import('zod') & {z?: typeof import('zod')}} */
const raw = require('../node_modules/zod/index.cjs')

const z = raw && raw.z && typeof raw.z.string === 'function' ? raw.z : raw

exports.__esModule = true
exports.z = z
exports.default = z

for (const key of Object.keys(raw)) {
  if (key === 'default' || key === 'z' || key === '__esModule') {
    continue
  }
  exports[key] = raw[key]
}
