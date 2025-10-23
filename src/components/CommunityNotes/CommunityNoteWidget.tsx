import {useState} from 'react'
import {View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {Trans} from '@lingui/macro'

import {type CommunityNote} from '#/lib/community-notes/types'
import {useProposalsQuery} from '#/state/queries/community-notes'
import {atoms as a, useTheme} from '#/alf'
import {CommunityNotes as CommunityNotesIcon} from '#/components/icons/CommunityNotes'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/EyeSlash'
import {Link} from '#/components/Link'
import {TextWithLinks} from '#/components/TextWithLinks'
import {Text} from '#/components/Typography'
import {APP_NAME} from '#/env'

type DisplayMode = 'rated_helpful' | 'needs_more_ratings' | 'embedded'

interface CommunityNoteWidgetProps {
  post: AppBskyFeedDefs.PostView
  displayMode: DisplayMode
  showRatingPrompt?: boolean
  showDisclaimer?: boolean
  parentHover?: boolean
}

export function CommunityNoteWidget({
  post,
  displayMode,
  showRatingPrompt = true,
  showDisclaimer = true,
  parentHover = false,
}: CommunityNoteWidgetProps) {
  const t = useTheme()
  const [noteHover, setNoteHover] = useState(false)

  // Determine which notes to fetch based on display mode
  // Embedded mode shows rated_helpful notes, others show their respective types
  const queryStatus =
    displayMode === 'needs_more_ratings'
      ? 'needs_more_ratings'
      : 'rated_helpful'

  const {
    data: notes,
    isLoading,
    error,
  } = useProposalsQuery(post.uri, queryStatus, 'annotation')

  // Don't render if loading
  if (isLoading) {
    return null
  }

  // Show error if there's an error or no notes when expected
  if (error || !notes || notes.length === 0) {
    // For embedded posts, this widget is always displayed, whether or not the post has helpful notes.
    // TODO: can callers look at labels to decide whether to display the CommunityNoteWidget?
    if (displayMode === 'embedded' && (!notes || notes.length === 0)) {
      return null
    }

    return (
      <View
        style={[
          a.mt_md,
          a.rounded_lg,
          a.border,
          t.atoms.bg,
          t.atoms.border_contrast_low,
          a.p_md,
        ]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <Text style={[a.text_md, t.atoms.text_contrast_medium]}>⚠️</Text>
          <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
            {error ? (
              <Trans>Error loading community note: {error.message}</Trans>
            ) : (
              <Trans>No community note found for this post</Trans>
            )}
          </Text>
        </View>
      </View>
    )
  }

  const primaryNote = notes[0]

  // Configure props based on display mode
  const promptConfig =
    displayMode === 'rated_helpful'
      ? {
          promptText: 'Do you find this helpful?',
          buttonLabel: 'Rate it',
          title: 'Readers added context they thought people might want to know',
        }
      : displayMode === 'embedded'
        ? {
            promptText: 'Do you find this helpful?',
            buttonLabel: 'Rate it',
            title: 'Readers added context',
          }
        : {
            promptText: 'Is this proposed note helpful?',
            buttonLabel: 'Rate',
            title: 'Rate proposed Community Notes',
          }

  const textColor =
    displayMode === 'needs_more_ratings'
      ? t.atoms.text_contrast_medium
      : undefined // defaults to black

  // const borderStyle = displayMode === 'needs_more_ratings' ? 'dotted' : 'solid' // Unused - borderStyle not supported in React Native

  // Configure container styles based on mode
  const containerStyles =
    displayMode === 'embedded'
      ? [a.pt_md, a.relative, a.flex_col, a.align_start, a.w_full]
      : [
          a.mt_md,
          a.relative,
          a.flex_col,
          a.align_start,
          a.w_full,
          t.atoms.bg,
          {
            borderWidth: 1,
            borderColor: t.atoms.border_contrast_low.borderColor,
            borderRadius: 8,
          },
        ]

  // Common overlay positioning
  const overlayBase = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    pointerEvents: 'none' as const,
  }

  const baseBackgroundStyle = {
    ...overlayBase,
    opacity: 0.3,
    backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
  }

  const hoverOverlayStyle = {
    ...overlayBase,
    backgroundColor: 'black',
    opacity: noteHover ? 0.05 : parentHover ? 0.03 : 0.0,
  }

  // Render the widget content
  const widgetContent = (
    <>
      <Header
        title={promptConfig.title}
        statusIndicator={
          displayMode === 'needs_more_ratings'
            ? 'needs_more_ratings'
            : undefined
        }
        backgroundStyle={
          displayMode === 'embedded' ? undefined : t.atoms.bg_contrast_25
        }
        hoverOverlayStyle={hoverOverlayStyle}
      />

      <Content note={primaryNote} textColor={textColor} />

      {/* Horizontal line above rating prompt (for non-embedded modes) */}
      {displayMode !== 'embedded' && showRatingPrompt && (
        <View
          style={[
            a.w_full,
            {
              borderTopWidth: 1,
              borderTopColor: t.atoms.border_contrast_low.borderColor,
            },
          ]}
        />
      )}

      {showRatingPrompt && (
        <RatingPrompt
          promptText={promptConfig.promptText}
          buttonLabel={promptConfig.buttonLabel}
        />
      )}
    </>
  )

  // Always wrap in Link to navigate to Community Notes page
  const widget = (
    <Link
      to={`/profile/${post.author.handle}/post/${post.uri.split('/').pop()}/community-notes`}
      action="navigate"
      style={containerStyles}
      label="Community Notes"
      // @ts-expect-error - onPointerEnter/Leave not in Link types but work on web
      onPointerEnter={() => setNoteHover(true)}
      onPointerLeave={() => setNoteHover(false)}
      onPress={e => {
        // Stop propagation to prevent post navigation
        e.stopPropagation()
      }}>
      {/* Base background for note body (always present) */}
      <View style={baseBackgroundStyle} />
      {/* Hover overlay */}
      <View style={hoverOverlayStyle} />
      {widgetContent}
    </Link>
  )

  return (
    <>
      {widget}
      {showDisclaimer && <Disclaimer />}
    </>
  )
}

// Private helper functions
function Header({
  title,
  statusIndicator,
  backgroundStyle,
  hoverOverlayStyle,
}: {
  title: string
  statusIndicator?: 'needs_more_ratings'
  backgroundStyle?: any
  hoverOverlayStyle: any
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.px_md,
        a.py_sm,
        a.w_full,
        a.relative,
        // Base header background
        backgroundStyle,
        backgroundStyle && {
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        },
      ]}>
      {/* Header hover overlay */}
      {backgroundStyle && <View style={hoverOverlayStyle} />}

      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        <CommunityNotesIcon size="sm" style={{color: t.palette.primary_500}} />
        <Text style={[a.font_bold, a.text_md, t.atoms.text, a.flex_1]}>
          {title}
        </Text>
      </View>

      {/* Status indicator - only show for needs_more_ratings */}
      {statusIndicator === 'needs_more_ratings' && (
        <View style={[a.flex_row, a.align_center, a.gap_sm, a.mt_sm]}>
          <EyeSlashIcon
            size="sm"
            style={[{color: t.atoms.text_contrast_medium.color}]}
          />
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.font_bold]}>
            <Trans>Not shown on {APP_NAME} • Needs ratings</Trans>
          </Text>
        </View>
      )}
    </View>
  )
}

