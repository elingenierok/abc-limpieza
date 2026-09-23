# Proyecto ABC de la Limpieza — Bitácora

**Última actualización:** 2026-09-23
**URL pública:** https://elingenierok.github.io/abc-limpieza/
**Repositorio:** https://github.com/elingenierok/abc-limpieza

---

## Estado general

| Capa | Estado |
|---|---|
| Base de datos | Supabase · 11 tablas |
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
| Stock | ✅ | ✅ | ✅ | Funcionando (crear + editar + movimiento + producir + filtros) |
| Calculadora | N/A | ✅ | ✅ | Funcionando (sólo cálculo) |
| Pedidos | ✅ | ✅ | ✅ | Funcionando (listar + despachar + cancelar) |
| Clientes | ✅ | ✅ | ✅ | Funcionando (listar + crear + editar) |
| Kits | ✅ | ✅ | ✅ | Funcionando (listar + crear + editar + eliminar + packaging + margen) |
| Compras | ✅ | ✅ | ❌ | Sin vista |
| Reportes | ✅ | ✅ | ❌ | Sin vista |
| Parámetros | ✅ (tabla) | ❌ | ❌ | Tabla creada, sin vista |
| Agenda | ❌ | ❌ | ❌ | No existe |
| Contable | ❌ | ❌ | ❌ | No existe |

---

## Árbol de archivos

### Configuración raíz

| Archivo | Función |
|---|---|
| `index.html` | Punto de entrada HTML |
| `package.json` | Dependencias y scripts |
| `vite.config.js` | Configuración Vite (base `/abc-limpieza/`) |
| `tailwind.config.js` | Configuración Tailwind |
| `postcss.config.js` | Configuración PostCSS |
| `.env` | Credenciales Supabase (NO subir a Git) |
| `.env.example` | Plantilla pública |
| `.gitignore` | Archivos ignorados por Git |
| `PROYECTO.md` | Este documento |

### Frontend — Entrada

| Archivo | Función |
|---|---|
| `src/main.jsx` | Arranque React (HashRouter + AuthProvider) |
| `src/App.jsx` | Definición de rutas |
| `src/index.css` | Estilos base Tailwind |

### Frontend — Core

| Archivo | Función |
|---|---|
| `src/core/supabase.js` | Cliente único Supabase |

### Frontend — Contexto

| Archivo | Función |
|---|---|
| `src/context/AuthContext.jsx` | Sesión activa del usuario |

### Frontend — Componentes (modales y layout)

| Archivo | Función |
|---|---|
| `src/components/Layout.jsx` | Sidebar + bottom nav + header móvil |
| `src/components/InsumoModal.jsx` | Crear/editar insumo (factor dilución + relación CONC/DIL) |
| `src/components/MovimientoModal.jsx` | Entrada / Salida / Ajuste de stock |
| `src/components/ProduccionModal.jsx` | Ejecutar dilución de concentrado → diluido |
| `src/components/KitModal.jsx` | Crear/editar kit, componentes y margen |
| `src/components/ClienteModal.jsx` | Crear/editar cliente con direcciones |
| `src/components/CrearPedidoModal.jsx` | Armar pedido (hoy sólo insumos sueltos) |

### Frontend — Repositorios

| Archivo | Función |
|---|---|
| `src/modules/auth/auth.repo.js` | Login (delegado a AuthContext) |
| `src/modules/stock/stock.repo.js` | CRUD de insumos, movimientos, producción, F-001 y F-007 |
| `src/modules/kits/kits.repo.js` | CRUD de kits, F-009 (armables), F-010 (precio) |
| `src/modules/pedidos/pedidos.repo.js` | Crear / despachar / cancelar pedidos |
| `src/modules/clientes/clientes.repo.js` | CRUD de clientes y direcciones |
| `src/modules/compras/compras.repo.js` | Proveedores + órdenes de compra (sin vista) |
| `src/modules/reportes/reportes.repo.js` | Ranking + valorización + resumen (sin vista) |

### Frontend — Vistas

