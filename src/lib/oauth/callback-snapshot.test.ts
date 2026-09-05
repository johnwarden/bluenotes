import {describe, expect, it} from '@jest/globals'

import {getSnapshottedOauthCallbackParams} from './callback-snapshot'

describe('callback-snapshot (native stub)', () => {
  it('has no window snapshot', () => {
    expect(getSnapshottedOauthCallbackParams()).toBeNull()
  })
})
