import {FlatList, View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {Trans} from '@lingui/macro'

import {atoms as a, useTheme} from '#/alf'
import {InstructionPrompt} from '#/components/CommunityNotes/InstructionPrompt'
import {PostWithNote} from '#/components/CommunityNotes/PostWithNote'
import {Text} from '#/components/Typography'

interface CommunityNotesContentProps {
  status: 'needs_your_help' | 'new' | 'rated_helpful'
  posts: AppBskyFeedDefs.PostView[]
  isActive: boolean
}

export function CommunityNotesContent({
  status,
  posts,
  isActive,
}: CommunityNotesContentProps) {
  const t = useTheme()

  const renderItem = ({item}: {item: AppBskyFeedDefs.PostView}) => (
    <PostWithNote post={item} status={status} />
  )

  const renderHeader = () => (
    <View style={[a.p_lg, a.w_full, {maxWidth: 600}]}>
      <InstructionPrompt status={status} />
    </View>
  )

  const renderEmpty = () => (
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

  if (!isActive) {
    return <View style={[a.flex_1]} />
  }

  return (
    <View style={[a.flex_1]}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={item => item.uri}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={posts.length === 0 ? [a.flex_1] : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}
