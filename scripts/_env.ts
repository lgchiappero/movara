// Carga .env / .env.local como Next antes de que otro import lea
// process.env (tiene que ser el primer import del script). Una variable ya
// definida en la terminal tiene prioridad.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
