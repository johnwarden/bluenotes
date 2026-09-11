import {type $Typed} from '@atproto/lex'

import {type app} from '#/lexicons'
import {type EmbedType, parseEmbed} from '#/types/bsky/post'
import {resolveQuotePostView} from './resolveQuotePostView'

const now = () => '2026-09-11T00:00:00.000Z'

const OUTER_URI =
  'at://did:plc:u2dwaqvvtmmz6v3hmszjrpk5/app.bsky.feed.post/3mvawjcyvgc2r'
const QUOTED_URI =
  'at://did:plc:qfflfersmonljuxmm6iyb445/app.bsky.feed.post/3mvass46pfk2h'

const OUTER_TEXT =
  '"I had a sikh friend & I remember how how instantly the racism started & how scared she was. & then someone killed a sikh community leader near us"\nbsky.app/profile/cyan...\n\nbsky.app/profile/ianb...'

const QUOTED_TEXT =
  'Pretending the days after Sept. 11, 2001 were some kind of gauzy Hallmark special when we came together as a country is nauseating and ahistorical.'

const quotedViewRecord = {
  $type: 'app.bsky.embed.record#viewRecord',
  uri: QUOTED_URI,
  cid: 'bafyreifoh6rqnhs7yiwj3ogyzwxdtzqnnsj4uiquurr3yixfiiavewwftm',
  author: {
    $type: 'app.bsky.actor.defs#profileViewBasic',
    did: 'did:plc:qfflfersmonljuxmm6iyb445',
    handle: 'ianboudreau.com',
  },
  value: {
    $type: 'app.bsky.feed.post',
    text: QUOTED_TEXT,
    createdAt: now(),
  },
  indexedAt: now(),
}

const outerPost = {
  $type: 'app.bsky.feed.defs#postView',
  uri: OUTER_URI,
  cid: 'bafyouter',
  author: {
    $type: 'app.bsky.actor.defs#profileViewBasic',
    did: 'did:plc:u2dwaqvvtmmz6v3hmszjrpk5',
    handle: 'originalist.bsky.social',
  },
  record: {
    $type: 'app.bsky.feed.post',
    text: OUTER_TEXT,
    createdAt: now(),
    embed: {
      $type: 'app.bsky.embed.record',
      record: {cid: quotedViewRecord.cid, uri: QUOTED_URI},
    },
  },
  embed: {
    $type: 'app.bsky.embed.record#view',
    record: quotedViewRecord,
  },
  indexedAt: now(),
} as $Typed<app.bsky.feed.defs.PostView>

function asQuoteEmbed(): EmbedType<'post'> {
  const parsed = parseEmbed(outerPost.embed)
  if (parsed.type !== 'post') {
    throw new Error(`expected post embed, got ${parsed.type}`)
  }
  return parsed
}

describe('resolveQuotePostView', () => {
  it('renders the quoted author and text, not the outer post', () => {
    const quote = resolveQuotePostView({embed: asQuoteEmbed()})

    expect(quote.uri).toBe(QUOTED_URI)
    expect(quote.author.handle).toBe('ianboudreau.com')
    expect(bskyRecordText(quote)).toBe(QUOTED_TEXT)
    expect(quote.uri).not.toBe(outerPost.uri)
    expect(quote.author.handle).not.toBe(outerPost.author.handle)
  })

  it('ignores a containing post passed as quotedPost when embed is present', () => {
    /*
     * Feed/thread callers pass CommonProps.post (the outer post) through
     * Embed -> RecordEmbed -> QuoteEmbed. If that value is reused as the
     * quote body, the card recursively repeats the outer post.
     */
    const quote = resolveQuotePostView({
      embed: asQuoteEmbed(),
      quotedPost: outerPost,
    })

    expect(quote.uri).toBe(QUOTED_URI)
    expect(quote.author.handle).toBe('ianboudreau.com')
    expect(bskyRecordText(quote)).toBe(QUOTED_TEXT)
  })

  it('uses quotedPost when there is no embed (Write Note preview)', () => {
    const quote = resolveQuotePostView({quotedPost: outerPost})

    expect(quote.uri).toBe(OUTER_URI)
    expect(quote.author.handle).toBe('originalist.bsky.social')
    expect(bskyRecordText(quote)).toBe(OUTER_TEXT)
  })

  it('throws when neither embed nor quotedPost is provided', () => {
    expect(() => resolveQuotePostView({})).toThrow(
      'QuoteEmbed requires embed or quotedPost',
    )
  })
})

function bskyRecordText(post: $Typed<app.bsky.feed.defs.PostView>): string {
  const record = post.record as {text?: string}
  return record.text ?? ''
}
