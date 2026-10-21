import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";
import { renderToString } from "react-dom/server";

const options = <><option value="monthly">Monthly</option><option value="yearly">Yearly</option></>;
describe("Select", () => {
  it("shows the selected label in server-rendered HTML before hydration", () => {
    const html = renderToString(<Select aria-label="Frequency" defaultValue="monthly">{options}</Select>);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector('[role="combobox"]')?.textContent).toContain("Monthly");
  });
  it("uses a themed list while preserving labels, native refs, changes and FormData", async () => {
    const ref=createRef<HTMLSelectElement>(), change=vi.fn();
    const {container}=render(<form><label htmlFor="frequency">Frequency</label><Select ref={ref} id="frequency" name="frequency" defaultValue="monthly" onChange={change}>{options}</Select></form>);
    const trigger=screen.getByRole("combobox",{name:"Frequency"});
    expect(trigger).toHaveTextContent("Monthly");expect(ref.current).toHaveValue("monthly");
    await userEvent.click(trigger);expect(screen.getByRole("listbox")).toHaveClass("bg-card");
    await userEvent.click(screen.getByRole("option",{name:"Yearly"}));
    expect(trigger).toHaveTextContent("Yearly");expect(change).toHaveBeenCalledOnce();
    expect(new FormData(container.querySelector("form")!).get("frequency")).toBe("yearly");
  });
  it("supports keyboard navigation, Escape and Tab to the next control",async()=>{
    render(<><Select aria-label="Frequency">{options}</Select><button>Next control</button></>);
    const trigger=screen.getByRole("combobox",{name:"Frequency"});await userEvent.click(trigger);
    await userEvent.keyboard("{End}{Enter}");expect(trigger).toHaveTextContent("Yearly");
    await userEvent.click(trigger);await userEvent.keyboard("{Escape}");expect(trigger).toHaveFocus();
    await userEvent.click(trigger);await userEvent.tab();expect(screen.getByRole("button",{name:"Next control"})).toHaveFocus();
  });
  it("resets uncontrolled values with the enclosing form",async()=>{
    const {container}=render(<form><Select aria-label="Frequency" name="frequency" defaultValue="monthly">{options}</Select></form>);
    await userEvent.click(screen.getByRole("combobox"));await userEvent.click(screen.getByRole("option",{name:"Yearly"}));
    fireEvent.reset(container.querySelector("form")!);
    await waitFor(()=>expect(screen.getByRole("combobox")).toHaveTextContent("Monthly"));
    expect(new FormData(container.querySelector("form")!).get("frequency")).toBe("monthly");
  });
  it("preserves controlled changes and empty option values",async()=>{
    function Form(){const [value,setValue]=useState("");return <form><Select name="vendor" aria-label="Vendor" value={value} onValueChange={setValue}><option value="">No vendor</option><option value="v1">Plumber</option></Select></form>;}
    const {container}=render(<Form/>);expect(new FormData(container.querySelector("form")!).get("vendor")).toBe("");
    await userEvent.click(screen.getByRole("combobox"));await userEvent.click(screen.getByRole("option",{name:"Plumber"}));
    expect(new FormData(container.querySelector("form")!).get("vendor")).toBe("v1");
  });
  it("keeps disabled fields out of form submission",()=>{
    const {container}=render(<form><Select disabled aria-label="Role" name="role"><option value="viewer">Viewer</option></Select></form>);
    expect(screen.getByRole("combobox",{name:"Role"})).toBeDisabled();expect(new FormData(container.querySelector("form")!).has("role")).toBe(false);
  });
});