function Content({note, textColor}: {note: CommunityNote; textColor?: any}) {
  return (
    <View style={[a.px_md, a.py_sm, a.w_full]}>
      <NoteContent note={note} textColor={textColor} />
    </View>
  )
}

function RatingPrompt({
  promptText,
  buttonLabel,
}: {
  promptText: string
  buttonLabel: string
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.px_md,
        a.py_sm,
        a.flex_row,
        a.align_center,
        a.justify_between,
        a.w_full,
      ]}>
      <Text style={[a.text_md, t.atoms.text]}>{promptText}</Text>
      <View
        style={[
          {
            borderWidth: 1,
            borderColor: t.palette.contrast_200,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
          {buttonLabel}
        </Text>
      </View>
    </View>
  )
}

function Disclaimer() {
  const t = useTheme()

  return (
    <View style={[a.mt_md]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Context is written by people who use {APP_NAME}, and appears when
          rated helpful by others.
        </Trans>{' '}
        <Link
          to="https://bluenotes.social/about/support/community-notes"
          action="navigate"
          label="Find out more about Community Notes">
          {({hovered}) => (
            <Text
              style={[
                a.text_sm,
                {color: t.palette.primary_500},
                hovered && {textDecorationLine: 'underline'},
              ]}>
              <Trans>Find out more.</Trans>
            </Text>
          )}
        </Link>
      </Text>
    </View>
  )
}

// NoteContent component (simplified since we only show one note)
interface NoteContentProps {
  note: CommunityNote
  textColor?: any
}

function NoteContent({note, textColor}: NoteContentProps) {
  const t = useTheme()

  // Use provided textColor or default to black
  const finalTextColor = textColor || t.atoms.text

  return (
    <View>
      {/* Note text */}
      <View style={[a.mb_sm]}>
        <TextWithLinks
          text={note.text}
          style={[a.text_md, finalTextColor, {lineHeight: 20}]}
        />
      </View>
    </View>
  )
}
