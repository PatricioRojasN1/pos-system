const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken } = require('../middleware/auth');

// Reporte de ventas por periodo
router.get('/ventas', verificarToken, (req, res) => {
  const { desde, hasta } = req.query;
  const params = [];
  let filtro = "WHERE v.estado = 'COMPLETADA'";
  if (desde) { filtro += ' AND date(v.fecha_venta) >= ?'; params.push(desde); }
  if (hasta) { filtro += ' AND date(v.fecha_venta) <= ?'; params.push(hasta); }

  const resumen = db.prepare(`
    SELECT
      COUNT(*) as total_ventas,
      SUM(total) as ingreso_total,
      AVG(total) as ticket_promedio,
      SUM(descuento) as descuentos_total
    FROM ventas v ${filtro}
  `).get(...params);

  const porDia = db.prepare(`
    SELECT date(v.fecha_venta) as dia, COUNT(*) as ventas, SUM(v.total) as total
    FROM ventas v ${filtro}
    GROUP BY dia ORDER BY dia DESC
  `).all(...params);

  const porMetodo = db.prepare(`
    SELECT v.metodo_pago, COUNT(*) as ventas, SUM(v.total) as total
    FROM ventas v ${filtro}
    GROUP BY v.metodo_pago
  `).all(...params);

  res.json({ resumen, por_dia: porDia, por_metodo: porMetodo });
});

// Productos más vendidos
router.get('/top-productos', verificarToken, (req, res) => {
  const { desde, hasta } = req.query;
  let filtro = "WHERE v.estado = 'COMPLETADA'";
  const params = [];
  if (desde) { filtro += ' AND date(v.fecha_venta) >= ?'; params.push(desde); }
  if (hasta) { filtro += ' AND date(v.fecha_venta) <= ?'; params.push(hasta); }

  const top = db.prepare(`
    SELECT p.nombre_producto, p.codigo_barras,
           SUM(dv.cantidad) as unidades_vendidas,
           SUM(dv.subtotal) as ingreso,
           p.precio_compra,
           ROUND(SUM(dv.subtotal) - (p.precio_compra * SUM(dv.cantidad)), 2) as margen_aprox
    FROM detalle_venta dv
    JOIN ventas v ON dv.id_venta = v.id_venta
    JOIN productos p ON dv.id_producto = p.id_producto
    ${filtro}
    GROUP BY dv.id_producto
    ORDER BY unidades_vendidas DESC
    LIMIT 20
  `).all(...params);

  res.json(top);
});

module.exports = router;
