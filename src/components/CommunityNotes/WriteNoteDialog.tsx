import {useMemo, useState} from 'react'
import {ActivityIndicator, ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'
import Graphemer from 'graphemer'

import * as apilib from '#/lib/api/community-notes'
import {RQKEY} from '#/state/queries/community-notes'
import {usePostQuery} from '#/state/queries/post'
import {useAgent} from '#/state/session'
import {CharProgress} from '#/view/com/composer/char-progress/CharProgress'
import {Post} from '#/view/com/post/Post'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import {NoteSubmittedDialog} from '#/components/CommunityNotes/NoteSubmittedDialog'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {CircleInfo_Stroke2_Corner0_Rounded as InfoIcon} from '#/components/icons/CircleInfo'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {Text} from '#/components/Typography'

const REASONS = [
  {
    key: 'factual_error',
    label: 'It contains a factual error',
  },
  {
    key: 'altered_media',
    label: 'It contains a digitally altered photo or video',
  },
  {
    key: 'outdated_information',
    label: 'It contains outdated information that may be misleading',
  },
  {
    key: 'misrepresentation_or_missing_context',
    label: 'It is a misrepresentation or missing important context',
  },
  {
    key: 'unverified_claim_as_fact',
    label: 'It presents an unverified claim as a fact',
  },
  {
    key: 'joke_or_satire',
    label: 'It is a joke or satire that might be misinterpreted as a fact',
  },
  {
    key: 'other',
    label: 'Other',
  },
]

// Community Notes constants (matching X/Twitter)
const COMMUNITY_NOTES_MAX_LENGTH = 280
const URL_LENGTH = 23 // Twitter's standard URL length

// URL detection utility
const COMPLETE_URL_REGEX = /https?:\/\/[^\s]+/gi
const URL_START_REGEX = /https?:\/\/\S*/gi

function hasValidUrls(text: string): boolean {
  const urls = text.match(COMPLETE_URL_REGEX)
  return urls !== null && urls.length > 0
}

// Calculate character count with URLs counted as 23 characters each
function calculateNoteLength(text: string): number {
  const graphemer = new Graphemer()

  // Find all URL-like patterns (including incomplete ones like "https://")
  const urlMatches = text.match(URL_START_REGEX) || []

  // Replace each URL pattern with a placeholder of URL_LENGTH characters
  let processedText = text
  urlMatches.forEach(url => {
    processedText = processedText.replace(url, 'x'.repeat(URL_LENGTH))
  })

  return graphemer.countGraphemes(processedText)
}

// Validation warning component
function ValidationWarning({message}: {message: string}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_sm,
        a.px_md,
        a.py_sm,
        a.mt_sm,
        a.rounded_md,
        {
          backgroundColor: t.palette.negative_25,
          borderWidth: 1,
          borderColor: t.palette.negative_200,
        },
      ]}>
      <InfoIcon size="sm" style={[{color: t.palette.negative_700}]} />
      <Text style={[a.flex_1, {color: t.palette.negative_700, fontSize: 14}]}>
        {message}
      </Text>
    </View>
  )
}

interface WriteNoteDialogProps {
  control: Dialog.DialogOuterProps['control']
  postUri: string
}

