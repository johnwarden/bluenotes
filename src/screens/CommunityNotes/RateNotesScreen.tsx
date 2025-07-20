import {useEffect, useState} from 'react'
import {ActivityIndicator, FlatList, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type RouteProp, useRoute} from '@react-navigation/native'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {fetchNotes} from '#/lib/mock-data/community-notes'
import {type CommunityNoteView} from '#/state/queries/community-notes'
import {usePostQuery} from '#/state/queries/post'
import {Post} from '#/view/com/post/Post'
import {atoms as a, useTheme} from '#/alf'
import {NoteCard} from '#/components/CommunityNotes/NoteCard'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'
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

  const [notes, setNotes] = useState<CommunityNoteView[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(true)
  const [notesError, setNotesError] = useState<string | null>(null)

  useSetTitle(_(msg`Rate notes`))

  useEffect(() => {
    async function loadNotes() {
      setIsLoadingNotes(true)
      try {
        const res = await fetchNotes(uri)
        setNotes(res)
      } catch (e: any) {
        setNotesError(e.toString())
      } finally {
        setIsLoadingNotes(false)
      }
    }
    loadNotes()
  }, [uri])

  const renderItem = ({item}: {item: CommunityNoteView}) => (
    <NoteCard note={item} />
  )

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
            {notesError}
          </Text>
        ) : (
          <FlatList
            data={notes}
            renderItem={renderItem}
            keyExtractor={item => item.author.aid}
            ListHeaderComponent={
              post ? (
                <View>
                  <View style={[a.pb_xl]}>
                    <Post post={post} />
                  </View>
                  <View style={[
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
          />
        )}
      </Layout.Center>
    </Layout.Screen>
  )
}