| Archivo | Función |
|---|---|
| `src/views/LoginView.jsx` | Login |
| `src/views/Dashboard.jsx` | Panel de KPIs |
| `src/views/StockView.jsx` | Stock con filtros, badges, acciones |
| `src/views/CalculadoraView.jsx` | 2 modos de cálculo de dilución |
| `src/views/KitsView.jsx` | Listado de kits con precio y armables |
| `src/views/PedidosView.jsx` | Listado de pedidos + despachar/cancelar |
| `src/views/ClientesView.jsx` | Listado de clientes con buscador |
| `src/views/Placeholder.jsx` | Vista temporal para módulos sin UI |

### Migraciones SQL

| Archivo | Función |
|---|---|
| `supabase/migrations/001_stock.sql` | Tablas `stock_insumos` y `movimientos` + RLS + `registrar_movimiento` |
| `supabase/migrations/002_kits.sql` | Tablas `kits` y `kit_items` + vista `kits_con_stock_virtual` |
| `supabase/migrations/003_pedidos.sql` | Tablas `pedidos`, `pedido_items`, `clientes` (stub) + RPCs |
| `supabase/migrations/004_clientes.sql` | Ampliación de `clientes` + `cliente_direcciones` + RPCs |
| `supabase/migrations/005_compras.sql` | Tablas `proveedores`, `ordenes_compra`, `orden_compra_items` + RPCs |
| `supabase/migrations/007_reportes.sql` | RPCs de reportes |
| `supabase/migrations/008_kits_categoria_abierta.sql` | Quita CHECK de categoría |
| `supabase/migrations/009_factores_dilucion.sql` | `factor_dilucion` + `insumo_conc_relacionado` |
| `supabase/migrations/010_tipos_y_parametros.sql` | Columna `tipo` en insumos + tabla `parametros_negocio` |
| `supabase/migrations/011_packaging_y_kits.sql` | 9 insumos de packaging + kits actualizados |
| `supabase/migrations/012_margen_por_kit.sql` | Columna `margen` en `kits` |

**Nota:** falta `006_*.sql` (nunca se creó).

---

## Árbol de base de datos

### `stock_insumos`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `cod` | text | NO | — | PK. Slug del insumo |
| `nom` | text | NO | — | Nombre visible |
| `unidad` | text | NO | — | `L` / `U` / `PAR` / `KG` |
| `stock` | numeric | NO | 0 | Check ≥ 0 |
| `minimo` | numeric | NO | 0 | Check ≥ 0 |
| `consumo_diario` | numeric | NO | 0 | Check ≥ 0 |
| `precio_unit` | numeric | NO | 0 | Check ≥ 0 |
| `factor_dilucion` | numeric | SÍ | — | Check > 1 si no nulo |
| `insumo_conc_relacionado` | text | SÍ | — | FK a `stock_insumos.cod` |
| `tipo` | text | SÍ | — | `LIQUIDO_CONC` / `LIQUIDO_DIL` / `PACKAGING` / `KIT_ARMADO` |

### `movimientos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | bigint | NO | secuencia |
| `fecha` | timestamptz | NO | `now()` |
| `tipo` | text | NO | — | Check: entrada/salida/ajuste |
| `item_cod` | text | NO | — | FK a `stock_insumos.cod` |
| `cantidad` | numeric | NO | — | Check > 0 |
| `motivo` | text | SÍ | — |
| `usuario_id` | uuid | SÍ | — | FK a `auth.users.id` |

### `kits`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | text | NO | — | PK. Slug |
| `nombre` | text | NO | — |
| `categoria` | text | NO | — | Sin CHECK (abierta) |
| `descripcion` | text | SÍ | — |
| `activo` | boolean | NO | true |
| `margen` | numeric | NO | 0.5 | Check 0 ≤ margen < 1 |
| `creado_en` | timestamptz | NO | `now()` |

### `kit_items`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `kit_id` | text | NO | FK a `kits.id`, cascade |
| `item_cod` | text | NO | FK a `stock_insumos.cod`, restrict |
| `cantidad` | numeric | NO | Check > 0 |

