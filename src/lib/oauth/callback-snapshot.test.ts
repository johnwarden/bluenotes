import {describe, expect, it} from '@jest/globals'

import {
  getSnapshottedOauthCallbackParams,
  oauthCallbackSnapshotHadParams,
  oauthCallbackSnapshotRanBeforeStrip,
} from './callback-snapshot'

describe('callback-snapshot (native stub)', () => {
  it('has no window snapshot', () => {
    expect(getSnapshottedOauthCallbackParams()).toBeNull()
    expect(oauthCallbackSnapshotRanBeforeStrip()).toBe(false)
    expect(oauthCallbackSnapshotHadParams()).toBe(false)
  })
})
