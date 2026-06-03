const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.get('/', verificarToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM proveedores WHERE activo = 1 ORDER BY empresa').all());
});

router.post('/', verificarToken, soloRoles('admin', 'gerente'), (req, res) => {
  const { nombre, empresa, telefono, email, direccion } = req.body;
  if (!nombre || !empresa) return res.status(400).json({ error: 'Nombre y empresa requeridos' });
  const r = db.prepare('INSERT INTO proveedores (nombre, empresa, telefono, email, direccion) VALUES (?,?,?,?,?)')
    .run(nombre, empresa, telefono||null, email||null, direccion||null);
  res.status(201).json({ id_proveedor: r.lastInsertRowid });
});

router.put('/:id', verificarToken, soloRoles('admin', 'gerente'), (req, res) => {
  const p = db.prepare('SELECT * FROM proveedores WHERE id_proveedor = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });
  const { nombre, empresa, telefono, email, direccion, activo } = req.body;
  db.prepare('UPDATE proveedores SET nombre=?,empresa=?,telefono=?,email=?,direccion=?,activo=? WHERE id_proveedor=?')
    .run(nombre??p.nombre, empresa??p.empresa, telefono??p.telefono, email??p.email, direccion??p.direccion, activo??p.activo, req.params.id);
  res.json({ mensaje: 'Proveedor actualizado' });
});

module.exports = router;
