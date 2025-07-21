import {useEffect, useMemo, useState} from 'react'
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native'
import {RichText as RichTextAPI} from '@atproto/api'
import {type MessageDescriptor} from '@lingui/core'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {type CommunityNote} from '#/lib/mock-data/community-notes'
import {
  type NoteRatingState,
  useNoteShadow,
} from '#/state/cache/community-notes-shadow'
import {useNoteRatingMutationQueue} from '#/state/queries/community-notes'
import {useRequireAuth} from '#/state/session'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import * as Toast from '#/view/com/util/Toast'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {NoteDetailsDialog} from '#/components/CommunityNotes/NoteDetailsDialog'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/EyeSlash'
import {Pencil_Stroke2_Corner0_Rounded as PencilIcon} from '#/components/icons/Pencil'
import {RatedCheckmark} from '#/components/icons/RatedCheckmark'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import * as Menu from '#/components/Menu'
import {MenuTriggerButton} from '#/components/Menu/MenuTriggerButton'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'

const HELPFUL_REASONS = [
  {key: 'cites_good_sources', label: msg`Cites high-quality sources`},
  {key: 'is_clear', label: msg`Easy to understand`},
  {key: 'addresses_claim', label: msg`Directly addresses the post's claim`},
  {key: 'provides_important_context', label: msg`Provides important context`},
  {key: 'is_unbiased', label: msg`Neutral or unbiased language`},
  {key: 'other', label: msg`Other`},
]

const NOT_HELPFUL_REASONS = [
  {
    key: 'sources_missing_or_unreliable',
    label: msg`Sources not included or unreliable`,
  },
  {key: 'sources_dont_support_note', label: msg`Sources do not support note`},
  {key: 'is_incorrect', label: msg`Incorrect information`},
  {key: 'is_opinion_or_speculation', label: msg`Opinion or speculation`},
  {key: 'is_hard_to_understand', label: msg`Typos or unclear language`},
  {
    key: 'is_off_topic_or_irrelevant',
    label: msg`Misses key points or irrelevant`,
  },
  {
    key: 'is_argumentative_or_biased',
    label: msg`Argumentative or biased language`,
  },
  {key: 'note_not_needed', label: msg`Note not needed on this post`},
  {key: 'is_spam_harassment_or_abuse', label: msg`Spam, harassment, or abuse`},
  {key: 'other', label: msg`Other`},
]

type Vote = 'helpful' | 'somewhat_helpful' | 'not_helpful'

