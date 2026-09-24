import { describe, it, expect } from "vitest";
import { POST } from "../route";

describe("POST /api/admin/auth/logout", () => {
  it("devuelve 200 y limpia la cookie de sesión (maxAge 0)", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get("movara_admin_session");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
