import {useEffect, useState} from 'react'
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type RouteProp, useRoute} from '@react-navigation/native'

import {usePalette} from '#/lib/hooks/usePalette'
import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {type CommunityNote, fetchNotes} from '#/lib/mock-data/community-notes'
import {s} from '#/lib/styles'
import {usePostQuery} from '#/state/queries/post'
import {Post} from '#/view/com/post/Post'
import {NoteCard} from '#/components/CommunityNotes/NoteCard'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'

type RateNotesScreenParams = {
  name: string
  rkey: string
}

type RateNotesScreenRouteProp = RouteProp<
  {params: RateNotesScreenParams},
  'params'
>

export function RateNotesScreen() {
  const pal = usePalette('default')
  const {_} = useLingui()
  const route = useRoute<RateNotesScreenRouteProp>()
  const {name, rkey} = route.params
  const uri = `at://${name}/app.bsky.feed.post/${rkey}`
  const {
    data: post,
    isLoading: isLoadingPost,
    error: postError,
  } = usePostQuery(uri)

  const [notes, setNotes] = useState<CommunityNote[]>([])
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
          <ActivityIndicator style={styles.loading} />
        ) : postError ? (
          <Text style={[pal.textLight, s.p20]}>{postError.toString()}</Text>
        ) : notesError ? (
          <Text style={[pal.textLight, s.p20]}>{notesError}</Text>
        ) : (
          <FlatList
            data={notes}
            renderItem={renderItem}
            keyExtractor={item => item.contributorId}
            ListHeaderComponent={
              post ? (
                <View>
                  <View style={{paddingBottom: 20}}>
                    <Post post={post} />
                  </View>
                  <View style={[pal.border, styles.header]}>
                    <Layout.Header.TitleText>
                      Notes suggesting context to be shown with the post
                    </Layout.Header.TitleText>
                    <InfoIcon size="sm" style={pal.text} />
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

const styles = StyleSheet.create({
  loading: {
    marginTop: 20,
  },
  title: {
    fontSize: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
})
