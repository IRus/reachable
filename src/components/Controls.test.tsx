import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {Controls} from "./Controls";
import {MAX_MINUTES} from "../lib/travel";

// Авто-очистка @testing-library включается только при globals: true. Здесь
// globals выключены, поэтому убираем разметку между тестами вручную —
// иначе второй render находит по два одинаковых элемента.
afterEach(cleanup);

function setup(minutes = 15) {
  const onMinutesChange = vi.fn();
  const onModeChange = vi.fn();
  render(
    <Controls
      minutes={minutes}
      mode="walking"
      onMinutesChange={onMinutesChange}
      onModeChange={onModeChange}
    />
  );
  return {onMinutesChange, onModeChange};
}

describe("Controls", () => {
  it("marks the active mode as pressed", () => {
    setup();
    expect(screen.getByRole("button", {name: "Пешком"}).getAttribute("aria-pressed"))
      .toBe("true");
    expect(
      screen.getByRole("button", {name: "На велосипеде"}).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("reports the mode the user picked", async () => {
    const {onModeChange} = setup();
    await userEvent.click(screen.getByRole("button", {name: "На велосипеде"}));
    expect(onModeChange).toHaveBeenCalledWith("cycling");
  });

  it("clamps typed minutes to the ORS limit", async () => {
    const {onMinutesChange} = setup();
    const field = screen.getByLabelText("За сколько минут") as HTMLInputElement;
    await userEvent.clear(field);
    await userEvent.type(field, "900");
    expect(onMinutesChange).toHaveBeenLastCalledWith(MAX_MINUTES);
  });

  it("shows the slider and the number field with the same value", () => {
    setup(42);
    expect((screen.getByLabelText("Минуты") as HTMLInputElement).value).toBe("42");
    expect((screen.getByLabelText("За сколько минут") as HTMLInputElement).value).toBe("42");
  });
});
