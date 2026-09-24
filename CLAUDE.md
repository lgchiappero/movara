@AGENTS.md

# Reglas de desarrollo MOVARA

## Antes de cada commit
- Correr tsc --noEmit — cero errores
- Correr eslint — cero errores
- Correr npm run test -- --coverage — mínimo 95% en statements, functions, lines, branches
- Correr npm run build — build limpio

## Al terminar cada feature
- Escribir tests unitarios para toda la lógica nueva
- Escribir tests e2e para los flujos críticos nuevos
- Verificar que la cobertura no bajó del 95%
- Correr el suite completo antes de git push

## Seguridad
- Nunca hardcodear credenciales
- Toda ruta /admin/* debe verificar JWT
- Toda ruta /api/admin/* debe verificar JWT
- Inputs validados con Zod en cliente y servidor
- Rate limiting en endpoints públicos

## Base de datos
- Nunca correr prisma migrate deploy sin antes verificar el diff
- Siempre generar el SQL y revisarlo antes de aplicar en Supabase producción
