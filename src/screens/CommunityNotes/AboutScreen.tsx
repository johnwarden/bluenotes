import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotesSidebar} from '#/components/CommunityNotes/CommunityNotesSidebar'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export function CommunityNotesAboutScreen() {
  const t = useTheme()

  useSetTitle('About Community Notes')

  return (
    <Layout.Screen>
      <CommunityNotesSidebar />
      <Layout.Center>
        <View style={[a.flex_1, a.p_xl, a.gap_lg]}>
          <View style={[a.gap_md]}>
            <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
              <Trans>About Community Notes</Trans>
            </Text>

            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans>
                Community Notes aims to create a better-informed world by
                empowering people on Bluesky to collaboratively add helpful
                context to posts.
              </Trans>
            </Text>
          </View>

          <View style={[a.gap_md]}>
            <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>How it works</Trans>
            </Text>

            <Text style={[a.text_md, t.atoms.text]}>
              <Trans>
                Community Notes allows eligible contributors to add context to
                posts that might be misleading. Notes are written and rated by
                contributors, and only shown when there's agreement from people
                with diverse perspectives.
              </Trans>
            </Text>
          </View>

          <View style={[a.gap_md]}>
            <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>Getting started</Trans>
            </Text>

            <Text style={[a.text_md, t.atoms.text]}>
              <Trans>
                To become a Community Notes contributor, you need to have an
                established account in good standing. Contributors can write
                notes and rate the helpfulness of notes written by others.
              </Trans>
            </Text>
          </View>

          <View style={[a.gap_md]}>
            <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>Learn more</Trans>
            </Text>

            <Text style={[a.text_md, t.atoms.text]}>
              <Trans>
                For more detailed information about Community Notes, including
                our algorithms and contributor guidelines, visit our help
                documentation.
              </Trans>
            </Text>
          </View>
        </View>
      </Layout.Center>
    </Layout.Screen>
  )
}
