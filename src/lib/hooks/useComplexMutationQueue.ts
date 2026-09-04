import {useCallback, useEffect, useRef, useState} from 'react'

type Task<TState> = {
  state: TState
  resolve: (serverState: TState) => void
  reject: (e: unknown) => void
}

type TaskQueue<TState> = {
  activeTask: Task<TState> | null
  queuedTask: Task<TState> | null
}

function AbortError() {
  const e = new Error()
  e.name = 'AbortError'
  return e
}

export function useComplexMutationQueue<TState>({
  initialState,
  runMutation,
  onSuccess,
}: {
  initialState: TState
  runMutation: (prevState: TState, nextState: TState) => Promise<TState>
  onSuccess: (finalState: TState) => void
}) {
  // We use the queue as a mutable object.
  // This is safe because it is not used for rendering.
  const [queue] = useState<TaskQueue<TState>>({
    activeTask: null,
    queuedTask: null,
  })

  async function processQueue() {
    if (queue.activeTask) {
      // There is another active processQueue call iterating over tasks.
      // It will handle any newly added tasks, so we should exit early.
      return
    }
    // To avoid relying on the rendered state, capture it once at the start.
    // From that point on, and until the queue is drained, we'll use the real server state.
    let confirmedState: TState = initialState
    try {
      while (queue.queuedTask) {
        const prevTask = queue.activeTask
        const nextTask = queue.queuedTask
        queue.activeTask = nextTask
        queue.queuedTask = null

        // Skip if the new state is identical to the previous state
        if (
          prevTask &&
          JSON.stringify(prevTask.state) === JSON.stringify(nextTask.state)
        ) {
          prevTask.reject(new (AbortError as any)())
          continue
        }

        try {
          // The state received from the server feeds into the next task.
          // This lets us queue operations on not-yet-created resources.
          confirmedState = await runMutation(confirmedState, nextTask.state)
          nextTask.resolve(confirmedState)
        } catch (e) {
          nextTask.reject(e)
        }
      }
    } finally {
      onSuccess(confirmedState)
      queue.activeTask = null
      queue.queuedTask = null
    }
  }

  function queueState(state: TState): Promise<TState> {
    return new Promise((resolve, reject) => {
      // Replace any existing queued task with the new one
      if (queue.queuedTask) {
        queue.queuedTask.reject(new (AbortError as any)())
      }
      queue.queuedTask = {state, resolve, reject}
      processQueue()
    })
  }

  const queueStateRef = useRef(queueState)
  useEffect(() => {
    queueStateRef.current = queueState
  })
  const queueStateStable = useCallback((state: TState): Promise<TState> => {
    const queueStateLatest = queueStateRef.current
    return queueStateLatest(state)
  }, [])
  return queueStateStable
}