PK compuesta: (`kit_id`, `item_cod`).

### `parametros_negocio`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | int | NO | 1 | Check id = 1 (fila única) |
| `costo_fijo_mensual` | numeric | NO | 0 | Check ≥ 0 |
| `incertidumbre_pct` | numeric | NO | 0 | Check ≥ 0 |
| `costo_logistica` | numeric | NO | 0 | Check ≥ 0 |
| `ventas_objetivo` | int | NO | 1 | Check > 0 |
| `actualizado_en` | timestamptz | NO | `now()` | |

### `clientes`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `razon_social` | text | NO | — |
| `nombre_fantasia` | text | SÍ | — |
| `cuit` | text | SÍ | — | UNIQUE |
| `condicion_iva` | text | SÍ | `'CONSUMIDOR_FINAL'` | Check 4 valores |
| `email` | text | SÍ | — |
| `telefono` | text | SÍ | — |
| `activo` | boolean | NO | true |
| `creado_en` | timestamptz | NO | `now()` |
| `limite_credito` | numeric | NO | 0 |

### `cliente_direcciones`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `cliente_id` | uuid | NO | — | FK cascade |
| `etiqueta` | text | NO | — |
| `direccion` | text | NO | — |
| `localidad` | text | NO | — |
| `provincia` | text | NO | — |
| `es_principal` | boolean | NO | false |
| `creado_en` | timestamptz | NO | `now()` |

### `pedidos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `cliente_id` | uuid | NO | — | FK restrict |
| `estado` | text | NO | `'BORRADOR'` | Check 6 valores |
| `prioridad` | text | NO | `'MEDIA'` | Check 3 valores |
| `fecha_compromiso` | date | SÍ | — |
| `monto` | numeric | NO | 0 |
| `obs` | text | SÍ | — |
| `creado_en` | timestamptz | NO | `now()` |
| `creado_por` | uuid | SÍ | — |
| `despachado_en` | timestamptz | SÍ | — |
| `cancelado_en` | timestamptz | SÍ | — |

### `pedido_items`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `pedido_id` | uuid | NO | FK cascade |
| `tipo` | text | NO | Check: INSUMO / KIT |
| `item_cod` | text | NO | FK polimórfica por trigger |
| `cantidad` | numeric | NO | Check > 0 |
| `precio_unit` | numeric | NO | Default 0 |

### `proveedores`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `razon_social` | text | NO | — |
| `cuit` | text | SÍ | — | UNIQUE |
| `email` | text | SÍ | — |
| `telefono` | text | SÍ | — |
| `direccion` | text | SÍ | — |
| `activo` | boolean | NO | true |
| `creado_en` | timestamptz | NO | `now()` |

### `ordenes_compra`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `proveedor_id` | uuid | NO | — | FK restrict |
| `estado` | text | NO | `'BORRADOR'` | Check 4 valores |
| `monto_total` | numeric | NO | 0 |
| `obs` | text | SÍ | — |
| `creado_en` | timestamptz | NO | `now()` |
| `creado_por` | uuid | SÍ | — |
| `enviado_en` | timestamptz | SÍ | — |
| `recibido_en` | timestamptz | SÍ | — |
| `cancelado_en` | timestamptz | SÍ | — |

### `orden_compra_items`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `orden_id` | uuid | NO | FK cascade |
| `item_cod` | text | NO | FK restrict |
| `cantidad` | numeric | NO | Check > 0 |
| `costo_unit` | numeric | NO | Check ≥ 0 |

### Vistas

| Vista | Función |
|---|---|
| `kits_con_stock_virtual` | Devuelve `max_armables` y `total_componentes` por kit |

### Funciones RPC

