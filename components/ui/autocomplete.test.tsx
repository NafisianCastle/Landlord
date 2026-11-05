import { describe, expect, it } from "vitest";
import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n";
import { Autocomplete } from "./autocomplete";
function Form(){const [value,setValue]=useState("");return <form><label htmlFor="place">District</label><Autocomplete id="place" name="district" value={value} onValueChange={setValue} options={["Dhaka","Gazipur","Tangail"]}/><button type="button">Next control</button></form>;}
describe("editable address suggestions",()=>{
  it("filters suggestions, accepts keyboard selection, and preserves form values",async()=>{
    const {container}=renderWithIntl(<Form/>);const input=screen.getByRole("combobox",{name:"District"});
    await userEvent.type(input,"gaz");expect(screen.getByRole("option",{name:"Gazipur"})).toBeInTheDocument();
    expect(screen.queryByRole("option",{name:"Dhaka"})).not.toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{Enter}");expect(input).toHaveValue("Gazipur");expect(input).toHaveFocus();
    expect(new FormData(container.querySelector("form")!).get("district")).toBe("Gazipur");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("allows custom text, shows an empty state and lets Tab leave the field",async()=>{
    renderWithIntl(<Form/>);const input=screen.getByRole("combobox",{name:"District"});
    await userEvent.type(input,"My own address");expect(input).toHaveValue("My own address");
    expect(screen.getByText("No suggestions. You can enter your own value.")).toBeInTheDocument();
    await userEvent.tab();expect(screen.getByRole("button",{name:"Next control"})).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("supports pointer selection and reopening a focused field",async()=>{
    renderWithIntl(<Form/>);const input=screen.getByRole("combobox",{name:"District"});
    await userEvent.click(input);await userEvent.click(screen.getByRole("option",{name:"Dhaka"}));expect(input).toHaveValue("Dhaka");
    await userEvent.click(input);expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");expect(input).toHaveFocus();expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
