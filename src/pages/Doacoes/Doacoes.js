import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { doacaoApi } from '../../services/api';
import { formatarDataSemHora } from '../../utils/datas';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import Pagination from '../../components/Pagination/Pagination';
import { usePagination } from '../../hooks/usePagination';
import './Doacoes.css';

const TIPO_DOACAO_LABEL = { 1: 'Dinheiro', 2: 'Material', 3: 'Serviço' };
const TIPO_DOACAO_CLASS = { 1: 'dinheiro', 2: 'material', 3: 'servico' };

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const formatDateBR = (isoDate) => formatarDataSemHora(isoDate, '—');

const Doacoes = () => {
    const { selectedCorporacao } = useAuth();
    const { canManageUsers } = usePermissions();

    const [donations, setDonations] = useState([]);
    const [stats, setStats] = useState({ TotalArrecadado: 0, MateriaisRecebidos: 0, ServicosPrestados: 0 });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [editingDoacao, setEditingDoacao] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const idCorporacao = selectedCorporacao?.idCorporacao;

    const loadData = useCallback(() => {
        if (!idCorporacao) return;
        setLoading(true);
        Promise.all([
            doacaoApi.list(idCorporacao),
            doacaoApi.estatisticas(idCorporacao),
        ])
            .then(([listRes, statsRes]) => {
                setDonations(listRes?.Doacoes ?? []);
                setStats(statsRes ?? { TotalArrecadado: 0, MateriaisRecebidos: 0, ServicosPrestados: 0 });
            })
            .catch(() => setError('Erro ao carregar doações.'))
            .finally(() => setLoading(false));
    }, [idCorporacao]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (idDoacao) => {
        if (!window.confirm('Deseja realmente excluir esta doação?')) return;
        setDeletingId(idDoacao);
        try {
            await doacaoApi.delete(idDoacao);
            setDonations(prev => prev.filter(d => d.idDoacao !== idDoacao));
            doacaoApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
        } catch (err) {
            alert(err.message || 'Erro ao excluir doação.');
        } finally {
            setDeletingId(null);
        }
    };

    const openEdit = (doacao) => {
        setEditingDoacao({
            idDoacao: doacao.idDoacao,
            idTipoDoacao: doacao.idTipoDoacao ?? 1,
            idTipoPessoa: doacao.idTipoPessoa ?? 1,
            nomeDoador: doacao.nomeDoador ?? '',
            cpfDoador: doacao.cpfDoador ?? '',
            dataDoacao: doacao.dataDoacao ? doacao.dataDoacao.slice(0, 10) : '',
            valor: doacao.valor ?? '',
            quantidade: String(doacao.quantidade ?? 1),
            observacao: doacao.observacao ?? '',
        });
    };

    const handleEditChange = (field, value) => {
        setEditingDoacao(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                idDoacao: editingDoacao.idDoacao,
                idCorporacao,
                idTipoDoacao: Number(editingDoacao.idTipoDoacao),
                idTipoPessoa: Number(editingDoacao.idTipoPessoa),
                nomeDoador: editingDoacao.nomeDoador || null,
                cpfDoador: editingDoacao.cpfDoador || null,
                dataDoacao: editingDoacao.dataDoacao || null,
                valor: editingDoacao.valor !== '' ? Number(editingDoacao.valor) : 0,
                quantidade: Number(editingDoacao.idTipoDoacao) === 1
                    ? 1
                    : Math.max(1, parseInt(editingDoacao.quantidade, 10) || 1),
                observacao: editingDoacao.observacao || null,
            };
            const res = await doacaoApi.update(payload);
            const updated = res?.Doacao ?? payload;
            setDonations(prev => prev.map(d => d.idDoacao === updated.idDoacao ? updated : d));
            doacaoApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
            setEditingDoacao(null);
        } catch (err) {
            alert(err.message || 'Erro ao salvar doação.');
        } finally {
            setIsSaving(false);
        }
    };

    const filtered = donations.filter(d => {
        const term = search.toLowerCase();
        return (
            (d.nomeDoador ?? 'Anônimo').toLowerCase().includes(term) ||
            (TIPO_DOACAO_LABEL[d.idTipoDoacao] ?? '').toLowerCase().includes(term)
        );
    });

    const isDinheiro = (d) => d.idTipoDoacao === 1;
    const paginacao = usePagination(filtered);

    const renderValorDescricao = (item) => {
        if (isDinheiro(item)) return formatCurrency(item.valor);
        const qtd = item.quantidade ?? 1;
        const unit = item.valor ?? 0;
        const rotuloQtd = item.idTipoDoacao === 2 ? `${qtd} un.` : `${qtd}x`;
        return (
            <>
                <div>{item.observacao || '—'}</div>
                {unit > 0 && (
                    <small style={{ color: 'var(--cor-texto-secundario)' }}>
                        {rotuloQtd} × {formatCurrency(unit)} = <strong>{formatCurrency(unit * qtd)}</strong>
                    </small>
                )}
            </>
        );
    };

    return (
        <main className="main-content">
            <header className="main-header">
                <h2>Controle de Doações</h2>
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
                    <div className="kpi-icon money"><FontAwesomeIcon icon="hand-holding-heart" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Total Arrecadado</span>
                        <h3 className="kpi-value">{formatCurrency(stats.TotalArrecadado)}</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon material"><FontAwesomeIcon icon="box-archive" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Materiais Recebidos</span>
                        <h3 className="kpi-value">{stats.MateriaisRecebidos} Doações</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon service"><FontAwesomeIcon icon="helmet-safety" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Serviços Prestados</span>
                        <h3 className="kpi-value">{stats.ServicosPrestados} Execuções</h3>
                    </div>
                </div>
            </section>

            <section className="panel modern-panel">
                <div className="filters modern-filters">
                    <div className="search-input">
                        <FontAwesomeIcon icon="search" />
                        <input
                            type="text"
                            placeholder="Buscar doações..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {canManageUsers && (
                        <Link to="/doacoes/incluir" className="btn-primary">
                            <FontAwesomeIcon icon="plus" />
                            Nova Doação
                        </Link>
                    )}
                </div>

                {loading ? (
                    <p style={{ padding: '32px', textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
                        Carregando doações...
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table modern-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Doador</th>
                                    <th>Valor / Descrição</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--cor-texto-secundario)' }}>
                                            Nenhuma doação encontrada.
                                        </td>
                                    </tr>
                                ) : paginacao.pageItems.map(item => (
                                    <tr key={item.idDoacao}>
                                        <td>{formatDateBR(item.dataDoacao)}</td>
                                        <td>
                                            <span className={`badge-type ${TIPO_DOACAO_CLASS[item.idTipoDoacao] ?? 'dinheiro'}`}>
                                                {TIPO_DOACAO_LABEL[item.idTipoDoacao] ?? '—'}
                                            </span>
                                        </td>
                                        <td className="font-medium">{item.nomeDoador || 'Anônimo'}</td>
                                        <td>{renderValorDescricao(item)}</td>
                                        <td className="actions-cell text-right">
                                            {canManageUsers && (
                                                <>
                                                    <button
                                                        className="action-btn-minimal"
                                                        title="Editar"
                                                        onClick={() => openEdit(item)}
                                                    >
                                                        <FontAwesomeIcon icon="pencil" />
                                                    </button>
                                                    <button
                                                        className="action-btn-minimal delete"
                                                        title="Excluir"
                                                        disabled={deletingId === item.idDoacao}
                                                        onClick={() => handleDelete(item.idDoacao)}
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
                    <Pagination
                        page={paginacao.page}
                        totalPages={paginacao.totalPages}
                        total={paginacao.total}
                        pageSize={paginacao.pageSize}
                        onPageChange={paginacao.setPage}
                        label="doações"
                    />
                )}
            </section>

            {/* MODAL DE EDIÇÃO */}
            {editingDoacao && (
                <div className="modal-overlay active" onClick={() => setEditingDoacao(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3>Editar Doação</h3>
                            <button className="modal-close-btn" onClick={() => setEditingDoacao(null)}>
                                <FontAwesomeIcon icon="xmark" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSave}>
                            <div className="modal-body form-grid">
                                <div className="form-group full-width">
                                    <label>Tipo de Doação*</label>
                                    <div className="chip-group">
                                        {[{ id: 1, label: 'Dinheiro', icon: 'hand-holding-heart' }, { id: 2, label: 'Material', icon: 'box-archive' }, { id: 3, label: 'Serviço', icon: 'helmet-safety' }].map(t => (
                                            <div
                                                key={t.id}
                                                className={`chip-option ${editingDoacao.idTipoDoacao === t.id ? 'active' : ''}`}
                                                onClick={() => handleEditChange('idTipoDoacao', t.id)}
                                            >
                                                <FontAwesomeIcon icon={t.icon} /> {t.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <label>Quem está doando?*</label>
                                    <div className="chip-group">
                                        {[{ id: 1, label: 'Anônima', icon: 'users' }, { id: 2, label: 'Pessoa Física', icon: 'user' }, { id: 3, label: 'Pessoa Jurídica', icon: 'building' }].map(p => (
                                            <div
                                                key={p.id}
                                                className={`chip-option ${editingDoacao.idTipoPessoa === p.id ? 'active' : ''}`}
                                                onClick={() => handleEditChange('idTipoPessoa', p.id)}
                                            >
                                                <FontAwesomeIcon icon={p.icon} /> {p.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {editingDoacao.idTipoPessoa !== 1 && (
                                    <>
                                        <div className="form-group">
                                            <label>Nome do Doador</label>
                                            <input
                                                type="text"
                                                value={editingDoacao.nomeDoador}
                                                onChange={e => handleEditChange('nomeDoador', e.target.value)}
                                                placeholder="Nome completo ou Razão Social"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>{editingDoacao.idTipoPessoa === 3 ? 'CNPJ' : 'CPF'}</label>
                                            <input
                                                type="text"
                                                value={editingDoacao.cpfDoador}
                                                onChange={e => handleEditChange('cpfDoador', e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label>Data da Doação*</label>
                                    <input
                                        type="date"
                                        value={editingDoacao.dataDoacao}
                                        onChange={e => handleEditChange('dataDoacao', e.target.value)}
                                        required
                                    />
                                </div>
                                {editingDoacao.idTipoDoacao === 1 && (
                                    <div className="form-group">
                                        <label>Valor (R$)*</label>
                                        <CurrencyInput
                                            required
                                            value={editingDoacao.valor}
                                            onChange={val => handleEditChange('valor', val)}
                                        />
                                    </div>
                                )}
                                {editingDoacao.idTipoDoacao !== 1 && (
                                    <>
                                        <div className="form-group">
                                            <label htmlFor="edit-quantidade">
                                                {editingDoacao.idTipoDoacao === 2 ? 'Quantidade do material' : 'Quantas vezes foi realizado'}
                                            </label>
                                            <input
                                                id="edit-quantidade"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={editingDoacao.quantidade}
                                                onChange={e => handleEditChange('quantidade', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>
                                                {editingDoacao.idTipoDoacao === 2 ? 'Valor unitário do material (R$)' : 'Valor do serviço por vez (R$)'}
                                            </label>
                                            <CurrencyInput
                                                value={editingDoacao.valor}
                                                onChange={val => handleEditChange('valor', val)}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="form-group full-width">
                                    <label>Observações / Descrição</label>
                                    <textarea
                                        value={editingDoacao.observacao}
                                        onChange={e => handleEditChange('observacao', e.target.value)}
                                        style={{ fontFamily: 'inherit' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-outline-secondary" onClick={() => setEditingDoacao(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving
                                        ? <><FontAwesomeIcon icon="sync" spin style={{ marginRight: '8px' }} />Salvando...</>
                                        : <><FontAwesomeIcon icon="check" style={{ marginRight: '8px' }} />Salvar</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Doacoes;