| RPC | Función |
|---|---|
| `rol_actual()` | Devuelve el rol del JWT |
| `solo_admin_operador()` | Valida rol, raise si no autorizado |
| `registrar_movimiento(...)` | Registra movimiento y actualiza stock atómicamente |
| `reemplazar_kit_items(...)` | Reemplaza componentes de un kit |
| `crear_pedido(...)` | Crea pedido + items con monto calculado |
| `despachar_pedido(...)` | Descuenta stock y cambia estado a ENTREGADO |
| `cancelar_pedido(...)` | Cancela pedido (valida estado) |
| `crear_cliente_completo(...)` | Cliente + direcciones en transacción |
| `actualizar_cliente_completo(...)` | Idem + reemplazo de direcciones |
| `crear_orden_compra(...)` | OC + items + monto |
| `enviar_orden_compra(...)` | BORRADOR → ENVIADA |
| `recibir_orden_compra(...)` | Suma stock vía `registrar_movimiento` |
| `cancelar_orden_compra(...)` | Cancela OC |
| `reportes_valorizacion_stock()` | Valorización con costo real o fallback |
| `reportes_ranking_ventas(...)` | Ranking por cantidad y facturación |
| `reportes_resumen_operativo()` | KPIs agregados |

### Triggers

| Trigger | Tabla | Función |
|---|---|---|
| `trg_validar_pedido_item` | `pedido_items` | Valida que `item_cod` exista según tipo |
| `trg_dir_principal` | `cliente_direcciones` | Sólo una dirección principal por cliente |

---

## Historial cronológico

### Bloque 0 — Base del proyecto

- Arquitectura por capas (core → modules → views).
- Supabase como backend.
- RBAC por rol (admin, operador, contador, repartidor).
- Migraciones `001_stock.sql` a `007_reportes.sql`.

### Bloque 1 — Auth y acceso

- `AuthContext.jsx` + `LoginView.jsx`.
- Roles en `raw_user_meta_data` de `auth.users`.
- `rol_actual()` y `solo_admin_operador()` en Supabase.

### Bloque 2 — Módulo Stock

- `stock.repo.js` con F-001 y F-007.
- `StockView.jsx` con badges, filtros, buscador.
- `InsumoModal.jsx` y `MovimientoModal.jsx`.
- Eliminación sólo si no tiene movimientos.

### Bloque 3 — Módulo Pedidos

- `pedidos.repo.js` con RPCs `crear_pedido`, `despachar_pedido`, `cancelar_pedido`.
- `PedidosView.jsx` + `CrearPedidoModal.jsx`.
- Despacho atómico con descuento de stock.

### Bloque 4 — Módulo Clientes

- `clientes.repo.js` con RPCs.
- `ClientesView.jsx` + `ClienteModal.jsx`.
- Direcciones múltiples.

### Bloque 5 — Módulo Kits

- `kits.repo.js` con F-009 y F-010.
- `KitsView.jsx` + `KitModal.jsx`.

### Bloque 6 — Separación CONC / DIL

- Kits se venden con producto diluido.
- Códigos `-CONC` y `-DIL`.
- 12 insumos reales.

### Bloque 7 — Deploy a GitHub Pages

- `.gitignore`, HashRouter, `base` de Vite.
- `gh-pages` + `npm run deploy`.

### Bloque 8 — Calculadora y Producción

- Migración `009`: `factor_dilucion` + `insumo_conc_relacionado`.
- `CalculadoraView.jsx` con 2 modos.
- `ProduccionModal.jsx` con ejecución atómica.
- `StockView.jsx` con botón Producir + filtros por tipo.

### Bloque 9 — Packaging + precio real

- Migración `010`: columna `tipo` + tabla `parametros_negocio`.
- Migración `011`: 9 insumos de packaging + kits actualizados.
- Migración `012`: columna `margen` por kit.
- `StockView.jsx` con filtro Packaging.
- `kits.repo.js` con F-010 nueva (margen real + costo del concentrado).
- `KitModal.jsx` con campo margen y cálculo correcto.
- **Bug resuelto:** `precio_concentrado` y `factor_concentrado` ahora se resuelven en consulta separada (Supabase no auto-resuelve FK a la misma tabla).

---

## Base de datos — Estado actual

### Insumos (21)

**Concentrados (6):**

