import type { ProductModel } from "@/data/models";

type PlanSize = ProductModel["floorPlanSize"];

export default function FloorPlan({ size }: { size: PlanSize }) {
  return (
    <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8 overflow-auto">
      <div className="min-w-[340px]">
        <svg
          viewBox="0 0 560 420"
          className="w-full max-w-xl mx-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {PLANS[size]}
        </svg>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-stone-800 block" />
            Muro
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 block" />
            Abertura
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-stone-300 border-dashed border-t block" style={{ borderTop: "1px dashed #d6d3d1" }} />
            Línea de cubierta
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────
const W = { wall: "#292524", door: "#d97706", dim: "#78716c" };

function Label({ x, y, text, sub }: { x: number; y: number; text: string; sub?: string }) {
  return (
    <g>
      <text x={x} y={y} textAnchor="middle" fill={W.dim} fontSize="11" fontFamily="monospace" fontWeight="600">
        {text}
      </text>
      {sub && (
        <text x={x} y={y + 14} textAnchor="middle" fill={W.dim} fontSize="9" fontFamily="monospace">
          {sub}
        </text>
      )}
    </g>
  );
}

function DimLine({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const isH = y1 === y2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={W.dim} strokeWidth="1" strokeDasharray="3 3" />
      <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} stroke={W.dim} strokeWidth="1" />
      <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} stroke={W.dim} strokeWidth="1" />
      <text
        x={isH ? mx : mx + 8}
        y={isH ? my - 5 : my}
        textAnchor="middle"
        fill={W.dim}
        fontSize="9"
        fontFamily="monospace"
      >
        {label}
      </text>
    </g>
  );
}

function Door({ x, y, width = 28, direction = "right" }: { x: number; y: number; width?: number; direction?: "right" | "left" | "up" | "down" }) {
  const arc = direction === "right"
    ? `M ${x},${y} L ${x + width},${y} A ${width},${width} 0 0,0 ${x},${y + width}`
    : direction === "left"
    ? `M ${x},${y} L ${x - width},${y} A ${width},${width} 0 0,1 ${x},${y + width}`
    : direction === "down"
    ? `M ${x},${y} L ${x},${y + width} A ${width},${width} 0 0,1 ${x - width},${y}`
    : `M ${x},${y} L ${x},${y - width} A ${width},${width} 0 0,0 ${x - width},${y}`;
  return <path d={arc} stroke={W.door} strokeWidth="1.5" fill={W.door} fillOpacity="0.08" />;
}

