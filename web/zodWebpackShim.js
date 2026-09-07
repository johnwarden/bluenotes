'use strict'

/*
 * Zod 3.25 is a dual ESM/CJS package (`"type": "module"`, `exports.import`
 * = index.js, `exports.require` = index.cjs). Expo webpack prefers the ESM
 * build. CJS @atproto packages then do `require("zod").z.string()` /
 * `.unknown()` at module init; ESM interop often yields the `z` namespace
 * (has `.string`, no `.z`) or `{default: namespace}`, so `.z` is undefined.
 * That is both e0f1cb31 throw sites: `@atproto/oauth-types` `uri.ts:15`
 * (`zod_1.z.string()`) and nested `@atproto/common-web` `types.ts:5`
 * (`cidSchema = z.unknown()`, compiled as `zod_1.z.unknown()`).
 *
 * Do not require `index.cjs` here: webpack's file-loader treats unknown
 * `.cjs` as a media URL, so the shim would receive a string and
 * `exports.z` would still be undefined. Load the ESM entry (parsed as
 * JS) and export a real namespace on both `.z` and `.default`.
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

const raw = require('../node_modules/zod/index.js')
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