| Código | Nombre | Stock | Precio/L | Factor |
|---|---|---|---|---|
| `DET-ULTRA-CONC` | Detergente Ultra Plus | 17 | $5.006 | x5 |
| `DES-LISO-CONC` | Lisoform Plus | 1 | $12.100 | x51 |
| `BAS-SUAV-CONC` | Suavizante Flores Silvestres | 10 | $13.326 | x10 |
| `JAB-ROPA-CONC` | Jabón Azul Ropa | 20 | $6.663 | x5 |
| `MUL-AZUL-CONC` | Multiuso Azul | 5 | $2.700 | x5 |
| `DES-NAR-CONC` | Desengrasante Naranja | 5 | $3.780 | x5 |

**Diluidos (6):**

| Código | Nombre | Stock | Precio/L |
|---|---|---|---|
| `DET-ULTRA-DIL` | Detergente Ultra Plus | 15 | $0 |
| `DES-LISO-DIL` | Lisoform Plus | 0 | $0 |
| `BAS-SUAV-DIL` | Suavizante Flores Silvestres | 0 | $0 |
| `JAB-ROPA-DIL` | Jabón Azul Ropa | 0 | $0 |
| `MUL-AZUL-DIL` | Multiuso Azul | 0 | $0 |
| `DES-NAR-DIL` | Desengrasante Naranja | 0 | $0 |

**Packaging (9):**

| Código | Nombre | Precio |
|---|---|---|
| `ENV-SLOT-500` | Botella Slot 500 cc PET | $500 |
| `ENV-SLOT-600` | Botella Slot 600 cc PET | $550 |
| `ENV-SLOT-1500` | Botella Slot 1.5 L PET | $1.200 |
| `ENV-OIL-900` | Botella Oil 900 cc PET | $900 |
| `TAPA-28410` | Tapa 28/410 con precinto y liner | $80 |
| `ETQ-GENERICA` | Etiqueta genérica | $100 |
| `CAJA-CARTON` | Caja de cartón | $100 |
| `BOLSA-PLAST` | Bolsa plástica | $80 |
| `BOLSA-TELA` | Bolsa de tela ecológica | $200 |

### Kits (3)

| ID | Nombre | Margen | Componentes | Precio |
|---|---|---|---|---|
| `kit-a-hogar-basico` | Hogar Básico | 50% | 1 líquido + 4 packaging | $2.600 |
| `kit-a-cocina-express` | Cocina Express | 50% | 2 líquidos + 4 packaging | $4.500 |
| `kit-a-bano-diario` | Baño Diario | 50% | 2 líquidos + 4 packaging | $13.500 |

### Parámetros de negocio (1)

| Parámetro | Valor |
|---|---|
| `costo_fijo_mensual` | $30.000 |
| `incertidumbre_pct` | 15% |
| `costo_logistica` | $1.200 |
| `ventas_objetivo` | 100 |

### Clientes (10)

**Personas:** Juan Pérez, María González, Carlos Rodríguez, Lucía Fernández, Roberto Díaz.
**Empresas:** Hotel Costa Norte S.A., Colegio San Martín, Restaurant La Bahía S.R.L., Clínica Vida Sana S.A., Oficinas Delta S.R.L.

---

## Fórmula de precio del kit
costo_diluido = precio_concentrado / factor_dilucion
costo_unitario_componente = costo_diluido × cantidad (para LIQUIDO_DIL)
costo_unitario_componente = precio_unit × cantidad (para PACKAGING, LIQUIDO_CONC)
costo_base = suma(costo_unitario_componente)
precio_venta = costo_base / (1 − margen) [margen real]
precio_final = redondear_a_centena(precio_venta)

**Ejemplo (Hogar Básico, margen 50%):**
Líquido: 0.5 L × ($5.006 / 5) = $500,60
Botella: 1 × $500 = $500
Tapa: 1 × $80 = $80
Etiqueta: 1 × $100 = $100
Caja: 1 × $100 = $100
Costo base = $1.280,60
Precio = $1.280,60 / 0.5 = $2.561,20
Redondeado = $2.600


---

## Ideas a futuro

### Iconos de clasificación visual rápida (NUEVO)

