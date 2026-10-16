import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FileUpload from "./FileUpload";
import { useSubidaArchivos } from "./useSubidaArchivos";
import { TIPOS_MOVARA, TIPOS_PEDIDOS } from "@/lib/admin/tipos-archivo";

const MB = 1024 * 1024;
function archivo(nombre: string, bytes: number, type: string): File {
  const f = new File(["x"], nombre, { type, lastModified: 1 });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
}
const pdf = (nombre = "contrato.pdf", bytes = 2.4 * MB) => archivo(nombre, bytes, "application/pdf");

/** FileUpload con su estado, como lo usa un formulario real. */
function Campo(props: Partial<React.ComponentProps<typeof FileUpload>> & { onCambio?: (a: File[]) => void }) {
  const [archivos, setArchivos] = useState<File[]>([]);
  return (
    <FileUpload
      label="Comprobante"
      tipos={TIPOS_MOVARA}
      archivos={archivos}
      onChange={(a) => {
        setArchivos(a);
        props.onCambio?.(a);
      }}
      {...props}
    />
  );
}

const input = () => screen.getByLabelText("Comprobante") as HTMLInputElement;

describe("FileUpload", () => {
  it("muestra la zona: botón Seleccionar archivo, 'o arrastralo acá', tipos y tamaño máximo; el input nativo está oculto", () => {
    render(<Campo />);
    expect(screen.getByRole("button", { name: "Seleccionar archivo" })).toBeInTheDocument();
    expect(screen.getByText("o arrastralo acá")).toBeInTheDocument();
    expect(screen.getByText("PDF, JPG, PNG, Excel o Word · hasta 20 MB")).toBeInTheDocument();
    expect(input()).toHaveClass("sr-only");
    expect(input().accept).toContain("application/pdf");
    expect(input().accept).toContain(".docx");
    expect(input().multiple).toBe(false);
  });

  it("usa los tipos de cada destino (pedidos no acepta Word)", () => {
    render(<Campo tipos={TIPOS_PEDIDOS} />);
    expect(screen.getByText("PDF, JPG, PNG o Excel · hasta 20 MB")).toBeInTheDocument();
    expect(input().accept).not.toContain(".docx");
  });

  it("el botón abre el selector del input oculto", () => {
    render(<Campo />);
    const click = vi.spyOn(input(), "click");
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar archivo" }));
    expect(click).toHaveBeenCalled();
  });

  it("selección: tarjeta con el nombre COMPLETO (sin recortar), el tamaño en MB, ícono de PDF y Quitar", async () => {
    const nombre = "Contrato de compraventa MOVARA Flex 38 - Juan Pérez - firmado por ambas partes.pdf";
    const onCambio = vi.fn();
    render(<Campo onCambio={onCambio} />);
    await userEvent.upload(input(), pdf(nombre));
    expect(onCambio).toHaveBeenLastCalledWith([expect.objectContaining({ name: nombre })]);
    const nombreEl = screen.getByText(nombre);
    expect(nombreEl).toHaveClass("break-words");
    expect(nombreEl).not.toHaveClass("truncate");
    expect(screen.getByText("2,4 MB")).toBeInTheDocument();
    expect(document.querySelector('[data-clase="pdf"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: `Quitar ${nombre}` })).toHaveTextContent("Quitar");
    // Con un archivo elegido (modo simple) la zona se oculta: se cambia con Quitar.
    expect(screen.queryByTestId("zona-subida")).not.toBeInTheDocument();
  });

  it("Quitar vacía la selección y vuelve a mostrar la zona", async () => {
    const onCambio = vi.fn();
    render(<Campo onCambio={onCambio} />);
    await userEvent.upload(input(), pdf());
    await userEvent.click(screen.getByRole("button", { name: "Quitar contrato.pdf" }));
    expect(onCambio).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText("contrato.pdf")).not.toBeInTheDocument();
    expect(screen.getByTestId("zona-subida")).toBeInTheDocument();
  });

  it("drag & drop: resalta la zona al arrastrar y toma el archivo soltado", () => {
    const onCambio = vi.fn();
    render(<Campo onCambio={onCambio} />);
    const zona = screen.getByTestId("zona-subida");
    fireEvent.dragOver(zona);
    expect(zona).toHaveClass("border-sage-500");
    fireEvent.dragLeave(zona);
    expect(zona).not.toHaveClass("border-sage-500");
    fireEvent.drop(zona, { dataTransfer: { files: [pdf("soltado.pdf")] } });
    expect(onCambio).toHaveBeenLastCalledWith([expect.objectContaining({ name: "soltado.pdf" })]);
    expect(screen.getByText("soltado.pdf")).toBeInTheDocument();
  });

  it("drop sin archivos no cambia nada", () => {
    const onCambio = vi.fn();
    render(<Campo onCambio={onCambio} />);
    fireEvent.drop(screen.getByTestId("zona-subida"), { dataTransfer: { files: [] } });
    expect(onCambio).not.toHaveBeenCalled();
  });

  it("archivo muy pesado: mensaje claro en rojo y no queda elegido", async () => {
    const onCambio = vi.fn();
    render(<Campo onCambio={onCambio} />);
    fireEvent.drop(screen.getByTestId("zona-subida"), { dataTransfer: { files: [pdf("planos.pdf", 24 * MB)] } });
    expect(screen.getByRole("alert")).toHaveTextContent("El archivo pesa 24 MB. El máximo es 20 MB.");
    expect(screen.getByRole("alert")).toHaveClass("text-red-600");
    expect(onCambio).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText("planos.pdf")).not.toBeInTheDocument();
  });

  it("tipo inválido: mensaje con los tipos permitidos; elegir uno válido borra el error", () => {
    render(<Campo />);
    const zona = screen.getByTestId("zona-subida");
    fireEvent.drop(zona, { dataTransfer: { files: [archivo("instalador.exe", 1000, "application/x-msdownload")] } });
    expect(screen.getByRole("alert")).toHaveTextContent('"instalador.exe" no es un tipo de archivo permitido. Subí PDF, JPG, PNG, Excel o Word.');
    fireEvent.drop(zona, { dataTransfer: { files: [pdf()] } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("varios archivos: una tarjeta por archivo, sin duplicados; los inválidos no entran; cada uno se quita solo", async () => {
    const onCambio = vi.fn();
    render(<Campo multiple onCambio={onCambio} />);
    expect(input().multiple).toBe(true);
    const a = pdf("a.pdf");
    const b = archivo("b.png", 0.5 * MB, "image/png");
    fireEvent.drop(screen.getByTestId("zona-subida"), { dataTransfer: { files: [a, b, archivo("c.exe", 10, "application/x-msdownload")] } });
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByText("b.png")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent('"c.exe" no es un tipo de archivo permitido');
    // En modo múltiple la zona sigue para agregar más; el mismo archivo no se repite.
    expect(screen.getByRole("button", { name: "Agregar otro archivo" })).toBeInTheDocument();
    fireEvent.drop(screen.getByTestId("zona-subida"), { dataTransfer: { files: [a] } });
    expect(screen.getAllByText("a.pdf")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Quitar a.pdf" }));
    expect(onCambio).toHaveBeenLastCalledWith([b]);
    expect(screen.getByText("b.png")).toBeInTheDocument();
  });

  it("imagen: muestra una miniatura y libera la URL al quitarla", async () => {
    const crear = vi.fn(() => "blob:miniatura");
    const liberar = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: crear, revokeObjectURL: liberar }));
    const { container } = render(<Campo />);
    await userEvent.upload(input(), archivo("frente.png", 300_000, "image/png"));
    expect(container.querySelector('img[src="blob:miniatura"]')).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Quitar frente.png" }));
    expect(liberar).toHaveBeenCalledWith("blob:miniatura");
    vi.unstubAllGlobals();
  });

  it("imagen sin createObjectURL (navegador viejo) usa el ícono; Excel/Word usan el ícono genérico", () => {
    const original = URL.createObjectURL;
    // @ts-expect-error — simulamos un entorno sin createObjectURL
    URL.createObjectURL = undefined;
    render(<FileUpload label="X" tipos={TIPOS_MOVARA} archivos={[archivo("f.jpg", 10, "image/jpeg"), archivo("planilla.xlsx", 10, "")]} onChange={() => {}} multiple />);
    expect(document.querySelector('[data-clase="imagen"]')).not.toBeNull();
    expect(document.querySelector('[data-clase="otro"]')).not.toBeNull();
    URL.createObjectURL = original;
  });

  it("durante la subida: barra de progreso con porcentaje y todo deshabilitado", () => {
    render(<FileUpload label="Comprobante" tipos={TIPOS_MOVARA} archivos={[pdf()]} onChange={() => {}} progreso={45} />);
    const barra = screen.getByRole("progressbar", { name: "Progreso de la subida" });
    expect(barra).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText("Subiendo… 45%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar contrato.pdf" })).toBeDisabled();
    expect(input()).toBeDisabled();
  });

  it("deshabilitado: arrastrar no resalta ni agrega", () => {
    const onChange = vi.fn();
    render(<FileUpload label="Comprobante" tipos={TIPOS_MOVARA} archivos={[]} onChange={onChange} disabled />);
    const zona = screen.getByTestId("zona-subida");
    fireEvent.dragOver(zona);
    expect(zona).not.toHaveClass("border-sage-500");
    fireEvent.drop(zona, { dataTransfer: { files: [pdf()] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Seleccionar archivo" })).toBeDisabled();
  });

  it("muestra el aviso de éxito solo con el campo vacío y sin subir; muestra el extra junto al título", () => {
    const { rerender } = render(
      <FileUpload label="C" tipos={TIPOS_MOVARA} archivos={[]} onChange={() => {}} mensajeExito="Archivo subido" extra={<a href="/x">Ver archivo actual</a>} compacto />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Archivo subido");
    expect(screen.getByRole("link", { name: "Ver archivo actual" })).toBeInTheDocument();
    rerender(<FileUpload label="C" tipos={TIPOS_MOVARA} archivos={[pdf()]} onChange={() => {}} mensajeExito="Archivo subido" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("change del input sin archivos no hace nada", () => {
    const onCambio = vi.fn();
    render(<Campo onCambio={onCambio} />);
    fireEvent.change(input(), { target: { files: null } });
    expect(onCambio).not.toHaveBeenCalled();
  });
});

describe("useSubidaArchivos", () => {
  function Formulario({ ok }: { ok: boolean }) {
    const s = useSubidaArchivos();
    return (
      <div>
        <FileUpload label="Comprobante" tipos={TIPOS_MOVARA} {...s.campo} />
        <button
          onClick={async () => {
            s.empezar();
            s.alProgresar(60);
            await Promise.resolve();
            s.terminar(ok);
          }}
        >
          subir
        </button>
        <span data-testid="subiendo">{String(s.subiendo)}</span>
      </div>
    );
  }

  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.useRealTimers());

  it("al terminar bien: el campo vuelve a cero y aparece 'Archivo subido'; elegir otro lo oculta", async () => {
    render(<Formulario ok />);
    await userEvent.upload(input(), pdf());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "subir" }));
    });
    expect(screen.queryByText("contrato.pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Archivo subido");
    expect(screen.getByTestId("subiendo")).toHaveTextContent("false");
    await userEvent.upload(input(), pdf("otro.pdf"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("si falla: conserva el archivo para reintentar y no muestra éxito", async () => {
    render(<Formulario ok={false} />);
    await userEvent.upload(input(), pdf());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "subir" }));
    });
    expect(screen.getByText("contrato.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
