import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from "@sanity/webhook";

const { mockRevalidatePath } = vi.hoisted(() => ({ mockRevalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

import { POST } from "../route";

const SECRET = "secreto-de-prueba-del-webhook";

async function req(body: unknown, { secreto = SECRET, ip = "10.1.0.1", firma = true }: { secreto?: string; ip?: string; firma?: boolean } = {}) {
  const texto = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": ip };
  if (firma) headers[SIGNATURE_HEADER_NAME] = await encodeSignatureHeader(texto, Date.now(), secreto);
  return new NextRequest("http://localhost/api/revalidate", { method: "POST", body: texto, headers });
}

beforeEach(() => {
  process.env.SANITY_REVALIDATE_SECRET = SECRET;
  mockRevalidatePath.mockClear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // parseBody espera 3 s la consistencia del Content Lake: se adelanta el reloj.
  vi.useFakeTimers({ toFake: ["setTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.SANITY_REVALIDATE_SECRET;
});

/** La firma se verifica con WebCrypto (resuelve en una tarea real) y recién
 *  después parseBody programa su espera de 3 s: se avanza el reloj de a poco
 *  hasta que la respuesta sale. */
async function enviar(r: Promise<NextRequest> | NextRequest) {
  let listo = false;
  const p = POST(await r).finally(() => {
    listo = true;
  });
  while (!listo) {
    await vi.advanceTimersByTimeAsync(500);
    await new Promise((resolve) => setImmediate(resolve));
  }
  return p;
}

describe("POST /api/revalidate (webhook de Sanity)", () => {
  it("con firma válida, configuradorModelos revalida /configurador", async () => {
    const res = await enviar(req({ _type: "configuradorModelos" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: true, tipo: "configuradorModelos", rutas: ["/configurador"] });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/configurador", undefined);
  });

  it("configuradorPage también revalida /configurador", async () => {
    await enviar(req({ _type: "configuradorPage" }));
    expect(mockRevalidatePath.mock.calls).toEqual([["/configurador", undefined]]);
  });

  it("siteConfig y homePage revalidan todo el sitio (layout raíz)", async () => {
    for (const _type of ["siteConfig", "homePage"]) {
      mockRevalidatePath.mockClear();
      await enviar(req({ _type }, { ip: `10.1.0.${_type.length}` }));
      expect(mockRevalidatePath.mock.calls).toEqual([["/", "layout"]]);
    }
  });

  it("modelo revalida la home, /modelos, /modelos/flex, todas las fichas y el sitemap", async () => {
    await enviar(req({ _type: "modelo", slug: "movara-duplex-76m2" }));
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/", undefined],
      ["/modelos", undefined],
      ["/modelos/flex", undefined],
      ["/modelos/[slug]", "page"],
      ["/sitemap.xml", undefined],
    ]);
  });

  it("quienesSomos → /nosotros; faqPage → /faq y la home", async () => {
    await enviar(req({ _type: "quienesSomos" }));
    expect(mockRevalidatePath.mock.calls).toEqual([["/nosotros", undefined]]);
    mockRevalidatePath.mockClear();
    await enviar(req({ _type: "faqPage" }));
    expect(mockRevalidatePath.mock.calls).toEqual([["/faq", undefined], ["/", undefined]]);
  });

  it("un tipo que ninguna página usa responde 200 sin revalidar", async () => {
    const res = await enviar(req({ _type: "testimonio" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: false, tipo: "testimonio", rutas: [] });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("401 con una firma hecha con otro secreto, y sin firma", async () => {
    expect((await enviar(req({ _type: "siteConfig" }, { secreto: "otro-secreto" }))).status).toBe(401);
    expect((await enviar(req({ _type: "siteConfig" }, { firma: false }))).status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("400 sin _type o con un cuerpo que no es JSON", async () => {
    expect((await enviar(req({ slug: "x" }))).status).toBe(400);
    expect((await enviar(req("{no es json"))).status).toBe(400);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("500 si falta SANITY_REVALIDATE_SECRET (no revalida sin poder validar)", async () => {
    delete process.env.SANITY_REVALIDATE_SECRET;
    const res = await enviar(req({ _type: "siteConfig" }));
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("SANITY_REVALIDATE_SECRET"));
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("429 al superar el límite por IP", async () => {
    let ultimo = 0;
    for (let i = 0; i < 61; i++) ultimo = (await enviar(req({ _type: "testimonio" }, { ip: "10.9.9.9" }))).status;
    expect(ultimo).toBe(429);
  });
});
