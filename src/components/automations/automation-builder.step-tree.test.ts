import { describe, expect, it } from "vitest";
import {
  insertAt,
  mapAtPath,
  type BuilderStep,
  type ParentScope,
  type StepPath,
} from "./automation-builder";

// Regression test for a bug where editing/moving/deleting a step nested
// inside a condition's "yes" or "no" branch silently no-opped: the path
// built for a branch child carried one segment too many, so mapAtPath
// always recursed one level past the target and never reached `updater`.

function condition(): BuilderStep {
  return {
    cid: "c_cond",
    step_type: "condition",
    step_config: { subject: "time_of_day" },
    branches: { yes: [], no: [] },
  };
}

function message(cid: string, text: string): BuilderStep {
  return { cid, step_type: "send_message", step_config: { text } };
}

// Path a step at `index` within `branch` of a root-level condition would
// receive from StepRenderer/ConditionBranches (see automation-builder.tsx).
function branchChildPath(condCid: string, branch: "yes" | "no", index: number): StepPath {
  return [{ kind: "root", index: 0 }, { kind: "branch", parentCid: condCid, branch, index }];
}

describe("condition branch step tree", () => {
  it("edits a step nested in the yes branch", () => {
    const parent: ParentScope = { kind: "branch", parentCid: "c_cond", branch: "yes" };
    let steps = [condition()];
    steps = insertAt(steps, parent, 0, message("c_yes", "original"));

    steps = mapAtPath(steps, branchChildPath("c_cond", "yes", 0), (s) => ({
      ...s,
      step_config: { ...s.step_config, text: "edited" },
    }));

    expect(steps[0].branches?.yes[0].step_config.text).toBe("edited");
  });

  it("edits a step nested in the no branch", () => {
    const parent: ParentScope = { kind: "branch", parentCid: "c_cond", branch: "no" };
    let steps = [condition()];
    steps = insertAt(steps, parent, 0, message("c_no", "original"));

    steps = mapAtPath(steps, branchChildPath("c_cond", "no", 0), (s) => ({
      ...s,
      step_config: { ...s.step_config, text: "edited" },
    }));

    expect(steps[0].branches?.no[0].step_config.text).toBe("edited");
  });

  it("edits the right step when a branch has more than one", () => {
    const parent: ParentScope = { kind: "branch", parentCid: "c_cond", branch: "no" };
    let steps = [condition()];
    steps = insertAt(steps, parent, 0, message("c_no_a", "first"));
    steps = insertAt(steps, parent, 1, message("c_no_b", "second"));

    steps = mapAtPath(steps, branchChildPath("c_cond", "no", 1), (s) => ({
      ...s,
      step_config: { ...s.step_config, text: "second-edited" },
    }));

    expect(steps[0].branches?.no[0].step_config.text).toBe("first");
    expect(steps[0].branches?.no[1].step_config.text).toBe("second-edited");
  });
});
