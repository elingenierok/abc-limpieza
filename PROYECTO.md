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
| Stock | ✅ | ✅ | ✅ | Funcionando (crear + editar + movimiento + producir) |
| Calculadora | N/A | ✅ | ✅ | Funcionando (sólo cálculo) |
| Pedidos | ✅ | ✅ | ✅ | Funcionando (listar + despachar + cancelar) |
| Clientes | ✅ | ✅ | ✅ | Funcionando (listar + crear + editar) |
| Kits | ✅ | ✅ | ✅ | Funcionando (listar + crear + editar + eliminar) |
| Compras | ✅ | ✅ | ❌ | Sin vista |
| Reportes | ✅ | ✅ | ❌ | Sin vista |
| Parámetros | ❌ | ❌ | ❌ | No existe |
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
| `src/components/InsumoModal.jsx` | Crear/editar insumo (con factor dilución y relación CONC/DIL) |
| `src/components/MovimientoModal.jsx` | Entrada / Salida / Ajuste de stock |
| `src/components/ProduccionModal.jsx` | Ejecutar dilución de concentrado → diluido |
| `src/components/KitModal.jsx` | Crear/editar kit y sus componentes |
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
| `creado_en` | timestamptz | NO | `now()` |

### `kit_items`

| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `kit_id` | text | NO | FK a `kits.id`, cascade |
| `item_cod` | text | NO | FK a `stock_insumos.cod`, restrict |
| `cantidad` | numeric | NO | Check > 0 |

PK compuesta: (`kit_id`, `item_cod`).

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
| `DET-ULTRA-DIL` | Detergente Ultra Plus | $0 |
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

## Ideas a futuro — Modelo de 4 tipos de insumo

### El problema

Hoy `stock_insumos` sólo contiene líquidos. Cuando agreguemos envases, tapas, etiquetas, cajas, bolsas, etc., va a ser difícil distinguirlos.

Además, hoy **no hay forma de stockear kits armados**. Si armás 10 kits por adelantado, el sistema no lo sabe: los envases figuran como disponibles hasta que se venden.

### La solución propuesta

Agregar una columna `tipo` a `stock_insumos` con 4 valores:

| tipo | Qué agrupa | Ejemplos |
|---|---|---|
| `LIQUIDO_CONC` | Concentrados líquidos | `DET-ULTRA-CONC` |
| `LIQUIDO_DIL` | Diluidos listos para vender | `DET-ULTRA-DIL` |
| `PACKAGING` | Envases, tapas, etiquetas, bolsas, cajas | `ENV-05L`, `TAPA-A`, `ETQ-HOGAR` |
| `KIT_ARMADO` | Kits pre-armados (si se decide stockearlos) | `KIT-COCINA-ARMADO` |

### Cómo se comportaría

| Acción | Efecto en stock |
|---|---|
| Comprar concentrado | +`LIQUIDO_CONC` |
| Diluir | −`LIQUIDO_CONC`, +`LIQUIDO_DIL` |
| Comprar envases | +`PACKAGING` |
| Armar kit (a futuro) | −`LIQUIDO_DIL`, −`PACKAGING`, +`KIT_ARMADO` |
| Vender kit sin armar | −`LIQUIDO_DIL`, −`PACKAGING` |
| Vender kit armado | −`KIT_ARMADO` |

### Ventajas

- Los envases se gestionan como insumos: stock, movimientos, órdenes de compra.
- Los kits pre-armados tienen stock real.
- El filtro de Stock (`LIQUIDO_CONC` / `LIQUIDO_DIL` / `PACKAGING` / `KIT_ARMADO`) permite ver cada grupo por separado.
- Se reutiliza toda la infraestructura existente (`stock_insumos`, `movimientos`, `registrar_movimiento`).

### Complicaciones a resolver

| # | Complicación | Nota |
|---|---|---|
| 1 | `kit_items` hoy sólo apunta a insumos. Con `PACKAGING` apunta también a envases | Se resuelve sin cambios: `stock_insumos` incluye todos |
| 2 | `despachar_pedido` hoy descuenta insumos del kit. Con `PACKAGING` debe descontar también | Modificar el RPC |
| 3 | `kits_con_stock_virtual` calcula `max_armables` con todos los componentes. Con envases, el envase también limita | OK sin cambios: el cálculo `floor(min(stock/cantidad))` ya lo maneja |
| 4 | El precio del kit debe sumar líquidos + envases | Cambiar `calcularPrecioKit` |
| 5 | El armado de kits por adelantado no está modelado. Opción C futura: crear insumo `KIT-XXX-ARMADO` y registrar 2 movimientos (baja componentes, alta armado) | Decisión pendiente |

### Precio del kit (nueva fórmula)

Traída del Excel `CALCULADORA.xlsx`:
costo_diluido = precio_concentrado / factor_dilucion
costo_envases = suma(envases, tapas, etiquetas)
costo_base = costo_diluido + costo_envases + otros
precio_venta = (costo_base × (1 + margen)) + (costo_fijo / ventas_objetivo)
precio_con_flete = precio_venta + costo_logistica


