import {View} from 'react-native'

import {type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {TabBar} from '#/view/com/pager/TabBar'
import {atoms as a, useTheme} from '#/alf'

export function CommunityNotesHeader(
  props: RenderTabBarFnProps & {
    onPressSelected: () => void
    tabs: string[]
  },
) {
  const t = useTheme()
  const {tabs, onPressSelected} = props

  return (
    <View style={[t.atoms.bg, a.border_b, t.atoms.border_contrast_low]}>
      <TabBar
        key={tabs.join(',')}
        onPressSelected={onPressSelected}
        selectedPage={props.selectedPage}
        onSelect={props.onSelect}
        testID="communityNotesTabBar"
        items={tabs}
        dragProgress={props.dragProgress}
        dragState={props.dragState}
      />
    </View>
  )
}
