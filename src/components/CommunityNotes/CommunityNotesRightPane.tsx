import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {useLayoutBreakpoints} from '#/lib/hooks/useLayoutBreakpoints'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {web} from '#/platform/detection'
import {atoms as a, useGutters, useTheme} from '#/alf'
import {CENTER_COLUMN_OFFSET} from '#/components/Layout/const'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'

export function CommunityNotesRightPane() {
  const t = useTheme()
  const {isDesktop} = useWebMediaQueries()
  const gutters = useGutters(['base', 0, 'base', 'wide'])
  const {rightNavVisible, centerColumnOffset} = useLayoutBreakpoints()

  if (!isDesktop || !rightNavVisible) {
    return null
  }

  const width = centerColumnOffset ? 250 : 300

  return (
    <View
      style={[
        gutters,
        a.gap_lg,
        web({
          position: 'fixed',
          left: '50%',
          transform: [
            {
              translateX: 300 + (centerColumnOffset ? CENTER_COLUMN_OFFSET : 0),
            },
            ...a.scrollbar_offset.transform,
          ],
          width: width + gutters.paddingLeft,
          maxHeight: '100%',
          overflowY: 'auto',
        }),
      ]}>
      {/* Community Notes Values */}
      <View
        style={[
          a.rounded_lg,
          a.border,
          a.p_lg,
          a.mb_lg,
          t.atoms.bg,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xl, a.font_bold, t.atoms.text, a.mb_lg]}>
          <Trans>Community Notes values</Trans>
        </Text>

        {/* Value 1 */}
        <View style={[a.flex_row, a.gap_md, a.mb_lg]}>
          <Text style={[a.text_lg, t.atoms.text]}>💡</Text>
          <Text style={[a.text_md, t.atoms.text, a.flex_1]}>
            <Trans>Contribute to build understanding</Trans>
          </Text>
        </View>

        {/* Value 2 */}
        <View style={[a.flex_row, a.gap_md, a.mb_lg]}>
          <Text style={[a.text_lg, t.atoms.text]}>💙</Text>
          <Text style={[a.text_md, t.atoms.text, a.flex_1]}>
            <Trans>Act in good faith</Trans>
          </Text>
        </View>

        {/* Value 3 */}
        <View style={[a.flex_row, a.gap_md, a.mb_lg]}>
          <Text style={[a.text_lg, t.atoms.text]}>👥</Text>
          <Text style={[a.text_md, t.atoms.text, a.flex_1]}>
            <Trans>Be helpful, even to those who disagree</Trans>
          </Text>
        </View>

        <Link
          to="/community-notes/about"
          style={[{color: t.palette.primary_500}]}>
          <Text style={[a.text_md, {color: t.palette.primary_500}]}>
            <Trans>Learn more about our values</Trans>
          </Text>
        </Link>
      </View>

      {/* Feedback Section */}
      <View
        style={[
          a.rounded_lg,
          a.border,
          a.p_lg,
          t.atoms.bg,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xl, a.font_bold, t.atoms.text, a.mb_md]}>
          <Trans>Feedback</Trans>
        </Text>

        <Text style={[a.text_md, t.atoms.text, a.mb_md]}>
          <Trans>Ideas or suggestions to improve Community Notes?</Trans>{' '}
          <Link
            to="https://bsky.app/profile/communitynotes.bsky.social"
            style={[{color: t.palette.primary_500}]}>
            <Text style={[a.text_md, {color: t.palette.primary_500}]}>
              <Trans>Send us a DM @CommunityNotes</Trans>
            </Text>
          </Link>
        </Text>

        {/* Footer Links */}
        <View style={[a.mt_lg, a.gap_sm]}>
          <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
            <Link
              to="/support/privacy"
              style={[{color: t.atoms.text_contrast_medium.color}]}>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>Privacy Policy</Trans>
              </Text>
            </Link>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>|</Text>
            <Link
              to="/support/tos"
              style={[{color: t.atoms.text_contrast_medium.color}]}>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>Terms of Service</Trans>
              </Text>
            </Link>
          </View>
          <View style={[a.flex_row, a.flex_wrap, a.gap_md]}>
            <Link
              to="/support/accessibility"
              style={[{color: t.atoms.text_contrast_medium.color}]}>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>Accessibility</Trans>
              </Text>
            </Link>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>|</Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>© 2025 Bluesky</Trans>
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
