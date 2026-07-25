import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const revalidatePathMock = vi.fn();
const supabaseMock = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
};
const createClientMock = vi.fn(async () => supabaseMock);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

function fd(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("signUp", () => {
  it("rejects passwords under 10 characters without calling supabase", async () => {
    const { signUp } = await import("./auth");
    const result = await signUp(null, fd({ email: "a@b.com", password: "short" }));
    expect(result).toEqual({ error: "Password must be at least 10 characters." });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns the supabase error message on failure", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: { message: "Email taken" } });
    const { signUp } = await import("./auth");
    const result = await signUp(null, fd({ email: "a@b.com", password: "longenough1" }));
    expect(result).toEqual({ error: "Email taken" });
  });

  it("returns success and passes fullName through options.data", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });
    const { signUp } = await import("./auth");
    const result = await signUp(
      null,
      fd({ email: "a@b.com", password: "longenough1", fullName: "Jane Doe" }),
    );
    expect(result).toEqual({ success: true });
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "longenough1",
      options: { data: { full_name: "Jane Doe" } },
    });
  });

  it("defaults fullName to empty string when absent", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });
    const { signUp } = await import("./auth");
    await signUp(null, fd({ email: "a@b.com", password: "longenough1" }));
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { full_name: "" } } }),
    );
  });

  it("accepts a password exactly 10 characters (boundary)", async () => {
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });
    const { signUp } = await import("./auth");
    const result = await signUp(null, fd({ email: "a@b.com", password: "1234567890" }));
    expect(result).toEqual({ success: true });
  });
});

describe("signIn", () => {
  it("returns the supabase error message on failure without redirecting", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });
    const { signIn } = await import("./auth");
    const result = await signIn(null, fd({ email: "a@b.com", password: "x" }));
    expect(result).toEqual({ error: "Invalid credentials" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard on success", async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    const { signIn } = await import("./auth");
    await expect(signIn(null, fd({ email: "a@b.com", password: "x" }))).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });
});

describe("signOut", () => {
  it("signs out and redirects to /login", async () => {
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    const { signOut } = await import("./auth");
    await expect(signOut()).rejects.toThrow("REDIRECT:/login");
    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
  });
});

describe("updateProfile", () => {
  it("returns an error when not authenticated", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { updateProfile } = await import("./auth");
    const result = await updateProfile(null, fd({ fullName: "Jane" }));
    expect(result).toEqual({ error: "Not authenticated." });
  });

  it("trims fullName, updates, and revalidates /profile on success", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
    const { updateProfile } = await import("./auth");
    const result = await updateProfile(null, fd({ fullName: "  Jane Doe  " }));
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: "Jane Doe" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
    expect(result).toEqual({ success: true });
  });

  it("returns the supabase error message when update fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: { message: "boom" } });
    const { updateProfile } = await import("./auth");
    const result = await updateProfile(null, fd({ fullName: "Jane" }));
    expect(result).toEqual({ error: "boom" });
  });
});

describe("changePassword", () => {
  it("rejects a new password under 10 characters", async () => {
    const { changePassword } = await import("./auth");
    const result = await changePassword(
      null,
      fd({ currentPassword: "old12345678", newPassword: "short", confirmPassword: "short" }),
    );
    expect(result).toEqual({ error: "New password must be at least 10 characters." });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched new/confirm passwords", async () => {
    const { changePassword } = await import("./auth");
    const result = await changePassword(
      null,
      fd({
        currentPassword: "old12345678",
        newPassword: "newpassword1",
        confirmPassword: "newpassword2",
      }),
    );
    expect(result).toEqual({ error: "New passwords do not match." });
  });

  it("returns not-authenticated when there is no user email", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { changePassword } = await import("./auth");
    const result = await changePassword(
      null,
      fd({
        currentPassword: "old12345678",
        newPassword: "newpassword1",
        confirmPassword: "newpassword1",
      }),
    );
    expect(result).toEqual({ error: "Not authenticated." });
  });

  it("returns incorrect-password when re-verification fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: { message: "bad" } });
    const { changePassword } = await import("./auth");
    const result = await changePassword(
      null,
      fd({
        currentPassword: "wrongcurrent",
        newPassword: "newpassword1",
        confirmPassword: "newpassword1",
      }),
    );
    expect(result).toEqual({ error: "Current password is incorrect." });
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and revalidates /profile on success", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
    const { changePassword } = await import("./auth");
    const result = await changePassword(
      null,
      fd({
        currentPassword: "old12345678",
        newPassword: "newpassword1",
        confirmPassword: "newpassword1",
      }),
    );
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: "newpassword1" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
    expect(result).toEqual({ success: true });
  });

  it("returns the supabase error message when the final update fails", async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { email: "a@b.com" } } });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: { message: "boom" } });
    const { changePassword } = await import("./auth");
    const result = await changePassword(
      null,
      fd({
        currentPassword: "old12345678",
        newPassword: "newpassword1",
        confirmPassword: "newpassword1",
      }),
    );
    expect(result).toEqual({ error: "boom" });
  });
});
