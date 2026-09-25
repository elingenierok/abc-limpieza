# Proyecto ABC de la Limpieza — Bitácora

**Última actualización:** 2026-09-25 (noche)
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
| Stock | ✅ | ✅ | ✅ | Funcionando (crear + editar + movimiento + producir + filtros + reservado + disponible) |
| Calculadora | N/A | ✅ | ✅ | Funcionando (sólo cálculo) |
| Pedidos | ✅ | ✅ | ✅ | Funcionando (crear + editar + despachar + cancelar + reserva de stock) |
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
| `src/components/CrearPedidoModal.jsx` | Armar pedido (kits + packaging + devolución + flete + validación de stock) |
| `src/components/EditarPedidoModal.jsx` | Editar pedido antes de despachar (sólo PENDIENTE) |

### Frontend — Repositorios

| Archivo | Función |
|---|---|
| `src/modules/auth/auth.repo.js` | Login (delegado a AuthContext) |
| `src/modules/stock/stock.repo.js` | CRUD de insumos, movimientos, producción, F-001 y F-007, `stock_disponible` |
| `src/modules/kits/kits.repo.js` | CRUD de kits, F-009 (armables), F-010 (precio), costo de envases |
| `src/modules/pedidos/pedidos.repo.js` | Crear / editar / despachar / cancelar pedidos + parámetros |
| `src/modules/clientes/clientes.repo.js` | CRUD de clientes y direcciones |
| `src/modules/compras/compras.repo.js` | Proveedores + órdenes de compra (sin vista) |
| `src/modules/reportes/reportes.repo.js` | Ranking + valorización + resumen (sin vista) |

### Frontend — Vistas

| Archivo | Función |
|---|---|
| `src/views/LoginView.jsx` | Login |
| `src/views/Dashboard.jsx` | Panel de KPIs |
| `src/views/StockView.jsx` | Stock con filtros, badges, acciones, reservado y disponible |
| `src/views/CalculadoraView.jsx` | 2 modos de cálculo de dilución |
| `src/views/KitsView.jsx` | Listado de kits con precio y armables |
| `src/views/PedidosView.jsx` | Listado de pedidos + editar/despachar/cancelar |
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
| `supabase/migrations/013_opciones_pedido.sql` | `devuelve_envases`, `flete`, `descuento_devolucion` en pedidos + `descuento_devolucion_pct` en parámetros |
| `supabase/migrations/014_item_devuelve_envases.sql` | Columna `devuelve_envases` en `pedido_items` |
| `supabase/migrations/015_stock_reservado.sql` | Columna `stock_reservado` en `stock_insumos` + RPC `actualizar_pedido` |

**Nota:** falta `006_*.sql` (nunca se creó).

---

## Árbol de base de datos

### `stock_insumos`

| Columna | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `cod` | text | NO | — | PK. Slug del insumo |
| `nom` | text | NO | — | Nombre visible |
| `unidad` | text | NO | — | `L` / `U` / `PAR` / `KG` |
| `stock` | numeric | NO | 0 | Check ≥ 0. Stock FÍSICO real |
| `stock_reservado` | numeric | NO | 0 | Check ≥ 0. Reservado por pedidos PENDIENTES |
| `minimo` | numeric | NO | 0 | Check ≥ 0 |
| `consumo_diario` | numeric | NO | 0 | Check ≥ 0 |
| `precio_unit` | numeric | NO | 0 | Check ≥ 0 |
| `factor_dilucion` | numeric | SÍ | — | Check > 1 si no nulo |
| `insumo_conc_relacionado` | text | SÍ | — | FK a `stock_insumos.cod` |
| `tipo` | text | SÍ | — | `LIQUIDO_CONC` / `LIQUIDO_DIL` / `PACKAGING` / `KIT_ARMADO` |

**Importante:** `stock_disponible = stock − stock_reservado`. Es VIRTUAL, no se guarda.

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
| `descuento_devolucion_pct` | numeric | NO | 0.8 | Check 0 ≤ pct ≤ 1 |
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
| `devuelve_envases` | boolean | NO | false |
| `flete` | numeric | NO | 0 | Check ≥ 0 |
| `descuento_devolucion` | numeric | NO | 0 | Check ≥ 0 |

