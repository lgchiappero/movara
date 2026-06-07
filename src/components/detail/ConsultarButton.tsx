"use client";

import { useWizardStore, type WizardModel } from "@/store/wizard";

export default function ConsultarButton({ model }: { model: WizardModel }) {
  const openWizard = useWizardStore((s) => s.openWizard);

  return (
    <button
      onClick={() => openWizard(model)}
      className="block w-full text-center py-3.5 bg-sage-600 hover:bg-sage-700 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-sage-600/25 hover:-translate-y-0.5"
    >
      Me interesa este modelo
    </button>
  );
}
