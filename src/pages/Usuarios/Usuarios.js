// src/pages/Usuarios/Usuarios.js

import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { usuarioApi, perfilApi, permissaoApi, perfilPermissaoApi } from '../../services/api';
import './Usuarios.css';

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// Mesma regra da API: 8 a 72 caracteres, com ao menos uma letra e um número.
const REGRA_SENHA = 'Mínimo de 8 caracteres, com letra e número.';

function validarSenha(senha) {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (senha.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'A senha deve ter ao menos uma letra e um número.';
  return '';
}

export default function Usuarios() {
  const { selectedCorporacao, user } = useAuth();
  const { canManageUsers } = usePermissions();
  // Perfil global (sem corporação) vale para todas: só o usuário global altera.
  const usuarioGlobal = user?.idCorporacao === null;
  const podeAlterarPerfil = (perfil) => usuarioGlobal || perfil.idCorporacao !== null;
  // Ninguém se exclui nem troca o próprio perfil (a API também recusa).
  const ehProprioUsuario = (u) => u.idUsuario === user?.sub;
  // Gerenciar corporação, usuários e perfis, e ver a auditoria, é só dos perfis
  // globais: perfil da corporação é de operação e nem oferece essas permissões
  // (a API recusa).
  const ehPermissaoDeGerencia = (perm) =>
    perm.entidade === 'Corporacao' ||
    perm.entidade === 'Perfil' ||
    perm.entidade === 'Audit' ||
    (perm.entidade === 'Usuario' && perm.acao !== 'Visualizar');

  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Modal: Adicionar usuário ─────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ nome: '', email: '', senha: '', idPerfil: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Modal: Editar usuário ────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', senha: '', idPerfil: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Modal: Excluir usuário ───────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Modal: Resetar MFA ───────────────────────────────────────────────────
  const [resetMfaTarget, setResetMfaTarget] = useState(null);
  const [resetMfaLoading, setResetMfaLoading] = useState(false);
  const [resetMfaError, setResetMfaError] = useState('');

  // ── Modal: Gerenciar Perfis ──────────────────────────────────────────────
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [newPerfilDesc, setNewPerfilDesc] = useState('');
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilError, setPerfilError] = useState('');
  // edição inline de perfil
  const [editingPerfil, setEditingPerfil] = useState(null); // { idPerfil, descricao }
  const [editingPerfilDesc, setEditingPerfilDesc] = useState('');
  // confirmação de exclusão de perfil
  const [deletePerfilTarget, setDeletePerfilTarget] = useState(null);
  const [deletePerfilLoading, setDeletePerfilLoading] = useState(false);

  // ── Modal: Permissões do Perfil ──────────────────────────────────────────
  const [permModal, setPermModal] = useState(null);        // { perfil } — perfil sendo editado
  const [allPermissoes, setAllPermissoes] = useState([]);  // todas as permissões do sistema
  const [originalPermIds, setOriginalPermIds] = useState(new Set()); // as que o perfil já tinha
  const [pendingPermIds, setPendingPermIds] = useState(new Set());   // seleção local do usuário
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState('');

  const ENTITY_LABELS = { Corporacao: 'Corporação', Usuario: 'Usuário', Perfil: 'Perfil', Ocorrencia: 'Ocorrência' };

  /** Extrai um array de qualquer formato de resposta da API */
  function extractArray(res) {
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      for (const val of Object.values(res)) {
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  }

  const idCorporacao = selectedCorporacao?.idCorporacao;

  // ── Carregar dados ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!idCorporacao) return;
    setLoading(true);
    setError('');
    try {
      const [usuariosRes, perfisRes] = await Promise.all([
        usuarioApi.list(idCorporacao),
        perfilApi.list(idCorporacao),
      ]);
      setUsuarios(usuariosRes?.Usuarios ?? usuariosRes?.usuarios ?? usuariosRes ?? []);
      setPerfis(perfisRes?.Perfis ?? perfisRes?.perfis ?? perfisRes ?? []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [idCorporacao]);

  useEffect(() => { loadData(); }, [loadData]);

  const getPerfilNome = (idPerfil) =>
    perfis.find(p => p.idPerfil === idPerfil)?.descricao || '-';

  // ── Adicionar usuário ────────────────────────────────────────────────────
  const openAddModal = () => {
    setAddForm({ nome: '', email: '', senha: '', idPerfil: perfis[0]?.idPerfil?.toString() || '' });
    setAddError('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.nome.trim() || !addForm.email.trim() || !addForm.senha || !addForm.idPerfil) {
      setAddError('Preencha todos os campos obrigatórios.');
      return;
    }
    const erroSenha = validarSenha(addForm.senha);
    if (erroSenha) {
      setAddError(erroSenha);
      return;
    }
    setAddLoading(true);
    setAddError('');
    try {
      await usuarioApi.create({
        idCorporacao,
        idPerfil: Number(addForm.idPerfil),
        nome: addForm.nome.trim(),
        email: addForm.email.trim(),
        senha: addForm.senha,
      });
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      setAddError(err.message || 'Erro ao criar usuário.');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Editar usuário ───────────────────────────────────────────────────────
  const openEditModal = (u) => {
    setEditTarget(u);
    setEditForm({ nome: u.nome, email: u.email, senha: '', idPerfil: u.idPerfil?.toString() || '' });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.nome.trim() || !editForm.email.trim()) {
      setEditError('Nome e e-mail são obrigatórios.');
      return;
    }
    const erroSenha = editForm.senha ? validarSenha(editForm.senha) : '';
    if (erroSenha) {
      setEditError(erroSenha);
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const payload = {
        idUsuario: editTarget.idUsuario,
        nome: editForm.nome.trim(),
        email: editForm.email.trim(),
        idPerfil: Number(editForm.idPerfil),
      };
      if (editForm.senha) payload.senha = editForm.senha;
      await usuarioApi.update(payload);
      setEditTarget(null);
      await loadData();
    } catch (err) {
      setEditError(err.message || 'Erro ao atualizar usuário.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Excluir usuário ──────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await usuarioApi.delete(deleteTarget.idUsuario, idCorporacao);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err.message || 'Erro ao remover usuário.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Resetar MFA ──────────────────────────────────────────────────────────
  const handleResetMfaConfirm = async () => {
    if (!resetMfaTarget) return;
    setResetMfaLoading(true);
    setResetMfaError('');
    try {
      await usuarioApi.resetarMfa(resetMfaTarget.idUsuario);
      setResetMfaTarget(null);
      await loadData();
    } catch (err) {
      setResetMfaError(err.message || 'Erro ao resetar o MFA.');
    } finally {
      setResetMfaLoading(false);
    }
  };

  // ── Criar perfil ─────────────────────────────────────────────────────────
  const handlePerfilCreate = async (e) => {
    e.preventDefault();
    if (!newPerfilDesc.trim()) {
      setPerfilError('Informe o nome do perfil.');
      return;
    }
    setPerfilLoading(true);
    setPerfilError('');
    try {
      await perfilApi.create({ idCorporacao, descricao: newPerfilDesc.trim() });
      setNewPerfilDesc('');
      await loadData();
    } catch (err) {
      setPerfilError(err.message || 'Erro ao criar perfil.');
    } finally {
      setPerfilLoading(false);
    }
  };

  // ── Editar perfil (inline) ───────────────────────────────────────────────
  const startEditPerfil = (p) => {
    setEditingPerfil(p);
    setEditingPerfilDesc(p.descricao);
    setPerfilError('');
  };

  const handlePerfilUpdate = async (e) => {
    e.preventDefault();
    if (!editingPerfilDesc.trim()) return;
    setPerfilLoading(true);
    setPerfilError('');
    try {
      await perfilApi.update({
        idPerfil: editingPerfil.idPerfil,
        idCorporacao,
        descricao: editingPerfilDesc.trim(),
      });
      setEditingPerfil(null);
      await loadData();
    } catch (err) {
      setPerfilError(err.message || 'Erro ao editar perfil.');
    } finally {
      setPerfilLoading(false);
    }
  };

  // ── Excluir perfil ───────────────────────────────────────────────────────
  const handlePerfilDelete = async (p) => {
    setDeletePerfilTarget(p);
    setPerfilError('');
  };

  const confirmPerfilDelete = async () => {
    if (!deletePerfilTarget) return;
    setDeletePerfilLoading(true);
    setPerfilError('');
    try {
      await perfilApi.delete(deletePerfilTarget.idPerfil, idCorporacao);
      setDeletePerfilTarget(null);
      await loadData();
    } catch (err) {
      setPerfilError(err.message || 'Erro ao excluir perfil.');
      setDeletePerfilTarget(null);
    } finally {
      setDeletePerfilLoading(false);
    }
  };

  // ── Permissões do Perfil ─────────────────────────────────────────────────
  const openPermModal = async (perfil) => {
    setPermModal({ perfil });
    setAllPermissoes([]);
    setOriginalPermIds(new Set());
    setPendingPermIds(new Set());
    setPermLoading(true);
    setPermError('');
    try {
      const [allRes, assignedRes] = await Promise.all([
        permissaoApi.list(),
        perfilPermissaoApi.list(perfil.idPerfil, idCorporacao),
      ]);
      const todasPermissoes = extractArray(allRes);
      const assignedList = extractArray(assignedRes);
      // idPermissao pode estar direto no item ou dentro do objeto aninhado .permissao
      const assignedSet = new Set(
        assignedList.map(ap => ap.idPermissao ?? ap.permissao?.idPermissao).filter(Boolean)
      );
      setAllPermissoes(
        todasPermissoes.filter(perm =>
          // Corporação é só do Superusuário: não se atribui pelo modal.
          perm.entidade !== 'Corporacao' &&
          (perfil.idCorporacao === null || !ehPermissaoDeGerencia(perm))
        )
      );
      setOriginalPermIds(new Set(assignedSet));
      setPendingPermIds(new Set(assignedSet));
    } catch (err) {
      setPermError(err.message || 'Erro ao carregar permissões.');
    } finally {
      setPermLoading(false);
    }
  };

  const togglePerm = (idPermissao) => {
    setPendingPermIds(prev => {
      const next = new Set(prev);
      next.has(idPermissao) ? next.delete(idPermissao) : next.add(idPermissao);
      return next;
    });
  };

  const handlePermSave = async () => {
    if (!permModal) return;
    setPermSaving(true);
    setPermError('');
    const toAdd    = [...pendingPermIds].filter(id => !originalPermIds.has(id));
    const toRemove = [...originalPermIds].filter(id => !pendingPermIds.has(id));
    try {
      await Promise.all([
        ...toAdd.map(id    => perfilPermissaoApi.assign(permModal.perfil.idPerfil, id, idCorporacao)),
        ...toRemove.map(id => perfilPermissaoApi.remove(permModal.perfil.idPerfil, id, idCorporacao)),
      ]);
      setOriginalPermIds(new Set(pendingPermIds));
      setPermModal(null);
    } catch (err) {
      setPermError(err.message || 'Erro ao salvar permissões.');
    } finally {
      setPermSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!idCorporacao) {
    return (
      <main className="main-content">
        <header className="main-header"><h2>Gerenciamento de Usuários</h2></header>
        <section className="panel">
          <div style={{ padding: '24px', color: 'var(--texto-secundario)' }}>
            Nenhuma corporação selecionada.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main-content">
      <header className="main-header">
        <h2>Gerenciamento de Usuários</h2>
        {canManageUsers && (
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => { setPerfilError(''); setNewPerfilDesc(''); setEditingPerfil(null); setDeletePerfilTarget(null); setShowPerfilModal(true); }}>
              <FontAwesomeIcon icon="list-check" />
              Gerenciar Perfis
            </button>
            <button className="btn-primary" onClick={openAddModal}>
              <FontAwesomeIcon icon="plus" />
              Adicionar Usuário
            </button>
          </div>
        )}
      </header>

      <section className="panel modern-panel">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            <FontAwesomeIcon icon="sync" spin style={{ marginRight: 8 }} />
            Carregando usuários...
          </div>
        ) : error ? (
          <div style={{ padding: '24px' }}>
            <div className="modal-error">
              <FontAwesomeIcon icon="triangle-exclamation" />
              {error}
            </div>
          </div>
        ) : usuarios.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum usuário encontrado nesta corporação.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table modern-table usuarios-table">
              <thead>
                <tr>
                  <th className="col-avatar"></th>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  {canManageUsers && <th className="text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.idUsuario}>
                    <td>
                      <div className="user-avatar">{getInitials(u.nome)}</div>
                    </td>
                    <td>
                      <div className="user-cell__info">
                        <span className="user-cell__name">{u.nome}</span>
                        <span className="user-cell__email">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge ativo">{getPerfilNome(u.idPerfil)}</span>
                      {u.mfaAtivo === false && (
                        <span
                          className="status-badge pendente mfa-pendente-badge"
                          title="O usuário vai configurar o MFA no próximo login."
                        >
                          MFA pendente
                        </span>
                      )}
                    </td>
                    {canManageUsers && (
                      <td className="actions-cell text-right">
                        <button
                          type="button"
                          className="action-btn-minimal"
                          title="Editar usuário"
                          onClick={() => openEditModal(u)}
                        >
                          <FontAwesomeIcon icon="pencil" />
                        </button>
                        {/* Vale para o próprio usuário também: é como se troca de celular */}
                        {u.mfaAtivo && (
                          <button
                            type="button"
                            className="action-btn-minimal"
                            title="Resetar MFA"
                            onClick={() => { setResetMfaError(''); setResetMfaTarget(u); }}
                          >
                            <FontAwesomeIcon icon="mobile-screen" />
                          </button>
                        )}
                        {!ehProprioUsuario(u) && (
                          <button
                            type="button"
                            className="action-btn-minimal delete"
                            title="Remover usuário"
                            onClick={() => { setDeleteError(''); setDeleteTarget(u); }}
                          >
                            <FontAwesomeIcon icon="trash" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Modal: Adicionar Usuário ── */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Adicionar Usuário</h3>
              <button className="modal__close" onClick={() => setShowAddModal(false)}>
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal__body">
                {addError && <div className="modal-error"><FontAwesomeIcon icon="triangle-exclamation" />{addError}</div>}
                <div className="form-field">
                  <label>Nome *</label>
                  <input type="text" name="nome" value={addForm.nome}
                    onChange={e => setAddForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome completo" disabled={addLoading} />
                </div>
                <div className="form-field">
                  <label>E-mail *</label>
                  <input type="email" name="email" value={addForm.email}
                    onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="usuario@email.com" disabled={addLoading} />
                </div>
                <div className="form-field">
                  <label>Senha * <span style={{ fontWeight: 400, textTransform: 'none' }}>({REGRA_SENHA})</span></label>
                  <input type="password" name="senha" value={addForm.senha}
                    onChange={e => setAddForm(p => ({ ...p, senha: e.target.value }))}
                    placeholder="Senha inicial" autoComplete="new-password" disabled={addLoading} />
                </div>
                <div className="form-field">
                  <label>Perfil *</label>
                  <select name="idPerfil" value={addForm.idPerfil}
                    onChange={e => setAddForm(p => ({ ...p, idPerfil: e.target.value }))}
                    disabled={addLoading || perfis.length === 0}>
                    {perfis.length === 0
                      ? <option value="">Nenhum perfil — crie um primeiro</option>
                      : perfis.map(p => <option key={p.idPerfil} value={p.idPerfil}>{p.descricao}</option>)
                    }
                  </select>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={addLoading}>
                  {addLoading ? <><FontAwesomeIcon icon="sync" spin /> Salvando...</> : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Usuário ── */}
      {editTarget && (
        <div className="modal-backdrop" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Editar Usuário</h3>
              <button className="modal__close" onClick={() => setEditTarget(null)}>
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal__body">
                {editError && <div className="modal-error"><FontAwesomeIcon icon="triangle-exclamation" />{editError}</div>}
                <div className="form-field">
                  <label>Nome *</label>
                  <input type="text" value={editForm.nome}
                    onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))}
                    disabled={editLoading} />
                </div>
                <div className="form-field">
                  <label>E-mail *</label>
                  <input type="email" value={editForm.email}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    disabled={editLoading} />
                </div>
                <div className="form-field">
                  <label>Nova Senha <span style={{ fontWeight: 400, textTransform: 'none' }}>(deixe vazio para manter. {REGRA_SENHA})</span></label>
                  <input type="password" value={editForm.senha}
                    onChange={e => setEditForm(p => ({ ...p, senha: e.target.value }))}
                    placeholder="••••••••" autoComplete="new-password" disabled={editLoading} />
                </div>
                <div className="form-field">
                  <label>Perfil</label>
                  <select value={editForm.idPerfil}
                    onChange={e => setEditForm(p => ({ ...p, idPerfil: e.target.value }))}
                    disabled={editLoading || ehProprioUsuario(editTarget)}
                    title={ehProprioUsuario(editTarget) ? 'Você não pode alterar o próprio perfil.' : undefined}>
                    {perfis.map(p => <option key={p.idPerfil} value={p.idPerfil}>{p.descricao}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn-secondary" onClick={() => setEditTarget(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? <><FontAwesomeIcon icon="sync" spin /> Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Excluir Usuário ── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--delete" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Remover Usuário</h3>
              <button className="modal__close" onClick={() => setDeleteTarget(null)}>
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <div className="modal__body">
              {deleteError && <div className="modal-error"><FontAwesomeIcon icon="triangle-exclamation" />{deleteError}</div>}
              <p>Tem certeza que deseja remover <strong>{deleteTarget.nome}</strong> desta corporação? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={handleDeleteConfirm} disabled={deleteLoading}>
                {deleteLoading ? <><FontAwesomeIcon icon="sync" spin /> Removendo...</> : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Resetar MFA ── */}
      {resetMfaTarget && (
        <div className="modal-backdrop" onClick={() => setResetMfaTarget(null)}>
          <div className="modal modal--delete" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Resetar MFA</h3>
              <button className="modal__close" onClick={() => setResetMfaTarget(null)}>
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <div className="modal__body">
              {resetMfaError && <div className="modal-error"><FontAwesomeIcon icon="triangle-exclamation" />{resetMfaError}</div>}
              <p>
                Tem certeza que deseja resetar o MFA de <strong>{resetMfaTarget.nome}</strong>? O aplicativo autenticador
                e os códigos de recuperação atuais deixam de valer, e o MFA será configurado de novo no próximo login.
              </p>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn-secondary" onClick={() => setResetMfaTarget(null)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={handleResetMfaConfirm} disabled={resetMfaLoading}>
                {resetMfaLoading ? <><FontAwesomeIcon icon="sync" spin /> Resetando...</> : 'Resetar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gerenciar Perfis ── */}
      {showPerfilModal && (
        <div className="modal-backdrop" onClick={() => setShowPerfilModal(false)}>
          <div className="modal modal--perfis" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>Gerenciar Perfis</h3>
              <button className="modal__close" onClick={() => setShowPerfilModal(false)}>
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <div className="modal__body">
              {perfilError && <div className="modal-error"><FontAwesomeIcon icon="triangle-exclamation" />{perfilError}</div>}

              {/* Lista de perfis com edição/exclusão inline */}
              {perfis.length > 0 ? (
                <div className="perfis-list">
                  <p className="perfis-list__label">PERFIS CADASTRADOS</p>
                  {perfis.map(p => (
                    <div key={p.idPerfil} className="perfil-item">
                      {/* Confirmação de exclusão inline */}
                      {deletePerfilTarget?.idPerfil === p.idPerfil ? (
                        <div className="perfil-item__confirm">
                          <span>Excluir <strong>{p.descricao}</strong>?</span>
                          <button type="button" className="btn-danger btn-xs" onClick={confirmPerfilDelete} disabled={deletePerfilLoading}>
                            {deletePerfilLoading ? <FontAwesomeIcon icon="sync" spin /> : 'Excluir'}
                          </button>
                          <button type="button" className="btn-secondary btn-xs" onClick={() => setDeletePerfilTarget(null)}>Não</button>
                        </div>
                      ) : editingPerfil?.idPerfil === p.idPerfil ? (
                        /* Edição inline */
                        <form className="perfil-item__edit" onSubmit={handlePerfilUpdate}>
                          <input
                            type="text"
                            value={editingPerfilDesc}
                            onChange={e => setEditingPerfilDesc(e.target.value)}
                            autoFocus
                            disabled={perfilLoading}
                          />
                          <button type="submit" className="btn-primary btn-xs" disabled={perfilLoading}>
                            {perfilLoading ? <FontAwesomeIcon icon="sync" spin /> : <FontAwesomeIcon icon="check" />}
                          </button>
                          <button type="button" className="btn-secondary btn-xs" onClick={() => setEditingPerfil(null)}>
                            <FontAwesomeIcon icon="xmark" />
                          </button>
                        </form>
                      ) : (
                        /* Visualização normal */
                        <>
                          <FontAwesomeIcon icon="users" className="perfil-item__icon" />
                          <span className="perfil-item__name">
                            {p.descricao}
                            {p.idCorporacao === null && <span className="perfil-item__tag">Global</span>}
                          </span>
                          <div className="perfil-item__actions">
                            <button type="button" className="action-btn-minimal" title={podeAlterarPerfil(p) ? 'Permissões' : 'Ver permissões'} onClick={() => openPermModal(p)}>
                              <FontAwesomeIcon icon="key" />
                            </button>
                            {podeAlterarPerfil(p) && (
                              <>
                                <button type="button" className="action-btn-minimal" title="Editar" onClick={() => startEditPerfil(p)}>
                                  <FontAwesomeIcon icon="pencil" />
                                </button>
                                <button type="button" className="action-btn-minimal delete" title="Excluir" onClick={() => handlePerfilDelete(p)}>
                                  <FontAwesomeIcon icon="trash" />
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--texto-secundario)', fontSize: 14, marginBottom: 8 }}>
                  Nenhum perfil cadastrado ainda.
                </p>
              )}

              {/* Criar novo perfil */}
              <form className="perfil-create-form" onSubmit={handlePerfilCreate}>
                <p className="perfis-list__label" style={{ marginTop: 12 }}>NOVO PERFIL</p>
                <div className="perfil-create-row">
                  <input
                    type="text"
                    value={newPerfilDesc}
                    onChange={e => { setNewPerfilDesc(e.target.value); if (perfilError) setPerfilError(''); }}
                    placeholder="Ex: Socorrista, Chefe de Equipe..."
                    disabled={perfilLoading}
                  />
                  <button type="submit" className="btn-primary" disabled={perfilLoading}>
                    {perfilLoading ? <FontAwesomeIcon icon="sync" spin /> : <><FontAwesomeIcon icon="plus" /> Criar</>}
                  </button>
                </div>
              </form>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn-secondary" onClick={() => setShowPerfilModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal: Permissões do Perfil ── */}
      {permModal && (
        <div className="modal-backdrop" onClick={() => { setPermModal(null); setPermError(''); }}>
          <div className="modal modal--permissions" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3>Permissões</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-secundario)' }}>
                  {permModal.perfil.descricao}
                </p>
              </div>
              <button className="modal__close" onClick={() => { setPermModal(null); setPermError(''); }}>
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <div className="modal__body">
              {permError && <div className="modal-error" style={{ marginBottom: 12 }}><FontAwesomeIcon icon="triangle-exclamation" />{permError}</div>}

              {!podeAlterarPerfil(permModal.perfil) && (
                <p className="perm-readonly">
                  <FontAwesomeIcon icon="lock" />
                  Perfil global: vale para todas as corporações e só o administrador do sistema pode alterar.
                </p>
              )}

              {permLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--texto-secundario)' }}>
                  <FontAwesomeIcon icon="sync" spin style={{ marginRight: 8 }} />
                  Carregando permissões...
                </div>
              ) : allPermissoes.length === 0 ? (
                <p style={{ color: 'var(--texto-secundario)', fontSize: 14 }}>Nenhuma permissão encontrada.</p>
              ) : (
                Object.entries(
                  allPermissoes.reduce((groups, perm) => {
                    (groups[perm.entidade] = groups[perm.entidade] || []).push(perm);
                    return groups;
                  }, {})
                ).map(([entidade, perms]) => (
                  <div className="perm-group" key={entidade}>
                    <p className="perm-group__label">
                      {ENTITY_LABELS[entidade] || entidade}
                    </p>
                    <div className="perm-group__items">
                      {perms.map(perm => (
                        <label key={perm.idPermissao} className="perm-checkbox">
                          <input
                            type="checkbox"
                            checked={pendingPermIds.has(perm.idPermissao)}
                            onChange={() => togglePerm(perm.idPermissao)}
                            disabled={permSaving || !podeAlterarPerfil(permModal.perfil)}
                          />
                          <span>{perm.acao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal__footer">
              {podeAlterarPerfil(permModal.perfil) ? (
                <>
                  <button type="button" className="btn-secondary" onClick={() => { setPermModal(null); setPermError(''); }} disabled={permSaving}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-primary" onClick={handlePermSave} disabled={permLoading || permSaving}>
                    {permSaving ? <><FontAwesomeIcon icon="sync" spin /> Salvando...</> : 'Salvar'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn-secondary" onClick={() => { setPermModal(null); setPermError(''); }}>
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
