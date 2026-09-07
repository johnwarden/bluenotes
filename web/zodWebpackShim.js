'use strict'

/*
 * Zod 3.25 is a dual ESM/CJS package. Webpack may expose:
 *   - the CJS module `{z, default, ...}`
 *   - the `z` namespace (`.string`, `.unknown`)
 *   - an interop wrapper `{default: namespace}` with no `.z`
 *
 * CJS atproto packages do `require("zod").z.string()` / `.unknown()` at
 * module init. Export the real namespace on both `.z` and `.default`.
 */

/**
 * @param {unknown} mod
 * @returns {typeof import('zod') | undefined}
 */
function asZodNamespace(mod) {
  if (!mod || typeof mod !== 'object') {
    return undefined
  }
  const rec = /** @type {Record<string, unknown>} */ (mod)
  if (typeof rec.string === 'function' && typeof rec.unknown === 'function') {
    return /** @type {typeof import('zod')} */ (mod)
  }
  if (rec.z && typeof rec.z === 'object') {
    const nested = asZodNamespace(rec.z)
    if (nested) return nested
  }
  if (rec.default && typeof rec.default === 'object') {
    return asZodNamespace(rec.default)
  }
  return undefined
}

const raw = require('../node_modules/zod/index.cjs')
const z = asZodNamespace(raw)
if (!z) {
  throw new Error('zod webpack shim: could not resolve z namespace')
}

exports.__esModule = true
exports.z = z
exports.default = z

for (const key of Object.keys(z)) {
  if (key === 'default' || key === 'z' || key === '__esModule') {
    continue
  }
  exports[key] = z[key]
}
