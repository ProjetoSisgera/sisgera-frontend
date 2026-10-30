// src/pages/Auditoria/Auditoria.js

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { auditApi, usuarioApi } from '../../services/api';
import '../Usuarios/Usuarios.css';
import './Auditoria.css';

// Cada API guarda a própria auditoria; a tela junta as três numa lista só,
// do registro mais novo para o mais antigo.
const ORIGENS = [
  { chave: 'auth', listar: auditApi.listAuth,
    entidades: ['Corporacao', 'Usuario', 'Perfil', 'PerfilPermissao', 'Permissao'] },
  { chave: 'ocorrencia', listar: auditApi.listOcorrencia,
    entidades: ['Ocorrencia', 'Vitima', 'VeiculoOcorrencia', 'Hospital', 'EncaminhamentoHospitalar',
      'AvaliacaoClinica', 'TraumaAvaliacaoClinica', 'EmergenciaAvaliacaoClinica',
      'ProcedimentoAvaliacaoClinica', 'EquipePlantaoOcorrencia', 'FotoOcorrencia'] },
  { chave: 'inventario', listar: auditApi.listInventario,
    entidades: ['Produto', 'MovimentoEstoque', 'Patrimonio', 'Doacao'] },
];

const NOMES_ENTIDADE = {
  Corporacao: 'Corporação',
  Usuario: 'Usuário',
  Perfil: 'Perfil',
  PerfilPermissao: 'Permissão do perfil',
  Permissao: 'Permissão',
  Ocorrencia: 'Ocorrência',
  Vitima: 'Vítima',
  VeiculoOcorrencia: 'Veículo da ocorrência',
  Hospital: 'Hospital',
  EncaminhamentoHospitalar: 'Encaminhamento hospitalar',
  AvaliacaoClinica: 'Avaliação clínica',
  TraumaAvaliacaoClinica: 'Trauma da avaliação',
  EmergenciaAvaliacaoClinica: 'Emergência da avaliação',
  ProcedimentoAvaliacaoClinica: 'Procedimento da avaliação',
  EquipePlantaoOcorrencia: 'Equipe de plantão',
  FotoOcorrencia: 'Foto da ocorrência',
  Produto: 'Produto',
  MovimentoEstoque: 'Movimento de estoque',
  Patrimonio: 'Patrimônio',
  Doacao: 'Doação',
};

const ACOES = ['Cadastrar', 'Editar', 'Excluir'];

// Registros por "Carregar mais"
const TAMANHO_PAGINA = 25;

const nomeEntidade = (entidade) => NOMES_ENTIDADE[entidade] || entidade;
const tempo = (item) => new Date(item.dataCadastro).getTime();

// Mais novo primeiro; no mesmo instante, o maior idAudit primeiro.
const maisNovoPrimeiro = (a, b) => tempo(b) - tempo(a) || b.idAudit - a.idAudit;

const formatarDataHora = (valor) =>
  new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

const ISO_DATA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const ADMIN_SISTEMA = 'Administrador do sistema';

function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'string' && ISO_DATA.test(valor)) return formatarDataHora(valor);
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

// Identificador do registro alterado: id<Entidade> (ou a chave composta).
function identificarRegistro(item) {
  const dados = item.dadosNovos ?? item.dadosAntigos;
  if (!dados) return '';
  if (dados.where) return `${dados.count ?? 0} registro(s)`;
  const chave = `id${item.entidade}`;
  if (dados[chave] !== undefined) return `#${dados[chave]}`;
  const ids = Object.keys(dados).filter(k => k.startsWith('id') && k !== 'idCorporacao');
  return ids.slice(0, 2).map(k => `${k}: ${dados[k]}`).join(', ');
}

