import {describe, expect, it} from "vitest";
import {circleRing, distanceMeters} from "./geo";

const minsk = {lat: 53.9023, lon: 27.5619};

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters(minsk, minsk)).toBe(0);
  });

  it("matches a known distance: Minsk to Vilnius is about 172 km", () => {
    const vilnius = {lat: 54.6872, lon: 25.2797};
    expect(distanceMeters(minsk, vilnius) / 1000).toBeCloseTo(171.9, 0);
  });

  it("is symmetric", () => {
    const other = {lat: 53.91, lon: 27.58};
    expect(distanceMeters(minsk, other)).toBeCloseTo(distanceMeters(other, minsk), 6);
  });
});

describe("circleRing", () => {
  it("closes the ring", () => {
    const ring = circleRing(minsk, 500);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("emits steps + 1 points", () => {
    expect(circleRing(minsk, 500, 12)).toHaveLength(13);
  });

  it("keeps every point at the requested radius", () => {
    const radius = 800;
    for (const [lat, lon] of circleRing(minsk, radius, 24)) {
      expect(distanceMeters(minsk, {lat, lon})).toBeCloseTo(radius, -1);
    }
  });

  it("does not blow up at the pole", () => {
    for (const [lat, lon] of circleRing({lat: 90, lon: 0}, 1000, 8)) {
      expect(Number.isFinite(lat)).toBe(true);
      expect(Number.isFinite(lon)).toBe(true);
    }
  });
});
