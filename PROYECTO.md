# ABC de la Limpieza — Resumen del proyecto

**Última actualización:** 2026-09-25 (noche final)
**URL:** https://elingenierok.github.io/abc-limpieza/
**Repo:** https://github.com/elingenierok/abc-limpieza

---

## Cómo usar este documento

- **Antes de trabajar:** pegame este `.md`. Con eso sé dónde estamos.
- **Al terminar:** actualizalo con lo hecho. Sólo las últimas 3 sesiones.

---

## Estado general

| Capa | Detalle |
|---|---|
| Backend | Supabase · 11 tablas |
| Frontend | React + Vite + Tailwind |
| Hosting | GitHub Pages |
| Router | HashRouter (URLs con `#`) |
| Deploy | `npm run deploy` (manual) |
| Bundle | ~553 KB (aviso de chunk size, no crítico) |
| Logo | `src/assets/logo.png` · header + drawer + sidebar |

---

## Módulos

| Módulo | Estado |
|---|---|
| Auth | ✅ Funcionando |
| Dashboard | ✅ Funcionando |
| Stock | ✅ Crear + editar + movimiento + producir + filtros + reserva + emojis |
| Calculadora | ✅ Sólo cálculo (2 modos) |
| Pedidos | ✅ Crear + editar + 5 estados + detalle + filtros + reserva |
| Clientes | ✅ Listar + crear + editar |
| Kits | ✅ CRUD + packaging + margen + emojis + filtro por categoría |
| Compras | ⚠️ Base lista, sin vista |
| Reportes | ⚠️ Base lista, sin vista |
| Parámetros | ⚠️ Tabla creada, sin vista |
| Agenda | ❌ No existe |
| Contable | ❌ No existe |

---

## Migraciones SQL (001-015)

| # | Qué hizo |
|---|---|
| 001 | `stock_insumos` + `movimientos` + RLS + `registrar_movimiento` |
| 002 | `kits` + `kit_items` + vista `kits_con_stock_virtual` |
| 003 | `pedidos` + `pedido_items` + `clientes` (stub) + RPCs básicas |
| 004 | Clientes ampliado + `cliente_direcciones` |
| 005 | Proveedores + órdenes de compra |
| 007 | RPCs de reportes |
| 008 | Quita CHECK de categoría de kits |
| 009 | `factor_dilucion` + `insumo_conc_relacionado` |
| 010 | `tipo` en insumos + tabla `parametros_negocio` |
| 011 | 9 insumos de packaging + kits con envases |
| 012 | `margen` por kit |
| 013 | `devuelve_envases`, `flete`, `descuento_devolucion` en pedidos |
| 014 | `devuelve_envases` en `pedido_items` |
| 015 | `stock_reservado` + RPC `actualizar_pedido` |
| 016 (RPC) | `avanzar_estado_pedido` |

Falta `006_*.sql` (nunca se creó).

---

## Tablas clave

### `stock_insumos`
`cod, nom, unidad, stock, stock_reservado, minimo, consumo_diario, precio_unit, factor_dilucion, insumo_conc_relacionado, tipo`

- `tipo`: `LIQUIDO_CONC` / `LIQUIDO_DIL` / `PACKAGING` / `KIT_ARMADO`
- `stock_disponible = stock − stock_reservado` (VIRTUAL, no se guarda)

### `kits`
`id (slug), nombre, categoria, descripcion, activo, margen`

### `kit_items`
`kit_id, item_cod, cantidad` (PK compuesta)

### `pedidos`
`id, cliente_id, estado, prioridad, fecha_compromiso, monto, obs, devuelve_envases, flete, descuento_devolucion`

- Estados: `PENDIENTE, PREPARADO, EN_CAMINO, ENTREGADO, CANCELADO`

### `pedido_items`
`pedido_id, tipo (INSUMO/KIT), item_cod, cantidad, precio_unit, devuelve_envases`

### `parametros_negocio` (fila única)
`costo_fijo_mensual, incertidumbre_pct, costo_logistica, ventas_objetivo, descuento_devolucion_pct`

### RPCs clave
- `crear_pedido` — crea + reserva stock
- `actualizar_pedido` — reemplaza items + ajusta reserva (sólo PENDIENTE)
- `avanzar_estado_pedido` — PREPARADO / EN_CAMINO / ENTREGADO / CANCELADO
- `registrar_movimiento` — movimiento atómico de stock
- `reemplazar_kit_items` — reemplaza componentes de un kit

---

## Flujo de pedidos
PENDIENTE → PREPARADO → EN_CAMINO → ENTREGADO
│ │ │
└───────────┴────────────┴──→ CANCELADO

| Estado | Reserva stock | Baja stock físico |
|---|---|---|
| PENDIENTE | Sí | No |
| PREPARADO | Mantiene | No |
| EN_CAMINO | Mantiene | No |
| ENTREGADO | Libera | Sí |
| CANCELADO | Libera | No |

**Flexible:** se puede saltar estados (no retroceder).
**ENTREGADO y CANCELADO no se pueden modificar.**

---

## Fórmulas clave

