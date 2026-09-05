import {describe, expect, it} from '@jest/globals'

import {
  getSnapshottedOauthCallbackParams,
  oauthCallbackSnapshotHadParams,
  oauthCallbackSnapshotRanBeforeStrip,
} from './callback-snapshot.web'

describe('callback-snapshot.web (module-eval)', () => {
  it('records that the snapshot module evaluated before any strip', () => {
    expect(oauthCallbackSnapshotRanBeforeStrip()).toBe(true)
    // Jest has no callback document; params are absent but the eval ran.
    expect(oauthCallbackSnapshotHadParams()).toBe(false)
    expect(getSnapshottedOauthCallbackParams()).toBeNull()
  })
})
