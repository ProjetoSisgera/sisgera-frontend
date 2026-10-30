// src/components/Sidebar/Sidebar.js

import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import './Sidebar.css';

// Itens do painel operacional (dentro de uma corporação)
const operationalItems = [
    { name: 'Início',        icon: 'house',               path: '/' },
    { name: 'Ocorrências',   icon: 'file-circle-check',   path: '/ocorrencias' },
    { name: 'Patrimonial',   icon: 'building-shield',     path: '/patrimonial' },
    { name: 'Doações',       icon: 'hand-holding-heart',  path: '/doacoes' },
    { name: 'Produtos',      icon: 'box-archive',         path: '/produtos' },
    { name: 'Manual',        icon: 'book-open',           path: '/manual' },
];

// Itens da seção de administração da corporação (só para canManageUsers)
const corpAdminItems = [
    { name: 'Usuários',      icon: 'users',               path: '/usuarios' },
    { name: 'Hospitais',     icon: 'hospital',            path: '/hospitais' },
];

// Só para quem tem a permissão de ver a auditoria
const auditoriaItem = { name: 'Auditoria', icon: 'clock', path: '/auditoria' };

// Itens do painel de controle admin
const adminItems = [
    { name: 'Corporações',   icon: 'building',            path: '/admin/corporacoes' },
];

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout, selectedCorporacao } = useAuth();
    const { isAdmin, canManageUsers, has } = usePermissions();
    // Auditoria: Coordenador Geral (só a corporação dele) e Superusuário
    const podeVerAuditoria = has('Audit', 'Visualizar');
    const navigate = useNavigate();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Detecta em qual contexto estamos
    const isAdminRoute = location.pathname.startsWith('/admin');

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const displayName = user?.email || 'Usuário';
    const userInitial = displayName.charAt(0).toUpperCase();

    return (
        <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
            <div className="sidebar-scroll-area">

                {/* ---- Cabeçalho ---- */}
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FontAwesomeIcon icon="shield-halved" />
                        <h1>SisGera</h1>
                    </div>
                    <div
                        className={`theme-switch-container ${theme === 'dark' ? 'dark' : ''}`}
                        onClick={toggleTheme}
                        title={`Mudar para modo ${theme === 'light' ? 'Escuro' : 'Claro'}`}
                    >
                        <div className="theme-switch-ball">
                            <FontAwesomeIcon icon={theme === 'dark' ? 'moon' : 'sun'} />
                        </div>
                    </div>
                </div>

                {/* ===== MODO PAINEL DE CONTROLE (admin) ===== */}
                {isAdminRoute ? (
                    <nav className="sidebar-nav sidebar-nav--flex">
                        <div className="sidebar-section-label">Sistema</div>
                        <ul>
                            {adminItems.map((item) => (
                                <li key={item.name}>
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                                        onClick={onClose}
                                    >
                                        <FontAwesomeIcon icon={item.icon} />
                                        {item.name}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>

                        {/* Acesso rápido para última corporação acessada */}
                        {selectedCorporacao && (
                            <>
                                <div className="sidebar-section-label">Acesso Rápido</div>
                                <ul>
                                    <li>
                                        <button
                                            className="sidebar-nav-btn"
                                            onClick={() => { navigate('/'); onClose(); }}
                                        >
                                            <FontAwesomeIcon icon="arrow-right" />
                                            {selectedCorporacao.nome}
                                        </button>
                                    </li>
                                </ul>
                            </>
                        )}

                        {/* Badge de contexto — EMBAIXO, acima do perfil */}
                        <div className="sidebar-nav__spacer" />
                        <div className="sidebar-context-badge sidebar-context-badge--admin sidebar-context-badge--bottom">
                            <FontAwesomeIcon icon="shield-halved" />
                            <span>Painel de Controle</span>
                        </div>
                    </nav>
                ) : (
                /* ===== MODO PAINEL OPERACIONAL (corporação) ===== */
                    <nav className="sidebar-nav sidebar-nav--flex">
                        <ul>
                            {operationalItems.map((item) => (
                                <li key={item.name}>
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                                        onClick={onClose}
                                    >
                                        <FontAwesomeIcon icon={item.icon} />
                                        {item.name}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>

                        {/* Seção de Administração da Corporação — só para Coordenador/Admin */}
                        {(canManageUsers || podeVerAuditoria) && (
                            <>
                                <div className="sidebar-section-label">Administração</div>
                                <ul>
                                    {[
                                        ...(canManageUsers ? corpAdminItems : []),
                                        ...(podeVerAuditoria ? [auditoriaItem] : []),
                                    ].map((item) => (
                                        <li key={item.name}>
                                            <NavLink
                                                to={item.path}
                                                className={({ isActive }) => (isActive ? 'active-link' : undefined)}
                                                onClick={onClose}
                                            >
                                                <FontAwesomeIcon icon={item.icon} />
                                                {item.name}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {/* Badge clicável — só para admin: volta ao Painel de Controle */}
                        {isAdmin && (
                            <>
                                <div className="sidebar-nav__spacer" />
                                <div
                                    className="sidebar-context-badge sidebar-context-badge--corp sidebar-context-badge--bottom"
                                    onClick={() => { navigate('/admin/corporacoes'); onClose(); }}
                                    title="Voltar ao Painel de Controle"
                                    role="button"
                                >
                                    <FontAwesomeIcon icon="building" />
                                    <div className="sidebar-context-badge__text">
                                        <span>{selectedCorporacao?.nome || 'Corporação'}</span>
                                        <small>← Painel de Controle</small>
                                    </div>
                                </div>
                            </>
                        )}
                    </nav>
                )}
            </div>

            {/* ---- Rodapé com perfil e logout ---- */}
            <div className="sidebar-bottom">
                <div className="user-profile">
                    <div className="user-avatar">{userInitial}</div>
                    <div className="user-profile__info">
                        <span>{displayName}</span>
                        <small>{isAdminRoute ? 'Super Admin' : (selectedCorporacao?.nome || 'Sistema')}</small>
                    </div>
                </div>
                <button
                    className="sidebar-logout-btn"
                    onClick={handleLogout}
                    title="Sair do sistema"
                >
                    <FontAwesomeIcon icon="arrow-right-from-bracket" />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
