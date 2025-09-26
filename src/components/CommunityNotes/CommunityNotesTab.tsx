import {useCallback} from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {FeedFeedbackProvider, useFeedFeedback} from '#/state/feed-feedback'
import {type FeedDescriptor} from '#/state/queries/post-feed'
import {useSession} from '#/state/session'
import {PostFeed} from '#/view/com/posts/PostFeed'
import {MainScrollProvider} from '#/view/com/util/MainScrollProvider'
import {atoms as a, useTheme} from '#/alf'
import {InstructionPrompt} from '#/components/CommunityNotes/InstructionPrompt'
import {Text} from '#/components/Typography'

type TabStatus = 'needs_your_help' | 'new' | 'rated_helpful'

interface CommunityNotesTabProps {
  feedDescriptor: FeedDescriptor | null
  displayMode: 'rated_helpful' | 'needs_more_ratings'
  status: TabStatus
  isPageFocused: boolean
  testID?: string
}

export function CommunityNotesTab({
  feedDescriptor,
  displayMode,
  status,
  isPageFocused,
  testID,
}: CommunityNotesTabProps) {
  const {hasSession} = useSession()
  const t = useTheme()
  const feedFeedback = useFeedFeedback(undefined, hasSession)

  // Empty state renderer for each tab
  const renderEmptyState = useCallback(() => {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
        <Text style={[t.atoms.text_contrast_medium, a.text_center]}>
          {status === 'needs_your_help' && (
            <Trans>No notes need your help right now</Trans>
          )}
          {status === 'new' && <Trans>No new notes to review</Trans>}
          {status === 'rated_helpful' && (
            <Trans>No notes have been rated helpful yet</Trans>
          )}
        </Text>
      </View>
    )
  }, [status, t])

  // Header renderer with instruction prompt
  const renderHeader = useCallback(() => {
    return (
      <View style={[a.w_full, {maxWidth: 600}]}>
        <InstructionPrompt status={status} />
      </View>
    )
  }, [status])

  // If no feed descriptor (config unavailable), show empty state
  if (!feedDescriptor) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
        <Text style={[t.atoms.text_contrast_medium, a.text_center]}>
          <Trans>This feed is currently unavailable</Trans>
        </Text>
      </View>
    )
  }

  return (
    <View testID={testID}>
      <MainScrollProvider>
        <FeedFeedbackProvider value={feedFeedback}>
          <PostFeed
            testID={`${testID}-feed`}
            enabled={isPageFocused}
            feed={feedDescriptor}
            renderEmptyState={renderEmptyState}
            ListHeaderComponent={renderHeader}
            communityNotesDisplayMode={displayMode}
          />
        </FeedFeedbackProvider>
      </MainScrollProvider>
    </View>
  )
}
