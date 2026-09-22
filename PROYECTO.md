# Proyecto ABC de la Limpieza — Bitácora

**Última actualización:** 2026-09-22
**URL pública:** https://elingenierok.github.io/abc-limpieza/
**Repositorio:** https://github.com/elingenierok/abc-limpieza

---

## Estado general

| Capa | Estado |
|---|---|
| Base de datos | Supabase · 11 tablas · 12 insumos · 3 kits · 10 clientes |
| Frontend | React + Vite + Tailwind |
| Hosting | GitHub Pages |
| Router | HashRouter (URLs con `#`) |
| Deploy | Manual con `npm run deploy` |

---

## Módulos

| Módulo | Base | Repo | Vista | Estado |
|---|---|---|---|---|
| Auth | ✅ | ✅ | ✅ | Funcionando |
| Dashboard | ✅ | ✅ | ✅ | Funcionando |
| Stock | ✅ | ✅ | ✅ | Funcionando (crear + editar + movimiento + producir) |
| Calculadora | N/A | ✅ | ✅ | Funcionando (sólo cálculo, no toca stock) |
| Pedidos | ✅ | ✅ | ✅ | Funcionando (listar + despachar + cancelar) |
| Clientes | ✅ | ✅ | ✅ | Funcionando (listar + crear + editar) |
| Kits | ✅ | ✅ | ✅ | Funcionando (listar + crear + editar + eliminar) |
| Compras | ✅ | ✅ | ❌ | Sin vista |
| Reportes | ✅ | ✅ | ❌ | Sin vista |
| Agenda | ❌ | ❌ | ❌ | No existe |
| Contable | ❌ | ❌ | ❌ | No existe |

---

## Historial cronológico

### Bloque 0 — Base del proyecto

- Definición de arquitectura por capas (core → modules → views).
- Elección de Supabase como backend.
- Elección de RBAC por rol (admin, operador, contador, repartidor).
- Migraciones SQL creadas: `001_stock.sql` a `007_reportes.sql`.

### Bloque 1 — Auth y acceso

- `AuthContext.jsx` con sesión persistente.
- `LoginView.jsx`.
- Roles asignados vía `raw_user_meta_data` en `auth.users`.
- Helper `rol_actual()` y `solo_admin_operador()` en Supabase.

### Bloque 2 — Módulo Stock

- Repo completo (`stock.repo.js`) con F-001 (cobertura) y F-007 (estado).
- Vista con badges, filtros, buscador.
- Modal `InsumoModal.jsx` para crear/editar.
- Modal `MovimientoModal.jsx` para entrada/salida/ajuste.
- Eliminación sólo si no tiene movimientos.

### Bloque 3 — Módulo Pedidos

- Repo `pedidos.repo.js` con RPC `crear_pedido`, `despachar_pedido`, `cancelar_pedido`.
- Vista `PedidosView.jsx` con listado y acciones.
- Modal `CrearPedidoModal.jsx` para armar pedidos.
- Despacho descuenta stock atómicamente y registra movimientos.

### Bloque 4 — Módulo Clientes

- Repo `clientes.repo.js` con RPC `crear_cliente_completo` y `actualizar_cliente_completo`.
- Vista `ClientesView.jsx` con buscador.
- Modal `ClienteModal.jsx` con direcciones múltiples.
- Soft-delete si tiene pedidos, hard-delete si no.

### Bloque 5 — Módulo Kits

- Repo `kits.repo.js` con cálculo de `max_armables` (F-009) y `precio_calculado` (F-010).
- Vista `KitsView.jsx` con listado, precio y armables.
- Modal `KitModal.jsx` con generación automática de slug y precio en vivo.
- Redondeo de precio a la centena.

### Bloque 6 — Separación CONC / DIL

- Decisión de negocio: los kits se venden con producto **diluido**.
- Insumos separados en dos códigos: `-CONC` (materia prima) y `-DIL` (producto final).
- 12 insumos reales cargados (6 CONC + 6 DIL).
- Dilución registrada como 2 movimientos manuales (salida CONC + entrada DIL).

### Bloque 7 — Deploy a GitHub Pages

- `.gitignore` protegiendo `.env`, `node_modules`, `dist`.
- Repo público `elingenierok/abc-limpieza`.
- `vite.config.js` con `base: '/abc-limpieza/'`.
- `HashRouter` en `main.jsx` (compatible con GitHub Pages).
- `gh-pages` instalado, script `npm run deploy` funcionando.
- URL pública activa.

### Bloque 8 — Calculadora y módulo de Producción

- Migración SQL `009`: agregadas columnas `factor_dilucion` y `insumo_conc_relacionado` a `stock_insumos`.
- Factores de dilución cargados para los 6 concentrados (x5, x51, x10, x5, x5, x5).
- Cada diluido vinculado a su concentrado de origen.
- `InsumoModal.jsx` actualizado: campos condicionales según sufijo del código (`-CONC` / `-DIL`).
- `CalculadoraView.jsx` creado: 2 modos (calcular insumos para X litros finales / calcular rendimiento desde Y litros de concentrado) + tabla de referencia.
- `ProduccionModal.jsx` creado: ejecuta la dilución atómicamente (descuenta concentrado, suma diluido, registra 2 movimientos).
- `StockView.jsx` actualizado: botón "Producir" (verde) sólo visible en concentrados + filtros nuevos por tipo (Todos / Concentrados / Diluidos).
- `Calculadora` agregada al menú principal entre Kits y Pedidos.

---

## Base de datos — Estado actual

### Insumos (12)

**Concentrados:**