### Parámetros de negocio (nueva tabla `parametros_negocio`)

| Parámetro | Valor actual | Editable desde |
|---|---|---|
| `costo_fijo_mensual` | $30.000 | Vista Parámetros |
| `incertidumbre_pct` | 15% | Vista Parámetros |
| `costo_logistica` | $1.200 | Vista Parámetros |
| `ventas_objetivo` | 100 | Vista Parámetros |

### Opciones en la venta

Al crear un pedido, se podrán tildar:

| Opción | Efecto |
|---|---|
| **Líquidos** | Cobra el contenido líquido |
| **Envases** | Cobra envase + tapa + etiqueta |
| **Flete** | Suma el costo de logística |

Una venta típica con los 3 marcados. Una entrega en barrio a varios clientes: sin flete.

---

## Pendientes priorizados

| # | Tarea | Prioridad | Complejidad |
|---|---|---|---|
| 1 | **Migración `tipo` en `stock_insumos`** | Alta | Baja |
| 2 | **Migración `parametros_negocio`** | Alta | Baja |
| 3 | **Migración columnas de packaging en `kits`** | Alta | Baja |
| 4 | **Cargar insumos de packaging reales** | Alta | Baja |
| 5 | **Actualizar `kits.repo.js`** con fórmula del Excel | Alta | Media |
| 6 | **Actualizar `KitModal.jsx`** para agregar envases | Alta | Media |
| 7 | **Actualizar `despachar_pedido` (RPC)** para descontar envases | Alta | Media |
| 8 | **Actualizar `CrearPedidoModal.jsx`** con sólo kits + opciones | Alta | Media |
| 9 | **Vista Parámetros** | Media | Baja |
| 10 | **Detalle de pedido** | Alta | Baja |
| 11 | **Reportes** | Media | Baja |
| 12 | **Compras** | Media | Alta |
| 13 | **Auth por rol** | Media | Media |
| 14 | **Agenda** | Baja | Alta |
| 15 | **Módulo Contable** | Baja | Alta |
| 16 | **Módulo Armado de kits** | Baja | Alta |

---

## Advertencias activas

| # | Advertencia | Gravedad |
|---|---|---|
| 1 | El modal de pedidos no permite agregar kits | Alta |
| 2 | El detalle del pedido no es visible | Alta |
| 3 | Los precios de venta de diluidos están en 0 | Alta |
| 4 | El precio del kit no incluye envases ni margen real | Alta |
| 5 | El armado de kits por adelantado no se refleja en stock | Media |
| 6 | `registrarProduccion` no es 100% atómico (2 llamadas seguidas) | Media |
| 7 | Todos los usuarios ven todo (no hay restricción por rol) | Media |
| 8 | Los kits no guardan versión histórica | Media |
| 9 | Sin tests de integración real | Media |
| 10 | Categorías de kits sin normalizar | Baja |
| 11 | URLs con `#` (HashRouter) | Cosmético |
| 12 | Deploy manual | Baja |

---

## Convenciones de nomenclatura

### Insumos — Sufijos

| Sufijo | Tipo | Significado |
|---|---|---|
| `-CONC` | Concentrado | Materia prima líquida |
| `-DIL` | Diluido | Líquido listo para vender |
| `-PACK` (a futuro) | Packaging | Envases, tapas, etiquetas |

### Otros prefijos sugeridos (a futuro)

| Prefijo | Tipo |
|---|---|
| `ENV-` | Envase |
| `TAPA-` | Tapa |
| `ETQ-` | Etiqueta |
| `BOLSA-` | Bolsa |
| `CAJA-` | Caja |
| `KIT-...-ARMADO` | Kit pre-armado |

### Kits

- **ID:** slug del nombre en minúsculas (`kit-a-hogar-basico`).
- **Categorías sugeridas:** Hogar, Cocina, Bano, Pisos, Exteriores, Pileta, Patio.

### Estados de stock

`CRITICO` · `BAJO` · `ATENCION` · `OK` (sin tildes).

### Estados de pedido

`BORRADOR` · `PENDIENTE` · `PREPARADO` · `EN_CAMINO` · `ENTREGADO` · `CANCELADO`.

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
| F-014 (a futuro) | `costo_diluido = precio_concentrado / factor_dilucion` | `kits.repo.js` |
| F-015 (a futuro) | `precio_venta = (costo_base × (1 + margen)) + (costo_fijo / ventas_objetivo)` | `kits.repo.js` |

---

## Flujo de trabajo para cambios

```powershell
git add .
git commit -m "descripción"
git push
npm run deploy

## Registro de sesiones

| Fecha | Qué se hizo |
|---|---|
| 2026-09-18 | Deploy a GitHub Pages. HashRouter. `.gitignore` |
| 2026-09-22 | Módulo Calculadora + Módulo Producción. Filtros por tipo en Stock |
| 2026-09-23 | Actualización completa del `.md` con árboles de archivos y BD. Definición del modelo de 4 tipos |