### `pedido_items`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `pedido_id` | uuid | NO | FK cascade |
| `tipo` | text | NO | Check: INSUMO / KIT |
| `item_cod` | text | NO | FK polimórfica por trigger |
| `cantidad` | numeric | NO | Check > 0 |
| `precio_unit` | numeric | NO | Default 0 |
| `devuelve_envases` | boolean | NO | Default false |

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
| `crear_pedido(...)` | Crea pedido + items. **Reserva stock.** Acepta `devuelve_envases`, `flete`, `descuento_devolucion` y `devuelve_envases` por línea |
| `despachar_pedido(...)` | **Baja stock físico + libera reserva.** Cambia estado a ENTREGADO |
| `cancelar_pedido(...)` | **Libera reserva.** Cambia estado a CANCELADO |
| `actualizar_pedido(...)` | **Reemplaza items y ajusta delta de reserva.** Sólo PENDIENTE |
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

## Estados del pedido

| Estado | Significado | ¿Reserva stock? | ¿Descuenta stock físico? |
|---|---|---|---|
| `BORRADOR` | Recién creado, sin confirmar | No | No |
| `PENDIENTE` | Confirmado, esperando preparación | **Sí** | No |
| `PREPARADO` | Alguien ya armó el pedido físicamente | Mantiene reserva | No |
| `EN_CAMINO` | Cargado en el vehículo, en distribución | Mantiene reserva | No |
| `ENTREGADO` | Entregado al cliente, cobrado | Libera reserva | **Sí** |
| `CANCELADO` | Cancelado | Libera reserva | No |

**Flujo normal:** BORRADOR → PENDIENTE → PREPARADO → EN_CAMINO → ENTREGADO.

**En la práctica hoy se usan sólo PENDIENTE y ENTREGADO.** Los otros están disponibles para futuro.

**Reglas:**
- Al crear un pedido: estado = PENDIENTE, se reserva stock.
- Al despachar: estado = ENTREGADO, se descuenta stock físico y se libera reserva.
- Al cancelar: estado = CANCELADO, se libera reserva (no toca stock físico).
- Un pedido ENTREGADO no se puede cancelar.
- Sólo se pueden editar pedidos en PENDIENTE (o BORRADOR).

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
- Bug resuelto: `precio_concentrado` y `factor_concentrado` ahora se resuelven en consulta separada.

### Bloque 10 — Opciones de pedido + verificación de despacho

- Migración `013`: `devuelve_envases`, `flete`, `descuento_devolucion` en `pedidos` + `descuento_devolucion_pct` en `parametros_negocio`.
- `kits.repo.js` expone `costo_envases` por kit.
- Verificado empíricamente: `despachar_pedido` ya descuenta packaging.
- Base limpiada: pedidos de prueba borrados.

### Bloque 11 — Opciones por línea + modal nuevo

- Migración `014`: `devuelve_envases` en `pedido_items`.
- `crear_pedido` modificado: acepta 3 parámetros nuevos y guarda `devuelve_envases` por línea.
- `pedidos.repo.js` actualizado.
- `CrearPedidoModal.jsx` REESCRITO: kits + packaging + checks + validación de disponible.
- Fix aplicado: input de cantidad fuerza enteros (`min="1"`, `Math.floor`).

### Bloque 12 — Modelo de reserva de stock (COMPLETO)

