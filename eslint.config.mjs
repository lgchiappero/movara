import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Hora argentina en todo el sitio: los días, meses y años, y cómo se
  // muestran las fechas, salen de src/lib/fecha-ar.ts (zona fija
  // America/Argentina/Cordoba). Los métodos de Date que dependen de la zona
  // de la máquina (Vercel en UTC, el navegador, la Mac) quedan prohibidos
  // fuera de ese módulo y de los tests.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/fecha-ar.ts", "src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...[
          "getFullYear",
          "getMonth",
          "getDate",
          "getDay",
          "getHours",
          "getMinutes",
          "setFullYear",
          "setMonth",
          "setDate",
          "setHours",
          "setMinutes",
          "toLocaleDateString",
          "toLocaleTimeString",
          "getTimezoneOffset",
        ].map((metodo) => ({
          selector: `CallExpression[callee.property.name="${metodo}"]`,
          message: `${metodo}() depende de la zona horaria de la máquina: usá src/lib/fecha-ar.ts.`,
        })),
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
