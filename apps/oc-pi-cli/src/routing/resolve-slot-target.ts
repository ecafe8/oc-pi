import type { ResolvedSlotTarget, SlotDefinition } from '@/shared/types/artifacts.js'
import type { SlotId, WriteMode } from '@/shared/types/core.js'

export interface ResolveSlotTargetInput {
  slotDefinitions: SlotDefinition[]
  slotId: SlotId
  writeMode?: WriteMode
}

export function resolveSlotTarget(
  input: ResolveSlotTargetInput,
): ResolvedSlotTarget {
  const slot = input.slotDefinitions.find(
    (slotDefinition) => slotDefinition.slotId === input.slotId,
  )

  if (!slot) {
    throw new Error(`Unknown slot definition: ${input.slotId}`)
  }

  return {
    slotId: slot.slotId,
    kind: slot.kind,
    path: slot.defaultPath,
    writeMode: input.writeMode ?? 'overwrite',
  }
}