| ID | Expresión |
|---|---|
| F-001 | `cobertura_dias = stock / consumo_diario` |
| F-007 | `estado_stock` según mínimo (CRITICO/BAJO/ATENCION/OK) |
| F-009 | `max_armables = floor(min(stock / cantidad_en_kit))` |
| F-010 | `precio_kit = round(costo_base / (1 − margen) / 100) × 100` |
| F-014 | `costo_diluido = precio_concentrado / factor_dilucion` |
| F-015 | `costo_envases_kit = suma(PACKAGING)` |
| F-016 | `monto_pedido = precio_base − descuento_devolucion + flete` |
| F-017 | `stock_disponible = stock − stock_reservado` |
| F-018 | `descuento_linea = costo_envases_kit × cantidad × descuento_devolucion_pct` |

---

## Convenciones

### Códigos de insumos
| Prefijo/Sufijo | Tipo |
|---|---|
| `-CONC` | Concentrado líquido |
| `-DIL` | Diluido líquido |
| `ENV-` | Botella |
| `TAPA-` | Tapa |
| `ETQ-` | Etiqueta |
| `BOLSA-` | Bolsa |
| `CAJA-` | Caja |
| `KIT-...-ARMADO` | Kit pre-armado (a futuro) |

### Emojis (frontend, según tipo/categoría)
- 🧪 concentrado · 💧 diluido · 🍶 botella · 🔘 tapa · 🏷️ etiqueta · 📦 caja · 🛍️ bolsa
- 🏠 hogar · 🍴 cocina · 🛁 baño · 🧹 pisos · 🌳 exteriores · 🏊 pileta · ⛱️ patio

---

## Base de datos — Datos actuales

### Insumos (21)
- **6 concentrados** con stock cargado
- **6 diluidos** con stock cargado (de pruebas)
- **9 packaging** con stock cargado (de pruebas)

### Kits (8 — demo actual)
| Kit | Categoría | Precio | Armables |
|---|---|---|---|
| Cocina Básica | Cocina | $2.400 | 97 |
| Cocina Completa | Cocina | $5.000 | 48 |
| Baño Diario | Bano | $13.300 | 40 |
| Baño Premium | Bano | $21.000 | 20 |
| Baño Económico | Bano | $6.100 | 40 |
| Hogar Básico | Hogar | $4.100 | 48 |
| Hogar Completo | Hogar | $6.300 | 32 |
| Pileta Verano | Pileta | $3.500 | 20 |

### Pedidos (10 — demo)
| Estado | Cantidad |
|---|---|
| PENDIENTE | 3 |
| PREPARADO | 2 |
| EN_CAMINO | 1 |
| ENTREGADO | 3 |
| CANCELADO | 1 |

### Clientes (10)
- **Personas:** Juan Pérez, María González, Carlos Rodríguez, Lucía Fernández, Roberto Díaz
- **Empresas:** Hotel Costa Norte S.A., Colegio San Martín, Restaurant La Bahía S.R.L., Clínica Vida Sana S.A., Oficinas Delta S.R.L.

---

## Pendientes priorizados

| # | Tarea | Prioridad | Complejidad |
|---|---|---|---|
| 1 | Vista **Parámetros** (editar desde la app) | Alta | Baja |
| 2 | Cargar **precios reales de packaging** | Alta | Trivial |
| 3 | **Precios de venta de diluidos** (hoy en $0) | Media | Baja |
| 4 | **Reportes** (ranking + valorización) | Media | Baja |
| 5 | **Compras** (proveedores + órdenes) | Media | Alta |
| 6 | **Auth por rol** (repartidor sólo ve su parte) | Media | Media |
| 7 | **Agenda** (calendario de entregas) | Baja | Alta |
| 8 | **Contable** | Baja | Alta |
| 9 | **Armado de kits** (KIT_ARMADO) | Baja | Alta |

---

## Advertencias activas

| # | Advertencia | Gravedad |
|---|---|---|
| 1 | Precios de venta de diluidos están en 0 | Alta |
| 2 | Precios de packaging son ficticios | Alta |
| 3 | El armado de kits por adelantado no se refleja en stock | Media |
| 4 | `registrarProduccion` no es 100% atómico | Media |
| 5 | Sin restricción por rol en el frontend | Media |
| 6 | Los kits no guardan versión histórica | Media |
| 7 | Sin tests de integración real | Media |
| 8 | Bundle JS pesa ~553 KB | Baja |
| 9 | Deploy manual | Baja |

---

## Problemas conocidos de herramientas

- **Supabase SQL Editor:** ejecuta **sólo el último `select`** de una query con múltiples. Correr de a 1. Si necesitás varios en uno, usar `do $$ ... perform ... $$`.
- **Vite en Windows:** a veces no detecta archivos nuevos. Reiniciar Vite tras crear archivos.
- **FK a misma tabla:** Supabase no resuelve auto-joins a la misma tabla (`insumo_conc_relacionado`). Usar 2 consultas.

---

## Deploy

```powershell
git add .
git commit -m "descripción"
git push
npm run deploy