| Código | Nombre | Precio/L | Factor |
|---|---|---|---|
| `DET-ULTRA-CONC` | Detergente Ultra Plus | $5.006 | x5 |
| `DES-LISO-CONC` | Lisoform Plus | $12.100 | x51 |
| `BAS-SUAV-CONC` | Suavizante Flores Silvestres | $13.326 | x10 |
| `JAB-ROPA-CONC` | Jabón Azul Ropa | $6.663 | x5 |
| `MUL-AZUL-CONC` | Multiuso Azul | $2.700 | x5 |
| `DES-NAR-CONC` | Desengrasante Naranja | $3.780 | x5 |

**Diluidos:**

| Código | Nombre | Precio/L |
|---|---|---|
| `DET-ULTRA-DIL` | Detergente Ultra Plus | $0 (sin definir) |
| `DES-LISO-DIL` | Lisoform Plus | $0 |
| `BAS-SUAV-DIL` | Suavizante Flores Silvestres | $0 |
| `JAB-ROPA-DIL` | Jabón Azul Ropa | $0 |
| `MUL-AZUL-DIL` | Multiuso Azul | $0 |
| `DES-NAR-DIL` | Desengrasante Naranja | $0 |

### Kits (3)

| ID | Nombre | Categoría | Componentes |
|---|---|---|---|
| `kit-a-hogar-basico` | Hogar Básico | Hogar | 0.5 L DET-ULTRA-DIL |
| `kit-a-cocina-express` | Cocina Express | Cocina | 0.5 L DET-ULTRA-DIL + 0.75 L DES-NAR-DIL |
| `kit-a-bano-diario` | Baño Diario | Bano | 1.5 L BAS-SUAV-DIL + 1.5 L JAB-ROPA-DIL |

### Clientes (10)

**Personas:** Juan Pérez, María González, Carlos Rodríguez, Lucía Fernández, Roberto Díaz.

**Empresas:** Hotel Costa Norte S.A., Colegio San Martín, Restaurant La Bahía S.R.L., Clínica Vida Sana S.A., Oficinas Delta S.R.L.

---

## Pendientes priorizados

| # | Tarea | Prioridad | Complejidad | Notas |
|---|---|---|---|---|
| 1 | **Soporte de kits en pedidos** | Alta | Media | Hoy `CrearPedidoModal` sólo permite insumos sueltos |
| 2 | **Detalle de pedido** | Alta | Baja | Ver items antes de despachar |
| 3 | **Precios de venta de diluidos** | Alta | Baja | Hoy están en 0. Necesario para reportes |
| 4 | **Precio de venta de kits** | Alta | Baja | Se calcula como suma de componentes; falta definir margen |
| 5 | **Reportes** | Media | Baja | Ranking de ventas + valorización de stock |
| 6 | **Compras** | Media | Alta | Proveedores + órdenes de compra |
| 7 | **Auth por rol** | Media | Media | Repartidor ve sólo agenda/pedidos |
| 8 | **Agenda** | Baja | Alta | Calendario de entregas |
| 9 | **Módulo Contable** | Baja | Alta | Análisis de costos y facturación |

---

## Advertencias activas

| # | Advertencia | Gravedad |
|---|---|---|
| 1 | El modal de pedidos no permite agregar kits | Alta |
| 2 | El detalle del pedido no es visible | Alta |
| 3 | Los precios de venta de diluidos están en 0 | Alta |
| 4 | `registrarProduccion` no es 100% atómico (2 llamadas seguidas) | Media |
| 5 | Todos los usuarios ven todo (no hay restricción por rol en frontend) | Media |
| 6 | Los kits no guardan versión histórica (Camino 1 aceptado) | Media |
| 7 | Categorías de kits sin normalizar ("Hogar" ≠ "hogar") | Baja |
| 8 | URLs con `#` (HashRouter) | Cosmético |
| 9 | Sin tests de integración real (sólo unitarios con mocks) | Media |
| 10 | El precio del kit cambia retroactivamente si cambia un insumo | Media |
| 11 | Deploy manual (no automatizado con GitHub Actions) | Baja |

---

## Convenciones de nomenclatura

### Insumos

- **Concentrado:** `<NOMBRE>-CONC` (materia prima, no se vende directo)
- **Diluido:** `<NOMBRE>-DIL` (producto final, se vende y va en kits)

### Kits

- **ID:** slug del nombre en minúsculas (`kit-a-hogar-basico`)
- **Categorías sugeridas:** Hogar, Cocina, Bano, Pisos, Exteriores, Pileta, Patio

### Estados de stock

`CRITICO` · `BAJO` · `ATENCION` · `OK` (sin tildes, para filtros y URLs)

### Estados de pedido

`BORRADOR` · `PENDIENTE` · `PREPARADO` · `EN_CAMINO` · `ENTREGADO` · `CANCELADO`

---

## Fórmulas registradas

| ID | Expresión | Vive en |
|---|---|---|
| F-001 | `cobertura_dias = stock / consumo_diario` | `stock.repo.js` |
| F-007 | `estado_stock` según umbrales de mínimo | `stock.repo.js` |
| F-009 | `max_armables = floor(min(stock / cantidad_en_kit))` | `kits.repo.js` |
| F-010 | `precio_kit = round(suma(precio_unit × cantidad) / 100) × 100` | `kits.repo.js` |
| F-011 | `produccion_diluido = cantidad_concentrado × factor_dilucion` | `ProduccionModal.jsx` |
| F-012 | `agua_a_agregar = produccion_diluido − cantidad_concentrado` | `ProduccionModal.jsx` |
| F-013 | `concentrado_necesario = litros_finales / factor_dilucion` | `CalculadoraView.jsx` |

---

## Flujo de trabajo para cambios

```powershell
git add .
git commit -m "descripción"
git push
npm run deploy