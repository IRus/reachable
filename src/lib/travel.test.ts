import {describe, expect, it} from "vitest";
import {clampMinutes, MAX_MINUTES, MIN_MINUTES, reachDistanceMeters} from "./travel";

describe("reachDistanceMeters", () => {
  it("walking covers about 415 m in five minutes", () => {
    expect(reachDistanceMeters("walking", 5)).toBeCloseTo(416.67, 1);
  });

  it("cycling covers three times the walking distance", () => {
    expect(reachDistanceMeters("cycling", 20)).toBeCloseTo(
      reachDistanceMeters("walking", 20) * 3,
      6
    );
  });

  it("scales linearly with minutes", () => {
    expect(reachDistanceMeters("walking", 30)).toBeCloseTo(
      reachDistanceMeters("walking", 15) * 2,
      6
    );
  });
});

describe("clampMinutes", () => {
  it("keeps values inside the range", () => {
    expect(clampMinutes(25)).toBe(25);
  });

  it("clamps below the minimum", () => {
    expect(clampMinutes(1)).toBe(MIN_MINUTES);
  });

  it("clamps above the ORS one hour limit", () => {
    expect(clampMinutes(500)).toBe(MAX_MINUTES);
  });

  it("falls back to the minimum for NaN", () => {
    expect(clampMinutes(Number.NaN)).toBe(MIN_MINUTES);
  });

  it("rounds fractional input", () => {
    expect(clampMinutes(12.6)).toBe(13);
  });
});