export function WriteNoteDialog({control, postUri}: WriteNoteDialogProps) {
  const t = useTheme()
  const {_} = useLingui()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [noteText, setNoteText] = useState('')
  const [hasReliableSources, setHasReliableSources] = useState<
    'yes' | 'no' | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string>('')
  const [submittedNoteUri, setSubmittedNoteUri] = useState<string>('')
  const [submittedNote, setSubmittedNote] = useState<any>(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const {data: post} = usePostQuery(postUri)
  const submittedDialogControl = Dialog.useDialogControl()

  // Character counting with URL handling
  const noteTextLength = useMemo(
    () => calculateNoteLength(noteText),
    [noteText],
  )

  // Validation logic
  const validationErrors = useMemo(() => {
    const errors: string[] = []

    // Check if at least one reason is selected
    if (selectedReasons.length === 0) {
      errors.push('Select at least one')
    }

    // Check if explanation is provided
    if (noteText.trim().length === 0) {
      errors.push('Enter an explanation')
    } else if (noteTextLength > COMMUNITY_NOTES_MAX_LENGTH) {
      errors.push('Note is too long')
    } else if (!hasValidUrls(noteText)) {
      // Only check for sources if there's text but no URLs
      errors.push("Your note doesn't include a source")
    }

    // Check if source trustworthiness is selected
    if (hasReliableSources === null) {
      errors.push('Select one')
    }

    return errors
  }, [selectedReasons, noteText, noteTextLength, hasReliableSources])

  const isFormValid = validationErrors.length === 0

  const handleClose = () => {
    setHasAttemptedSubmit(false)
  }

  const handleRefresh = () => {
    // Invalidate the notes query to refresh the list
    queryClient.invalidateQueries({
      queryKey: RQKEY(postUri),
    })
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    setHasAttemptedSubmit(true)

    // If form is invalid, don't proceed with submission
    if (!isFormValid) {
      return
    }

    setIsSubmitting(true)
    setSubmissionError('')

    try {
      const response = await apilib.createProposal(
        agent,
        postUri,
        noteText,
        selectedReasons,
      )

      console.log('Note created successfully:', response)

      // Store the note URI and create note object for the success dialog
      setSubmittedNoteUri(response.uri)
      const noteObj = apilib.mapProposalApiResponseToCommunityNote(response.proposal)
      setSubmittedNote(noteObj)

      // Clear form and close dialog
      setSelectedReasons([])
      setNoteText('')
      setHasReliableSources(null)
      setHasAttemptedSubmit(false)
      control.close()

      // Open success dialog with note URI
      submittedDialogControl.open()
    } catch (error) {
      console.error('Failed to create note:', error)
      if (error instanceof Error) {
        setSubmissionError(error.message)
      } else {
        setSubmissionError('Failed to submit note. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog.Outer control={control} onClose={handleClose}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={_(msg`Add a note`)}>
          <Dialog.Close />
          <View style={[a.flex_1]}>
            {/* Header */}
            <View style={[a.pb_lg]}>
              <Text style={[a.text_xl, a.font_bold, a.text_center]}>
                Add a note
              </Text>
            </View>

            <ScrollView style={[a.flex_1]} showsVerticalScrollIndicator={false}>
              {/* Post Preview Section */}
              {post && (
                <View
                  style={[
                    a.p_md,
                    a.mb_lg,
                    a.border,
                    a.rounded_md,
                    {
                      borderStyle: 'dashed',
                      backgroundColor: t.palette.contrast_25,
                      borderColor: t.palette.contrast_200,
                    },
                  ]}>
                  <Text style={[a.font_bold, a.mb_md]}>
                    Post to add note to:
                  </Text>
                  <Post post={post} />
                </View>
              )}

              {/* Reasons Section */}
              <View style={[a.mb_lg]}>
                <Text style={[a.font_bold, a.mb_md, {fontSize: 15}]}>
                  Why do you believe this post may be misleading?
                </Text>
                <Toggle.Group
                  type="checkbox"
                  values={selectedReasons}
                  onChange={setSelectedReasons}
                  label="Misleading reasons">
                  {REASONS.map(reason => (
                    <Toggle.Item
                      key={reason.key}
                      name={reason.key}
                      label={reason.label}
                      style={[a.flex_row, a.align_center, a.py_sm]}>
                      <Toggle.LabelText style={[a.flex_1, {fontSize: 15}]}>
                        {reason.label}
                      </Toggle.LabelText>
                      <Toggle.Checkbox />
                    </Toggle.Item>
                  ))}
                </Toggle.Group>
                {hasAttemptedSubmit && selectedReasons.length === 0 && (
                  <ValidationWarning message="Select at least one" />
                )}
              </View>

              {/* Note Writing Section */}
              <View style={[a.mb_lg]}>
                <Text style={[a.font_bold, a.mb_sm, {fontSize: 15}]}>
                  Write a note with context that you believe should be shown
                  with the post to keep others informed.
                </Text>
                <Button
                  variant="ghost"
                  size="small"
                  label={_(msg`See examples`)}
                  style={[a.self_start, a.mb_md]}
                  onPress={() => {
                    // TODO: Show examples
                  }}>
                  <ButtonText style={[{color: t.palette.primary_500}]}>
                    See examples
                  </ButtonText>
                </Button>

                <View style={[a.relative]}>
                  <TextField.Root
                    isInvalid={
                      hasAttemptedSubmit &&
                      (noteText.trim().length === 0 ||
                        noteTextLength > COMMUNITY_NOTES_MAX_LENGTH ||
                        (noteText.trim().length > 0 && !hasValidUrls(noteText)))
                    }>
                    <TextField.Input
                      label="Your explanation"
                      placeholder="Your explanation"
                      value={noteText}
                      onChangeText={setNoteText}
                      multiline
                      style={[{minHeight: 120}]}
                      accessibilityLabel="Note text input"
                      accessibilityHint="Enter your explanation for why this post needs context"
                    />
                  </TextField.Root>

                  {/* Character counter in top-right */}
                  <View style={[a.absolute, {top: 8, right: 12}]}>
                    <CharProgress
                      count={noteTextLength}
                      max={COMMUNITY_NOTES_MAX_LENGTH}
                      size={20}
                    />
                  </View>
                </View>

                <Text
                  style={[
                    a.mt_sm,
                    {fontSize: 13, color: t.palette.contrast_600},
                  ]}>
                  Be precise — providing links to outside sources is required.
                </Text>
                {hasAttemptedSubmit && noteText.trim().length === 0 && (
                  <ValidationWarning message="Enter an explanation" />
                )}
                {hasAttemptedSubmit &&
                  noteTextLength > COMMUNITY_NOTES_MAX_LENGTH && (
                    <ValidationWarning message="Note is too long" />
                  )}
                {hasAttemptedSubmit &&
                  noteText.trim().length > 0 &&
                  noteTextLength <= COMMUNITY_NOTES_MAX_LENGTH &&
                  !hasValidUrls(noteText) && (
                    <ValidationWarning message="Your note doesn't include a source" />
                  )}
              </View>

              {/* Source Verification Section */}
              <View style={[a.mb_lg]}>
                <Text style={[a.font_bold, a.mb_md, {fontSize: 15}]}>
                  Did you link to sources you believe most people would consider
                  trustworthy?
                </Text>
                <Toggle.Group
                  type="radio"
                  values={hasReliableSources ? [hasReliableSources] : []}
                  onChange={values => {
                    setHasReliableSources(values[0] as 'yes' | 'no' | null)
                  }}
                  label="Source trustworthiness">
                  <Toggle.Item
                    name="yes"
                    label="Yes"
                    style={[a.flex_row, a.align_center, a.py_sm]}>
                    <Toggle.LabelText style={[a.flex_1, {fontSize: 15}]}>
                      Yes
                    </Toggle.LabelText>
                    <Toggle.Radio />
                  </Toggle.Item>
                  <Toggle.Item
                    name="no"
                    label="No"
                    style={[a.flex_row, a.align_center, a.py_sm]}>
                    <Toggle.LabelText style={[a.flex_1, {fontSize: 15}]}>
                      No
                    </Toggle.LabelText>
                    <Toggle.Radio />
                  </Toggle.Item>
                </Toggle.Group>
                {hasAttemptedSubmit && hasReliableSources === null && (
                  <ValidationWarning message="Select one" />
                )}
              </View>

              {/* Author Attribution Section */}
              <View
                style={[
                  a.p_md,
                  a.mb_lg,
                  a.rounded_md,
                  {backgroundColor: t.palette.primary_25},
                ]}>
                <View style={[a.flex_row, a.align_center, a.mb_xs]}>
                  <PersonIcon size="sm" style={[a.mr_sm]} />
                  <Text style={[a.font_bold]}>Note Authors are Anonymous</Text>
                </View>
                <Text style={[{fontSize: 13, color: t.palette.contrast_600}]}>
                  Your note will be published using your Community Notes alias,
                  without connections to your Bluesky profile.
                </Text>
              </View>

              {/* Error Message Section */}
              {submissionError && (
                <View style={[a.w_full, a.mb_lg]}>
                  <Admonition type="error">
                    <Trans>{submissionError}</Trans>
                  </Admonition>
                </View>
              )}

              {/* Submit Button */}
              <Button
                variant="solid"
                color="primary"
                label={_(msg`Submit note`)}
                disabled={isSubmitting}
                style={[
                  a.w_full,
                  {
                    borderRadius: 20,
                    paddingVertical: 12,
                  },
                ]}
                onPress={handleSubmit}>
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ButtonText>Submit</ButtonText>
                )}
              </Button>
            </ScrollView>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>

      <NoteSubmittedDialog
        control={submittedDialogControl}
        noteUri={submittedNoteUri}
        note={submittedNote}
        onRefresh={handleRefresh}
      />
    </>
  )
}
