import {type TextStyle} from 'react-native'

import {atoms as a, flatten, type TextStyleProp} from '#/alf'
import {InlineLinkText} from '#/components/Link'
import {Text, type TextProps} from '#/components/Typography'

export type TextWithLinksProps = TextStyleProp &
  Pick<TextProps, 'selectable' | 'numberOfLines'> & {
    text: string
    testID?: string
    interactiveStyle?: TextStyle
  }

// URL detection matching WriteNoteDialog validation logic
// Only detects URLs with explicit http:// or https:// protocol
const URL_REGEX = /https?:\/\/[^\s]+/gi

interface DetectedLink {
  type: 'link'
  url: string
}

interface DetectedText {
  type: 'text'
  text: string
}

type Segment = DetectedLink | DetectedText

function detectUrls(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  let match

  // Reset regex lastIndex
  URL_REGEX.lastIndex = 0

  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL if any
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
      })
    }

    // Add the URL
    segments.push({
      type: 'link',
      url: match[0],
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(lastIndex),
    })
  }

  return segments
}

/**
 * Renders plain text with clickable URLs.
 * Only detects URLs with http:// or https:// protocol, matching the
 * validation rules in the Write Note form.
 */
export function TextWithLinks({
  text,
  testID,
  style,
  numberOfLines,
  selectable,
  interactiveStyle,
}: TextWithLinksProps) {
  const segments = detectUrls(text)

  // If no links detected, just render plain text
  if (
    segments.length === 0 ||
    (segments.length === 1 && segments[0].type === 'text')
  ) {
    return (
      <Text
        testID={testID}
        selectable={selectable}
        numberOfLines={numberOfLines}
        style={style}>
        {text}
      </Text>
    )
  }

  const flattenedStyle = flatten(style)
  const interactiveStyles = flatten([
    flattenedStyle,
    interactiveStyle,
    a.underline,
  ])

  // Render text with links
  const elements = segments.map((segment, index) => {
    if (segment.type === 'text') {
      return segment.text
    }

    // segment is a link
    return (
      <InlineLinkText
        key={index}
        selectable={selectable}
        to={segment.url}
        style={interactiveStyles}
        shareOnLongPress>
        {segment.url}
      </InlineLinkText>
    )
  })

  return (
    <Text
      testID={testID}
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={flattenedStyle}>
      {elements}
    </Text>
  )
}
