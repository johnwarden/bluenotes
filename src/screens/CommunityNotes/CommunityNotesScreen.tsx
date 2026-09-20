import {type RouteProp, useRoute} from '@react-navigation/native'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {CommunityNotesFeedScreen} from './CommunityNotesFeedScreen'
import {CommunityNotesFeedsScreen} from './CommunityNotesFeedsScreen'
import {type CommunityNotesTab} from './constants'

export function CommunityNotesScreen() {
  const route = useRoute<RouteProp<CommonNavigatorParams, 'CommunityNotes'>>()
  const tab = (route.params?.tab ?? 'feeds') as CommunityNotesTab

  // 'feeds' tab = show list of feeds
  if (tab === 'feeds') {
    return <CommunityNotesFeedsScreen />
  }

  // Other tabs = show individual feed
  return <CommunityNotesFeedScreen tab={tab} />
}
