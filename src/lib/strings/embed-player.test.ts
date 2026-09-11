import {describe, expect, it, jest} from '@jest/globals'

/*
 * embed-player.ts reads IS_WEB at call time, so a getter lets each test pick
 * the platform. The mock-prefixed name is required by jest's factory scope rule.
 */
let mockIsWeb = false
jest.mock('#/env', () => ({
  get IS_WEB() {
    return mockIsWeb
  },
}))

import {
  type EmbedPlayerType,
  getEmbedPlayerMediaType,
  parseEmbedPlayerFromUrl,
} from './embed-player'

const YOUTUBE_WATCH = 'https://www.youtube.com/watch?v=videoId'
const TWITCH_CHANNEL = 'https://www.twitch.tv/channelName'

function stubWebLocation({
  origin,
  hostname,
}: {
  origin: string
  hostname: string
}) {
  const host = new URL(origin).host
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      origin,
      host,
      hostname,
    },
  })
}

describe('getEmbedPlayerMediaType', () => {
  it.each<
    readonly [EmbedPlayerType, ReturnType<typeof getEmbedPlayerMediaType>]
  >([
    ['youtube_video', 'video'],
    ['youtube_short', 'video'],
    ['twitch_video', 'video'],
    ['vimeo_video', 'video'],
    ['spotify_song', 'audio'],
    ['soundcloud_set', 'audio'],
    ['apple_music_album', 'audio'],
    ['bandcamp_track', 'audio'],
    ['giphy_gif', 'gif'],
    ['flickr_album', 'other'],
  ])('classifies %s as %s', (type, expected) => {
    expect(getEmbedPlayerMediaType(type)).toBe(expected)
  })
})

describe('parseEmbedPlayerFromUrl YouTube iframe host', () => {
  it('uses bsky.app on native (WebView loads the URI top-level)', () => {
    mockIsWeb = false

    const params = parseEmbedPlayerFromUrl(YOUTUBE_WATCH)

    expect(params?.playerUri).toBe(
      'https://bsky.app/iframe/youtube.html?videoId=videoId&start=0',
    )
  })

  it('uses the Blue Notes origin on web, not bsky.app', () => {
    mockIsWeb = true
    stubWebLocation({
      origin: 'https://bluenotes.social',
      hostname: 'bluenotes.social',
    })

    const params = parseEmbedPlayerFromUrl(YOUTUBE_WATCH)

    expect(params?.playerUri).toBe(
      'https://bluenotes.social/iframe/youtube.html?videoId=videoId&start=0',
    )
    expect(params?.playerUri).not.toContain('bsky.app')
  })

  it('uses the current origin for local web (localhost:8100)', () => {
    mockIsWeb = true
    stubWebLocation({
      origin: 'http://localhost:8100',
      hostname: 'localhost',
    })

    const params = parseEmbedPlayerFromUrl(YOUTUBE_WATCH)

    expect(params?.playerUri).toBe(
      'http://localhost:8100/iframe/youtube.html?videoId=videoId&start=0',
    )
  })
})

describe('parseEmbedPlayerFromUrl Twitch parent hostname', () => {
  it('uses localhost on native', () => {
    mockIsWeb = false

    const params = parseEmbedPlayerFromUrl(TWITCH_CHANNEL)

    expect(params?.playerUri).toContain('parent=localhost')
  })

  it('uses the current hostname on Blue Notes web', () => {
    mockIsWeb = true
    stubWebLocation({
      origin: 'https://bluenotes.social',
      hostname: 'bluenotes.social',
    })

    const params = parseEmbedPlayerFromUrl(TWITCH_CHANNEL)

    expect(params?.playerUri).toContain('parent=bluenotes.social')
    expect(params?.playerUri).not.toContain('parent=bsky.app')
  })
})
