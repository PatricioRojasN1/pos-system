const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, (req, res) => {
  const { busqueda } = req.query;
  let query = 'SELECT * FROM clientes WHERE activo = 1';
  const params = [];
  if (busqueda) { query += ' AND (nombre LIKE ? OR telefono LIKE ?)'; params.push(`%${busqueda}%`, `%${busqueda}%`); }
  query += ' ORDER BY nombre';
  res.json(db.prepare(query).all(...params));
});

router.post('/', verificarToken, (req, res) => {
  const { nombre, apellido, telefono, direccion, email } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const r = db.prepare('INSERT INTO clientes (nombre, apellido, telefono, direccion, email) VALUES (?, ?, ?, ?, ?)')
    .run(nombre, apellido || null, telefono || null, direccion || null, email || null);
  res.status(201).json({ id_cliente: r.lastInsertRowid });
});

router.put('/:id', verificarToken, (req, res) => {
  const { nombre, apellido, telefono, direccion, email, activo } = req.body;
  const c = db.prepare('SELECT * FROM clientes WHERE id_cliente = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
  db.prepare('UPDATE clientes SET nombre=?, apellido=?, telefono=?, direccion=?, email=?, activo=? WHERE id_cliente=?')
    .run(nombre??c.nombre, apellido??c.apellido, telefono??c.telefono, direccion??c.direccion, email??c.email, activo??c.activo, req.params.id);
  res.json({ mensaje: 'Cliente actualizado' });
});

module.exports = router;
