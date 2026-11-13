import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { produtoApi, movimentoEstoqueApi } from '../../services/api';
import Pagination from '../../components/Pagination/Pagination';
import { usePagination } from '../../hooks/usePagination';
import './Produtos.css';

const UNIDADE_LABEL = {
    1: 'Unidade', 2: 'Caixa', 3: 'Par', 4: 'Rolo',
    5: 'Litro', 6: 'mL', 7: 'Kg', 8: 'g', 9: 'Metro', 10: 'Ampola',
};
const SITUACAO_LABEL = { 1: 'Ativo', 2: 'Inativo' };
const SITUACAO_CLASS = { 1: 'ativo', 2: 'inativo' };

const ControleProdutos = () => {
    const { selectedCorporacao } = useAuth();
    const { canManageUsers } = usePermissions();

    const [products, setProducts]   = useState([]);
    const [saldos, setSaldos]       = useState({}); // { idProduto: number }
    const [stats, setStats]         = useState({ TotalProduto: 0, ProdutoAtivo: 0, EstoqueBaixo: 0 });
    const [search, setSearch]       = useState('');
    const [loading, setLoading]     = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    // Modal de edição de dados do produto
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSaving, setIsSaving]   = useState(false);

    // Modal de movimentação de estoque
    const [estoqueModal, setEstoqueModal] = useState(null); // produto selecionado
    const [movForm, setMovForm] = useState({ idTipoMovimento: 1, quantidade: '', justificativa: '' });
    const [isSavingMov, setIsSavingMov] = useState(false);

    const [error, setError] = useState('');

    const idCorporacao = selectedCorporacao?.idCorporacao;

    /* ── carrega saldos em paralelo para todos os produtos ── */
    const loadSaldos = useCallback(async (productList) => {
        if (!productList.length) return;
        const results = await Promise.allSettled(
            productList.map(p =>
                movimentoEstoqueApi.saldo(p.idProduto)
                    .then(r => ({ id: p.idProduto, saldo: r?.saldo ?? 0 }))
            )
        );
        const map = {};
        results.forEach(r => {
            if (r.status === 'fulfilled') map[r.value.id] = r.value.saldo;
        });
        setSaldos(map);
    }, []);

    const loadData = useCallback(() => {
        if (!idCorporacao) return;
        setLoading(true);
        Promise.all([
            produtoApi.list(idCorporacao),
            produtoApi.estatisticas(idCorporacao),
        ])
            .then(([listRes, statsRes]) => {
                const prods = listRes?.Produtos ?? [];
                setProducts(prods);
                setStats(statsRes ?? { TotalProduto: 0, ProdutoAtivo: 0, EstoqueBaixo: 0 });
                loadSaldos(prods);
            })
            .catch(() => setError('Erro ao carregar produtos.'))
            .finally(() => setLoading(false));
    }, [idCorporacao, loadSaldos]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── atualiza saldo de um único produto após movimentação ── */
    const refreshSaldo = async (idProduto) => {
        try {
            const res = await movimentoEstoqueApi.saldo(idProduto);
            setSaldos(prev => ({ ...prev, [idProduto]: res?.saldo ?? 0 }));
        } catch {}
    };

    /* ── DELETE ── */
    const handleDelete = async (idProduto) => {
        if (!window.confirm('Deseja realmente excluir este produto?')) return;
        setDeletingId(idProduto);
        try {
            await produtoApi.delete(idProduto);
            setProducts(prev => prev.filter(p => p.idProduto !== idProduto));
            produtoApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
        } catch (err) {
            alert(err.message || 'Erro ao excluir produto.');
        } finally {
            setDeletingId(null);
        }
    };

    /* ── MODAL EDITAR PRODUTO ── */
    const openEdit = (product) => {
        setEditingProduct({
            idProduto: product.idProduto,
            nome: product.nome ?? '',
            precoUnitario: product.precoUnitario ?? '',
            idTipoUnidadeMedida: product.idTipoUnidadeMedida ?? 1,
            estoqueMinimo: product.estoqueMinimo ?? '',
            idTipoSituacao: product.idTipoSituacao ?? 1,
            descricao: product.descricao ?? '',
        });
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                idProduto: editingProduct.idProduto,
                idCorporacao,
                nome: editingProduct.nome,
                precoUnitario: editingProduct.precoUnitario !== '' ? Number(editingProduct.precoUnitario) : null,
                idTipoUnidadeMedida: Number(editingProduct.idTipoUnidadeMedida),
                estoqueMinimo: Number(editingProduct.estoqueMinimo),
                idTipoSituacao: Number(editingProduct.idTipoSituacao),
                descricao: editingProduct.descricao || null,
            };
            const res = await produtoApi.update(payload);
            const updated = res?.Produto ?? payload;
            setProducts(prev => prev.map(p => p.idProduto === updated.idProduto ? { ...p, ...updated } : p));
            produtoApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
            setEditingProduct(null);
        } catch (err) {
            alert(err.message || 'Erro ao salvar produto.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ── MODAL MOVIMENTAÇÃO DE ESTOQUE ── */
    const openEstoque = (product) => {
        setEstoqueModal(product);
        setMovForm({ idTipoMovimento: 1, quantidade: '', justificativa: '' });
    };

    const handleMovSave = async (e) => {
        e.preventDefault();
        if (!movForm.quantidade || Number(movForm.quantidade) <= 0) {
            alert('Informe uma quantidade válida.');
            return;
        }
        setIsSavingMov(true);
        try {
            await movimentoEstoqueApi.create({
                idProduto: estoqueModal.idProduto,
                idTipoMovimento: Number(movForm.idTipoMovimento),
                quantidade: Number(movForm.quantidade),
                justificativa: movForm.justificativa || undefined,
            });
            await refreshSaldo(estoqueModal.idProduto);
            produtoApi.estatisticas(idCorporacao).then(setStats).catch(() => {});
            setEstoqueModal(null);
        } catch (err) {
            alert(err.message || 'Erro ao registrar movimentação.');
        } finally {
            setIsSavingMov(false);
        }
    };

    const filtered = products.filter(p =>
        p.nome?.toLowerCase().includes(search.toLowerCase())
    );
    const paginacao = usePagination(filtered);

    const isEntrada = movForm.idTipoMovimento === 1;

    return (
        <main className="main-content">
            <header className="main-header">
                <h2>Controle de Produtos</h2>
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
                    <div className="kpi-icon products"><FontAwesomeIcon icon="box-archive" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Total de Produtos</span>
                        <h3 className="kpi-value">{stats.TotalProduto} itens</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon active"><FontAwesomeIcon icon="check" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Produtos Ativos</span>
                        <h3 className="kpi-value">{stats.ProdutoAtivo} itens</h3>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon alert"><FontAwesomeIcon icon="triangle-exclamation" /></div>
                    <div className="kpi-info">
                        <span className="kpi-label">Estoque Baixo</span>
                        <h3 className="kpi-value">{stats.EstoqueBaixo} alertas</h3>
                    </div>
                </div>
            </section>

            <section className="panel modern-panel">
                <div className="filters modern-filters">
                    <div className="search-input">
                        <FontAwesomeIcon icon="search" />
                        <input
                            type="text"
                            placeholder="Buscar por nome do produto..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {canManageUsers && (
                        <Link to="/produtos/cadastrar" className="btn-primary">
                            <FontAwesomeIcon icon="plus" />
                            Novo Produto
                        </Link>
                    )}
                </div>

                {loading ? (
                    <p style={{ padding: '32px', textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
                        Carregando produtos...
                    </p>
                ) : (
                    <div className="table-wrapper">
                        <table className="data-table modern-table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Preço Unitário (R$)</th>
                                    <th>Unidade</th>
                                    <th>Saldo Atual</th>
                                    <th>Estoque Mín.</th>
                                    <th>Situação</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--cor-texto-secundario)' }}>
                                            Nenhum produto encontrado.
                                        </td>
                                    </tr>
                                ) : paginacao.pageItems.map(product => {
                                    const saldo = saldos[product.idProduto];
                                    const estoqueMin = product.estoqueMinimo ?? 0;
                                    const isBaixo = saldo !== undefined && estoqueMin > 0 && saldo <= estoqueMin;

                                    return (
                                        <tr key={product.idProduto}>
                                            <td className="font-medium">{product.nome}</td>
                                            <td>
                                                {product.precoUnitario != null
                                                    ? `R$ ${Number(product.precoUnitario).toFixed(2)}`
                                                    : '—'}
                                            </td>
                                            <td>{UNIDADE_LABEL[product.idTipoUnidadeMedida] ?? '—'}</td>
                                            <td>
                                                {saldo === undefined ? (
                                                    <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '13px' }}>…</span>
                                                ) : (
                                                    <span style={{ color: isBaixo ? '#dc2626' : 'inherit', fontWeight: isBaixo ? 700 : 400 }}>
                                                        {saldo}
                                                        {isBaixo && (
                                                            <FontAwesomeIcon
                                                                icon="triangle-exclamation"
                                                                style={{ marginLeft: '6px', fontSize: '11px' }}
                                                                title="Estoque abaixo do mínimo"
                                                            />
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                            <td>{product.estoqueMinimo ?? '—'}</td>
                                            <td>
                                                <span className={`status-badge ${SITUACAO_CLASS[product.idTipoSituacao] ?? 'inativo'}`}>
                                                    {SITUACAO_LABEL[product.idTipoSituacao] ?? 'Desconhecido'}
                                                </span>
                                            </td>
                                            <td className="actions-cell text-right">
                                                {canManageUsers && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="action-btn-minimal"
                                                            title="Movimentar Estoque"
                                                            onClick={() => openEstoque(product)}
                                                        >
                                                            <FontAwesomeIcon icon="cloud-arrow-up" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="action-btn-minimal"
                                                            title="Editar Produto"
                                                            onClick={() => openEdit(product)}
                                                        >
                                                            <FontAwesomeIcon icon="pencil" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="action-btn-minimal delete"
                                                            title="Excluir"
                                                            disabled={deletingId === product.idProduto}
                                                            onClick={() => handleDelete(product.idProduto)}
                                                        >
                                                            <FontAwesomeIcon icon="trash" />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && (
                    <Pagination page={paginacao.page} totalPages={paginacao.totalPages} total={paginacao.total} pageSize={paginacao.pageSize} onPageChange={paginacao.setPage} label="produtos" />
                )}
            </section>

            {/* ── MODAL: MOVIMENTAÇÃO DE ESTOQUE ── */}
            {estoqueModal && (
                <div className="modal-overlay active" onClick={() => setEstoqueModal(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <h3>Movimentar Estoque</h3>
                            <button className="modal-close-btn" onClick={() => setEstoqueModal(null)}>
                                <FontAwesomeIcon icon="xmark" />
                            </button>
                        </div>
                        <form onSubmit={handleMovSave}>
                            <div className="modal-body">
                                {/* Info do produto */}
                                <div style={{ background: 'var(--cor-fundo, #f8fafc)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)', display: 'block' }}>Produto</span>
                                        <strong>{estoqueModal.nome}</strong>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)', display: 'block' }}>Saldo atual</span>
                                        <strong style={{ fontSize: '20px' }}>{saldos[estoqueModal.idProduto] ?? '…'}</strong>
                                        <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)', marginLeft: '4px' }}>
                                            {UNIDADE_LABEL[estoqueModal.idTipoUnidadeMedida] ?? ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Tipo de movimento */}
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Tipo de Movimentação*</label>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setMovForm(f => ({ ...f, idTipoMovimento: 1 }))}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid',
                                                borderColor: movForm.idTipoMovimento === 1 ? '#16a34a' : 'var(--cor-borda, #e2e8f0)',
                                                background: movForm.idTipoMovimento === 1 ? '#f0fdf4' : 'transparent',
                                                color: movForm.idTipoMovimento === 1 ? '#16a34a' : 'var(--cor-texto-secundario)',
                                                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            <FontAwesomeIcon icon="arrow-down" style={{ marginRight: '8px', transform: 'rotate(180deg)' }} />
                                            Entrada
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMovForm(f => ({ ...f, idTipoMovimento: 2 }))}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '8px', border: '2px solid',
                                                borderColor: movForm.idTipoMovimento === 2 ? '#dc2626' : 'var(--cor-borda, #e2e8f0)',
                                                background: movForm.idTipoMovimento === 2 ? '#fef2f2' : 'transparent',
                                                color: movForm.idTipoMovimento === 2 ? '#dc2626' : 'var(--cor-texto-secundario)',
                                                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            <FontAwesomeIcon icon="arrow-down" style={{ marginRight: '8px' }} />
                                            Saída
                                        </button>
                                    </div>
                                </div>

                                {/* Quantidade */}
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label htmlFor="mov-qtd">
                                        Quantidade*
                                        <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)', marginLeft: '6px' }}>
                                            ({UNIDADE_LABEL[estoqueModal.idTipoUnidadeMedida] ?? 'un'})
                                        </span>
                                    </label>
                                    <input
                                        id="mov-qtd"
                                        type="number"
                                        min={1}
                                        required
                                        placeholder="Ex: 10"
                                        value={movForm.quantidade}
                                        onChange={e => setMovForm(f => ({ ...f, quantidade: e.target.value }))}
                                        style={{ marginTop: '6px' }}
                                    />
                                </div>

                                {/* Resultado estimado */}
                                {movForm.quantidade && saldos[estoqueModal.idProduto] !== undefined && (
                                    <div style={{
                                        background: isEntrada ? '#f0fdf4' : '#fef2f2',
                                        border: `1px solid ${isEntrada ? '#bbf7d0' : '#fecaca'}`,
                                        borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
                                        fontSize: '13px', color: isEntrada ? '#166534' : '#991b1b',
                                    }}>
                                        Novo saldo estimado: <strong>
                                            {isEntrada
                                                ? (saldos[estoqueModal.idProduto] + Number(movForm.quantidade))
                                                : Math.max(0, saldos[estoqueModal.idProduto] - Number(movForm.quantidade))}
                                        </strong> {UNIDADE_LABEL[estoqueModal.idTipoUnidadeMedida] ?? ''}
                                    </div>
                                )}

                                {/* Justificativa */}
                                <div className="form-group">
                                    <label htmlFor="mov-just">Justificativa (Opcional)</label>
                                    <textarea
                                        id="mov-just"
                                        placeholder="Ex: Reposição mensal, uso em ocorrência #1045..."
                                        value={movForm.justificativa}
                                        onChange={e => setMovForm(f => ({ ...f, justificativa: e.target.value }))}
                                        style={{ fontFamily: 'inherit', marginTop: '6px' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-outline-secondary" onClick={() => setEstoqueModal(null)}>
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSavingMov}
                                    style={{ background: isEntrada ? '#16a34a' : '#dc2626', borderColor: isEntrada ? '#16a34a' : '#dc2626' }}
                                >
                                    {isSavingMov ? (
                                        <><FontAwesomeIcon icon="sync" spin style={{ marginRight: '8px' }} />Salvando...</>
                                    ) : (
                                        <><FontAwesomeIcon icon="check" style={{ marginRight: '8px' }} />
                                            Confirmar {isEntrada ? 'Entrada' : 'Saída'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDITAR PRODUTO ── */}
            {editingProduct && (
                <div className="modal-overlay active" onClick={() => setEditingProduct(null)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <h3>Editar Produto</h3>
                            <button className="modal-close-btn" onClick={() => setEditingProduct(null)}>
                                <FontAwesomeIcon icon="xmark" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSave}>
                            <div className="modal-body">
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label>Nome do Produto*</label>
                                    <input
                                        type="text"
                                        value={editingProduct.nome}
                                        onChange={e => setEditingProduct(p => ({ ...p, nome: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Preço Unitário (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editingProduct.precoUnitario}
                                        onChange={e => setEditingProduct(p => ({ ...p, precoUnitario: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unidade de Medida*</label>
                                    <select
                                        value={editingProduct.idTipoUnidadeMedida}
                                        onChange={e => setEditingProduct(p => ({ ...p, idTipoUnidadeMedida: e.target.value }))}
                                        style={{ paddingTop: '12px', paddingBottom: '12px' }}
                                    >
                                        {Object.entries(UNIDADE_LABEL).map(([id, label]) => (
                                            <option key={id} value={id}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Estoque Mínimo*</label>
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={editingProduct.estoqueMinimo}
                                        onChange={e => setEditingProduct(p => ({ ...p, estoqueMinimo: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Situação*</label>
                                    <div className="chip-group">
                                        {[{ id: 1, label: 'Ativo' }, { id: 2, label: 'Inativo' }].map(s => (
                                            <div
                                                key={s.id}
                                                className={`chip-option ${editingProduct.idTipoSituacao === s.id ? 'active' : ''}`}
                                                onClick={() => setEditingProduct(p => ({ ...p, idTipoSituacao: s.id }))}
                                            >
                                                {s.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <label>Descrição</label>
                                    <textarea
                                        value={editingProduct.descricao}
                                        onChange={e => setEditingProduct(p => ({ ...p, descricao: e.target.value }))}
                                        style={{ fontFamily: 'inherit' }}
                                    />
                                </div>
                            </div>{/* fecha form-grid */}
                            </div>{/* fecha modal-body */}
                            <div className="modal-footer">
                                <button type="button" className="btn-outline-secondary" onClick={() => setEditingProduct(null)}>
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

export default ControleProdutos;
