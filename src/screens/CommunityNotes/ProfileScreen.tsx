import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {useSetTitle} from '#/lib/hooks/useSetTitle'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotesSidebar} from '#/components/CommunityNotes/CommunityNotesSidebar'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export function CommunityNotesProfileScreen() {
  const t = useTheme()
  const {currentAccount} = useSession()

  useSetTitle('Your Community Notes Profile')

  return (
    <Layout.Screen>
      <CommunityNotesSidebar />
      <Layout.Center>
        <View style={[a.flex_1, a.p_xl, a.gap_lg]}>
          <View style={[a.gap_md]}>
            <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
              <Trans>Your Community Notes Profile</Trans>
            </Text>

            <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
              <Trans>
                Track your contributions and impact in Community Notes.
              </Trans>
            </Text>
          </View>

          <View style={[a.gap_md]}>
            <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>Contributor Status</Trans>
            </Text>

            <View
              style={[
                a.rounded_lg,
                a.border,
                a.p_lg,
                t.atoms.bg,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[a.text_md, t.atoms.text, a.mb_sm]}>
                <Trans>Account: {currentAccount?.handle || 'Unknown'}</Trans>
              </Text>
              <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
                <Trans>Status: Eligible Contributor</Trans>
              </Text>
            </View>
          </View>

          <View style={[a.gap_md]}>
            <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>Your Contributions</Trans>
            </Text>

            <View style={[a.gap_sm]}>
              <View
                style={[
                  a.rounded_lg,
                  a.border,
                  a.p_md,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                  <Trans>Notes Written</Trans>
                </Text>
                <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
                  <Trans>0</Trans>
                </Text>
              </View>

              <View
                style={[
                  a.rounded_lg,
                  a.border,
                  a.p_md,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                  <Trans>Notes Rated</Trans>
                </Text>
                <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
                  <Trans>0</Trans>
                </Text>
              </View>

              <View
                style={[
                  a.rounded_lg,
                  a.border,
                  a.p_md,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                  <Trans>Helpful Notes</Trans>
                </Text>
                <Text style={[a.text_lg, t.atoms.text_contrast_medium]}>
                  <Trans>0</Trans>
                </Text>
              </View>
            </View>
          </View>

          <View style={[a.gap_md]}>
            <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>Recent Activity</Trans>
            </Text>

            <View
              style={[
                a.rounded_lg,
                a.border,
                a.p_lg,
                t.atoms.bg,
                t.atoms.border_contrast_low,
                a.align_center,
              ]}>
              <Text
                style={[
                  a.text_md,
                  t.atoms.text_contrast_medium,
                  a.text_center,
                ]}>
                <Trans>No recent activity</Trans>
              </Text>
              <Text
                style={[
                  a.text_sm,
                  t.atoms.text_contrast_low,
                  a.text_center,
                  a.mt_sm,
                ]}>
                <Trans>Start contributing by writing or rating notes</Trans>
              </Text>
            </View>
          </View>
        </View>
      </Layout.Center>
    </Layout.Screen>
  )
}
