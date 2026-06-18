const STATS = [
  { value: "+50",    label: "Casas entregadas" },
  { value: "+8",     label: "Años de experiencia" },
  { value: "100%",   label: "Fabricación argentina" },
  { value: "5 años", label: "Garantía estructural" },
];

export default function SocialProof() {
  return (
    <section className="bg-white border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-stone-100">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center lg:px-8">
              <dt className="text-3xl font-bold text-sage-500 tracking-tight">{value}</dt>
              <dd className="mt-1 text-sm text-stone-500 font-medium">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
