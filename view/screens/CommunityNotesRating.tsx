import {observer} from 'mobx-react-lite'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {RateNotesScreen as RateNotesView} from '#/screens/CommunityNotes/RateNotesScreen'

export const CommunityNotesRatingScreen = observer(
  function CommunityNotesRatingScreenImpl() {
    useSetTitle('Rate Notes')
    return <RateNotesView />
  },
)
