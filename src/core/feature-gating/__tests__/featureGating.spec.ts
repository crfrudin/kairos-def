import { describe, expect, it } from "vitest";

import type { FeatureGatingSnapshot } from "..";
import { isFeatureEnabled, requireFeature } from "..";

describe("Feature Gating (core)", () => {
  it("detects enabled/disabled features by snapshot", () => {
    const snap: FeatureGatingSnapshot = {
      plan: "FREE",
      state: "FREE",
      cancelEffectiveOn: null,
      features: new Set(["AUTH", "PROFILE_RULES"]),
      maxActiveSubjects: { kind: "LIMITED", value: 2 },
    };

    expect(isFeatureEnabled(snap, "AUTH")).toBe(true);
    expect(isFeatureEnabled(snap, "ADVANCED_STATS")).toBe(false);

    expect(requireFeature(snap, "AUTH")).toEqual({ ok: true });
    expect(requireFeature(snap, "ADVANCED_STATS")).toEqual({ ok: false });
  });
});