export function NoteCard({note}: {note: CommunityNote}) {
  const t = useTheme()
  const {_} = useLingui()
  const requireAuth = useRequireAuth()
  const noteWithShadow = useNoteShadow(note)
  const submitRating = useNoteRatingMutationQueue(note)

  // Local UI state for rating selection (before submission)
  const [voted, setVoted] = useState<Vote | null>(null)
  const [reasons, setReasons] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const noteDetailsControl = Dialog.useDialogControl()

  // Get the current rating state from the shadow cache
  const currentRating = noteWithShadow.viewer?.rating
  const hasSubmittedRating = currentRating && currentRating.val !== null

  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: note.text,
      }),
    [note.text],
  )

  // Only populate form when explicitly editing
  useEffect(() => {
    if (isEditing && currentRating) {
      setVoted(currentRating.val as Vote)
      setReasons(currentRating.reasons || [])
    }
  }, [isEditing, currentRating])

  const handleSelectVote = (vote: Vote) => {
    setVoted(vote)
  }

  const handleSubmit = () => {
    requireAuth(async () => {
      if (!voted) return

      setIsSubmitting(true)
      try {
        const newRatingState: NoteRatingState = {
          uri: currentRating?.uri, // Preserve existing URI for updates
          val: voted,
          reasons: reasons,
        }

        await submitRating(newRatingState)

        // Clear the local UI state after successful submission
        setVoted(null)
        setReasons([])
        setIsEditing(false)
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          Toast.show(_(msg`Failed to submit your rating. Please try again.`))
        }
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  const handleDelete = () => {
    requireAuth(async () => {
      setIsSubmitting(true)
      try {
        const deleteRatingState: NoteRatingState = {
          uri: currentRating?.uri,
          val: null,
          reasons: [],
        }

        await submitRating(deleteRatingState)

        // Clear local state
        setVoted(null)
        setReasons([])
        setIsEditing(false)
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          Toast.show(_(msg`Failed to delete your rating. Please try again.`))
        }
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  const handleEdit = () => {
    // Enter editing mode
    setIsEditing(true)
  }

  // Determine what UI to show
  const shouldShowRatingForm =
    !hasSubmittedRating || isEditing || voted !== null

  const renderReasons = () => {
    return (
      <View style={styles.reasonsContainer}>
        {(voted === 'helpful' || voted === 'somewhat_helpful') && (
          <ReasonsGroup
            title={_(msg`What was helpful about it?`)}
            reasons={HELPFUL_REASONS}
          />
        )}
        {(voted === 'not_helpful' || voted === 'somewhat_helpful') && (
          <ReasonsGroup
            title={_(msg`What was unhelpful about it?`)}
            reasons={NOT_HELPFUL_REASONS}
          />
        )}
        <SubmitButton />
      </View>
    )
  }

  const SubmitButton = () => (
    <View style={styles.submitButtonContainer}>
      <Button
        label={_(msg`Submit`)}
        onPress={handleSubmit}
        variant="ghost"
        disabled={isSubmitting}
        style={styles.submitButton}>
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <ButtonText style={styles.submitButtonText}>
            <Trans>Submit</Trans>
          </ButtonText>
        )}
      </Button>
    </View>
  )

  const ReasonsGroup = ({
    title,
    reasons: reasonSet,
  }: {
    title: string
    reasons: {key: string; label: MessageDescriptor}[]
  }) => (
    <View style={styles.reasonsGroup}>
      <Text style={styles.reasonsGroupTitle}>{title}</Text>
      <Toggle.Group
        type="checkbox"
        values={reasons}
        onChange={setReasons}
        label={title}>
        {reasonSet.map(reason => (
          <Toggle.Item
            key={reason.key}
            name={reason.key}
            label={_(reason.label)}
            style={styles.reasonItem}>
            <Toggle.LabelText style={{fontSize: 15, fontWeight: 'normal'}}>
              {_(reason.label)}
            </Toggle.LabelText>
            <Toggle.Checkbox />
          </Toggle.Item>
        ))}
      </Toggle.Group>
    </View>
  )

  const getVoteText = (vote: Vote | null) => {
    if (vote === 'helpful') return _(msg`Helpful`)
    if (vote === 'somewhat_helpful') return _(msg`Somewhat Helpful`)
    if (vote === 'not_helpful') return _(msg`Not Helpful`)
    return ''
  }

  const styles = StyleSheet.create({
    card: {
      padding: 0,
      margin: 12,
    },
    text: {
      marginBottom: 10,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    question: {
      marginRight: 'auto',
      color: t.palette.contrast_950,
      fontSize: 15,
      fontWeight: 'bold',
    },
    button: {
      borderWidth: 1,
      borderColor: t.palette.contrast_200,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginLeft: 10,
    },
    selected: {
      backgroundColor: t.palette.primary_500,
      borderColor: t.palette.primary_500,
    },
    selectedButtonText: {
      color: t.palette.white,
    },
    unselectedButtonText: {
      color: t.palette.primary_500,
    },
    reasonsContainer: {
      marginTop: 10,
    },
    statusLineTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    needsRatingText: {
      fontWeight: 'bold',
      color: t.palette.contrast_950,
    },
    statusLineBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 4,
      paddingBottom: 4,
    },
    actionsBox: {
      backgroundColor: t.palette.contrast_25,
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    reasonsGroup: {
      paddingTop: 12,
    },
    reasonsGroupTitle: {
      color: t.palette.contrast_950,
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    reasonItem: {
      paddingVertical: 8,
      justifyContent: 'space-between',
    },
    submitButtonContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    submitButton: {
      backgroundColor: t.palette.primary_500,
      borderColor: t.palette.primary_500,
      borderWidth: 1,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    submitButtonText: {
      color: t.palette.white,
      fontWeight: 'bold',
    },
    votedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.palette.positive_25,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 10,
    },
    votedCheckmark: {
      marginRight: 12,
    },
    votedText: {
      flex: 1,
      color: t.palette.contrast_950,
      fontSize: 15,
    },
    votedTextBold: {
      fontWeight: 'bold',
    },
    menuItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    menuItemIcon: {
      width: 20,
      height: 20,
      marginRight: 12,
      color: t.palette.contrast_700,
    },
    menuItemIconDelete: {
      width: 20,
      height: 20,
      marginRight: 12,
      color: t.palette.negative_500,
    },
    menuItemTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: t.palette.contrast_700,
    },
    menuItemTitleDelete: {
      fontSize: 16,
      fontWeight: 'bold',
      color: t.palette.negative_500,
    },
  })

  return (
    <View style={[t.atoms.bg, styles.card, t.atoms.border_contrast_low]}>
      <View style={styles.statusLineTop}>
        <Text style={[t.atoms.text, styles.needsRatingText]}>
          <Trans>• Needs more ratings</Trans>
        </Text>
        <TimeElapsed timestamp={note.createdAt}>
          {({timeElapsed}) => (
            <Text style={t.atoms.text_contrast_low} title={timeElapsed}>
              {timeElapsed}
            </Text>
          )}
        </TimeElapsed>
        <Text style={t.atoms.text_contrast_low}>·</Text>
        <Pressable
          onPress={() => noteDetailsControl.open()}
          accessibilityLabel={_(msg`View Details`)}
          accessibilityHint="">
          <Text style={t.atoms.text_contrast_high}>
            <Trans>View details</Trans>
          </Text>
        </Pressable>
      </View>
      <View style={styles.statusLineBottom}>
        <EyeSlashIcon size="sm" style={t.atoms.text_contrast_low} />
        <Text style={t.atoms.text_contrast_low}>
          <Trans>Not shown on Bluesky</Trans>
        </Text>
      </View>

      <RichText value={richText} style={[t.atoms.text, {paddingTop: 4}]} />

      {shouldShowRatingForm ? (
        <View style={styles.actionsBox}>
          <View style={styles.actions}>
            <Text style={styles.question}>Is this note helpful?</Text>
            <Button
              variant="ghost"
              label={_(msg`Rate as helpful`)}
              onPress={() => handleSelectVote('helpful')}
              style={[styles.button, voted === 'helpful' && styles.selected]}>
              <ButtonText
                style={
                  voted === 'helpful'
                    ? styles.selectedButtonText
                    : styles.unselectedButtonText
                }>
                {_(msg`Yes`)}
              </ButtonText>
            </Button>
            <Button
              variant="ghost"
              label={_(msg`Rate as somewhat helpful`)}
              onPress={() => handleSelectVote('somewhat_helpful')}
              style={[
                styles.button,
                voted === 'somewhat_helpful' && styles.selected,
              ]}>
              <ButtonText
                style={
                  voted === 'somewhat_helpful'
                    ? styles.selectedButtonText
                    : styles.unselectedButtonText
                }>
                {_(msg`Somewhat`)}
              </ButtonText>
            </Button>
            <Button
              variant="ghost"
              label={_(msg`Rate as not helpful`)}
              onPress={() => handleSelectVote('not_helpful')}
              style={[
                styles.button,
                voted === 'not_helpful' && styles.selected,
              ]}>
              <ButtonText
                style={
                  voted === 'not_helpful'
                    ? styles.selectedButtonText
                    : styles.unselectedButtonText
                }>
                {_(msg`No`)}
              </ButtonText>
            </Button>
          </View>
          {voted && renderReasons()}
        </View>
      ) : (
        <Menu.Root>
          <View style={styles.votedContainer}>
            <RatedCheckmark size="sm" style={styles.votedCheckmark} />
            <Text style={styles.votedText}>
              <Trans>You rated this note as</Trans>{' '}
              <Text style={styles.votedTextBold}>
                {getVoteText(currentRating.val as Vote)}
              </Text>
              .
            </Text>
            <MenuTriggerButton label={_(msg`Rated note options menu`)} />
          </View>
          <Menu.Outer>
            <Menu.Group>
              <Menu.Item
                key="delete"
                label={_(msg`Delete rating`)}
                onPress={handleDelete}
                disabled={isSubmitting}
                style={styles.menuItem}>
                <TrashIcon size="sm" style={styles.menuItemIconDelete} />
                <Menu.ItemText style={styles.menuItemTitleDelete}>
                  <Trans>Delete</Trans>
                </Menu.ItemText>
              </Menu.Item>
              <Menu.Item
                key="edit"
                label={_(msg`Edit rating`)}
                onPress={handleEdit}
                disabled={isSubmitting}
                style={styles.menuItem}>
                <PencilIcon size="sm" style={styles.menuItemIcon} />
                <Menu.ItemText style={styles.menuItemTitle}>
                  <Trans>Edit</Trans>
                </Menu.ItemText>
              </Menu.Item>
            </Menu.Group>
          </Menu.Outer>
        </Menu.Root>
      )}
      <NoteDetailsDialog control={noteDetailsControl} note={note} />
    </View>
  )
}