**Objetivo:** facilitar la búsqueda y clasificación visual dentro de las listas de Stock.

**Idea:** incorporar iconos o emojis según el tipo de insumo:

| Tipo | Icono sugerido |
|---|---|
| `LIQUIDO_CONC` | 🧪 |
| `LIQUIDO_DIL` | 💧 |
| `PACKAGING` - envases | 🍾 |
| `PACKAGING` - botellas | 🍶 |
| `PACKAGING` - bolsas | 🛍️ |
| `PACKAGING` - cajas | 📦 |
| `KIT_ARMADO` | 🧴 |

**Y por categoría de kit:**

| Categoría | Icono |
|---|---|
| Hogar | 🏠 |
| Cocina | 🍴 |
| Bano | 🛁 |
| Pisos | 🧹 |
| Exteriores | 🌳 |
| Pileta | 🏊 |
| Patio | ⛱️ |

**Nota:** los iconos se agregan a nivel frontend (no a la base). Se resuelven por `tipo` del insumo o `categoria` del kit.

### Filtro "Kits" en Stock (NUEVO)

Cuando se implemente `KIT_ARMADO` como tipo real de insumo, agregar el filtro correspondiente en `StockView.jsx`:
[Todos] [Concentrados] [Diluidos] [Packaging] [Kits Armados]

**Estado:** pendiente de implementar el modelo `KIT_ARMADO` real.

### Armado de kits por adelantado

**Decisión aceptada (Camino 1):** no se refleja en stock. Los kits armados no tienen stock propio.

**A futuro:** crear insumo `KIT-XXX-ARMADO` y registrar 2 movimientos:

- Baja componentes (líquido + packaging).
- Alta del kit armado.

### Modelo de 4 tipos de insumo

Agregar `tipo` a `stock_insumos` con 4 valores:

| tipo | Qué agrupa | Ejemplos |
|---|---|---|
| `LIQUIDO_CONC` | Concentrados líquidos | `DET-ULTRA-CONC` |
| `LIQUIDO_DIL` | Diluidos listos para vender | `DET-ULTRA-DIL` |
| `PACKAGING` | Envases, tapas, etiquetas, bolsas, cajas | `ENV-SLOT-500`, `TAPA-28410` |
| `KIT_ARMADO` | Kits pre-armados (a futuro) | `KIT-COCINA-ARMADO` |

**Estado:** los 3 primeros ya están implementados. `KIT_ARMADO` pendiente.

### Opciones en la venta

Al crear un pedido, se podrán tildar:

| Opción | Efecto |
|---|---|
| **Líquidos** | Cobra el contenido líquido |
| **Envases** | Cobra envase + tapa + etiqueta |
| **Flete** | Suma el costo de logística |

**Estado:** pendiente de implementar en `CrearPedidoModal.jsx`.

### Calculadora de dilución inversa

Ya implementada parcialmente en `CalculadoraView.jsx`.

**Pendiente:** botón "Ejecutar producción" desde la calculadora, que dispare `registrarProduccion` directamente.

---

## Pendientes priorizados

