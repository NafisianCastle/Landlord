import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

describe("Select", () => {
  it("preserves native labels, defaults, changes, and form submission", async () => {
    const ref = createRef<HTMLSelectElement>();
    const { container } = render(
      <form>
        <label htmlFor="frequency">Frequency</label>
        <Select
          ref={ref}
          id="frequency"
          name="frequency"
          defaultValue="monthly"
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </Select>
      </form>,
    );
    const field = screen.getByRole("combobox", { name: "Frequency" });
    expect(ref.current).toBe(field);
    expect(field).toHaveValue("monthly");
    await userEvent.selectOptions(field, "yearly");
    expect(
      new FormData(container.querySelector("form")!).get("frequency"),
    ).toBe("yearly");
  });

  it("keeps disabled selects out of form data", () => {
    const { container } = render(
      <form>
        <Select disabled aria-label="Role" name="role">
          <option value="viewer">Viewer</option>
        </Select>
      </form>,
    );
    expect(screen.getByRole("combobox", { name: "Role" })).toBeDisabled();
    expect(new FormData(container.querySelector("form")!).has("role")).toBe(
      false,
    );
  });
});