// Campos para o modal. Com antes e depois (edição, exclusão lógica), só os que
// mudaram; com um lado só (cadastro, exclusão física), todos os do registro.
function camposDoRegistro(item) {
  const antigo = item.dadosAntigos || {};
  const novo = item.dadosNovos || {};
  const comparar = Boolean(item.dadosAntigos && item.dadosNovos);
  const chaves = [...new Set([...Object.keys(antigo), ...Object.keys(novo)])]
    .filter(k => k !== 'dataAlteracao');
  return chaves
    .map(k => ({ campo: k, antes: antigo[k], depois: novo[k] }))
    .filter(c => !comparar || JSON.stringify(c.antes) !== JSON.stringify(c.depois));
}

const fontesVazias = () =>
  Object.fromEntries(ORIGENS.map(o => [o.chave, { itens: [], temMais: true, erro: '' }]));

// Até onde a lista junta é confiável: a fonte que ainda tem registros e parou
// no registro mais novo limita o que pode ser mostrado das outras.
function horizonte(fontes) {
  let limite = -Infinity;
  for (const fonte of Object.values(fontes)) {
    if (!fonte.temMais) continue;
    const ultimo = fonte.itens[fonte.itens.length - 1];
    limite = Math.max(limite, ultimo ? tempo(ultimo) : Infinity);
  }
  return limite;
}

function visiveis(fontes) {
  const limite = horizonte(fontes);
  return ORIGENS
    .flatMap(o => fontes[o.chave].itens.map(item => ({ ...item, origem: o.chave })))
    .filter(item => tempo(item) >= limite)
    .sort(maisNovoPrimeiro);
}

const FILTROS_INICIAIS = { de: '', ate: '', acao: '', entidade: '', idUsuario: '', escopo: 'corporacao' };

