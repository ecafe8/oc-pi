import { ProcessTerminal, TUI, matchesKey } from '@earendil-works/pi-tui'

import { createDefaultWorkbenchState } from '@/runtime/default-config.js'
import { FileRuntimeSessionStore } from '@/runtime/session-store.js'
import { handleGoalNew } from '@/workbench/controller/index.js'
import { WorkbenchRootView } from '@/workbench/views/index.js'

export interface StartWorkbenchOptions {
  workspacePath: string
}

export async function startWorkbench(options: StartWorkbenchOptions): Promise<void> {
  const sessionStore = new FileRuntimeSessionStore(options.workspacePath)
  const session = await sessionStore.read()
  let state = session?.workbenchState ?? createDefaultWorkbenchState(options.workspacePath)

  const terminal = new ProcessTerminal()
  const tui = new TUI(terminal)
  const rootView = new WorkbenchRootView({
    state,
    onSubmit: async (value) => {
      const trimmed = value.trim()

      if (trimmed.length === 0) {
        return
      }

      const next = handleGoalNew({
        state,
        goal: trimmed,
      })

      state = next.state
      rootView.setState(state)
      tui.requestRender(true)

      await sessionStore.write({
        workbenchState: state,
        latestRun: session?.latestRun,
      })
    },
  })

  tui.addChild(rootView)
  tui.setFocus(rootView)
  tui.addInputListener((data) => {
    if (matchesKey(data, 'ctrl+c')) {
      tui.stop()
      process.exit(0)
    }

    return undefined
  })
  tui.start()
}
