import {useState} from 'react'
import {ScrollView, TextInput, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePostQuery} from '#/state/queries/post'
import {Post} from '#/view/com/post/Post'
import {atoms as a, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonText} from '#/components/Button'
import {NoteSubmittedDialog} from '#/components/CommunityNotes/NoteSubmittedDialog'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
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

interface WriteNoteDialogProps {
  control: Dialog.DialogOuterProps['control']
  postUri: string
}

export function WriteNoteDialog({control, postUri}: WriteNoteDialogProps) {
  const t = useTheme()
  const {_} = useLingui()
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [noteText, setNoteText] = useState('')
  const [hasReliableSources, setHasReliableSources] = useState<
    'yes' | 'no' | null
  >(null)
  const [submissionError, _setSubmissionError] = useState<string>(
    'There was an error submitting your note. Please try again later.',
  )

  const {data: post} = usePostQuery(postUri)
  const submittedDialogControl = Dialog.useDialogControl()

  const handleSubmit = () => {
    // TODO: Implement note submission
    console.log('Submitting note:', {
      postUri,
      reasons: selectedReasons,
      noteText,
      hasReliableSources,
    })
    control.close()
    submittedDialogControl.open()
  }

  return (
    <>
      <Dialog.Outer control={control}>
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
                <TextInput
                  style={[
                    a.border,
                    a.rounded_md,
                    a.p_md,
                    {
                      borderColor: t.palette.contrast_200,
                      backgroundColor: t.palette.white,
                      minHeight: 120,
                      textAlignVertical: 'top',
                      fontSize: 15,
                      color: t.palette.contrast_950,
                    },
                  ]}
                  placeholder="Your explanation"
                  placeholderTextColor={t.palette.contrast_400}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={6}
                  accessibilityLabel="Note text input"
                  accessibilityHint="Enter your explanation for why this post needs context"
                />
                <Text
                  style={[
                    a.mt_sm,
                    {fontSize: 13, color: t.palette.contrast_600},
                  ]}>
                  Be precise — providing links to outside sources is required.
                </Text>
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
                  <Text style={[a.font_bold]}>
                    Writing as Jovial Elm Seagull
                  </Text>
                </View>
                <Text style={[{fontSize: 13, color: t.palette.contrast_600}]}>
                  Your note will be published using your Community Notes alias,
                  without connections to your X profile.
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
                style={[
                  a.w_full,
                  {
                    borderRadius: 20,
                    paddingVertical: 12,
                  },
                ]}
                onPress={handleSubmit}>
                <ButtonText>Submit</ButtonText>
              </Button>
            </ScrollView>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>

      <NoteSubmittedDialog
        control={submittedDialogControl}
        onSeeNote={() => {
          // TODO: Navigate to the submitted note
          console.log('Navigate to submitted note')
        }}
      />
    </>
  )
}
