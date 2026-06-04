import { useState, useEffect } from 'react';
import api from '../api/axios';
import './Reportes.css';

export default function Reportes() {
  const [resumen, setResumen] = useState(null);
  const [porDia, setPorDia] = useState([]);
  const [porMetodo, setPorMetodo] = useState([]);
  const [topProductos, setTopProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ventas');
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => { cargarReportes(); }, [desde, hasta]);

  const cargarReportes = async () => {
    setLoading(true);
    try {
      const [ventasRes, topRes] = await Promise.all([
        api.get(`/reportes/ventas?desde=${desde}&hasta=${hasta}`),
        api.get(`/reportes/top-productos?desde=${desde}&hasta=${hasta}`),
      ]);
      setResumen(ventasRes.data.resumen);
      setPorDia(ventasRes.data.por_dia);
      setPorMetodo(ventasRes.data.por_metodo);
      setTopProductos(topRes.data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reportes-page">
      <div className="page-header">
        <h2>Reportes</h2>
        <div className="filtro-fechas">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </div>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="cards-resumen">
          <div className="card-stat">
            <span className="card-label">Total ventas</span>
            <span className="card-valor">{resumen.total_ventas || 0}</span>
          </div>
          <div className="card-stat">
            <span className="card-label">Ingreso total</span>
            <span className="card-valor">${parseFloat(resumen.ingreso_total || 0).toFixed(2)}</span>
          </div>
          <div className="card-stat">
            <span className="card-label">Ticket promedio</span>
            <span className="card-valor">${parseFloat(resumen.ticket_promedio || 0).toFixed(2)}</span>
          </div>
          <div className="card-stat">
            <span className="card-label">Descuentos</span>
            <span className="card-valor">${parseFloat(resumen.descuentos_total || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="tabs">
        {[
          { key: 'ventas', label: 'Ventas por dia' },
          { key: 'metodo', label: 'Por metodo de pago' },
          { key: 'productos', label: 'Top productos' },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'activo' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading">Cargando...</div> : (
        <>
          {tab === 'ventas' && (
            <div className="tabla-container">
              <table className="tabla">
                <thead><tr><th>Dia</th><th>No. Ventas</th><th>Total</th></tr></thead>
                <tbody>
                  {porDia.length === 0 ? (
                    <tr><td colSpan={3} style={{textAlign:'center', padding:32, color:'#94a3b8'}}>Sin ventas en el periodo</td></tr>
                  ) : porDia.map(d => (
                    <tr key={d.dia}>
                      <td>{d.dia}</td>
                      <td>{d.ventas}</td>
                      <td className="monto">${parseFloat(d.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'metodo' && (
            <div className="tabla-container">
              <table className="tabla">
                <thead><tr><th>Metodo</th><th>No. Ventas</th><th>Total</th></tr></thead>
                <tbody>
                  {porMetodo.length === 0 ? (
                    <tr><td colSpan={3} style={{textAlign:'center', padding:32, color:'#94a3b8'}}>Sin datos</td></tr>
                  ) : porMetodo.map(m => (
                    <tr key={m.metodo_pago}>
                      <td><span className="badge badge-metodo">{m.metodo_pago}</span></td>
                      <td>{m.ventas}</td>
                      <td className="monto">${parseFloat(m.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'productos' && (
            <div className="tabla-container">
              <table className="tabla">
                <thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Ingreso</th><th>Margen aprox</th></tr></thead>
                <tbody>
                  {topProductos.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign:'center', padding:32, color:'#94a3b8'}}>Sin datos</td></tr>
                  ) : topProductos.map((p, i) => (
                    <tr key={p.codigo_barras}>
                      <td className="rank">#{i + 1}</td>
                      <td>{p.nombre_producto}</td>
                      <td>{p.unidades_vendidas}</td>
                      <td className="monto">${parseFloat(p.ingreso).toFixed(2)}</td>
                      <td className={parseFloat(p.margen_aprox) >= 0 ? 'monto-pos' : 'monto-neg'}>
                        ${parseFloat(p.margen_aprox || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
