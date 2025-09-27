import {type AppBskyFeedDefs} from '@atproto/api'

interface DebugLabelsProps {
  post: AppBskyFeedDefs.PostView
}

export function DebugLabels({post: _post}: DebugLabelsProps) {
  // Temporarily disabled to prevent iOS rendering issues
  return null
}
