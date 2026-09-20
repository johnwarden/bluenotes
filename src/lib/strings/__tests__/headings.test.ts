import {describe, expect, it} from '@jest/globals'

import {APP_NAME} from '#/lib/constants'
import {bskyTitle} from '../headings'

describe('bskyTitle', () => {
  it('suffixes the page with the spaced Blue Notes product name', () => {
    expect(APP_NAME).toBe('Blue Notes')
    expect(bskyTitle('Following')).toBe('Following — Blue Notes')
  })

  it('prefixes unread counts when present', () => {
    expect(bskyTitle('Notifications', '3')).toBe(
      '(3) Notifications — Blue Notes',
    )
  })
})
