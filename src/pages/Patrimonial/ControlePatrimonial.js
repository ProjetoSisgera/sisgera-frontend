import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { patrimonioApi } from '../../services/api';
import { formatarDataSemHora } from '../../utils/datas';
import './Patrimonial.css';

const SITUACAO_LABEL = { 1: 'Ativo', 2: 'Em Manutenção', 3: 'Baixado' };
const SITUACAO_CLASS = { 1: 'ativo', 2: 'em-manutencao', 3: 'baixado' };

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const formatDateBR = (isoDate) => formatarDataSemHora(isoDate, '—');

const ControlePatrimonial = () => {
    const { selectedCorporacao } = useAuth();
    const { canManageUsers } = usePermissions();

    const [assets, setAssets] = useState([]);
    const [stats, setStats] = useState({ TotalPatrimonio: 0, ValorTotal: 0, ItensAtivos: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [editingAsset, setEditingAsset] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const idCorporacao = selectedCorporacao?.idCorporacao;

    const loadData = useCallback(() => {
        if (!idCorporacao) return;
        setLoading(true);
        Promise.all([
            patrimonioApi.list(idCorporacao),
            patrimonioApi.estatisticas(idCorporacao),
        ])
            .then(([listRes, statsRes]) => {
                setAssets(listRes?.Patrimonios ?? []);
                setStats(statsRes ?? { TotalPatrimonio: 0, ValorTotal: 0, ItensAtivos: 0 });
            })
            .catch(() => setError('Erro ao carregar patrimônios.'))
            .finally(() => setLoading(false));
    }, [idCorporacao]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (idPatrimonio) => {
        if (!window.confirm('Deseja realmente excluir este bem patrimonial?')) return;
        setDeletingId(idPatrimonio);
        try {
            await patrimonioApi.delete(idPatrimonio);
            setAssets(prev => prev.filter(a => a.idPatrimonio !== idPatrimonio));
            patrimonioApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
        } catch (err) {
            alert(err.message || 'Erro ao excluir patrimônio.');
        } finally {
            setDeletingId(null);
        }
    };

    const openEdit = (asset) => {
        setEditingAsset({
            idPatrimonio: asset.idPatrimonio,
            descricao: asset.descricao ?? '',
            valor: asset.valor ?? '',
            dataAquisicao: asset.dataAquisicao ? asset.dataAquisicao.slice(0, 10) : '',
            idTipoSituacao: asset.idTipoSituacao ?? 1,
            observacao: asset.observacao ?? '',
        });
    };

    const handleEditChange = (field, value) => {
        setEditingAsset(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                idPatrimonio: editingAsset.idPatrimonio,
                idCorporacao,
                descricao: editingAsset.descricao,
                valor: editingAsset.valor !== '' ? Number(editingAsset.valor) : null,
                dataAquisicao: editingAsset.dataAquisicao || null,
                idTipoSituacao: Number(editingAsset.idTipoSituacao),
                observacao: editingAsset.observacao || null,
            };
            const res = await patrimonioApi.update(payload);
            const updated = res?.Patrimonio ?? payload;
            setAssets(prev => prev.map(a => a.idPatrimonio === updated.idPatrimonio ? updated : a));
            patrimonioApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
            setEditingAsset(null);
        } catch (err) {
            alert(err.message || 'Erro ao salvar patrimônio.');
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = assets.filter(a =>
        a.descricao?.toLowerCase().includes(search.toLowerCase()) ||
        String(a.idPatrimonio).includes(search)
    );

    return (
        <main className="main-content">
            <header className="main-header">
                <h2>Controle Patrimonial</h2>
                <div className="header-actions">
                    <button className="btn-icon-help" title="Mais informações">
                        <FontAwesomeIcon icon="circle-info" />
                    </button>
                </div>
            </header>

            {error && (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                    {error}
                </div>
            )}

            {/* KPI CARDS */}
            <section className="kpi-container">
                <div className="kpi-card">
                    <div className="kpi-icon assets"><FontAwesomeIcon icon="laptop" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Total de Bens</span>
                        <h3 className="kpi-value">{stats.TotalPatrimonio} itens</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon value"><FontAwesomeIcon icon="dollar-sign" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Valor Total</span>
                        <h3 className="kpi-value">{formatCurrency(stats.ValorTotal)}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon alert"><FontAwesomeIcon icon="check-circle" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Bens Ativos</span>
                        <h3 className="kpi-value">{stats.ItensAtivos}</h3>
                    </div>
                </div>
            </section>

            <section className="panel modern-panel">
                <div className="filters modern-filters">
                    <div className="search-input">
                        <FontAwesomeIcon icon="search" />
                        <input
                            type="text"
                            placeholder="Buscar por nº patrimônio ou descrição..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {canManageUsers && (
                        <Link to="/patrimonial/cadastrar" className="btn-primary">
                            <FontAwesomeIcon icon="plus" />
                            Novo Bem
                        </Link>
                    )}
                </div>

                {loading ? (
                    <p style={{ padding: '32px', textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
                        Carregando patrimônios...
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table modern-table">
                            <thead>
                                <tr>
                                    <th>Nº Patrimônio</th>
                                    <th>Descrição</th>
                                    <th>Valor (R$)</th>
                                    <th>Data Aquisição</th>
                                    <th>Situação</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--cor-texto-secundario)' }}>
                                            Nenhum bem patrimonial encontrado.
                                        </td>
                                    </tr>
                                ) : filtered.map(asset => (
                                    <tr key={asset.idPatrimonio}>
                                        <td className="font-medium">#{asset.idPatrimonio}</td>
                                        <td>{asset.descricao}</td>
                                        <td>{formatCurrency(asset.valor)}</td>
                                        <td>{formatDateBR(asset.dataAquisicao)}</td>
                                        <td>
                                            <span className={`status-badge ${SITUACAO_CLASS[asset.idTipoSituacao] ?? 'ativo'}`}>
                                                {SITUACAO_LABEL[asset.idTipoSituacao] ?? 'Desconhecido'}
                                            </span>
                                        </td>
                                        <td className="actions-cell text-right">
                                            {canManageUsers && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="action-btn-minimal"
                                                        title="Editar"
                                                        onClick={() => openEdit(asset)}
                                                    >
                                                        <FontAwesomeIcon icon="pencil" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-btn-minimal delete"
                                                        title="Excluir"
                                                        disabled={deletingId === asset.idPatrimonio}
                                                        onClick={() => handleDelete(asset.idPatrimonio)}
                                                    >
                                                        <FontAwesomeIcon icon="trash" />
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && (
                    <div className="pagination">
                        <span>Mostrando {filtered.length} de {assets.length} resultados</span>
                    </div>
                )}
            </section>

            {/* MODAL DE EDIÇÃO */}
            {editingAsset && (
                <div className="modal-overlay active" onClick={() => setEditingAsset(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <h3>Editar Bem Patrimonial</h3>
                            <button className="modal-close-btn" onClick={() => setEditingAsset(null)}>
                                <FontAwesomeIcon icon="xmark" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSave}>
                            <div className="modal-body form-grid">
                                <div className="form-group full-width">
                                    <label>Descrição*</label>
                                    <input
                                        type="text"
                                        value={editingAsset.descricao}
                                        onChange={e => handleEditChange('descricao', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Valor (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingAsset.valor}
                                        onChange={e => handleEditChange('valor', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Data de Aquisição</label>
                                    <input
                                        type="date"
                                        value={editingAsset.dataAquisicao}
                                        onChange={e => handleEditChange('dataAquisicao', e.target.value)}
                                    />
                                </div>
                                <div className="form-group full-width">
                                    <label>Situação*</label>
                                    <div className="chip-group">
                                        {[{ id: 1, label: 'Ativo', icon: 'check' }, { id: 2, label: 'Em Manutenção', icon: 'wrench' }, { id: 3, label: 'Baixado', icon: 'arrow-down' }].map(s => (
                                            <div
                                                key={s.id}
                                                className={`chip-option ${editingAsset.idTipoSituacao === s.id ? 'active' : ''}`}
                                                onClick={() => handleEditChange('idTipoSituacao', s.id)}
                                            >
                                                <FontAwesomeIcon icon={s.icon} /> {s.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <label>Observações</label>
                                    <textarea
                                        value={editingAsset.observacao}
                                        onChange={e => handleEditChange('observacao', e.target.value)}
                                        style={{ fontFamily: 'inherit' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-outline-secondary" onClick={() => setEditingAsset(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? (
                                        <><FontAwesomeIcon icon="sync" spin style={{ marginRight: '8px' }} /> Salvando...</>
                                    ) : (
                                        <><FontAwesomeIcon icon="check" style={{ marginRight: '8px' }} /> Salvar</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ControlePatrimonial;
