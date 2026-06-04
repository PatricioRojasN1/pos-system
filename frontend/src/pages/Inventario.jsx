import { useState, useEffect } from 'react';
import api from '../api/axios';
import './Inventario.css';

export default function Inventario() {
  const [movimientos, setMovimientos] = useState([]);
  const [alertas, setAlertas] = useState({ stock_bajo: [], proximos_caducar: [] });
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('alertas');
  const [modalAjuste, setModalAjuste] = useState(false);
  const [form, setForm] = useState({ id_producto: '', tipo_movimiento: 'ENTRADA', cantidad: '', motivo: '' });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [movRes, alertRes, prodRes] = await Promise.all([
        api.get('/inventario'),
        api.get('/productos/alertas'),
        api.get('/productos'),
      ]);
      setMovimientos(movRes.data);
      setAlertas(alertRes.data);
      setProductos(prodRes.data);
    } catch {
      setError('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const guardarAjuste = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await api.post('/inventario/ajuste', {
        ...form,
        cantidad: parseInt(form.cantidad),
      });
      await cargarDatos();
      setModalAjuste(false);
      setForm({ id_producto: '', tipo_movimiento: 'ENTRADA', cantidad: '', motivo: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar ajuste');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="inventario-page">
      <div className="page-header">
        <h2>Inventario</h2>
        <button className="btn-primary" onClick={() => setModalAjuste(true)}>+ Ajuste manual</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tabs">
        {[
          { key: 'alertas', label: `Alertas (${alertas.stock_bajo.length + alertas.proximos_caducar.length})` },
          { key: 'movimientos', label: `Movimientos (${movimientos.length})` },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'activo' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading">Cargando...</div> : (
        <>
          {tab === 'alertas' && (
            <div className="alertas-section">
              <h3 className="section-title">Stock bajo</h3>
              {alertas.stock_bajo.length === 0 ? (
                <p className="empty">Sin productos con stock bajo</p>
              ) : (
                <div className="tabla-container">
                  <table className="tabla">
                    <thead><tr><th>Código</th><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th></tr></thead>
                    <tbody>
                      {alertas.stock_bajo.map(p => (
                        <tr key={p.id_producto}>
                          <td className="codigo">{p.codigo_barras}</td>
                          <td>{p.nombre_producto}</td>
                          <td><span className="badge badge-danger">{p.stock}</span></td>
                          <td>{p.stock_minimo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="section-title" style={{marginTop: 24}}>Proximos a caducar</h3>
              {alertas.proximos_caducar.length === 0 ? (
                <p className="empty">Sin productos proximos a caducar</p>
              ) : (
                <div className="tabla-container">
                  <table className="tabla">
                    <thead><tr><th>Producto</th><th>Fecha caducidad</th><th>Stock</th></tr></thead>
                    <tbody>
                      {alertas.proximos_caducar.map(p => (
                        <tr key={p.id_producto}>
                          <td>{p.nombre_producto}</td>
                          <td><span className="badge badge-warning">{p.fecha_caducidad}</span></td>
                          <td>{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'movimientos' && (
            <div className="tabla-container">
              <table className="tabla">
                <thead>
                  <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th><th>Motivo</th></tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center', padding:32, color:'#94a3b8'}}>Sin movimientos</td></tr>
                  ) : movimientos.map(m => (
                    <tr key={m.id_movimiento}>
                      <td className="fecha">{new Date(m.fecha_movimiento).toLocaleString()}</td>
                      <td>{m.nombre_producto}</td>
                      <td><span className={`badge ${m.tipo_movimiento === 'ENTRADA' ? 'badge-ok' : m.tipo_movimiento === 'SALIDA' ? 'badge-danger' : 'badge-warning'}`}>{m.tipo_movimiento}</span></td>
                      <td>{m.cantidad}</td>
                      <td>{m.stock_anterior}</td>
                      <td>{m.stock_nuevo}</td>
                      <td className="motivo">{m.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalAjuste && (
        <div className="modal-overlay" onClick={() => setModalAjuste(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajuste de Inventario</h3>
              <button className="modal-close" onClick={() => setModalAjuste(false)}>X</button>
            </div>
            <form onSubmit={guardarAjuste} className="modal-form">
              <div className="field">
                <label>Producto *</label>
                <select value={form.id_producto} onChange={e => setForm({...form, id_producto: e.target.value})} required>
                  <option value="">Selecciona un producto</option>
                  {productos.map(p => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} (stock: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Tipo *</label>
                  <select value={form.tipo_movimiento} onChange={e => setForm({...form, tipo_movimiento: e.target.value})}>
                    <option value="ENTRADA">ENTRADA</option>
                    <option value="SALIDA">SALIDA</option>
                    <option value="AJUSTE">AJUSTE</option>
                    <option value="MERMA">MERMA</option>
                  </select>
                </div>
                <div className="field">
                  <label>Cantidad *</label>
                  <input type="number" min="1" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} required />
                </div>
              </div>
              <div className="field">
                <label>Motivo *</label>
                <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Ej: Conteo físico, merma por daño..." required />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setModalAjuste(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
