import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import english from "@/messages/en.json";
import bangla from "@/messages/bn.json";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function ExampleDialog({ locale = "en" }: { locale?: "en" | "bn" }) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? english : bangla}
    >
      <Dialog>
        <DialogTrigger>Open example</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Example</DialogTitle>
            <DialogDescription>Example content</DialogDescription>
          </DialogHeader>
          <input aria-label="Example field" />
        </DialogContent>
      </Dialog>
    </NextIntlClientProvider>
  );
}

describe("Dialog", () => {
  it.each([
    ["en", "Close"],
    ["bn", "বন্ধ করুন"],
  ] as const)(
    "uses the %s close label and returns focus to the opener",
    async (locale, closeLabel) => {
      const user = userEvent.setup();
      render(<ExampleDialog locale={locale} />);
      const opener = screen.getByRole("button", { name: "Open example" });
      await user.click(opener);
      expect(
        screen.getByRole("dialog", { name: "Example" }),
      ).toHaveAccessibleDescription("Example content");
      await user.click(screen.getByRole("button", { name: closeLabel }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    },
  );

  it("keeps keyboard focus within the open dialog and dismisses on Escape", async () => {
    const user = userEvent.setup();
    render(<ExampleDialog />);
    await user.click(screen.getByRole("button", { name: "Open example" }));
    const field = screen.getByRole("textbox", { name: "Example field" });
    expect(field).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab();
    expect(field).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
