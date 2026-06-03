const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken, soloRoles } = require('../middleware/auth');

// GET /api/ventas
router.get('/', verificarToken, (req, res) => {
  const { desde, hasta, estado, id_empleado } = req.query;
  let query = `
    SELECT v.*, c.nombre as cliente_nombre, e.nombre as empleado_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
    LEFT JOIN empleados e ON v.id_empleado = e.id_empleado
    WHERE 1=1
  `;
  const params = [];

  if (desde) { query += ` AND date(v.fecha_venta) >= ?`; params.push(desde); }
  if (hasta) { query += ` AND date(v.fecha_venta) <= ?`; params.push(hasta); }
  if (estado) { query += ` AND v.estado = ?`; params.push(estado); }
  if (id_empleado) { query += ` AND v.id_empleado = ?`; params.push(id_empleado); }

  query += ` ORDER BY v.fecha_venta DESC LIMIT 200`;
  res.json(db.prepare(query).all(...params));
});

// GET /api/ventas/:id
router.get('/:id', verificarToken, (req, res) => {
  const venta = db.prepare(`
    SELECT v.*, c.nombre as cliente_nombre, e.nombre as empleado_nombre
    FROM ventas v
    LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
    LEFT JOIN empleados e ON v.id_empleado = e.id_empleado
    WHERE v.id_venta = ?
  `).get(req.params.id);

  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

  const detalles = db.prepare(`
    SELECT dv.*, p.nombre_producto, p.codigo_barras, p.unidad_medida
    FROM detalle_venta dv
    JOIN productos p ON dv.id_producto = p.id_producto
    WHERE dv.id_venta = ?
  `).all(req.params.id);

  res.json({ ...venta, detalles });
});

// POST /api/ventas — crear venta completa
router.post('/', verificarToken, (req, res) => {
  const { id_cliente, items, metodo_pago, descuento, notas } = req.body;
  const id_empleado = req.usuario.id_empleado;

  if (!items || items.length === 0)
    return res.status(400).json({ error: 'La venta debe tener al menos un producto' });

  // Transacción completa
  const realizarVenta = db.transaction(() => {
    // Obtener tasa de impuesto
    const configIva = db.prepare(`SELECT valor FROM configuracion_tienda WHERE clave = 'tasa_impuesto'`).get();
    const tasaIva = parseFloat(configIva?.valor || 0) / 100;

    // Validar stock y calcular totales
    let subtotal = 0;
    const detalles = [];

    for (const item of items) {
      const producto = db.prepare('SELECT * FROM productos WHERE id_producto = ? AND activo = 1').get(item.id_producto);
      if (!producto) throw new Error(`Producto ${item.id_producto} no encontrado`);
      if (producto.stock < item.cantidad) throw new Error(`Stock insuficiente para ${producto.nombre_producto}`);

      const itemSubtotal = producto.precio_venta * item.cantidad;
      subtotal += itemSubtotal;
      detalles.push({ ...item, precio_unitario: producto.precio_venta, subtotal: itemSubtotal, producto });
    }

    const descuentoVal = parseFloat(descuento || 0);
    const impuestos = (subtotal - descuentoVal) * tasaIva;
    const total = subtotal - descuentoVal + impuestos;

    // Insertar venta
    const venta = db.prepare(`
      INSERT INTO ventas (id_cliente, id_empleado, subtotal, impuestos, descuento, total, metodo_pago, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETADA', ?)
    `).run(
      id_cliente || 1, id_empleado,
      subtotal, impuestos, descuentoVal, total,
      metodo_pago || 'EFECTIVO', notas || null
    );

    const id_venta = venta.lastInsertRowid;

    // Insertar detalles y actualizar stock
    for (const d of detalles) {
      db.prepare(`
        INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `).run(id_venta, d.id_producto, d.cantidad, d.precio_unitario, d.subtotal);

      const stockAnterior = d.producto.stock;
      const stockNuevo = stockAnterior - d.cantidad;

      db.prepare('UPDATE productos SET stock = ? WHERE id_producto = ?').run(stockNuevo, d.id_producto);

      db.prepare(`
        INSERT INTO movimiento_inventario
        (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, referencia_tipo, id_empleado)
        VALUES (?, 'SALIDA', ?, ?, ?, 'Venta', ?, 'VENTA', ?)
      `).run(d.id_producto, d.cantidad, stockAnterior, stockNuevo, id_venta, id_empleado);
    }

    return { id_venta, total, subtotal, impuestos, descuento: descuentoVal };
  });

  try {
    const resultado = realizarVenta();
    res.status(201).json({ mensaje: 'Venta completada', ...resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/ventas/:id/cancelar
router.put('/:id/cancelar', verificarToken, soloRoles('admin', 'gerente'), (req, res) => {
  const venta = db.prepare('SELECT * FROM ventas WHERE id_venta = ?').get(req.params.id);
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
  if (venta.estado === 'CANCELADA') return res.status(400).json({ error: 'La venta ya está cancelada' });

  const cancelar = db.transaction(() => {
    db.prepare(`UPDATE ventas SET estado = 'CANCELADA' WHERE id_venta = ?`).run(req.params.id);

    const detalles = db.prepare('SELECT * FROM detalle_venta WHERE id_venta = ?').all(req.params.id);
    for (const d of detalles) {
      const producto = db.prepare('SELECT stock FROM productos WHERE id_producto = ?').get(d.id_producto);
      const stockNuevo = producto.stock + d.cantidad;
      db.prepare('UPDATE productos SET stock = ? WHERE id_producto = ?').run(stockNuevo, d.id_producto);
      db.prepare(`
        INSERT INTO movimiento_inventario
        (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia_id, referencia_tipo, id_empleado)
        VALUES (?, 'ENTRADA', ?, ?, ?, 'Cancelación de venta', ?, 'CANCELACION', ?)
      `).run(d.id_producto, d.cantidad, producto.stock, stockNuevo, req.params.id, req.usuario.id_empleado);
    }
  });

  try {
    cancelar();
    res.json({ mensaje: 'Venta cancelada y stock reintegrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