- **Migración `015`:** columna `stock_reservado` en `stock_insumos`.
- **`stock.repo.js`:** `conDerivados` ahora calcula `stock_disponible = stock − stock_reservado`.
- **`crear_pedido`:** explota kits, valida disponible, reserva stock (sube `stock_reservado`, no toca `stock`).
- **`despachar_pedido`:** baja `stock` físico Y libera `stock_reservado`. Todo atómico.
- **`cancelar_pedido`:** libera `stock_reservado` sin tocar `stock` físico.
- **`actualizar_pedido` (NUEVO):** libera reserva vieja, valida disponible, reserva nueva, reemplaza items, recalcula monto. Sólo PENDIENTE.
- **Bug resuelto:** `actualizar_pedido` con `temp tables` no liberaba la reserva vieja. Se reescribió con CTEs directas.
- **`StockView.jsx`:** muestra Físico + Disponible + badge púrpura si hay reserva.
- **`CrearPedidoModal.jsx`:** calcula requerimientos consolidados, valida contra `stock_disponible`, bloquea guardar si hay faltantes.
- **`EditarPedidoModal.jsx` (NUEVO):** modal completo con todos los campos editables (excepto cliente). Validación de faltantes considera la reserva propia del pedido.
- **`PedidosView.jsx`:** botón Editar en pedidos PENDIENTES. Badges "+ Flete" y "Dev. envases" si aplica.
- **`pedidos.repo.js`:** nueva función `actualizarPedido`.

**Verificado empíricamente end-to-end:** crear → editar → despachar → stock baja correctamente → reserva se libera.

---

## Base de datos — Estado actual

### Insumos (21)

**Concentrados (6):**

| Código | Nombre | Stock | Precio/L | Factor |
|---|---|---|---|---|
| `DET-ULTRA-CONC` | Detergente Ultra Plus | 17 | $5.006 | x5 |
| `DES-LISO-CONC` | Lisoform Plus | 1 | $12.100 | x51 |
| `BAS-SUAV-CONC` | Suavizante Flores Silvestres | 10 | $13.326 | x10 |
| `JAB-ROPA-CONC` | Jabón Azul Ropa | 13 | $6.663 | x5 |
| `MUL-AZUL-CONC` | Multiuso Azul | 5 | $2.700 | x5 |
| `DES-NAR-CONC` | Desengrasante Naranja | 5 | $3.780 | x5 |

**Diluidos (6):** (stock cargado con movimientos de prueba)

| Código | Nombre | Stock | Precio/L |
|---|---|---|---|
| `DET-ULTRA-DIL` | Detergente Ultra Plus | 68.5 | $0 |
| `DES-LISO-DIL` | Lisoform Plus | 30 | $0 |
| `BAS-SUAV-DIL` | Suavizante Flores Silvestres | 60 | $0 |
| `JAB-ROPA-DIL` | Jabón Azul Ropa | 69 | $0 |
| `MUL-AZUL-DIL` | Multiuso Azul | 60 | $0 |
| `DES-NAR-DIL` | Desengrasante Naranja | 60 | $0 |

**Packaging (9):** (stock cargado con movimientos de prueba)

| Código | Nombre | Stock | Precio |
|---|---|---|---|
| `ENV-SLOT-500` | Botella Slot 500 cc PET | 97 | $500 |
| `ENV-SLOT-600` | Botella Slot 600 cc PET | 100 | $550 |
| `ENV-SLOT-1500` | Botella Slot 1.5 L PET | 100 | $1.200 |
| `ENV-OIL-900` | Botella Oil 900 cc PET | 100 | $900 |
| `TAPA-28410` | Tapa 28/410 con precinto y liner | 397 | $80 |
| `ETQ-GENERICA` | Etiqueta genérica | 197 | $100 |
| `CAJA-CARTON` | Caja de cartón | 197 | $100 |
| `BOLSA-PLAST` | Bolsa plástica | 200 | $80 |
| `BOLSA-TELA` | Bolsa de tela ecológica | 100 | $200 |

### Kits (3)

| ID | Nombre | Margen | Componentes | Precio | Costo envases |
|---|---|---|---|---|---|
| `kit-a-hogar-basico` | Hogar Básico | 50% | 1 líquido + 4 packaging | $2.600 | $780 |
| `kit-a-cocina-express` | Cocina Express | 50% | 2 líquidos + 4 packaging | $4.500 | $1.360 |
| `kit-a-bano-diario` | Baño Diario | 50% | 2 líquidos + 4 packaging | $13.500 | $2.760 |

### Parámetros de negocio (1)

| Parámetro | Valor |
|---|---|
| `costo_fijo_mensual` | $30.000 |
| `incertidumbre_pct` | 15% |
| `costo_logistica` | $1.200 |
| `ventas_objetivo` | 100 |
| `descuento_devolucion_pct` | 0.8 |

