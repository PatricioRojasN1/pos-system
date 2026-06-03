require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Inicializar DB al arrancar
require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Rutas
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/productos',  require('./routes/productos'));
app.use('/api/ventas',     require('./routes/ventas'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/clientes',   require('./routes/clientes'));
app.use('/api/empleados',  require('./routes/empleados'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/proveedores',require('./routes/proveedores'));
app.use('/api/reportes',   require('./routes/reportes'));
app.use('/api/config',     require('./routes/config'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
