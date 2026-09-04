import {useCallback, useMemo} from 'react'
import {View} from 'react-native'
import {AtUri} from '@atproto/syntax'
import {Trans} from '@lingui/react/macro'
import type React from 'react'

import {useCommunityNotesConfig} from '#/state/queries/community-notes-config'
import {useFeedSourceInfoQuery} from '#/state/queries/feed'
import {useEnableMinimalShellMode} from '#/state/shell'
import {FeedSourceCard} from '#/view/com/feeds/FeedSourceCard'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotesRightPane} from '#/components/CommunityNotes/CommunityNotesRightPane'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {type CommunityNotesFeedTab} from './constants'

const FEED_ITEMS: Array<{
  key: CommunityNotesFeedTab
  description: React.ReactNode
}> = [
  {
    key: 'needs_your_help',
    description: (
      <Trans>
        Notes on these posts need a more diverse range of feedback, and your
        point of view could help decide if they're helpful. This list refreshes
        regularly.
      </Trans>
    ),
  },
  {
    key: 'new',
    description: (
      <Trans>
        Hot off the press! These are the most recently written notes.
        Contributors can rate these notes to determine their helpfulness.
      </Trans>
    ),
  },
  {
    key: 'rated_helpful',
    description: (
      <Trans>
        Community Notes relies on contributors to rate each other's notes. Notes
        shown on these posts have been rated helpful by contributors of multiple
        perspectives.
      </Trans>
    ),
  },
]

export function CommunityNotesFeedsScreen() {
  const t = useTheme()
  useEnableMinimalShellMode({enabled: false})
  const {data: config, isLoading: configLoading} = useCommunityNotesConfig()

  const getFeedUri = useCallback(
    (tab: CommunityNotesFeedTab): string | null => {
      // AT URIs must use DIDs, not handles
      if (!config?.feedGeneratorDid) return null
      return `at://${config.feedGeneratorDid}/app.bsky.feed.generator/${tab}`
    },
    [config?.feedGeneratorDid],
  )

  const feedUris = useMemo(() => {
    return FEED_ITEMS.map(item => getFeedUri(item.key)).filter(
      Boolean,
    ) as string[]
  }, [getFeedUri])

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content align="left">
          <Layout.Header.TitleText>
            <Trans>Community Notes</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Content>
        {configLoading ? (
          <View style={[a.w_full, a.py_2xl, a.align_center]}>
            <Loader size="xl" />
          </View>
        ) : feedUris.length > 0 ? (
          FEED_ITEMS.map((item, index) => {
            const feedUri = feedUris[index]
            if (!feedUri) return null

            return (
              <FeedListItem
                key={item.key}
                feedUri={feedUri}
                description={item.description}
              />
            )
          })
        ) : (
          <View style={[a.flex_1, a.p_lg]}>
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>Community Notes feeds are currently unavailable.</Trans>
            </Text>
          </View>
        )}
      </Layout.Content>
      <CommunityNotesRightPane />
    </Layout.Screen>
  )
}

function FeedListItem({
  feedUri,
  description,
}: {
  feedUri: string
  description: React.ReactNode
}) {
  const t = useTheme()
  const {data: feedInfo} = useFeedSourceInfoQuery({uri: feedUri})

  // Link directly to CommunityNotes route to avoid ProfileFeed redirect and history pollution
  const linkTo = useMemo(() => {
    if (!feedInfo) return null
    const uri = new AtUri(feedInfo.uri)
    return {
      screen: 'CommunityNotes' as const,
      params: {
        tab: uri.rkey,
      },
    }
  }, [feedInfo])

  return (
    <View style={[a.border_b, t.atoms.border_contrast_low]}>
      {linkTo && feedInfo ? (
        <>
          <Link to={linkTo} label={`View ${feedInfo.displayName}`}>
            <FeedSourceCard
              feedUri={feedUri}
              showMinimalPlaceholder
              hideTopBorder={true}
              link={false}
            />
          </Link>
          <Link
            to={linkTo}
            label={`View ${feedInfo.displayName}`}
            style={[a.px_lg, a.pb_lg]}>
            <Text
              style={[a.text_md, t.atoms.text_contrast_medium, a.leading_snug]}>
              {description}
            </Text>
          </Link>
        </>
      ) : (
        <>
          <FeedSourceCard
            feedUri={feedUri}
            showMinimalPlaceholder
            hideTopBorder={true}
          />
          <View style={[a.px_lg, a.pb_lg]}>
            <Text
              style={[a.text_md, t.atoms.text_contrast_medium, a.leading_snug]}>
              {description}
            </Text>
          </View>
        </>
      )}
    </View>
  )
}
