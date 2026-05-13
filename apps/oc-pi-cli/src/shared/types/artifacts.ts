import type { RoleId, SlotId, SlotKind, WriteMode } from "@/shared/types/core.js";

export interface RoleConfig {
  roleId: RoleId;
  name: string;
  provider: string;
  model: string;
  responsibility: string;
  outputTarget: SlotId;
  reviewBy?: RoleId;
}

export interface SlotDefinition {
  slotId: SlotId;
  name: string;
  description: string;
  kind: SlotKind;
  defaultPath: string;
}

export interface ResolvedSlotTarget {
  slotId: SlotId;
  kind: SlotKind;
  path: string;
  writeMode: WriteMode;
}
