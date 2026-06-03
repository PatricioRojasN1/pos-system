const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken } = require('../middleware/auth');

// GET /api/productos — listar todos
router.get('/', verificarToken, (req, res) => {
  const { busqueda, categoria, activo } = req.query;
  let query = `
    SELECT p.*, c.nombre_categoria
    FROM productos p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    WHERE 1=1
  `;
  const params = [];

  if (busqueda) {
    query += ` AND (p.nombre_producto LIKE ? OR p.codigo_barras LIKE ?)`;
    params.push(`%${busqueda}%`, `%${busqueda}%`);
  }
  if (categoria) {
    query += ` AND p.id_categoria = ?`;
    params.push(categoria);
  }
  if (activo !== undefined) {
    query += ` AND p.activo = ?`;
    params.push(activo === 'false' ? 0 : 1);
  } else {
    query += ` AND p.activo = 1`;
  }

  query += ` ORDER BY p.nombre_producto`;
  const productos = db.prepare(query).all(...params);
  res.json(productos);
});

// GET /api/productos/codigo/:codigo — buscar por código de barras (para escaneo)
router.get('/codigo/:codigo', verificarToken, (req, res) => {
  const producto = db.prepare(`
    SELECT p.*, c.nombre_categoria
    FROM productos p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    WHERE p.codigo_barras = ? AND p.activo = 1
  `).get(req.params.codigo);

  if (!producto)
    return res.status(404).json({ error: 'Producto no encontrado', codigo: req.params.codigo });

  res.json(producto);
});

// GET /api/productos/alertas — stock bajo y caducidad
router.get('/alertas', verificarToken, (req, res) => {
  const stockBajo = db.prepare(`
    SELECT * FROM productos WHERE stock <= stock_minimo AND activo = 1
  `).all();

  const config = db.prepare(`SELECT valor FROM configuracion_tienda WHERE clave = 'dias_caducidad'`).get();
  const dias = parseInt(config?.valor || 30);

  const proxCaducar = db.prepare(`
    SELECT * FROM productos
    WHERE fecha_caducidad IS NOT NULL
    AND date(fecha_caducidad) <= date('now', '+' || ? || ' days')
    AND activo = 1
    ORDER BY fecha_caducidad
  `).all(dias);

  res.json({ stock_bajo: stockBajo, proximos_caducar: proxCaducar });
});

// GET /api/productos/:id
router.get('/:id', verificarToken, (req, res) => {
  const producto = db.prepare(`
    SELECT p.*, c.nombre_categoria
    FROM productos p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    WHERE p.id_producto = ?
  `).get(req.params.id);

  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// POST /api/productos — crear
router.post('/', verificarToken, (req, res) => {
  const {
    codigo_barras, nombre_producto, descripcion,
    precio_venta, precio_compra, stock, stock_minimo,
    unidad_medida, fecha_caducidad, id_categoria, id_proveedor
  } = req.body;

  if (!codigo_barras || !nombre_producto || precio_venta === undefined || precio_compra === undefined)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const existe = db.prepare('SELECT id_producto FROM productos WHERE codigo_barras = ?').get(codigo_barras);
  if (existe) return res.status(400).json({ error: 'El código de barras ya existe' });

  const result = db.prepare(`
    INSERT INTO productos
    (codigo_barras, nombre_producto, descripcion, precio_venta, precio_compra,
     stock, stock_minimo, unidad_medida, fecha_caducidad, id_categoria, id_proveedor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    codigo_barras, nombre_producto, descripcion || null,
    precio_venta, precio_compra,
    stock || 0, stock_minimo || 5,
    unidad_medida || 'pieza',
    fecha_caducidad || null,
    id_categoria || null, id_proveedor || null
  );

  res.status(201).json({ id_producto: result.lastInsertRowid, mensaje: 'Producto creado' });
});

// PUT /api/productos/:id — editar
router.put('/:id', verificarToken, (req, res) => {
  const {
    codigo_barras, nombre_producto, descripcion,
    precio_venta, precio_compra, stock_minimo,
    unidad_medida, fecha_caducidad, id_categoria, id_proveedor, activo
  } = req.body;

  const producto = db.prepare('SELECT * FROM productos WHERE id_producto = ?').get(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

  db.prepare(`
    UPDATE productos SET
      codigo_barras = ?, nombre_producto = ?, descripcion = ?,
      precio_venta = ?, precio_compra = ?, stock_minimo = ?,
      unidad_medida = ?, fecha_caducidad = ?, id_categoria = ?,
      id_proveedor = ?, activo = ?, fecha_modificacion = datetime('now')
    WHERE id_producto = ?
  `).run(
    codigo_barras ?? producto.codigo_barras,
    nombre_producto ?? producto.nombre_producto,
    descripcion ?? producto.descripcion,
    precio_venta ?? producto.precio_venta,
    precio_compra ?? producto.precio_compra,
    stock_minimo ?? producto.stock_minimo,
    unidad_medida ?? producto.unidad_medida,
    fecha_caducidad ?? producto.fecha_caducidad,
    id_categoria ?? producto.id_categoria,
    id_proveedor ?? producto.id_proveedor,
    activo !== undefined ? activo : producto.activo,
    req.params.id
  );

  res.json({ mensaje: 'Producto actualizado' });
});

// DELETE (inactivar) /api/productos/:id
router.delete('/:id', verificarToken, (req, res) => {
  db.prepare(`UPDATE productos SET activo = 0, fecha_modificacion = datetime('now') WHERE id_producto = ?`)
    .run(req.params.id);
  res.json({ mensaje: 'Producto inactivado' });
});

module.exports = router;
