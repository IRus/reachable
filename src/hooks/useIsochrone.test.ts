import {afterEach, describe, expect, it, vi} from "vitest";
import {act, renderHook, waitFor} from "@testing-library/react";
import {useIsochrone} from "./useIsochrone";

const center = {lat: 53.9023, lon: 27.5619};

const square = [
  [27.55, 53.9],
  [27.57, 53.9],
  [27.57, 53.91],
  [27.55, 53.91],
  [27.55, 53.9]
];

function okResponse(): Response {
  return new Response(
    JSON.stringify({features: [{geometry: {type: "Polygon", coordinates: [square]}}]}),
    {status: 200}
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsochrone", () => {
  it("gives back the street zone when the service answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse()));

    const {result} = renderHook(() => useIsochrone(center, 15, "walking"));

    await waitFor(() => expect(result.current.zone).not.toBeNull());
    expect(result.current.zone!.source).toBe("streets");
    expect(result.current.notice).toBeNull();
  });

  it("falls back to a circle and explains why when the service fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", {status: 429})));

    const {result} = renderHook(() => useIsochrone(center, 15, "walking"));

    await waitFor(() => expect(result.current.zone).not.toBeNull());
    expect(result.current.zone!.source).toBe("circle");
    expect(result.current.notice).toContain("Слишком много запросов");
  });

  it("asks the service once for the same point and settings", async () => {
    const spy = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", spy);

    const {result, rerender} = renderHook(
      ({minutes}) => useIsochrone(center, minutes, "walking"),
      {initialProps: {minutes: 15}}
    );

    await waitFor(() => expect(result.current.zone).not.toBeNull());

    // Тот же запрос второй раз должен прийти из кэша.
    await act(async () => {
      rerender({minutes: 30});
      rerender({minutes: 15});
    });
    await waitFor(() => expect(result.current.zone).not.toBeNull());

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ignores GPS jitter below the movement threshold", async () => {
    const spy = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", spy);

    const {result, rerender} = renderHook(
      ({point}) => useIsochrone(point, 15, "walking"),
      {initialProps: {point: center}}
    );

    await waitFor(() => expect(result.current.zone).not.toBeNull());

    // Примерно 11 метров севернее — меньше порога в 30 метров.
    await act(async () => {
      rerender({point: {lat: center.lat + 0.0001, lon: center.lon}});
    });
    await waitFor(() => expect(result.current.zone).not.toBeNull());

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("asks again after a real move", async () => {
    const spy = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", spy);

    const {result, rerender} = renderHook(
      ({point}) => useIsochrone(point, 15, "walking"),
      {initialProps: {point: center}}
    );

    await waitFor(() => expect(result.current.zone).not.toBeNull());

    // Примерно 220 метров севернее — заметно больше порога.
    await act(async () => {
      rerender({point: {lat: center.lat + 0.002, lon: center.lon}});
    });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});
