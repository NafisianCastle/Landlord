import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/i18n";
import LocaleSwitcher from "./LocaleSwitcher";

const mocks = vi.hoisted(() => ({ setLocale: vi.fn(), refresh: vi.fn() }));
vi.mock("@/app/actions/locale", () => ({ setLocale: mocks.setLocale }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.setLocale.mockResolvedValue(undefined);
});

describe("LocaleSwitcher", () => {
  it("opens the selected language and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: "Language: English" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const selected = screen.getByRole("menuitemradio", { name: "English" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("supports arrow navigation, Home/End, typeahead, and keyboard selection", async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    screen.getByRole("button", { name: "Language: English" }).focus();
    await user.keyboard("{ArrowUp}");
    const bangla = screen.getByRole("menuitemradio", { name: "বাংলা" });
    expect(bangla).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitemradio", { name: "English" }),
    ).toHaveFocus();
    await user.keyboard("{End}");
    expect(bangla).toHaveFocus();
    await user.keyboard("{Home}b{Enter}");
    await waitFor(() => expect(mocks.setLocale).toHaveBeenCalledWith("bn"));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Tab and outside interaction without trapping focus", async () => {
    const user = userEvent.setup();
    render(
      <>
        <LocaleSwitcher />
        <button>Next control</button>
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.tab();
    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not save or refresh when the current language is chosen", async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(screen.getByRole("menuitemradio", { name: "English" }));
    expect(mocks.setLocale).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("prevents duplicate changes while saving", async () => {
    let finish!: () => void;
    mocks.setLocale.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: "Language: English" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitemradio", { name: "বাংলা" }));
    expect(trigger).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Changing language");
    await user.click(trigger);
    expect(mocks.setLocale).toHaveBeenCalledOnce();
    finish();
    await waitFor(() => expect(trigger).toBeEnabled());
  });

  it("shows a recoverable error when saving fails", async () => {
    mocks.setLocale.mockRejectedValueOnce(new Error("Network unavailable"));
    const user = userEvent.setup();
    render(<LocaleSwitcher />);
    const trigger = screen.getByRole("button", { name: "Language: English" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitemradio", { name: "বাংলা" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not change language",
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    await user.click(trigger);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("menuitemradio", { name: "বাংলা" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });
});
