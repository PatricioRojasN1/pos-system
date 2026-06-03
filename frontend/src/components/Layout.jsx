import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar escritorio */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">POS</h1>
          <span className="logo-sub">Sistema de Ventas</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🛒</span> Punto de Venta
          </NavLink>
          <NavLink to="/productos" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📦</span> Productos
          </NavLink>
          <NavLink to="/inventario" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📊</span> Inventario
          </NavLink>
          <NavLink to="/reportes" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📈</span> Reportes
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="usuario-info">👤 {usuario?.nombre || usuario?.username}</span>
          <span className="rol-badge">{usuario?.rol}</span>
          <button onClick={handleLogout} className="btn-logout">Cerrar sesión</button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Nav inferior móvil */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({isActive}) => isActive ? 'bottom-item active' : 'bottom-item'}>
          <span>🛒</span><small>Venta</small>
        </NavLink>
        <NavLink to="/productos" className={({isActive}) => isActive ? 'bottom-item active' : 'bottom-item'}>
          <span>📦</span><small>Productos</small>
        </NavLink>
        <NavLink to="/inventario" className={({isActive}) => isActive ? 'bottom-item active' : 'bottom-item'}>
          <span>📊</span><small>Inventario</small>
        </NavLink>
        <NavLink to="/reportes" className={({isActive}) => isActive ? 'bottom-item active' : 'bottom-item'}>
          <span>📈</span><small>Reportes</small>
        </NavLink>
      </nav>
    </div>
  );
}
