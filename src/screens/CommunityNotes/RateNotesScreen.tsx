import {useMemo} from 'react'
import {ActivityIndicator, FlatList, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type RouteProp, useRoute} from '@react-navigation/native'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {useProposalsQuery} from '#/state/queries/community-notes'
import {usePostQuery} from '#/state/queries/post'
import {atoms as a, useTheme} from '#/alf'
import {NoteCard} from '#/components/CommunityNotes/NoteCard'
import {WriteANotePrompt} from '#/components/CommunityNotes/WriteANotePrompt'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'
import {QuoteEmbed} from '#/components/Post/Embed'
import {Text} from '#/components/Typography'

type RateNotesScreenParams = {
  name: string
  rkey: string
}

type RateNotesScreenRouteProp = RouteProp<
  {params: RateNotesScreenParams},
  'params'
>

export function RateNotesScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const route = useRoute<RateNotesScreenRouteProp>()
  const {name, rkey} = route.params
  const uri = `at://${name}/app.bsky.feed.post/${rkey}`
  const {
    data: post,
    isLoading: isLoadingPost,
    error: postError,
  } = usePostQuery(uri)

  const {
    data: notes,
    isLoading: isLoadingNotes,
    error: notesError,
  } = useProposalsQuery(uri)

  // Create a version of the post without the proposed-note label
  // This prevents the RateCommunityNotesPrompt from showing in QuoteEmbed
  const postWithoutProposedNoteLabel = useMemo(() => {
    if (!post) return post
    return {
      ...post,
      labels: post.labels?.filter(label => label.val !== 'proposed-note') || [],
    }
  }, [post])

  useSetTitle(_(msg`Rate notes`))

  const renderItem = ({item}: {item: CommunityNote}) => <NoteCard note={item} />

  return (
    <Layout.Screen>
      <Layout.Center>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.TitleText>Post with notes</Layout.Header.TitleText>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        {isLoadingPost || isLoadingNotes ? (
          <ActivityIndicator style={[a.mt_xl]} />
        ) : postError ? (
          <Text style={[t.atoms.text_contrast_medium, a.p_xl]}>
            {postError.toString()}
          </Text>
        ) : notesError ? (
          <Text style={[t.atoms.text_contrast_medium, a.p_xl]}>
            {notesError.toString()}
          </Text>
        ) : (
          <FlatList
            data={notes || []}
            renderItem={renderItem}
            keyExtractor={item => item.author.aid}
            ListHeaderComponent={
              postWithoutProposedNoteLabel ? (
                <View>
                  <View style={[a.pb_xl, a.px_lg]}>
                    <QuoteEmbed
                      embed={{
                        type: 'post',
                        view: {
                          uri: postWithoutProposedNoteLabel.uri,
                          cid: postWithoutProposedNoteLabel.cid,
                          author: postWithoutProposedNoteLabel.author,
                          value: postWithoutProposedNoteLabel.record,
                          labels: postWithoutProposedNoteLabel.labels,
                          likeCount: postWithoutProposedNoteLabel.likeCount,
                          repostCount: postWithoutProposedNoteLabel.repostCount,
                          replyCount: postWithoutProposedNoteLabel.replyCount,
                          quoteCount: postWithoutProposedNoteLabel.quoteCount,
                          indexedAt: postWithoutProposedNoteLabel.indexedAt,
                          embeds: postWithoutProposedNoteLabel.embed
                            ? [postWithoutProposedNoteLabel.embed]
                            : undefined,
                        },
                      }}
                    />
                  </View>
                  <View
                    style={[
                      a.flex_row,
                      a.align_center,
                      a.gap_xs,
                      a.px_lg,
                      a.py_md,
                      a.border_t,
                      a.border_b,
                      t.atoms.border_contrast_low,
                    ]}>
                    <Layout.Header.TitleText>
                      Notes suggesting context to be shown with the post
                    </Layout.Header.TitleText>
                    <InfoIcon size="sm" style={t.atoms.text} />
                  </View>
                </View>
              ) : undefined
            }
            ListFooterComponent={<WriteANotePrompt postUri={uri} />}
          />
        )}
      </Layout.Center>
    </Layout.Screen>
  )
}
