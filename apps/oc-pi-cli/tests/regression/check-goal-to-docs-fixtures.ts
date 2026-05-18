import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface GoalStageResult {
  stageId: string;
  reviewStatus: "accepted" | "changes-requested";
  logicalArtifactPath: string;
  artifactDetails: Array<{
    slotId: string;
    logicalArtifactPath: string;
    wroteArtifact: boolean;
    reviewStatus: "accepted" | "changes-requested";
  }>;
}

interface GoalCommandResult {
  command: "goal.new";
  mode: "preview" | "sandbox-write" | "write";
  acceptedGoal: string;
  stages: GoalStageResult[];
  wroteArtifact: boolean;
  blockedByRealWriteGuard: boolean;
  latestReviewStatus: "accepted" | "changes-requested";
  latestReviewSummary: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, "..", "..");
const fixtureRoot = join(appRoot, "tests", "fixtures", "goal-to-docs");

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command === "preview-stable") {
    await runPreviewStableCheck();
    return;
  }

  if (command === "preview-adversarial") {
    await runPreviewAdversarialCheck();
    return;
  }

  if (command === "preview") {
    await runPreviewChecks();
    return;
  }

  if (command === "sandbox-stable") {
    await runSandboxStableCheck();
    return;
  }

  if (command === "sandbox") {
    await runSandboxChecks();
    return;
  }

  throw new Error(
    "Unsupported command. Expected: preview-stable, preview-adversarial, preview, sandbox-stable, or sandbox",
  );
}

async function runPreviewChecks(): Promise<void> {
  await runPreviewStableCheck();
  await runPreviewAdversarialCheck();
}

async function runPreviewStableCheck(): Promise<void> {
  const stableGoal = await readFixture("stable-goal.txt");
  const stableResult = await runGoalCommand(stableGoal);
  assertStageAccepted(stableResult, "capability-breakdown");
  assertStageAccepted(stableResult, "feature-planning");
  assertStageAccepted(stableResult, "handoff-summary");

  console.log("preview stable check passed: stable fixture accepted through Stage 4");
}

async function runPreviewAdversarialCheck(): Promise<void> {
  const adversarialGoal = await readFixture("adversarial-goal.txt");
  const adversarialResult = await runGoalCommand(adversarialGoal);
  const blockedStage = adversarialResult.stages.find((stage) => stage.reviewStatus !== "accepted");

  if (!blockedStage) {
    throw new Error("Adversarial fixture unexpectedly passed all stages.");
  }

  if (!["capability-breakdown", "feature-planning", "handoff-summary"].includes(blockedStage.stageId)) {
    throw new Error(`Adversarial fixture failed in unexpected stage: ${blockedStage.stageId}`);
  }

  console.log(`preview adversarial check passed: adversarial fixture blocked at ${blockedStage.stageId}`);
}

async function runSandboxChecks(): Promise<void> {
  await runSandboxStableCheck();
}

async function runSandboxStableCheck(): Promise<void> {
  const stableGoal = await readFixture("stable-goal.txt");
  const stableResult = await runGoalCommand(stableGoal, "--write");

  if (stableResult.mode !== "sandbox-write") {
    throw new Error(`Expected sandbox-write mode, got ${stableResult.mode}`);
  }

  assertStageAccepted(stableResult, "capability-breakdown");
  assertStageAccepted(stableResult, "feature-planning");
  assertStageAccepted(stableResult, "handoff-summary");

  const wroteOutsideSandbox = stableResult.stages
    .flatMap((stage) => stage.artifactDetails)
    .some(
      (artifact) =>
        artifact.wroteArtifact && artifact.logicalArtifactPath.startsWith("apps/web-docs/content/docs/") === false,
    );

  if (wroteOutsideSandbox) {
    throw new Error("Sandbox fixture reported unexpected non-docs artifact write.");
  }

  const wroteArtifacts = stableResult.stages
    .flatMap((stage) => stage.artifactDetails)
    .filter((artifact) => artifact.wroteArtifact);

  if (wroteArtifacts.length === 0) {
    throw new Error("Sandbox fixture did not report any written artifacts.");
  }

  console.log(`sandbox stable check passed: ${wroteArtifacts.length} artifact writes reported in sandbox mode`);
}

async function readFixture(fileName: string): Promise<string> {
  const content = await readFile(join(fixtureRoot, fileName), "utf8");
  return content.trim();
}

async function runGoalCommand(goal: string, modeFlag?: "--write"): Promise<GoalCommandResult> {
  const args = ["bun", "run", "src/index.ts", "goal", "new"];

  if (modeFlag) {
    args.push(modeFlag);
  }

  args.push(goal);

  const processResult = Bun.spawn(args, {
    cwd: appRoot,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(processResult.stdout).text();
  const stderr = await new Response(processResult.stderr).text();
  const exitCode = await processResult.exited;

  if (exitCode !== 0) {
    throw new Error(`goal command failed with exit code ${exitCode}\n${stderr}`);
  }

  return JSON.parse(stdout) as GoalCommandResult;
}

function assertStageAccepted(result: GoalCommandResult, stageId: string): void {
  const stage = result.stages.find((item) => item.stageId === stageId);

  if (!stage) {
    throw new Error(`Missing stage result for ${stageId}`);
  }

  if (stage.reviewStatus !== "accepted") {
    throw new Error(`Expected ${stageId} to be accepted, got ${stage.reviewStatus}`);
  }
}

await main();
