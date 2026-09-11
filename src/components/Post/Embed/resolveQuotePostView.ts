import {type $Typed} from '@atproto/lex'

import {type app} from '#/lexicons'
import {type EmbedType} from '#/types/bsky/post'

/**
 * Build the PostView a quote card should render.
 *
 * `CommonProps.post` is the *containing* (outer) post and must never be used
 * as the quote body. Prefer `embed.view` (the quoted record from
 * `app.bsky.embed.record`). `quotedPost` is only for embed-less previews such
 * as the Write Note dialog.
 */
export function resolveQuotePostView({
  embed,
  quotedPost,
}: {
  embed?: EmbedType<'post'>
  quotedPost?: app.bsky.feed.defs.PostView
}): $Typed<app.bsky.feed.defs.PostView> {
  if (embed) {
    return {
      ...embed.view,
      $type: 'app.bsky.feed.defs#postView',
      record: embed.view.value,
      embed: embed.view.embeds?.[0],
    }
  }
  if (quotedPost) {
    return {
      ...quotedPost,
      $type: 'app.bsky.feed.defs#postView',
    }
  }
  throw new Error('QuoteEmbed requires embed or quotedPost')
}
