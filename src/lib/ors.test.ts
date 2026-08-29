import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchIsochrone, OrsError} from "./ors";

const center = {lat: 53.9023, lon: 27.5619};

// Квадрат вокруг центра в порядке GeoJSON: [долгота, широта].
const square = [
  [27.55, 53.9],
  [27.57, 53.9],
  [27.57, 53.91],
  [27.55, 53.91],
  [27.55, 53.9]
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status});
}

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchIsochrone", () => {
  it("posts lon/lat in that order and range in seconds", async () => {
    const spy = mockFetch(async () =>
      jsonResponse({features: [{geometry: {type: "Polygon", coordinates: [square]}}]})
    );

    await fetchIsochrone({center, minutes: 15, mode: "walking"});

    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toContain("/ors/v2/isochrones/foot-walking");
    expect(JSON.parse(String(init!.body))).toEqual({
      locations: [[27.5619, 53.9023]],
      range: [900],
      range_type: "time"
    });
  });

  it("uses the cycling profile for the cycling mode", async () => {
    const spy = mockFetch(async () =>
      jsonResponse({features: [{geometry: {type: "Polygon", coordinates: [square]}}]})
    );

    await fetchIsochrone({center, minutes: 10, mode: "cycling"});

    expect(String(spy.mock.calls[0]![0])).toContain("cycling-regular");
  });

  it("returns rings flipped into lat/lon order", async () => {
    mockFetch(async () =>
      jsonResponse({features: [{geometry: {type: "Polygon", coordinates: [square]}}]})
    );

    const rings = await fetchIsochrone({center, minutes: 15, mode: "walking"});

    expect(rings).toHaveLength(1);
    expect(rings[0]![0]).toEqual([53.9, 27.55]);
  });

  it("keeps holes as extra rings", async () => {
    const hole = square.map(([lon, lat]) => [lon! + 0.002, lat! + 0.002]);
    mockFetch(async () =>
      jsonResponse({features: [{geometry: {type: "Polygon", coordinates: [square, hole]}}]})
    );

    const rings = await fetchIsochrone({center, minutes: 15, mode: "walking"});

    expect(rings).toHaveLength(2);
  });

  it("picks the largest piece of a MultiPolygon", async () => {
    const small = square.slice(0, 4);
    mockFetch(async () =>
      jsonResponse({
        features: [{geometry: {type: "MultiPolygon", coordinates: [[small], [square]]}}]
      })
    );

    const rings = await fetchIsochrone({center, minutes: 15, mode: "walking"});

    expect(rings[0]).toHaveLength(square.length);
  });

  it("reports a rate limit", async () => {
    mockFetch(async () => jsonResponse({error: "quota"}, 429));

    await expect(fetchIsochrone({center, minutes: 15, mode: "walking"}))
      .rejects.toMatchObject({kind: "rate-limited"});
  });

  it("reports a rejected key", async () => {
    mockFetch(async () => jsonResponse({error: "forbidden"}, 403));

    await expect(fetchIsochrone({center, minutes: 15, mode: "walking"}))
      .rejects.toMatchObject({kind: "unauthorized"});
  });

  it("reports an empty answer when no roads are near", async () => {
    mockFetch(async () => jsonResponse({features: []}));

    await expect(fetchIsochrone({center, minutes: 15, mode: "walking"}))
      .rejects.toMatchObject({kind: "empty"});
  });

  it("reports a lost network", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const error = await fetchIsochrone({center, minutes: 15, mode: "walking"}).catch(e => e);
    expect(error).toBeInstanceOf(OrsError);
    expect(error.kind).toBe("offline");
  });

  it("passes an abort through instead of turning it into an OrsError", async () => {
    mockFetch(async () => {
      throw new DOMException("aborted", "AbortError");
    });

    const error = await fetchIsochrone({center, minutes: 15, mode: "walking"}).catch(e => e);
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("AbortError");
  });
});
