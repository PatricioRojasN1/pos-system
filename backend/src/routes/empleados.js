const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.get('/', verificarToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM empleados WHERE activo = 1 ORDER BY nombre').all());
});

router.post('/', verificarToken, soloRoles('admin', 'gerente'), (req, res) => {
  const { nombre, apellido, telefono, email, puesto, salario, fecha_contratacion } = req.body;
  if (!nombre || !apellido || !puesto || !fecha_contratacion)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  const r = db.prepare('INSERT INTO empleados (nombre, apellido, telefono, email, puesto, salario, fecha_contratacion) VALUES (?,?,?,?,?,?,?)')
    .run(nombre, apellido, telefono||null, email||null, puesto, salario||0, fecha_contratacion);
  res.status(201).json({ id_empleado: r.lastInsertRowid });
});

router.put('/:id', verificarToken, soloRoles('admin', 'gerente'), (req, res) => {
  const e = db.prepare('SELECT * FROM empleados WHERE id_empleado = ?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  const { nombre, apellido, telefono, email, puesto, salario, activo } = req.body;
  db.prepare('UPDATE empleados SET nombre=?,apellido=?,telefono=?,email=?,puesto=?,salario=?,activo=? WHERE id_empleado=?')
    .run(nombre??e.nombre, apellido??e.apellido, telefono??e.telefono, email??e.email, puesto??e.puesto, salario??e.salario, activo??e.activo, req.params.id);
  res.json({ mensaje: 'Empleado actualizado' });
});

module.exports = router;
