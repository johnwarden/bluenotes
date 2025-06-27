import {useMemo, useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {RichText as RichTextAPI} from '@atproto/api'
import {type MessageDescriptor} from '@lingui/core'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {usePalette} from '#/lib/hooks/usePalette'
import {type CommunityNote, submitVote} from '#/lib/mock-data/community-notes'
import {Button, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
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
  const pal = usePalette('default')
  const {_} = useLingui()
  const [voted, setVoted] = useState<Vote | null>(null)
  const [finalVoted, setFinalVoted] = useState<Vote | null>(null)
  const [reasons, setReasons] = useState<string[]>([])

  const richText = useMemo(
    () =>
      new RichTextAPI({
        text: note.text,
      }),
    [note.text],
  )

  const handleSelectVote = (vote: Vote) => {
    setVoted(vote)
  }

  const handleSubmit = async () => {
    if (!voted) return
    // using contributorId as a note ID for now
    await submitVote(note.contributorId, voted, reasons)
    setFinalVoted(voted)
  }

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
    <Button
      label={_(msg`Submit`)}
      onPress={handleSubmit}
      variant="solid"
      color="primary">
      <ButtonText>
        <Trans>Submit</Trans>
      </ButtonText>
    </Button>
  )

  const ReasonsGroup = ({
    title,
    reasons: reasonSet,
  }: {
    title: string
    reasons: {key: string; label: MessageDescriptor}[]
  }) => (
    <View style={styles.reasonsContainer}>
      <Text style={pal.text}>{title}</Text>
      <Toggle.Group
        type="checkbox"
        values={reasons}
        onChange={setReasons}
        label={title}>
        {reasonSet.map(reason => (
          <Toggle.Item
            key={reason.key}
            name={reason.key}
            label={_(reason.label)}>
            <Toggle.Checkbox />
            <Toggle.LabelText>{_(reason.label)}</Toggle.LabelText>
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

  if (finalVoted) {
    return (
      <View style={[pal.view, styles.card]}>
        <RichText value={richText} style={[pal.text]} />
        <Text style={pal.textLight}>
          <Trans>You rated this note as {getVoteText(finalVoted)}.</Trans>
        </Text>
      </View>
    )
  }

  return (
    <View style={[pal.view, styles.card]}>
      <RichText value={richText} style={[pal.text]} />
      <View style={styles.actions}>
        <Text style={[pal.text, styles.question]}>Is this note helpful?</Text>
        <Button
          variant="ghost"
          color="primary"
          label={_(msg`Rate as helpful`)}
          onPress={() => handleSelectVote('helpful')}
          style={[styles.button, voted === 'helpful' && styles.selected]}>
          <ButtonText>{_(msg`Yes`)}</ButtonText>
        </Button>
        <Button
          variant="ghost"
          color="primary"
          label={_(msg`Rate as somewhat helpful`)}
          onPress={() => handleSelectVote('somewhat_helpful')}
          style={[
            styles.button,
            voted === 'somewhat_helpful' && styles.selected,
          ]}>
          <ButtonText>{_(msg`Somewhat`)}</ButtonText>
        </Button>
        <Button
          variant="ghost"
          color="primary"
          label={_(msg`Rate as not helpful`)}
          onPress={() => handleSelectVote('not_helpful')}
          style={[styles.button, voted === 'not_helpful' && styles.selected]}>
          <ButtonText>{_(msg`No`)}</ButtonText>
        </Button>
      </View>
      {voted && renderReasons()}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: 'gray',
  },
  text: {
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  question: {
    marginRight: 'auto',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
  },
  selected: {
    backgroundColor: '#0085ff',
  },
  reasonsContainer: {
    marginTop: 10,
  },
})
