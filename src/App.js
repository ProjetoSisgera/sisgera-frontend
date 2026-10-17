// src/App.js

import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Sidebar from './components/Sidebar/Sidebar';

import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import ControleProdutos from './pages/Produtos/ControleProdutos';
import CadastrarProduto from './pages/Produtos/CadastrarProduto';
import ControleOcorrencias from './pages/Ocorrencias/ControleOcorrencias';
import ControlePatrimonial from './pages/Patrimonial/ControlePatrimonial';
import CadastrarPatrimonio from './pages/Patrimonial/CadastrarPatrimonio';
import Doacoes from './pages/Doacoes/Doacoes';
import IncluirDoacao from './pages/Doacoes/IncluirDoacao';
import Usuarios from './pages/Usuarios/Usuarios';
import AdminCorporacao from './pages/AdminCorporacao/AdminCorporacao';
import Hospitais from './pages/Hospitais/Hospitais';

// Configuração dos ícones globais do Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faHouse, faFileCircleCheck, faBuildingShield, faHandHoldingHeart, faBoxArchive,
  faUsers, faBookOpen, faShieldHalved, faPlus, faTriangleExclamation,
  faCheckDouble, faFileLines, faSearch, faEye, faPencil, faTrash, faCheck, faSync,
  faCloudArrowUp, faFireFlameCurved, faHelmetSafety, faTimes, faCircleInfo, faLaptop,
  faDollarSign, faCheckCircle, faWrench, faArrowDown, faArrowLeft, faListCheck,
  faArrowRight, faUser, faComment, faStethoscope, faHeartPulse, faWind, faTemperatureHigh,
  faTint, faCamera, faFileSignature, faSun, faMoon, faBars, faXmark,
  // Novos ícones para login, admin e permissões
  faLock, faEyeSlash, faArrowRightFromBracket, faBuilding, faKey,
  faChartBar, faClock, faHospital,
  faFilePen, faHourglassHalf, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

library.add(
  faHouse, faFileCircleCheck, faBuildingShield, faHandHoldingHeart, faBoxArchive,
  faUsers, faBookOpen, faShieldHalved, faPlus, faTriangleExclamation,
  faCheckDouble, faFileLines, faSearch, faEye, faPencil, faTrash, faCheck, faSync,
  faCloudArrowUp, faFireFlameCurved, faHelmetSafety, faTimes, faCircleInfo, faLaptop,
  faDollarSign, faCheckCircle, faWrench, faArrowDown, faArrowLeft, faListCheck,
  faArrowRight, faUser, faComment, faStethoscope, faHeartPulse, faWind, faTemperatureHigh,
  faTint, faCamera, faFileSignature, faSun, faMoon, faBars, faXmark,
  faLock, faEyeSlash, faArrowRightFromBracket, faBuilding, faKey,
  faChartBar, faClock, faHospital,
  faFilePen, faHourglassHalf, faChevronRight,
);

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/ocorrencias': 'Ocorrências',
  '/ocorrencias/nova': 'Nova Ocorrência',
  '/patrimonial': 'Patrimonial',
  '/patrimonial/cadastrar': 'Cadastrar Patrimônio',
  '/doacoes': 'Doações',
  '/doacoes/incluir': 'Incluir Doação',
  '/produtos': 'Produtos',
  '/produtos/cadastrar': 'Cadastrar Produto',
  '/usuarios': 'Usuários',
  '/hospitais': 'Hospitais',
  '/manual': 'Manual',
  '/admin/corporacoes': 'Corporações',
};

function MobileTopbar({ onToggle, sidebarOpen }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'SisGera';
  return (
    <div className="mobile-topbar">
      <button
        className={`mobile-menu-btn${sidebarOpen ? ' is-open' : ''}`}
        onClick={onToggle}
        aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {sidebarOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>
      <span className="mobile-topbar-title">{title}</span>
    </div>
  );
}

// Layout das rotas privadas (com Sidebar)
function PrivateLayout({ sidebarOpen, toggleSidebar, closeSidebar }) {
  return (
    <div id="app-container">
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} onToggle={toggleSidebar} />
      <div className="main-wrapper">
        <MobileTopbar onToggle={toggleSidebar} sidebarOpen={sidebarOpen} />
        <Outlet />
      </div>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Rota pública: Login */}
          <Route path="/login" element={<Login />} />

          {/* Rotas privadas: exigem autenticação */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <PrivateLayout
                sidebarOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                closeSidebar={closeSidebar}
              />
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/produtos" element={<ControleProdutos />} />
              <Route path="/produtos/cadastrar" element={<CadastrarProduto />} />
              <Route path="/ocorrencias" element={<ControleOcorrencias />} />
              <Route path="/ocorrencias/nova" element={<ControleOcorrencias />} />
              <Route path="/patrimonial" element={<ControlePatrimonial />} />
              <Route path="/patrimonial/cadastrar" element={<CadastrarPatrimonio />} />
              <Route path="/doacoes" element={<Doacoes />} />
              <Route path="/doacoes/incluir" element={<IncluirDoacao />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/hospitais" element={<Hospitais />} />
              <Route path="/manual" element={<h1 className="main-content">Manual de Instruções — Em Breve</h1>} />

              {/* Rotas exclusivas para administradores do sistema */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin/corporacoes" element={<AdminCorporacao />} />
              </Route>
            </Route>
          </Route>

          {/* Qualquer outra rota redireciona para login */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
