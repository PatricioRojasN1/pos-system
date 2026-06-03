const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken, soloRoles } = require('../middleware/auth');

// GET movimientos
router.get('/', verificarToken, (req, res) => {
  const { id_producto, tipo, desde, hasta } = req.query;
  let query = `
    SELECT m.*, p.nombre_producto, p.codigo_barras, e.nombre as empleado
    FROM movimiento_inventario m
    JOIN productos p ON m.id_producto = p.id_producto
    LEFT JOIN empleados e ON m.id_empleado = e.id_empleado
    WHERE 1=1
  `;
  const params = [];
  if (id_producto) { query += ' AND m.id_producto = ?'; params.push(id_producto); }
  if (tipo) { query += ' AND m.tipo_movimiento = ?'; params.push(tipo); }
  if (desde) { query += ' AND date(m.fecha_movimiento) >= ?'; params.push(desde); }
  if (hasta) { query += ' AND date(m.fecha_movimiento) <= ?'; params.push(hasta); }
  query += ' ORDER BY m.fecha_movimiento DESC LIMIT 500';
  res.json(db.prepare(query).all(...params));
});

// POST ajuste manual
router.post('/ajuste', verificarToken, soloRoles('admin', 'gerente', 'almacenista'), (req, res) => {
  const { id_producto, tipo_movimiento, cantidad, motivo } = req.body;
  if (!id_producto || !tipo_movimiento || !cantidad || !motivo)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const producto = db.prepare('SELECT * FROM productos WHERE id_producto = ?').get(id_producto);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

  const stockAnterior = producto.stock;
  const stockNuevo = tipo_movimiento === 'ENTRADA'
    ? stockAnterior + cantidad
    : stockAnterior - cantidad;

  if (stockNuevo < 0) return res.status(400).json({ error: 'Stock no puede quedar negativo' });

  db.prepare('UPDATE productos SET stock = ? WHERE id_producto = ?').run(stockNuevo, id_producto);
  db.prepare(`
    INSERT INTO movimiento_inventario
    (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, id_empleado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id_producto, tipo_movimiento, cantidad, stockAnterior, stockNuevo, motivo, req.usuario.id_empleado);

  res.json({ mensaje: 'Ajuste registrado', stock_nuevo: stockNuevo });
});

module.exports = router;
