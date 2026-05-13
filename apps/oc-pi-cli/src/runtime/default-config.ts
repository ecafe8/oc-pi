import type { GoalToDocsStageContract } from '@/planning/goal-to-docs/types.js'
import type { RoleConfig, SlotDefinition } from '@/shared/types/artifacts.js'
import { createWorkbenchState } from '@/workbench/state.js'
import type { WorkbenchState } from '@/workbench/types.js'

export const DEFAULT_ROLE_CONFIGS: RoleConfig[] = [
  {
    roleId: 'goal-planner',
    name: 'Goal Planner',
    provider: 'github-copilot',
    model: 'copilot-chat-model',
    responsibility: '负责目标定型与产品目标草案生成',
    outputTarget: 'product-goal',
    reviewBy: 'goal-reviewer',
  },
  {
    roleId: 'goal-reviewer',
    name: 'Goal Reviewer',
    provider: 'github-copilot',
    model: 'copilot-chat-model',
    responsibility: '负责审查产品目标草案的范围、表达与一致性',
    outputTarget: 'review-notes',
  },
  {
    roleId: 'doc-writer',
    name: 'Doc Writer',
    provider: 'github-copilot',
    model: 'copilot-chat-model',
    responsibility: '负责规划文档编写',
    outputTarget: 'feature-plan',
    reviewBy: 'doc-reviewer',
  },
  {
    roleId: 'doc-reviewer',
    name: 'Doc Reviewer',
    provider: 'github-copilot',
    model: 'copilot-chat-model',
    responsibility: '负责规划文档审查',
    outputTarget: 'review-notes',
  },
  {
    roleId: 'code-writer',
    name: 'Code Writer',
    provider: 'github-copilot',
    model: 'copilot-chat-model',
    responsibility: '负责代码实现',
    outputTarget: 'implementation-code',
    reviewBy: 'code-reviewer',
  },
  {
    roleId: 'code-reviewer',
    name: 'Code Reviewer',
    provider: 'github-copilot',
    model: 'copilot-chat-model',
    responsibility: '负责代码审查',
    outputTarget: 'review-notes',
  },
]

export const DEFAULT_SLOT_DEFINITIONS: SlotDefinition[] = [
  {
    slotId: 'product-goal',
    name: 'Product Goal',
    description: '产品目标文档落点',
    kind: 'docs',
    defaultPath: 'apps/web-docs/content/docs/product/vision.md',
  },
  {
    slotId: 'capability-map',
    name: 'Capability Map',
    description: '能力拆解文档落点',
    kind: 'docs',
    defaultPath: 'apps/web-docs/content/docs/capabilities/overview.mdx',
  },
  {
    slotId: 'feature-plan',
    name: 'Feature Plan',
    description: '功能规划文档落点',
    kind: 'docs',
    defaultPath: 'apps/web-docs/content/docs/planning/mvp-features.md',
  },
  {
    slotId: 'mvp-scope',
    name: 'MVP Scope',
    description: 'MVP 范围文档落点',
    kind: 'docs',
    defaultPath: 'apps/web-docs/content/docs/planning/mvp-features.md',
  },
  {
    slotId: 'next-summary',
    name: 'Next Summary',
    description: '下一步摘要落点',
    kind: 'status',
    defaultPath: 'apps/web-docs/content/docs/tasks/next-up.md',
  },
  {
    slotId: 'review-notes',
    name: 'Review Notes',
    description: '审查结果落点',
    kind: 'review',
    defaultPath: 'apps/web-docs/content/docs/tasks/review-notes.md',
  },
  {
    slotId: 'implementation-code',
    name: 'Implementation Code',
    description: '代码实现落点',
    kind: 'code',
    defaultPath: 'apps/web-docs/content/docs/tasks/implementation-code.md',
  },
  {
    slotId: 'progress-status',
    name: 'Progress Status',
    description: '进度状态落点',
    kind: 'status',
    defaultPath: 'apps/web-docs/content/docs/tasks/progress-status.md',
  },
]

export const DEFAULT_GOAL_TO_DOCS_STAGES: GoalToDocsStageContract[] = [
  {
    stageId: 'goal-framing',
    name: 'Goal Framing',
    inputArtifacts: ['user-goal'],
    primaryOutputSlot: 'product-goal',
    writerRoleId: 'goal-planner',
    reviewerRoleId: 'goal-reviewer',
    reviewRequired: true,
    completionRule: 'accepted',
  },
  {
    stageId: 'capability-breakdown',
    name: 'Capability Breakdown',
    inputArtifacts: ['product-goal'],
    primaryOutputSlot: 'capability-map',
    writerRoleId: 'goal-planner',
    reviewerRoleId: 'goal-reviewer',
    reviewRequired: true,
    completionRule: 'accepted',
  },
  {
    stageId: 'feature-planning',
    name: 'Feature Planning',
    inputArtifacts: ['capability-map'],
    primaryOutputSlot: 'feature-plan',
    additionalOutputSlots: ['mvp-scope'],
    writerRoleId: 'doc-writer',
    reviewerRoleId: 'doc-reviewer',
    reviewRequired: true,
    completionRule: 'accepted',
  },
  {
    stageId: 'handoff-summary',
    name: 'Handoff Summary',
    inputArtifacts: ['feature-plan', 'mvp-scope'],
    primaryOutputSlot: 'next-summary',
    writerRoleId: 'doc-writer',
    reviewerRoleId: 'doc-reviewer',
    reviewRequired: true,
    completionRule: 'accepted',
  },
]

export function createDefaultWorkbenchState(
  workspacePath: string,
): WorkbenchState {
  return createWorkbenchState({
    workspacePath,
    mode: 'planning',
    currentStageId: 'goal-framing',
    currentStageStatus: 'pending',
    activeRoleId: 'goal-planner',
    activeOutputTarget: 'product-goal',
  })
}
