const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.get('/', verificarToken, (req, res) => {
  const config = db.prepare('SELECT clave, valor FROM configuracion_tienda').all();
  const obj = {};
  config.forEach(c => obj[c.clave] = c.valor);
  res.json(obj);
});

router.put('/', verificarToken, soloRoles('admin', 'gerente'), (req, res) => {
  const update = db.prepare('UPDATE configuracion_tienda SET valor = ? WHERE clave = ?');
  const updateMany = db.transaction((entries) => {
    for (const [clave, valor] of entries) update.run(valor, clave);
  });
  updateMany(Object.entries(req.body));
  res.json({ mensaje: 'Configuración actualizada' });
});

module.exports = router;