### Clientes (10)

**Personas:** Juan Pérez, María González, Carlos Rodríguez, Lucía Fernández, Roberto Díaz.
**Empresas:** Hotel Costa Norte S.A., Colegio San Martín, Restaurant La Bahía S.R.L., Clínica Vida Sana S.A., Oficinas Delta S.R.L.

---

## Fórmula de precio del kit

    costo_diluido = precio_concentrado / factor_dilucion
    costo_unitario_componente = costo_diluido × cantidad    (para LIQUIDO_DIL)
    costo_unitario_componente = precio_unit × cantidad      (para PACKAGING, LIQUIDO_CONC)
    costo_base = suma(costo_unitario_componente)
    precio_venta = costo_base / (1 − margen)    [margen real]
    precio_final = redondear_a_centena(precio_venta)

---

## Fórmula del pedido

    precio_base = suma(precio_item × cantidad)                 [kits + packaging suelto]
    descuento_linea = costo_envases_kit × cantidad × 0.8       [sólo si es KIT y devuelve_envases=true]
    descuento_total = suma(descuento_linea)
    neto = precio_base − descuento_total
    flete = parametros_negocio.costo_logistica (si el check está tildado)
    monto = neto + flete

**El descuento por devolución sólo afecta al `monto`. No afecta stock.**

---

## Fórmula de reserva de stock

    stock_disponible = stock − stock_reservado

**Al crear pedido:** `stock_reservado = stock_reservado + cantidad_requerida` (por insumo).
**Al despachar:** `stock = stock − cantidad_requerida` Y `stock_reservado = stock_reservado − cantidad_requerida`.
**Al cancelar:** sólo `stock_reservado = stock_reservado − cantidad_requerida`.

---

## Ideas a futuro

### Botón "Ver resumen" en tarjetas de pedido (NUEVO)

**Objetivo:** desde la lista de pedidos, poder ver el detalle completo sin abrir el modal de edición.

**Qué debería mostrar:**

- Ítems del pedido (kits + cantidades + packaging suelto).
- Checks aplicados (devolución de envases por línea).
- Subtotal, descuento por devolución, flete, total.
- Estado del pedido y fechas.
- Cliente y observaciones.

**Idea:** botón "Ver detalle" o ícono de ojo que abra un modal liviano de sólo lectura.

**Estado:** pendiente implementar.

### Iconos de clasificación visual rápida

| Tipo | Icono |
|---|---|
| `LIQUIDO_CONC` | 🧪 |
| `LIQUIDO_DIL` | 💧 |
| `PACKAGING` - envases | 🍾 |
| `PACKAGING` - botellas | 🍶 |
| `PACKAGING` - bolsas | 🛍️ |
| `PACKAGING` - cajas | 📦 |
| `KIT_ARMADO` | 🧴 |

| Categoría kit | Icono |
|---|---|
| Hogar | 🏠 |
| Cocina | 🍴 |
| Bano | 🛁 |
| Pisos | 🧹 |
| Exteriores | 🌳 |
| Pileta | 🏊 |
| Patio | ⛱️ |

### Filtro "Kits Armados" en Stock

Cuando se implemente `KIT_ARMADO`:

    [Todos] [Concentrados] [Diluidos] [Packaging] [Kits Armados]

### Armado de kits por adelantado

Hoy no se refleja en stock. A futuro: crear insumo `KIT-XXX-ARMADO` y registrar 2 movimientos (baja componentes, alta armado).

### Calculadora de dilución inversa

`CalculadoraView.jsx` ya tiene los 2 modos. Pendiente: botón "Ejecutar producción" que dispare `registrarProduccion`.

---

## Pendientes priorizados