export default function Auditoria() {
  const { user, selectedCorporacao } = useAuth();
  const { has, isAdmin } = usePermissions();
  const podeVer = has('Audit', 'Visualizar');
  const idCorporacao = selectedCorporacao?.idCorporacao;

  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [fontes, setFontes] = useState(fontesVazias);
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [idsGlobais, setIdsGlobais] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  // Descarta a resposta de uma busca antiga quando os filtros mudam no meio.
  const buscaAtual = useRef(0);

  // Admin pode ver todas as corporações; o Coordenador a API já restringe.
  const todasCorporacoes = isAdmin && (filtros.escopo === 'todas' || !idCorporacao);

  const consulta = useMemo(() => ({
    idCorporacao: todasCorporacoes ? undefined : idCorporacao,
    idUsuario: filtros.idUsuario || undefined,
    acao: filtros.acao || undefined,
    entidade: filtros.entidade || undefined,
    de: filtros.de ? new Date(`${filtros.de}T00:00:00`).toISOString() : undefined,
    ate: filtros.ate ? new Date(`${filtros.ate}T23:59:59.999`).toISOString() : undefined,
  }), [filtros, idCorporacao, todasCorporacoes]);

  // Busca a próxima página das fontes que limitam a lista até ter pelo menos
  // `alvo` registros novos visíveis (ou acabarem os registros).
  const carregar = useCallback(async (inicial, alvo) => {
    const busca = ++buscaAtual.current;
    setLoading(true);

    // Próxima página de uma origem, a partir do último registro que ela trouxe.
    const buscarPagina = async (origem, fonte) => {
      const ultimo = fonte.itens[fonte.itens.length - 1];
      try {
        const res = await origem.listar({
          ...consulta,
          limite: TAMANHO_PAGINA,
          antesDe: ultimo?.dataCadastro,
          antesDeId: ultimo?.idAudit,
        });
        return [origem.chave, {
          itens: [...fonte.itens, ...(res?.Audits ?? [])],
          temMais: Boolean(res?.temMais),
          erro: '',
        }];
      } catch (err) {
        // Uma API fora do ar não derruba a tela: mostra o aviso e segue.
        return [origem.chave, { ...fonte, temMais: false, erro: err.message || 'Falha ao carregar.' }];
      }
    };

    let atual = inicial;
    const jaVisiveis = visiveis(atual).length;

    for (let rodada = 0; rodada < 6; rodada++) {
      const limite = horizonte(atual);
      if (limite === -Infinity || visiveis(atual).length - jaVisiveis >= alvo) break;

      const nestaRodada = atual;
      const pendentes = ORIGENS.filter(o => {
        const fonte = nestaRodada[o.chave];
        const ultimo = fonte.itens[fonte.itens.length - 1];
        return fonte.temMais && (!ultimo || tempo(ultimo) >= limite);
      });

      const respostas = await Promise.all(
        pendentes.map(o => buscarPagina(o, nestaRodada[o.chave]))
      );

      if (busca !== buscaAtual.current) return;
      atual = { ...atual, ...Object.fromEntries(respostas) };
      setFontes(atual);
    }

    if (busca === buscaAtual.current) setLoading(false);
  }, [consulta]);

  // Filtro novo: recomeça do zero. Fontes que não têm o tipo de registro
  // escolhido nem são consultadas.
  useEffect(() => {
    if (!podeVer) return;
    const inicial = fontesVazias();
    if (consulta.entidade) {
      ORIGENS.forEach(o => {
        if (!o.entidades.includes(consulta.entidade)) inicial[o.chave].temMais = false;
      });
    }
    setFontes(inicial);
    carregar(inicial, TAMANHO_PAGINA);
  }, [podeVer, consulta, carregar]);

  useEffect(() => {
    if (!podeVer || !idCorporacao) return;
    usuarioApi.list(idCorporacao)
      .then(res => setUsuarios(res?.Usuarios ?? res?.usuarios ?? []))
      .catch(() => setUsuarios([]));
  }, [podeVer, idCorporacao]);

  // Ações do Superusuário: a corporação não o enxerga, então aparece só como
  // "Administrador do sistema", sem nome.
  useEffect(() => {
    if (!podeVer) return;
    auditApi.usuariosGlobais()
      .then(res => setIdsGlobais(res?.idsUsuario ?? []))
      .catch(() => setIdsGlobais([]));
  }, [podeVer]);

  const nomeUsuario = (idUsuario) => {
    if (idUsuario === user?.sub) return 'Você';
    if (idsGlobais.includes(idUsuario)) return ADMIN_SISTEMA;
    return usuarios.find(u => u.idUsuario === idUsuario)?.nome || `Usuário #${idUsuario}`;
  };

  const lista = visiveis(fontes);
  const temMais = Object.values(fontes).some(f => f.temMais);
  const erros = ORIGENS.map(o => fontes[o.chave].erro).filter(Boolean);
  const alterarFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }));
  const filtrando = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIAIS);

  if (!podeVer) {
    return (
      <main className="main-content">
        <header className="main-header"><h2>Auditoria</h2></header>
        <section className="panel">
          <div style={{ padding: '24px', color: 'var(--texto-secundario)' }}>
            Você não tem permissão para ver a auditoria.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="main-content">
      <header className="main-header">
        <h2>Auditoria</h2>
      </header>

      <section className="panel modern-panel auditoria-filtros">
        <div className="form-field">
          <label>De</label>
          <input type="date" value={filtros.de} onChange={alterarFiltro('de')} />
        </div>
        <div className="form-field">
          <label>Até</label>
          <input type="date" value={filtros.ate} onChange={alterarFiltro('ate')} />
        </div>
        <div className="form-field">
          <label>Ação</label>
          <select value={filtros.acao} onChange={alterarFiltro('acao')}>
            <option value="">Todas</option>
            {ACOES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Registro</label>
          <select value={filtros.entidade} onChange={alterarFiltro('entidade')}>
            <option value="">Todos</option>
            {Object.keys(NOMES_ENTIDADE)
              .sort((a, b) => nomeEntidade(a).localeCompare(nomeEntidade(b)))
              .map(e => <option key={e} value={e}>{nomeEntidade(e)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Usuário</label>
          <select value={filtros.idUsuario} onChange={alterarFiltro('idUsuario')}>
            <option value="">Todos</option>
            {user?.sub && <option value={user.sub}>Você</option>}
            {idsGlobais.filter(id => id !== user?.sub).map(id => (
              <option key={`global-${id}`} value={id}>{ADMIN_SISTEMA}</option>
            ))}
            {usuarios.filter(u => u.idUsuario !== user?.sub).map(u => (
              <option key={u.idUsuario} value={u.idUsuario}>{u.nome}</option>
            ))}
          </select>
        </div>
        {isAdmin && idCorporacao && (
          <div className="form-field">
            <label>Corporação</label>
            <select value={filtros.escopo} onChange={alterarFiltro('escopo')}>
              <option value="corporacao">{selectedCorporacao?.nome || 'Atual'}</option>
              <option value="todas">Todas</option>
            </select>
          </div>
        )}
        {filtrando && (
          <button type="button" className="btn-secondary auditoria-limpar"
            onClick={() => setFiltros(FILTROS_INICIAIS)}>
            Limpar filtros
          </button>
        )}
      </section>

      {erros.length > 0 && (
        <div className="modal-error auditoria-aviso">
          <FontAwesomeIcon icon="triangle-exclamation" />
          Parte da auditoria não carregou: {erros.join(' ')}
        </div>
      )}

      <section className="panel modern-panel">
        {lista.length === 0 && !loading ? (
          <div className="auditoria-vazia">
            <FontAwesomeIcon icon="clock" className="auditoria-vazia__icone" />
            <p>{filtrando ? 'Nenhum registro com esses filtros.' : 'Nenhum registro de auditoria ainda.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table modern-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(item => (
                  <tr key={`${item.origem}-${item.idAudit}`} className="auditoria-linha"
                    onClick={() => setDetalhe(item)} title="Ver detalhes">
                    <td className="auditoria-data">{formatarDataHora(item.dataCadastro)}</td>
                    <td>{nomeUsuario(item.idUsuario)}</td>
                    <td>
                      <span className={`auditoria-acao auditoria-acao--${item.acao.toLowerCase()}`}>
                        {item.acao}
                      </span>
                    </td>
                    <td>
                      {nomeEntidade(item.entidade)}{' '}
                      <span className="auditoria-id">{identificarRegistro(item)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(loading || temMais) && (
          <div className="auditoria-mais">
            {loading ? (
              <span><FontAwesomeIcon icon="sync" spin style={{ marginRight: 8 }} />Carregando...</span>
            ) : (
              <button type="button" className="btn-secondary"
                onClick={() => carregar(fontes, TAMANHO_PAGINA)}>
                Carregar mais
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Modal: Detalhe do registro ── */}
      {detalhe && (
        <div className="modal-backdrop" onClick={() => setDetalhe(null)}>
          <div className="modal modal--auditoria" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>{detalhe.acao} · {nomeEntidade(detalhe.entidade)} {identificarRegistro(detalhe)}</h3>
              <button className="modal__close" onClick={() => setDetalhe(null)} aria-label="Fechar">
                <FontAwesomeIcon icon="xmark" />
              </button>
            </div>
            <div className="modal__body">
              <p className="auditoria-meta">
                {formatarDataHora(detalhe.dataCadastro)} · {nomeUsuario(detalhe.idUsuario)}
              </p>
              {camposDoRegistro(detalhe).length === 0 ? (
                <p className="auditoria-meta">Nenhum campo alterado.</p>
              ) : (
                <table className="auditoria-campos">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      {detalhe.dadosAntigos && <th>Antes</th>}
                      {detalhe.dadosNovos && <th>Depois</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {camposDoRegistro(detalhe).map(c => (
                      <tr key={c.campo}>
                        <td className="auditoria-campo">{c.campo}</td>
                        {detalhe.dadosAntigos && <td>{formatarValor(c.antes)}</td>}
                        {detalhe.dadosNovos && <td>{formatarValor(c.depois)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal__footer">
              <button type="button" className="btn-secondary" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