| # | Tarea | Prioridad | Complejidad |
|---|---|---|---|
| 1 | **Actualizar `despachar_pedido` (RPC) para descontar packaging** | Alta | Media |
| 2 | **Actualizar `CrearPedidoModal.jsx` con kits + opciones (flete, bolsas)** | Alta | Media |
| 3 | **Vista Parámetros** para editar costo fijo, logística, ventas objetivo | Media | Baja |
| 4 | **Detalle de pedido** (ver items antes de despachar) | Alta | Baja |
| 5 | **Reportes** (ranking ventas + valorización) | Media | Baja |
| 6 | **Compras** (proveedores + órdenes) | Media | Alta |
| 7 | **Auth por rol** (repartidor ve sólo agenda) | Media | Media |
| 8 | **Agenda** (calendario de entregas) | Baja | Alta |
| 9 | **Módulo Contable** | Baja | Alta |
| 10 | **Módulo Armado de kits** (KIT_ARMADO) | Baja | Alta |
| 11 | **Iconos de clasificación visual** | Baja | Baja |
| 12 | **Filtro "Kits Armados" en Stock** (depende de #10) | Baja | Baja |

---

## Advertencias activas

| # | Advertencia | Gravedad |
|---|---|---|
| 1 | El modal de pedidos no permite agregar kits | Alta |
| 2 | El detalle del pedido no es visible | Alta |
| 3 | Los precios de venta de diluidos están en 0 | Alta |
| 4 | Los precios de packaging son ficticios (falta cargar reales) | Alta |
| 5 | `despachar_pedido` no descuenta packaging todavía | Alta |
| 6 | El armado de kits por adelantado no se refleja en stock | Media |
| 7 | `registrarProduccion` no es 100% atómico (2 llamadas seguidas) | Media |
| 8 | Todos los usuarios ven todo (no hay restricción por rol) | Media |
| 9 | Los kits no guardan versión histórica | Media |
| 10 | Sin tests de integración real | Media |
| 11 | Categorías de kits sin normalizar | Baja |
| 12 | URLs con `#` (HashRouter) | Cosmético |
| 13 | Deploy manual | Baja |

---

## Convenciones de nomenclatura

### Insumos — Sufijos

| Sufijo | Tipo | Significado |
|---|---|---|
| `-CONC` | Concentrado | Materia prima líquida |
| `-DIL` | Diluido | Líquido listo para vender |

### Otros prefijos

| Prefijo | Tipo |
|---|---|
| `ENV-` | Envase / Botella |
| `TAPA-` | Tapa |
| `ETQ-` | Etiqueta |
| `BOLSA-` | Bolsa |
| `CAJA-` | Caja |
| `KIT-...-ARMADO` | Kit pre-armado (a futuro) |

### Kits

- **ID:** slug del nombre en minúsculas (`kit-a-hogar-basico`).
- **Categorías sugeridas:** Hogar, Cocina, Bano, Pisos, Exteriores, Pileta, Patio.
- **Margen default:** 50%.

### Estados de stock

`CRITICO` · `BAJO` · `ATENCION` · `OK` (sin tildes).

### Estados de pedido

`BORRADOR` · `PENDIENTE` · `PREPARADO` · `EN_CAMINO` · `ENTREGADO` · `CANCELADO`.

---

## Fórmulas registradas

| ID | Expresión | Vive en | Estado |
|---|---|---|---|
| F-001 | `cobertura_dias = stock / consumo_diario` | `stock.repo.js` | Activa |
| F-007 | `estado_stock` según umbrales de mínimo | `stock.repo.js` | Activa |
| F-009 | `max_armables = floor(min(stock / cantidad_en_kit))` | `kits.repo.js` | Activa |
| F-010 | `precio_kit = round(costo_base / (1 - margen) / 100) × 100` | `kits.repo.js` | Activa |
| F-011 | `produccion_diluido = cantidad_concentrado × factor_dilucion` | `ProduccionModal.jsx` | Activa |
| F-012 | `agua_a_agregar = produccion_diluido − cantidad_concentrado` | `ProduccionModal.jsx` | Activa |
| F-013 | `concentrado_necesario = litros_finales / factor_dilucion` | `CalculadoraView.jsx` | Activa |
| F-014 | `costo_diluido = precio_concentrado / factor_dilucion` | `kits.repo.js` | Activa |

---

## Flujo de trabajo para cambios

```powershell
git add .
git commit -m "descripción"
git push
npm run deploy

En 30 segundos la URL pública refleja los cambios.

Registro de sesiones
Fecha	Qué se hizo
2026-09-23 (tarde)	Migración 010 (tipo + parámetros). Migración 011 (packaging). Migración 012 (margen). Precio del kit con margen real. Bug del precio_concentrado resuelto
2026-09-23	Actualización completa del .md con árboles de archivos y BD. Definición del modelo de 4 tipos
2026-09-22	Módulo Calculadora + Módulo Producción. Filtros por tipo en Stock
2026-09-18	Deploy a GitHub Pages. HashRouter. .gitignore