| # | Tarea | Prioridad | Complejidad |
|---|---|---|---|
| 1 | **Botón "Ver resumen" en tarjetas de pedido** | Alta | Baja |
| 2 | **Vista Parámetros** (editar desde la app) | Alta | Baja |
| 3 | **Cargar precios reales de packaging** | Alta | Trivial |
| 4 | **Precios de venta de diluidos** (hoy en $0) | Media | Baja |
| 5 | **Reportes** (ranking ventas + valorización) | Media | Baja |
| 6 | **Compras** (proveedores + órdenes) | Media | Alta |
| 7 | **Auth por rol** | Media | Media |
| 8 | **Agenda** | Baja | Alta |
| 9 | **Módulo Contable** | Baja | Alta |
| 10 | **Módulo Armado de kits** (KIT_ARMADO) | Baja | Alta |
| 11 | **Iconos de clasificación visual** | Baja | Baja |

---

## Advertencias activas

| # | Advertencia | Gravedad |
|---|---|---|
| 1 | Los precios de venta de diluidos están en 0 | Alta |
| 2 | Los precios de packaging son ficticios | Alta |
| 3 | El detalle del pedido no es visible desde la lista | Alta |
| 4 | El armado de kits por adelantado no se refleja en stock | Media |
| 5 | `registrarProduccion` no es 100% atómico | Media |
| 6 | Todos los usuarios ven todo (no hay restricción por rol) | Media |
| 7 | Los kits no guardan versión histórica | Media |
| 8 | Sin tests de integración real | Media |
| 9 | Categorías de kits sin normalizar | Baja |
| 10 | URLs con `#` (HashRouter) | Cosmético |
| 11 | Deploy manual | Baja |

---

## Convenciones de nomenclatura

### Insumos — Sufijos

| Sufijo | Tipo |
|---|---|
| `-CONC` | Concentrado |
| `-DIL` | Diluido |

### Otros prefijos

| Prefijo | Tipo |
|---|---|
| `ENV-` | Envase / Botella |
| `TAPA-` | Tapa |
| `ETQ-` | Etiqueta |
| `BOLSA-` | Bolsa |
| `CAJA-` | Caja |
| `KIT-...-ARMADO` | Kit pre-armado |

### Kits

- **ID:** slug del nombre en minúsculas.
- **Categorías:** Hogar, Cocina, Bano, Pisos, Exteriores, Pileta, Patio.
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
| F-015 | `costo_envases_kit = suma(precio_unit × cantidad)` de componentes `PACKAGING` | `kits.repo.js` | Activa |
| F-016 | `monto_pedido = precio_base − descuento_devolucion + flete` | `CrearPedidoModal.jsx` | Activa |
| F-017 | `stock_disponible = stock − stock_reservado` | `stock.repo.js` | Activa |
| F-018 | `descuento_linea = costo_envases_kit × cantidad × descuento_devolucion_pct` | `CrearPedidoModal.jsx` | Activa |

---

## Flujo de trabajo para cambios

    git add .
    git commit -m "descripción"
    git push
    npm run deploy

En 30 segundos la URL pública refleja los cambios.

---

## Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-09-25 (noche) | Bloque 12: Modelo de reserva COMPLETO. Migración 015. 4 RPCs modificadas. `StockView` muestra disponible. `CrearPedidoModal` valida. `EditarPedidoModal` creado. `PedidosView` con botón Editar. Verificado end-to-end |
| 2026-09-25 | Bloque 11: Migración 014. `crear_pedido` con opciones. `CrearPedidoModal` reescrito |
| 2026-09-23 (noche) | Migración 013 (opciones de pedido). `kits.repo.js` con `costo_envases`. Verificación de `despachar_pedido` |
| 2026-09-23 (tarde) | Migración 010 (tipo + parámetros). Migración 011 (packaging). Migración 012 (margen) |
| 2026-09-23 | Actualización completa del `.md` con árboles de archivos y BD |
| 2026-09-22 | Módulo Calculadora + Módulo Producción. Filtros por tipo en Stock |
| 2026-09-18 | Deploy a GitHub Pages. HashRouter. `.gitignore` |

---

## Cómo usar este documento

- **Antes de cada jornada:** pegar este documento en el chat para que la IA sepa el estado actual.
- **Al finalizar cada jornada:** pegar este documento para que la IA lo actualice.
- **Cada decisión nueva:** agregar en la sección correspondiente.
- **Cada problema detectado:** agregar a "Advertencias".