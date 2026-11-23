// Diagnóstico de la conexión con WhatsApp Cloud API (Meta). Nunca imprime el
// token: viaja solo en el header Authorization (y en debug_token, dentro de
// la URL, que tampoco se imprime).
//
//   npx tsx scripts/whatsapp-diagnostico.ts [PHONE_NUMBER_ID_A_COMPARAR]
//
// Usa WHATSAPP_ACCESS_TOKEN y WHATSAPP_WABA_ID de .env.local (o de la terminal).
// 1. Verifica el token: a quién pertenece, permisos y cuentas asignadas.
// 2. GET /{WABA_ID}/subscribed_apps.
// 3. Si la app no está suscrita, POST /{WABA_ID}/subscribed_apps y verifica de nuevo.
// 4. Lista los números de la cuenta y compara el Phone Number ID.
import "./_env";
import { GRAPH_API_VERSION } from "../src/lib/whatsapp-cloud/cliente";

const BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "";
const waba = process.env.WHATSAPP_WABA_ID?.trim() ?? "";
const comparar = (process.argv[2] ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim();

type ErrorGraph = { message?: string; type?: string; code?: number; error_subcode?: number; fbtrace_id?: string };
type Respuesta = { ok: boolean; status: number; json: Record<string, unknown> & { error?: ErrorGraph } };

async function graph(ruta: string, metodo: "GET" | "POST" = "GET"): Promise<Respuesta> {
  const res = await fetch(`${BASE}${ruta}`, { method: metodo, headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json().catch(() => ({}))) as Respuesta["json"];
  return { ok: res.ok && !json.error, status: res.status, json };
}

/** Error de Graph sin nada que pueda contener el token. */
function describirError(r: Respuesta): string {
  const e = r.json.error ?? {};
  const msg = (e.message ?? "sin mensaje").replaceAll(token, "[token]");
  return `HTTP ${r.status} · código ${e.code ?? "?"}${e.error_subcode ? `/${e.error_subcode}` : ""} · ${e.type ?? ""} · ${msg}${e.fbtrace_id ? ` (fbtrace_id ${e.fbtrace_id})` : ""}`;
}

type AppSuscrita = { whatsapp_business_api_data?: { id?: string; name?: string; link?: string } };

async function appsSuscritas(): Promise<AppSuscrita[] | null> {
  const r = await graph(`/${waba}/subscribed_apps`);
  if (!r.ok) {
    console.log(`  ✗ No se pudo leer: ${describirError(r)}`);
    return null;
  }
  const data = (r.json.data as AppSuscrita[] | undefined) ?? [];
  if (data.length === 0) console.log("  Ninguna app suscrita a esta cuenta.");
  for (const a of data) console.log(`  ✓ App suscrita: ${a.whatsapp_business_api_data?.name ?? "?"} (app id ${a.whatsapp_business_api_data?.id ?? "?"})`);
  return data;
}

async function main() {
  if (!token || !waba) {
    console.error("Faltan WHATSAPP_ACCESS_TOKEN y/o WHATSAPP_WABA_ID en .env.local.");
    process.exit(1);
  }
  let problemas = 0;

  console.log("1. Token");
  const me = await graph("/me?fields=id,name");
  if (me.ok) console.log(`  Pertenece a: ${String(me.json.name ?? "?")} (id ${String(me.json.id ?? "?")})`);
  else {
    problemas++;
    console.log(`  ✗ /me falló: ${describirError(me)}`);
  }
  const dbg = await graph(`/debug_token?input_token=${encodeURIComponent(token)}`);
  const d = (dbg.json.data ?? {}) as {
    is_valid?: boolean; type?: string; application?: string; app_id?: string; expires_at?: number;
    scopes?: string[]; granular_scopes?: { scope: string; target_ids?: string[] }[]; error?: { message?: string };
  };
  if (!dbg.ok) {
    problemas++;
    console.log(`  ✗ debug_token falló: ${describirError(dbg)}`);
  } else {
    console.log(`  Válido: ${d.is_valid ? "sí" : "NO"}${d.error?.message ? ` (${d.error.message.replaceAll(token, "[token]")})` : ""}`);
    console.log(`  Tipo: ${d.type ?? "?"} · App: ${d.application ?? "?"} (app id ${d.app_id ?? "?"})`);
    console.log(`  Vence: ${!d.expires_at ? "nunca (permanente)" : new Date(d.expires_at * 1000).toLocaleString("es-AR")}`);
    console.log(`  Permisos: ${(d.scopes ?? []).join(", ") || "ninguno"}`);
    for (const p of ["whatsapp_business_management", "whatsapp_business_messaging"]) {
      const g = d.granular_scopes?.find((x) => x.scope === p);
      const cuentas = g?.target_ids;
      const tieneWaba = !cuentas || cuentas.includes(waba);
      console.log(
        `  ${g && tieneWaba ? "✓" : "✗"} ${p}: ${!g ? "FALTA" : !cuentas ? "todas las cuentas" : `cuentas ${cuentas.join(", ")}${tieneWaba ? "" : ` (NO incluye ${waba})`}`}`,
      );
      if (!g || !tieneWaba) problemas++;
    }
    if (!d.is_valid) problemas++;
  }

  console.log(`\n2. Apps suscritas a la cuenta ${waba}`);
  let apps = await appsSuscritas();
  const nuestra = (lista: AppSuscrita[] | null) => !!lista?.some((a) => !d.app_id || a.whatsapp_business_api_data?.id === d.app_id);

  if (apps && !nuestra(apps)) {
    console.log(`\n3. La app${d.app_id ? ` ${d.app_id}` : ""} no está suscrita: suscribiendo…`);
    const post = await graph(`/${waba}/subscribed_apps`, "POST");
    if (post.ok) console.log(`  Respuesta: ${JSON.stringify(post.json)}`);
    else {
      problemas++;
      console.log(`  ✗ POST falló: ${describirError(post)}`);
    }
    console.log("  Verificando de nuevo:");
    apps = await appsSuscritas();
  } else if (apps) console.log("\n3. Ya está suscrita: no hace falta el POST.");
  if (!nuestra(apps)) problemas++;

  console.log(`\n4. Números de la cuenta ${waba}`);
  const nums = await graph(`/${waba}/phone_numbers?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,status,platform_type`);
  if (!nums.ok) {
    problemas++;
    console.log(`  ✗ No se pudo listar: ${describirError(nums)}`);
  } else {
    const lista = (nums.json.data as Record<string, string>[] | undefined) ?? [];
    if (lista.length === 0) console.log("  La cuenta no tiene números.");
    for (const n of lista) {
      console.log(
        `  • ${n.display_phone_number} · "${n.verified_name}" · Phone Number ID ${n.id} · estado ${n.status ?? "?"} · plataforma ${n.platform_type ?? "?"} · verificación ${n.code_verification_status ?? "?"}`,
      );
    }
    if (comparar) {
      const coincide = lista.some((n) => n.id === comparar);
      console.log(`  ${coincide ? "✓" : "✗"} El Phone Number ID a comparar ${coincide ? "coincide con" : "NO está entre"} los números de esta cuenta.`);
      if (!coincide) problemas++;
    } else console.log("  (Sin Phone Number ID para comparar: pasalo como argumento.)");
  }

  console.log(problemas ? `\n${problemas} problema(s) encontrados.` : "\nTodo en orden.");
  process.exit(problemas ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.name : "Error");
  process.exit(1);
});
