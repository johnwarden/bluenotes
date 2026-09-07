export interface CommunityNoteSubjectRef {
  uri: string
  cid?: string
}

export interface NoteAuthor {
  aid: string
  pseudonym: string
  writingImpact: number
  ratingImpact: number
  profileUrl: string
}

export interface CommunityNote {
  $type: 'social.pmsky.proposal'
  typ: 'label'
  subject: CommunityNoteSubjectRef
  label: string
  text: string
  createdAt: string
  noteId: string
  status: 'needs_more_ratings' | 'rated_helpful' | 'rated_not_helpful'
  uri: string
  author: NoteAuthor
}

export interface NoteRatingState {
  uri?: string
  val: 'helpful' | 'somewhat_helpful' | 'not_helpful' | null
  reasons: string[]
}
