import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {
  atoms as a,
  useGutters,
  useLayoutBreakpoints,
  useTheme,
  web,
} from '#/alf'
import {CENTER_COLUMN_OFFSET} from '#/components/Layout/const'
import {InlineLinkText, Link} from '#/components/Link'
import {Text} from '#/components/Typography'

export function CommunityNotesRightPane() {
  const t = useTheme()
  const {_} = useLingui()
  const {isDesktop} = useWebMediaQueries()
  const gutters = useGutters(['base', 0, 'base', 'wide'])
  const {rightNavVisible, centerColumnOffset} = useLayoutBreakpoints()

  if (!isDesktop || !rightNavVisible) {
    return null
  }

  const width = centerColumnOffset ? 280 : 330

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
          to="https://bluenotes.social/about/support/community-notes"
          label="Learn more about our values">
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

        <Text style={[a.text_md, t.atoms.text]}>
          <Trans>Ideas or suggestions to improve Community Notes?</Trans>{' '}
          <Link
            to="https://bsky.app/profile/bluenotes.social"
            label="Send us a DM @bluenotes.social">
            <Text style={[a.text_md, {color: t.palette.primary_500}, a.mt_md]}>
              <Trans>Send us a DM @bluenotes.social</Trans>
            </Text>
          </Link>
        </Text>
      </View>

      {/* Footer Links - Same as main app */}
      <Text style={[a.leading_snug, t.atoms.text_contrast_low]}>
        <InlineLinkText
          to="/about/support/privacy-policy"
          label={_(msg`Privacy`)}>
          {_(msg`Privacy`)}
        </InlineLinkText>
        {' • '}
        <InlineLinkText to="/about/support/tos" label={_(msg`Terms`)}>
          {_(msg`Terms`)}
        </InlineLinkText>
        {' • '}
        <InlineLinkText to="/about/support" label={_(msg`Help`)}>
          {_(msg`Help`)}
        </InlineLinkText>
      </Text>
    </View>
  )
}
