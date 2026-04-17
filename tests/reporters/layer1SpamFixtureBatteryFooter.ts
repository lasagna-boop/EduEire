import type { Reporter, RunnerTask, RunnerTestFile } from "vitest/node";

const EXPECTED_CASES = 40;

/** Exact Vitest file names so v1 and v2 fixture suites do not share one ambiguous match. */
const FOOTER_TARGETS = [
  "moderationSpamScoreLayer1Fixture.test.ts",
  "moderationSpamScoreLayer1FixtureV2.test.ts",
] as const;

function countLeafTests(task: RunnerTask, acc: { pass: number; fail: number; skip: number }) {
  const kind = task.type as string;
  if (kind === "test" || kind === "custom") {
    const state = task.result?.state;
    if (state === "pass") acc.pass += 1;
    else if (state === "fail") acc.fail += 1;
    else if (state === "skip") acc.skip += 1;
    return;
  }
  if (task.type === "suite" && task.tasks) {
    for (const t of task.tasks) countLeafTests(t, acc);
  }
}

/**
 * Prints one footer line after Vitest’s summary for the 40-case Layer-1 fixture file.
 */
export default class Layer1SpamFixtureBatteryFooter implements Reporter {
  onFinished(files: RunnerTestFile[]) {
    for (const suffix of FOOTER_TARGETS) {
      const file = files.find((f) => {
        const path = f.filepath ?? f.name ?? "";
        return typeof path === "string" && path.endsWith(suffix);
      });
      if (!file) continue;

      const acc = { pass: 0, fail: 0, skip: 0 };
      for (const t of file.tasks) countLeafTests(t, acc);

      const ran = acc.pass + acc.fail + acc.skip;
      const tail =
        ran !== EXPECTED_CASES ? ` (${ran} tests executed in file)` : "";
      const skipNote = acc.skip > 0 ? `; ${acc.skip} skipped` : "";

      console.log(
        `\n[Layer-1 spam fixture] ${acc.pass} passed; ${acc.fail} failed out of ${EXPECTED_CASES} cases${skipNote}${tail}.`
      );
    }
  }
}
