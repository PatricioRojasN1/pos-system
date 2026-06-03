const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const usuario = db.prepare(`
    SELECT u.*, e.nombre as emp_nombre, e.apellido as emp_apellido
    FROM usuarios u
    LEFT JOIN empleados e ON u.id_empleado = e.id_empleado
    WHERE u.username = ? AND u.activo = 1
  `).get(username);

  if (!usuario)
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const valid = bcrypt.compareSync(password, usuario.password_hash);
  if (!valid)
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id_usuario: usuario.id_usuario, rol: usuario.rol, id_empleado: usuario.id_empleado },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    usuario: {
      id_usuario: usuario.id_usuario,
      username: usuario.username,
      rol: usuario.rol,
      nombre: `${usuario.emp_nombre || ''} ${usuario.emp_apellido || ''}`.trim(),
    }
  });
});

// POST /api/auth/register (solo para setup inicial)
router.post('/register', (req, res) => {
  const { username, password, rol, id_empleado } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username y password requeridos' });

  const existe = db.prepare('SELECT id_usuario FROM usuarios WHERE username = ?').get(username);
  if (existe)
    return res.status(400).json({ error: 'El usuario ya existe' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO usuarios (username, password_hash, rol, id_empleado)
    VALUES (?, ?, ?, ?)
  `).run(username, hash, rol || 'cajero', id_empleado || null);

  res.status(201).json({ id_usuario: result.lastInsertRowid, username, rol: rol || 'cajero' });
});

module.exports = router;
