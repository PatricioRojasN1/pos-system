import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './POS.css';

export default function POS() {
  const { usuario } = useAuth();
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [escaneando, setEscaneando] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [descuento, setDescuento] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketVenta, setTicketVenta] = useState(null);
  const scannerRef = useRef(null);
  const inputRef = useRef(null);

  const IVA = 0.16;

  const subtotal = carrito.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0);
  const descuentoVal = parseFloat(descuento) || 0;
  const impuestos = (subtotal - descuentoVal) * IVA;
  const total = subtotal - descuentoVal + impuestos;

  useEffect(() => {
    if (!escaneando) return;

    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      supportedScanTypes: [0],
    }, false);

    scanner.render(
      (codigo) => {
        scanner.clear();
        setEscaneando(false);
        buscarPorCodigo(codigo);
      },
      () => {}
    );

    scannerRef.current = scanner;
    return () => { scanner.clear().catch(() => {}); };
  }, [escaneando]);

  const buscarPorCodigo = async (codigo) => {
    if (!codigo.trim()) return;
    setError('');
    try {
      const { data } = await api.get(`/productos/codigo/${codigo.trim()}`);
      agregarAlCarrito(data);
      setBusqueda('');
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`Producto "${codigo}" no encontrado. Regístralo en Productos.`);
      } else {
        setError('Error al buscar producto');
      }
    }
  };

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id_producto === producto.id_producto);
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          setError(`Stock insuficiente para ${producto.nombre_producto}`);
          return prev;
        }
        return prev.map(i =>
          i.id_producto === producto.id_producto ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      if (producto.stock <= 0) {
        setError(`Sin stock para ${producto.nombre_producto}`);
        return prev;
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;
    setCarrito(prev => prev.map(i =>
      i.id_producto === id ? { ...i, cantidad: nuevaCantidad } : i
    ));
  };

  const eliminarItem = (id) => {
    setCarrito(prev => prev.filter(i => i.id_producto !== id));
  };

  const limpiarVenta = () => {
    setCarrito([]);
    setDescuento(0);
    setMetodoPago('EFECTIVO');
    setError('');
    setTicketVenta(null);
  };

  const cobrar = async () => {
    if (carrito.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/ventas', {
        items: carrito.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
        metodo_pago: metodoPago,
        descuento: descuentoVal,
      });
      setTicketVenta({ ...data, carrito, metodoPago, fecha: new Date().toLocaleString() });
      setCarrito([]);
      setDescuento(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar venta');
    } finally {
      setLoading(false);
    }
  };

  if (ticketVenta) {
    return (
      <div className="ticket-page">
        <div className="ticket">
          <h2>✅ Venta Completada</h2>
          <p className="ticket-fecha">{ticketVenta.fecha}</p>
          <p className="ticket-folio">Folio #{ticketVenta.id_venta}</p>
          <hr />
          <table className="ticket-items">
            <thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Sub</th></tr></thead>
            <tbody>
              {ticketVenta.carrito.map(i => (
                <tr key={i.id_producto}>
                  <td>{i.nombre_producto}</td>
                  <td>{i.cantidad}</td>
                  <td>${i.precio_venta.toFixed(2)}</td>
                  <td>${(i.precio_venta * i.cantidad).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <div className="ticket-totales">
            <div><span>Subtotal</span><span>${ticketVenta.subtotal?.toFixed(2)}</span></div>
            {ticketVenta.descuento > 0 && <div><span>Descuento</span><span>-${ticketVenta.descuento?.toFixed(2)}</span></div>}
            <div><span>IVA (16%)</span><span>${ticketVenta.impuestos?.toFixed(2)}</span></div>
            <div className="ticket-total"><span>TOTAL</span><span>${ticketVenta.total?.toFixed(2)}</span></div>
            <div><span>Método de pago</span><span>{ticketVenta.metodoPago}</span></div>
          </div>
          <button className="btn-nueva-venta" onClick={limpiarVenta}>🛒 Nueva Venta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-page">
      <div className="pos-left">
        <div className="pos-header">
          <h2>🛒 Punto de Venta</h2>
        </div>

        <div className="scan-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Código de barras o nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarPorCodigo(busqueda)}
            className="input-busqueda"
          />
          <button onClick={() => buscarPorCodigo(busqueda)} className="btn-buscar">Buscar</button>
          <button
            onClick={() => setEscaneando(!escaneando)}
            className={`btn-scan ${escaneando ? 'activo' : ''}`}
          >
            {escaneando ? '❌ Cerrar' : '📷 Escanear'}
          </button>
        </div>

        {escaneando && (
          <div className="scanner-container">
            <div id="qr-reader"></div>
          </div>
        )}

        {error && <div className="error-bar">{error} <button onClick={() => setError('')}>✕</button></div>}

        <div className="carrito">
          {carrito.length === 0 ? (
            <div className="carrito-vacio">
              <p>🛒 Escanea o busca un producto para agregar</p>
            </div>
          ) : (
            <table className="carrito-tabla">
              <thead>
                <tr><th>Producto</th><th>Precio</th><th>Cant</th><th>Sub</th><th></th></tr>
              </thead>
              <tbody>
                {carrito.map(item => (
                  <tr key={item.id_producto}>
                    <td className="producto-nombre">{item.nombre_producto}</td>
                    <td>${item.precio_venta.toFixed(2)}</td>
                    <td>
                      <div className="cantidad-ctrl">
                        <button onClick={() => cambiarCantidad(item.id_producto, item.cantidad - 1)}>-</button>
                        <span>{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.id_producto, item.cantidad + 1)}>+</button>
                      </div>
                    </td>
                    <td>${(item.precio_venta * item.cantidad).toFixed(2)}</td>
                    <td><button className="btn-eliminar" onClick={() => eliminarItem(item.id_producto)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="pos-right">
        <div className="totales-card">
          <h3>Resumen</h3>
          <div className="total-row"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="descuento-row">
            <label>Descuento ($)</label>
            <input
              type="number" min="0" max={subtotal}
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className="input-descuento"
            />
          </div>
          <div className="total-row"><span>IVA (16%)</span><span>${impuestos.toFixed(2)}</span></div>
          <div className="total-row total-final"><span>TOTAL</span><span>${total.toFixed(2)}</span></div>
          <div className="metodo-pago">
            <label>Método de pago</label>
            <div className="metodo-btns">
              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map(m => (
                <button
                  key={m}
                  className={`btn-metodo ${metodoPago === m ? 'activo' : ''}`}
                  onClick={() => setMetodoPago(m)}
                >
                  {m === 'EFECTIVO' ? '💵' : m === 'TARJETA' ? '💳' : '📲'} {m}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-cobrar" onClick={cobrar} disabled={carrito.length === 0 || loading}>
            {loading ? 'Procesando...' : `💰 Cobrar $${total.toFixed(2)}`}
          </button>
          <button className="btn-cancelar" onClick={limpiarVenta} disabled={carrito.length === 0}>
            🗑️ Cancelar venta
          </button>
        </div>
      </div>
    </div>
  );
}
