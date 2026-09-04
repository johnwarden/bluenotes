import {useRoute} from '@react-navigation/native'

import {CommunityNotesFeedScreen} from './CommunityNotesFeedScreen'
import {CommunityNotesFeedsScreen} from './CommunityNotesFeedsScreen'
import {type CommunityNotesTab} from './constants'

export function CommunityNotesScreen() {
  const route = useRoute<any>()
  const tab = route.params?.tab as CommunityNotesTab

  // 'feeds' tab = show list of feeds
  if (tab === 'feeds') {
    return <CommunityNotesFeedsScreen />
  }

  // Other tabs = show individual feed
  return <CommunityNotesFeedScreen tab={tab} />
}
