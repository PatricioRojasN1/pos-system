import { useState, useEffect } from 'react';
import api from '../api/axios';
import './Productos.css';

const FORM_INICIAL = {
  codigo_barras: '', nombre_producto: '', descripcion: '',
  precio_venta: '', precio_compra: '', stock: '', stock_minimo: '5',
  unidad_medida: 'pieza', fecha_caducidad: '', id_categoria: ''
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
      ]);
      setProductos(prodRes.data);
      setCategorias(catRes.data);
    } catch {
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_barras.includes(busqueda)
  );

  const abrirNuevo = () => {
    setForm(FORM_INICIAL);
    setEditando(null);
    setError('');
    setModalAbierto(true);
  };

  const abrirEditar = (p) => {
    setForm({
      codigo_barras: p.codigo_barras,
      nombre_producto: p.nombre_producto,
      descripcion: p.descripcion || '',
      precio_venta: p.precio_venta,
      precio_compra: p.precio_compra,
      stock: p.stock,
      stock_minimo: p.stock_minimo,
      unidad_medida: p.unidad_medida,
      fecha_caducidad: p.fecha_caducidad || '',
      id_categoria: p.id_categoria || '',
    });
    setEditando(p.id_producto);
    setError('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setError('');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const payload = {
        ...form,
        precio_venta: parseFloat(form.precio_venta),
        precio_compra: parseFloat(form.precio_compra),
        stock: parseInt(form.stock),
        stock_minimo: parseInt(form.stock_minimo),
        id_categoria: form.id_categoria || null,
        fecha_caducidad: form.fecha_caducidad || null,
      };
      if (editando) {
        await api.put(`/productos/${editando}`, payload);
      } else {
        await api.post('/productos', payload);
      }
      await cargarDatos();
      cerrarModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const inactivar = async (id) => {
    if (!confirm('¿Inactivar este producto?')) return;
    try {
      await api.delete(`/productos/${id}`);
      await cargarDatos();
    } catch {
      setError('Error al inactivar');
    }
  };

  return (
    <div className="productos-page">
      <div className="page-header">
        <h2>Productos</h2>
        <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo Producto</button>
      </div>

      <div className="filtros">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input-busqueda"
        />
        <span className="contador">{productosFiltrados.length} productos</span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Precio Venta</th>
                <th>Precio Compra</th>
                <th>Stock</th>
                <th>Categoría</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center', padding:32, color:'#94a3b8'}}>No hay productos</td></tr>
              ) : productosFiltrados.map(p => (
                <tr key={p.id_producto} className={p.stock <= p.stock_minimo ? 'stock-bajo' : ''}>
                  <td className="codigo">{p.codigo_barras}</td>
                  <td className="nombre">{p.nombre_producto}</td>
                  <td>${parseFloat(p.precio_venta).toFixed(2)}</td>
                  <td>${parseFloat(p.precio_compra).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${p.stock <= p.stock_minimo ? 'badge-danger' : 'badge-ok'}`}>
                      {p.stock} {p.unidad_medida}
                    </span>
                  </td>
                  <td>{p.nombre_categoria || '—'}</td>
                  <td className="acciones">
                    <button className="btn-edit" onClick={() => abrirEditar(p)}>Editar</button>
                    <button className="btn-delete" onClick={() => inactivar(p.id_producto)}>Inactivar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>
            <form onSubmit={guardar} className="modal-form">
              <div className="form-row">
                <div className="field">
                  <label>Código de barras *</label>
                  <input name="codigo_barras" value={form.codigo_barras} onChange={handleChange} required disabled={!!editando} />
                </div>
                <div className="field">
                  <label>Nombre *</label>
                  <input name="nombre_producto" value={form.nombre_producto} onChange={handleChange} required />
                </div>
              </div>
              <div className="field">
                <label>Descripción</label>
                <input name="descripcion" value={form.descripcion} onChange={handleChange} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Precio Venta *</label>
                  <input type="number" step="0.01" min="0" name="precio_venta" value={form.precio_venta} onChange={handleChange} required />
                </div>
                <div className="field">
                  <label>Precio Compra *</label>
                  <input type="number" step="0.01" min="0" name="precio_compra" value={form.precio_compra} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Stock inicial</label>
                  <input type="number" min="0" name="stock" value={form.stock} onChange={handleChange} />
                </div>
                <div className="field">
                  <label>Stock mínimo</label>
                  <input type="number" min="0" name="stock_minimo" value={form.stock_minimo} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Unidad de medida</label>
                  <select name="unidad_medida" value={form.unidad_medida} onChange={handleChange}>
                    <option>pieza</option>
                    <option>kg</option>
                    <option>litro</option>
                    <option>caja</option>
                    <option>paquete</option>
                  </select>
                </div>
                <div className="field">
                  <label>Categoría</label>
                  <select name="id_categoria" value={form.id_categoria} onChange={handleChange}>
                    <option value="">Sin categoría</option>
                    {categorias.map(c => (
                      <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Fecha de caducidad</label>
                <input type="date" name="fecha_caducidad" value={form.fecha_caducidad} onChange={handleChange} />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