// ──────────────────────────────────────────────────────────────
// Floor plans
// ──────────────────────────────────────────────────────────────
const PLANS: Record<PlanSize, React.ReactNode> = {

  // ── SMALL (20–35 m²) ──────────────────────────────────────
  small: (
    <>
      {/* Outer walls */}
      <rect x="60" y="60" width="380" height="280" rx="2" stroke={W.wall} strokeWidth="3" />

      {/* Partition: main space / bath */}
      <line x1="60" y1="220" x2="220" y2="220" stroke={W.wall} strokeWidth="2.5" />
      <line x1="220" y1="60" x2="220" y2="340" stroke={W.wall} strokeWidth="2.5" />

      {/* Doors */}
      <Door x={220} y={220} width={32} direction="right" />
      <Door x={440} y={200} width={32} direction="left" />

      {/* Room labels */}
      <Label x={340} y={185} text="ESPACIO PRINCIPAL" sub="16 m²" />
      <Label x={140} y={155} text="BAÑO" sub="4 m²" />
      <Label x={140} y={280} text="HALL / KIT." sub="5 m²" />

      {/* Fixtures - bath */}
      <rect x="70" y="70" width="42" height="58" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <ellipse cx="91" cy="99" rx="16" ry="22" stroke={W.dim} strokeWidth="1" />
      <rect x="130" y="70" width="82" height="36" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <circle cx="171" cy="88" r="10" stroke={W.dim} strokeWidth="1" />

      {/* Fixtures - main desk */}
      <rect x="240" y="70" width="190" height="48" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <text x="335" y="100" textAnchor="middle" fill={W.dim} fontSize="9" fontFamily="monospace">escritorio</text>

      {/* Dimension lines */}
      <DimLine x1={60} y1={360} x2={440} y2={360} label="7.0 m" />
      <DimLine x1={20} y1={60} x2={20} y2={340} label="5.0 m" />
    </>
  ),

  // ── MEDIUM (45–65 m²) ──────────────────────────────────────
  medium: (
    <>
      {/* Outer walls */}
      <rect x="50" y="50" width="440" height="300" rx="2" stroke={W.wall} strokeWidth="3" />

      {/* Vertical partition (living | bedrooms) */}
      <line x1="250" y1="50" x2="250" y2="350" stroke={W.wall} strokeWidth="2.5" />

      {/* Horizontal partition (dorm1 | dorm2 / right side) */}
      <line x1="250" y1="190" x2="490" y2="190" stroke={W.wall} strokeWidth="2.5" />

      {/* Bath partition */}
      <line x1="50" y1="210" x2="170" y2="210" stroke={W.wall} strokeWidth="2.5" />
      <line x1="170" y1="50" x2="170" y2="350" stroke={W.wall} strokeWidth="2.5" />

      {/* Doors */}
      <Door x={250} y={280} width={30} direction="right" />
      <Door x={250} y={110} width={30} direction="right" />
      <Door x={170} y={210} width={30} direction="right" />
      <Door x={490} y={260} width={32} direction="left" />

      {/* Room labels */}
      <Label x={150} y={138} text="BAÑO" sub="4 m²" />
      <Label x={80} y={290} text="COCINA" sub="8 m²" />
      <Label x={370} y={110} text="DORMITORIO 1" sub="12 m²" />
      <Label x={370} y={280} text="DORMITORIO 2" sub="10 m²" />
      <Label x={200} y={295} text="LIVING" sub="18 m²" />

      {/* Fixtures - bath */}
      <rect x="60" y="60" width="44" height="60" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <ellipse cx="82" cy="90" rx="16" ry="23" stroke={W.dim} strokeWidth="1" />
      <rect x="115" y="60" width="50" height="32" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <circle cx="140" cy="76" r="9" stroke={W.dim} strokeWidth="1" />

      {/* Fixtures - kitchen */}
      <rect x="60" y="220" width="100" height="38" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <circle cx="80" cy="239" r="7" stroke={W.dim} strokeWidth="1" />
      <circle cx="100" cy="239" r="7" stroke={W.dim} strokeWidth="1" />
      <circle cx="120" cy="239" r="7" stroke={W.dim} strokeWidth="1" />

      {/* Fixtures - beds */}
      <rect x="260" y="60" width="80" height="60" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="270" y="68" width="60" height="44" rx="2" stroke={W.dim} strokeWidth="1" />
      <rect x="260" y="200" width="80" height="60" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="270" y="208" width="60" height="44" rx="2" stroke={W.dim} strokeWidth="1" />

      {/* Dimension lines */}
      <DimLine x1={50} y1={375} x2={490} y2={375} label="8.8 m" />
      <DimLine x1={18} y1={50} x2={18} y2={350} label="6.0 m" />
    </>
  ),

  // ── LARGE (75–95 m²) ──────────────────────────────────────
  large: (
    <>
      {/* Outer walls */}
      <rect x="40" y="40" width="480" height="340" rx="2" stroke={W.wall} strokeWidth="3" />

      {/* Vertical main partition */}
      <line x1="200" y1="40" x2="200" y2="380" stroke={W.wall} strokeWidth="2.5" />

      {/* Right side: upper / lower */}
      <line x1="200" y1="190" x2="520" y2="190" stroke={W.wall} strokeWidth="2.5" />

      {/* Right upper: dorm1 / dorm2 */}
      <line x1="360" y1="40" x2="360" y2="190" stroke={W.wall} strokeWidth="2.5" />

      {/* Left side: bath / living vertical */}
      <line x1="40" y1="200" x2="200" y2="200" stroke={W.wall} strokeWidth="2.5" />
      <line x1="115" y1="40" x2="115" y2="200" stroke={W.wall} strokeWidth="2.5" />

      {/* Right lower: dorm3 / kitchen */}
      <line x1="360" y1="190" x2="360" y2="380" stroke={W.wall} strokeWidth="2.5" />

      {/* Doors */}
      <Door x={200} y={300} width={32} direction="right" />
      <Door x={200} y={80} width={30} direction="right" />
      <Door x={360} y={100} width={30} direction="right" />
      <Door x={115} y={200} width={30} direction="right" />
      <Door x={520} y={260} width={32} direction="left" />

      {/* Room labels */}
      <Label x={78} y={130} text="BAÑO 1" sub="4 m²" />
      <Label x={155} y={310} text="BAÑO 2" sub="3 m²" />
      <Label x={155} y={110} text="COCINA" sub="10 m²" />
      <Label x={280} y={100} text="DORMITORIO 1" sub="12 m²" />
      <Label x={440} y={100} text="DORMITORIO 2" sub="12 m²" />
      <Label x={280} y={290} text="LIVING / COMEDOR" sub="22 m²" />
      <Label x={440} y={290} text="DORMITORIO 3" sub="14 m²" />

      {/* Fixtures - bath1 */}
      <rect x="50" y="50" width="58" height="50" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <ellipse cx="79" cy="75" rx="20" ry="18" stroke={W.dim} strokeWidth="1" />

      {/* Fixtures - bath2 */}
      <rect x="50" y="300" width="40" height="22" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <circle cx="132" cy="315" r="14" stroke={W.dim} strokeWidth="1.5" />

      {/* Fixtures - kitchen counter */}
      <rect x="50" y="110" width="50" height="80" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <circle cx="64" cy="128" r="6" stroke={W.dim} strokeWidth="1" />
      <circle cx="82" cy="128" r="6" stroke={W.dim} strokeWidth="1" />

      {/* Fixtures - beds */}
      <rect x="210" y="50" width="70" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="370" y="50" width="70" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="370" y="210" width="70" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />

      {/* Dimension lines */}
      <DimLine x1={40} y1={400} x2={520} y2={400} label="10.0 m" />
      <DimLine x1={12} y1={40} x2={12} y2={380} label="8.0 m" />
    </>
  ),

  // ── XL (120 m²) ───────────────────────────────────────────
  xl: (
    <>
      {/* Outer walls */}
      <rect x="30" y="30" width="500" height="360" rx="2" stroke={W.wall} strokeWidth="3" />

      {/* Main vertical spine */}
      <line x1="200" y1="30" x2="200" y2="390" stroke={W.wall} strokeWidth="2.5" />

      {/* Right: two floors */}
      <line x1="200" y1="200" x2="530" y2="200" stroke={W.wall} strokeWidth="2.5" />

      {/* Right upper: three rooms */}
      <line x1="330" y1="30" x2="330" y2="200" stroke={W.wall} strokeWidth="2.5" />
      <line x1="430" y1="30" x2="430" y2="200" stroke={W.wall} strokeWidth="2.5" />

      {/* Left: bath + wc + kitchen */}
      <line x1="100" y1="30" x2="100" y2="200" stroke={W.wall} strokeWidth="2.5" />
      <line x1="100" y1="125" x2="200" y2="125" stroke={W.wall} strokeWidth="2.5" />

      {/* Right lower: room + service */}
      <line x1="380" y1="200" x2="380" y2="390" stroke={W.wall} strokeWidth="2.5" />

      {/* Left lower */}
      <line x1="30" y1="240" x2="200" y2="240" stroke={W.wall} strokeWidth="2.5" />

      {/* Doors */}
      <Door x={200} y={320} width={32} direction="right" />
      <Door x={200} y={80} width={28} direction="right" />
      <Door x={330} y={100} width={28} direction="right" />
      <Door x={430} y={100} width={28} direction="right" />
      <Door x={380} y={290} width={28} direction="right" />
      <Door x={100} y={240} width={28} direction="right" />

      {/* Room labels */}
      <Label x={65} y={90} text="BAÑO 1" sub="5 m²" />
      <Label x={150} y={90} text="W.C." sub="3 m²" />
      <Label x={100} y={170} text="COCINA" sub="12 m²" />
      <Label x={265} y={100} text="DORM. 1" sub="14 m²" />
      <Label x={380} y={100} text="DORM. 2" sub="12 m²" />
      <Label x={480} y={100} text="DORM. 3" sub="12 m²" />
      <Label x={100} y={225} text="LAVADERO" sub="4 m²" />
      <Label x={100} y={320} text="SALA DE ESTAR" sub="16 m²" />
      <Label x={290} y={295} text="LIVING / COMEDOR" sub="28 m²" />
      <Label x={455} y={295} text="DORM. 4" sub="16 m²" />

      {/* Fixtures - baths */}
      <rect x="38" y="38" width="50" height="40" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <ellipse cx="63" cy="58" rx="17" ry="14" stroke={W.dim} strokeWidth="1" />
      <rect x="38" y="250" width="56" height="22" rx="2" stroke={W.dim} strokeWidth="1.5" />

      {/* Kitchen counter */}
      <rect x="38" y="140" width="58" height="75" rx="2" stroke={W.dim} strokeWidth="1.5" />
      <circle cx="54" cy="157" r="6" stroke={W.dim} strokeWidth="1" />
      <circle cx="74" cy="157" r="6" stroke={W.dim} strokeWidth="1" />

      {/* Beds */}
      <rect x="208" y="38" width="68" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="338" y="38" width="68" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="438" y="38" width="68" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />
      <rect x="388" y="215" width="68" height="55" rx="3" stroke={W.dim} strokeWidth="1.5" />

      {/* Dimension lines */}
      <DimLine x1={30} y1={408} x2={530} y2={408} label="12.5 m" />
      <DimLine x1={8} y1={30} x2={8} y2={390} label="10.5 m" />
    </>
  ),
};
