import {getStateFromPath} from '#/lib/routes/get-state-from-path'
import {router} from '#/routes'

describe('Community Notes deep-link routes', () => {
  it('matches /community-notes/:tab feed paths', () => {
    expect(router.matchPath('/community-notes/feeds')).toEqual([
      'CommunityNotes',
      {tab: 'feeds'},
    ])
    expect(router.matchPath('/community-notes/needs_your_help')).toEqual([
      'CommunityNotes',
      {tab: 'needs_your_help'},
    ])
    expect(router.matchPath('/community-notes/new')).toEqual([
      'CommunityNotes',
      {tab: 'new'},
    ])
    expect(router.matchPath('/community-notes/rated_helpful')).toEqual([
      'CommunityNotes',
      {tab: 'rated_helpful'},
    ])
  })

  it('matches a bare /community-notes path', () => {
    expect(router.matchPath('/community-notes')).toEqual(['CommunityNotes', {}])
  })

  it('matches the per-post rating path', () => {
    expect(
      router.matchPath(
        '/profile/alice.test/post/3kbeuduu7m22v/community-notes',
      ),
    ).toEqual([
      'CommunityNotesRating',
      {name: 'alice.test', rkey: '3kbeuduu7m22v'},
    ])
  })

  it('builds /community-notes/:tab from the named route', () => {
    const route = router.matchName('CommunityNotes')
    expect(route?.build({tab: 'feeds'})).toBe('/community-notes/feeds')
    expect(route?.build({tab: 'needs_your_help'})).toBe(
      '/community-notes/needs_your_help',
    )
  })

  it('boots the Flat CommunityNotes screen on web, defaulting a missing tab', () => {
    expect(getStateFromPath('/community-notes', {isNative: false})).toEqual({
      index: 0,
      routes: [{name: 'CommunityNotes', params: {tab: 'feeds'}}],
    })
    expect(
      getStateFromPath('/community-notes/needs_your_help', {isNative: false}),
    ).toEqual({
      index: 0,
      routes: [{name: 'CommunityNotes', params: {tab: 'needs_your_help'}}],
    })
  })

  it('boots CommunityNotesTab on native instead of a missing HomeTab screen', () => {
    expect(
      getStateFromPath('/community-notes/feeds', {isNative: true}),
    ).toEqual({
      index: 0,
      routes: [
        {
          name: 'CommunityNotesTab',
          state: {
            index: 0,
            routes: [{name: 'CommunityNotes', params: {tab: 'feeds'}}],
          },
        },
      ],
    })
  })
})
