const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken } = require('../middleware/auth');

router.get('/', verificarToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre_categoria').all());
});

router.post('/', verificarToken, (req, res) => {
  const { nombre_categoria, descripcion } = req.body;
  if (!nombre_categoria) return res.status(400).json({ error: 'Nombre requerido' });
  const r = db.prepare('INSERT INTO categorias (nombre_categoria, descripcion) VALUES (?, ?)').run(nombre_categoria, descripcion || null);
  res.status(201).json({ id_categoria: r.lastInsertRowid });
});

router.put('/:id', verificarToken, (req, res) => {
  const { nombre_categoria, descripcion, activo } = req.body;
  db.prepare('UPDATE categorias SET nombre_categoria = COALESCE(?, nombre_categoria), descripcion = COALESCE(?, descripcion), activo = COALESCE(?, activo) WHERE id_categoria = ?')
    .run(nombre_categoria, descripcion, activo, req.params.id);
  res.json({ mensaje: 'Categoría actualizada' });
});

module.exports = router;
