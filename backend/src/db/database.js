const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = path.resolve(__dirname, 'pos.db');

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Habilitar foreign keys y WAL para mejor rendimiento
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Crear todas las tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS categorias (
    id_categoria     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE,
    descripcion      VARCHAR(200),
    activo           INTEGER NOT NULL DEFAULT 1,
    fecha_creacion   DATETIME NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor   INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         VARCHAR(100) NOT NULL,
    empresa        VARCHAR(100) NOT NULL,
    telefono       VARCHAR(15),
    email          VARCHAR(100),
    direccion      VARCHAR(200),
    activo         INTEGER NOT NULL DEFAULT 1,
    fecha_registro DATETIME NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS productos (
    id_producto        INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras      VARCHAR(50) NOT NULL UNIQUE,
    nombre_producto    VARCHAR(100) NOT NULL,
    descripcion        VARCHAR(200),
    precio_venta       DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_compra      DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock              INTEGER NOT NULL DEFAULT 0,
    stock_minimo       INTEGER NOT NULL DEFAULT 5,
    unidad_medida      VARCHAR(20) NOT NULL DEFAULT 'pieza',
    fecha_caducidad    DATE,
    activo             INTEGER NOT NULL DEFAULT 1,
    id_categoria       INTEGER,
    id_proveedor       INTEGER,
    fecha_creacion     DATETIME NOT NULL DEFAULT (datetime('now')),
    fecha_modificacion DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id_cliente     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         VARCHAR(50) NOT NULL,
    apellido       VARCHAR(50),
    telefono       VARCHAR(15),
    direccion      VARCHAR(100),
    email          VARCHAR(100) UNIQUE,
    activo         INTEGER NOT NULL DEFAULT 1,
    fecha_registro DATETIME NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS empleados (
    id_empleado        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre             VARCHAR(50) NOT NULL,
    apellido           VARCHAR(50) NOT NULL,
    telefono           VARCHAR(15),
    email              VARCHAR(100),
    puesto             VARCHAR(50) NOT NULL,
    salario            DECIMAL(10,2) DEFAULT 0,
    fecha_contratacion DATE NOT NULL,
    activo             INTEGER NOT NULL DEFAULT 1,
    fecha_creacion     DATETIME NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario     INTEGER PRIMARY KEY AUTOINCREMENT,
    username       VARCHAR(50) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    rol            VARCHAR(20) NOT NULL DEFAULT 'cajero',
    id_empleado    INTEGER,
    activo         INTEGER NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id_venta    INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente  INTEGER NOT NULL DEFAULT 1,
    id_empleado INTEGER NOT NULL,
    fecha_venta DATETIME NOT NULL DEFAULT (datetime('now')),
    subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0,
    impuestos   DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento   DECIMAL(10,2) NOT NULL DEFAULT 0,
    total       DECIMAL(10,2) NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(20) NOT NULL DEFAULT 'EFECTIVO',
    estado      VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas       VARCHAR(300),
    FOREIGN KEY (id_cliente)  REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
  );

  CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta INTEGER PRIMARY KEY AUTOINCREMENT,
    id_venta         INTEGER NOT NULL,
    id_producto      INTEGER NOT NULL,
    cantidad         INTEGER NOT NULL,
    precio_unitario  DECIMAL(10,2) NOT NULL,
    subtotal         DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_venta)    REFERENCES ventas(id_venta),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
  );

  CREATE TABLE IF NOT EXISTS compras (
    id_compra    INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proveedor INTEGER NOT NULL,
    id_empleado  INTEGER NOT NULL,
    fecha_compra DATETIME NOT NULL DEFAULT (datetime('now')),
    subtotal     DECIMAL(10,2) NOT NULL DEFAULT 0,
    total        DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado       VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas        VARCHAR(300),
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
    FOREIGN KEY (id_empleado)  REFERENCES empleados(id_empleado)
  );

  CREATE TABLE IF NOT EXISTS detalle_compra (
    id_detalle_compra INTEGER PRIMARY KEY AUTOINCREMENT,
    id_compra         INTEGER NOT NULL,
    id_producto       INTEGER NOT NULL,
    cantidad          INTEGER NOT NULL,
    precio_unitario   DECIMAL(10,2) NOT NULL,
    subtotal          DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_compra)   REFERENCES compras(id_compra),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
  );

  CREATE TABLE IF NOT EXISTS movimiento_inventario (
    id_movimiento    INTEGER PRIMARY KEY AUTOINCREMENT,
    id_producto      INTEGER NOT NULL,
    tipo_movimiento  VARCHAR(20) NOT NULL,
    cantidad         INTEGER NOT NULL,
    stock_anterior   INTEGER NOT NULL,
    stock_nuevo      INTEGER NOT NULL,
    motivo           VARCHAR(200),
    referencia_id    INTEGER,
    referencia_tipo  VARCHAR(20),
    id_empleado      INTEGER,
    fecha_movimiento DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
  );

  CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario   INTEGER,
    accion       VARCHAR(50) NOT NULL,
    entidad      VARCHAR(50) NOT NULL,
    entidad_id   INTEGER,
    resumen      VARCHAR(500),
    fecha        DATETIME NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
  );

  CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    clave       VARCHAR(50) NOT NULL UNIQUE,
    valor       VARCHAR(200) NOT NULL,
    descripcion VARCHAR(200)
  );

  CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo_barras);
  CREATE INDEX IF NOT EXISTS idx_ventas_fecha     ON ventas(fecha_venta);
  CREATE INDEX IF NOT EXISTS idx_ventas_estado    ON ventas(estado);
`);

// Datos iniciales
const clienteGeneral = db.prepare('SELECT id_cliente FROM clientes WHERE id_cliente = 1').get();
if (!clienteGeneral) {
  db.prepare(`INSERT INTO clientes (id_cliente, nombre, apellido, activo) VALUES (1, 'Cliente', 'General', 1)`).run();
}

const configExiste = db.prepare('SELECT id FROM configuracion_tienda LIMIT 1').get();
if (!configExiste) {
  const insertConfig = db.prepare('INSERT INTO configuracion_tienda (clave, valor, descripcion) VALUES (?, ?, ?)');
  const configs = [
    ['nombre_tienda', 'Mi Tienda', 'Nombre del negocio'],
    ['telefono', '', 'Teléfono de contacto'],
    ['direccion', '', 'Dirección del negocio'],
    ['tasa_impuesto', '16', 'IVA en porcentaje'],
    ['dias_caducidad', '30', 'Días de anticipación para alertar caducidad'],
  ];
  configs.forEach(c => insertConfig.run(...c));
}

console.log('✅ Base de datos lista:', dbPath);

module.exports = db;
