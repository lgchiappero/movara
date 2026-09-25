"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { adminRoles, type AdminRole } from "@/lib/admin/roles";
import { MAX_USUARIOS } from "@/lib/validators/admin-usuarios";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#D4B06A]";

const ROL_LABELS: Record<AdminRole, string> = { admin: "Admin", vendedor: "Vendedor" };
const ROL_COLORS: Record<AdminRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  vendedor: "bg-blue-100 text-blue-700",
};

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  ultimoLogin: string | null;
};

function formatFecha(value: string | null): string {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function UsuariosPanel({ initialUsuarios }: { initialUsuarios: Usuario[] }) {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState(initialUsuarios);
  const [showNuevo, setShowNuevo] = useState(false);
  const [rolFijo, setRolFijo] = useState<AdminRole | undefined>(undefined);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showSuccess, showError } = useToast();

  function abrirNuevo(rol?: AdminRole) {
    setRolFijo(rol);
    setShowNuevo(true);
  }

  function refreshAndSync() {
    router.refresh();
  }

  async function crearUsuario(data: { nombre: string; email: string; password: string; rol: AdminRole }) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error ?? "No pudimos crear el usuario.";
        setError(message);
        showError(message);
        return;
      }
      setUsuarios((prev) => [
        ...prev,
        { id: json.id, nombre: data.nombre, email: data.email, rol: data.rol, activo: true, ultimoLogin: null },
      ]);
      setShowNuevo(false);
      showSuccess(`${ROL_LABELS[data.rol]} creado correctamente`);
      refreshAndSync();
    } catch {
      const message = "No pudimos crear el usuario. Probá de nuevo.";
      setError(message);
      showError(message);
    } finally {
      setBusy(false);
    }
  }

  async function editarUsuario(id: string, data: { nombre: string; rol: AdminRole; activo: boolean }) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error ?? "No pudimos guardar los cambios.";
        setError(message);
        showError(message);
        return;
      }
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
      setEditId(null);
      showSuccess();
      refreshAndSync();
    } catch {
      const message = "No pudimos guardar los cambios. Probá de nuevo.";
      setError(message);
      showError(message);
    } finally {
      setBusy(false);
    }
  }

  async function desactivar(u: Usuario) {
    if (!window.confirm(`¿Desactivar a ${u.nombre}? Va a perder el acceso al panel de inmediato.`)) return;
    await editarUsuario(u.id, { nombre: u.nombre, rol: u.rol as AdminRole, activo: false });
  }

  const alTope = usuarios.length >= MAX_USUARIOS;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Último login</th>
              <th className="px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) =>
              editId === u.id ? (
                <EditRow
                  key={u.id}
                  usuario={u}
                  busy={busy}
                  onCancel={() => setEditId(null)}
                  onSave={(data) => editarUsuario(u.id, data)}
                />
              ) : (
                <tr key={u.id} className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-5 py-3 font-medium text-[#1a1a1a]">{u.nombre}</td>
                  <td className="px-5 py-3 text-stone-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        ROL_COLORS[u.rol as AdminRole] ?? "bg-[#f5f5f5] text-stone-600"
                      }`}
                    >
                      {ROL_LABELS[u.rol as AdminRole] ?? u.rol}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        u.activo ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500"
                      }`}
                    >
                      {u.activo ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{formatFecha(u.ultimoLogin)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditId(u.id)}
                        className="text-[#D4B06A] font-medium hover:underline"
                      >
                        Editar
                      </button>
                      {u.activo && (
                        <button
                          type="button"
                          onClick={() => desactivar(u)}
                          className="text-red-600 font-medium hover:underline"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {showNuevo ? (
        <NuevoUsuarioForm
          busy={busy}
          rolFijo={rolFijo}
          onCancel={() => setShowNuevo(false)}
          onCreate={crearUsuario}
        />
      ) : alTope ? (
        <p className="text-sm text-stone-500 px-1">Máximo de {MAX_USUARIOS} usuarios alcanzado.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => abrirNuevo("vendedor")}
            className="px-5 py-3 bg-[#D4B06A] hover:bg-[#c19f5a] text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
          >
            + Nuevo vendedor
          </button>
          <button
            type="button"
            onClick={() => abrirNuevo(undefined)}
            className="px-5 py-3 border border-stone-300 text-stone-600 hover:bg-stone-50 font-bold text-sm rounded-xl transition-colors"
          >
            + Nuevo usuario
          </button>
        </div>
      )}
    </div>
  );
}

function NuevoUsuarioForm({
  busy,
  rolFijo,
  onCancel,
  onCreate,
}: {
  busy: boolean;
  /** Cuando viene seteado (ej. desde "+ Nuevo vendedor"), el rol queda fijo
   * y no se muestra el selector — un ABM más claro que dejar el mismo
   * formulario genérico para las dos cosas. */
  rolFijo?: AdminRole;
  onCancel: () => void;
  onCreate: (data: { nombre: string; email: string; password: string; rol: AdminRole }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<AdminRole>(rolFijo ?? "vendedor");

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
        {rolFijo ? `Nuevo ${ROL_LABELS[rolFijo].toLowerCase()}` : "Nuevo usuario"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Nombre</span>
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Email</span>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-stone-500">Contraseña temporal</span>
          <input
            type="text"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {rolFijo ? (
          <div className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Rol</span>
            <p className={`${inputClass} bg-[#F4F4F4] text-stone-500`}>{ROL_LABELS[rolFijo]}</p>
          </div>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-stone-500">Rol</span>
            <select className={inputClass} value={rol} onChange={(e) => setRol(e.target.value as AdminRole)}>
              {adminRoles.map((r) => (
                <option key={r} value={r}>
                  {ROL_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || !nombre.trim() || !email.trim() || password.length < 8}
          onClick={() => onCreate({ nombre: nombre.trim(), email: email.trim(), password, rol })}
          className="px-5 py-2.5 bg-[#D4B06A] hover:bg-[#c19f5a] disabled:opacity-50 text-[#1a1a1a] font-bold text-sm rounded-xl transition-colors"
        >
          {busy ? "Creando..." : "Crear usuario"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-stone-300 text-stone-600 hover:bg-stone-50 font-medium text-sm rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function EditRow({
  usuario,
  busy,
  onCancel,
  onSave,
}: {
  usuario: Usuario;
  busy: boolean;
  onCancel: () => void;
  onSave: (data: { nombre: string; rol: AdminRole; activo: boolean }) => void;
}) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<AdminRole>(usuario.rol as AdminRole);
  const [activo, setActivo] = useState(usuario.activo);

  return (
    <tr className="border-b border-[#F0F0F0] last:border-0 bg-[#f9f9f9]">
      <td className="px-5 py-3">
        <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </td>
      <td className="px-5 py-3 text-stone-500">{usuario.email}</td>
      <td className="px-5 py-3">
        <select className={inputClass} value={rol} onChange={(e) => setRol(e.target.value as AdminRole)}>
          {adminRoles.map((r) => (
            <option key={r} value={r}>
              {ROL_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-5 py-3">
        <select
          className={inputClass}
          value={activo ? "activo" : "inactivo"}
          onChange={(e) => setActivo(e.target.value === "activo")}
        >
          <option value="activo">Activo</option>
          <option value="inactivo">Desactivado</option>
        </select>
      </td>
      <td className="px-5 py-3 text-stone-400">{formatFecha(usuario.ultimoLogin)}</td>
      <td className="px-5 py-3">
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSave({ nombre: nombre.trim(), rol, activo })}
            className="text-[#D4B06A] font-medium hover:underline disabled:opacity-50"
          >
            Guardar
          </button>
          <button type="button" onClick={onCancel} className="text-stone-500 font-medium hover:underline">
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}
