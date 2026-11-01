import { useState, useMemo, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ocorrenciaApi } from '../../services/api';
import NovaOcorrenciaModal from './NovaOcorrenciaModal';
import { GaleriaMidias, TermosRecusa } from './MidiasOcorrencia';
import './Ocorrencias.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const TIPO_OCORRENCIA = { 1: 'Simplificado', 2: 'Incêndio', 3: 'Resgate' };
const TIPO_STATUS     = { 1: 'Rascunho', 2: 'Validado', 3: 'Arquivado', 4: 'Pend. Validação', 5: 'Pend. Arquivamento' };
const STATUS_CLASS    = { 1: 'urgente', 2: 'em-andamento', 3: 'concluido', 4: 'pendente', 5: 'pendente-arq' };

// Transições de status disponíveis por status atual (action em vez de id para suportar múltiplas ações → mesmo alvo)
const STATUS_OPTIONS = {
  1: [
    { action: 'validar',   label: 'Validar',   danger: false, warning: 'Após validar, a ocorrência ficará aguardando arquivamento.' },
    { action: 'invalidar', label: 'Invalidar',  danger: true,  warning: 'A ocorrência será marcada como Pendente de Validação e devolvida para revisão.' },
    { action: 'arquivar',  label: 'Arquivar',   danger: true,  warning: 'Após arquivar, o status não poderá mais ser alterado. Esta ação é irreversível.' },
  ],
  2: [
    { action: 'arquivar',  label: 'Arquivar',   danger: true,  warning: 'Após arquivar, o status não poderá mais ser alterado. Esta ação é irreversível.' },
  ],
  4: [
    { action: 'resubmeter', label: 'Resubmeter', danger: false, warning: 'A ocorrência voltará ao status Rascunho para edição e reenvio.' },
  ],
  5: [
    { action: 'revalidar',  label: 'Revalidar',  danger: false, warning: 'A ocorrência voltará ao status Validado.' },
  ],
};

const formatDate     = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '-';
const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString('pt-BR')     : '-';

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`toast ${type}`}>
      <div className="toast-icon"><FontAwesomeIcon icon={type === 'success' ? 'check-circle' : 'circle-info'} /></div>
      <span>{message}</span>
    </div>
  );
};

// ── Modal de Mudança de Status (2 etapas: escolha → confirmação) ──────────────
const ACTION_ICON = {
  validar:   'check',
  invalidar:  'times',
  arquivar:  'box-archive',
  resubmeter: 'arrow-right',
  revalidar:  'check',
};

const StatusConfirmModal = ({ ocorrencia, onConfirm, onCancel }) => {
  const options = STATUS_OPTIONS[ocorrencia.idTipoStatus] || [];
  const [selected, setSelected] = useState(options.length === 1 ? options[0] : null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  if (!options.length) return null;

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await onConfirm(ocorrencia.idOcorrencia, selected.action);
    } catch (err) {
      setError(err.message || 'Erro ao alterar status.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal--delete" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Alterar Status</h3>
          <button className="modal__close" onClick={onCancel}><FontAwesomeIcon icon="xmark" /></button>
        </div>
        <div className="modal__body">
          {error && (
            <div className="modal-error" style={{ marginBottom: 12 }}>
              <FontAwesomeIcon icon="triangle-exclamation" /> {error}
            </div>
          )}

          <p style={{ marginBottom: 12, fontSize: 14 }}>
            Ocorrência <strong>#{ocorrencia.idOcorrencia}</strong> — {TIPO_OCORRENCIA[ocorrencia.idTipoOcorrencia]}
            <span style={{ marginLeft: 8 }} className={`status-pill ${STATUS_CLASS[ocorrencia.idTipoStatus]}`}>
              {TIPO_STATUS[ocorrencia.idTipoStatus]}
            </span>
          </p>

          {/* Etapa 1: escolher ação (só aparece se mais de uma opção) */}
          {options.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--texto-secundario)', marginBottom: 8 }}>
                Selecione a ação:
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {options.map(opt => (
                  <button
                    key={opt.action}
                    type="button"
                    className={selected?.action === opt.action ? (opt.danger ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}
                    style={{ flex: 1 }}
                    onClick={() => { setSelected(opt); setError(''); }}
                    disabled={saving}
                  >
                    <FontAwesomeIcon icon={ACTION_ICON[opt.action] || 'check'} style={{ marginRight: 6 }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 2: aviso de confirmação */}
          {selected && (
            <div style={{
              padding: '10px 14px',
              background: selected.danger ? '#fff7ed' : '#f0fdf4',
              border: `1px solid ${selected.danger ? '#fdba74' : '#86efac'}`,
              borderRadius: 8,
              fontSize: 13,
            }}>
              <FontAwesomeIcon
                icon="triangle-exclamation"
                style={{ color: selected.danger ? '#f97316' : '#22c55e', marginRight: 6 }}
              />
              {selected.warning}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className={selected?.danger ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
            disabled={!selected || saving}
          >
            {saving
              ? <><FontAwesomeIcon icon="sync" spin /> Salvando...</>
              : selected ? `Confirmar — ${selected.label}` : 'Selecione uma ação'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Lookups para exibição nos modais ─────────────────────────────────────────
const ORIGEM_LABELS = {
  1: '193 (Bombeiros)', 2: 'Rádio', 3: 'App/Online', 4: 'Presencial',
  5: 'Outro', 6: 'CECOM', 7: 'SAMU', 8: 'PMMG', 9: 'BMMG', 10: 'PRF',
};
const TIPO_LOCAL_LABELS = {
  1: 'Via pública', 2: 'Via rural', 3: 'Rodovia', 4: 'Residência', 5: 'Outro',
};
const TIPO_SIMPLIFICADO_LABELS = {
  1: 'Vistoria e inspeção', 2: 'Corte de árvore', 3: 'Desobstrução de via',
  4: 'Eventos da defesa civil', 5: 'Transporte intra-hospitalar',
  6: 'Cobertura em evento (público)', 7: 'Cobertura em evento (privado)',
  8: 'Transporte para o domicílio', 9: 'Outro',
};
const GENERO_LABELS   = { 1: 'Masculino', 2: 'Feminino', 3: 'Não Informado' };
const DESTINO_LABELS  = {
  1: 'Óbito no local', 2: 'Vítima atendida no local', 3: 'Evadiu do local',
  4: 'Recusou atendimento', 5: 'Encaminhado ao hospital', 6: 'Recusou encaminhamento ao hospital',
};
const TRAUMA_LABELS = {
  1: 'Queda de altura (+2m)', 2: 'Queda da própria altura', 3: 'Ferimento por arma de fogo',
  4: 'Ferimento por arma branca', 5: 'Colisão veicular', 6: 'Atropelamento',
  7: 'Capotamento', 8: 'Colisão entre veículo/animal', 9: 'Choque elétrico',
  10: 'Agressão por animal', 11: 'Agressão por animal peçonhento', 12: 'Agressão física',
  13: 'Soterramento', 14: 'Desabamento', 15: 'Afogamento', 16: 'Queimadura', 17: 'Outro',
};
const EMERGENCIA_LABELS = {
  1: 'Parada cardiorrespiratória (PCR)', 2: 'OVACE', 3: 'Convulsão', 4: 'Síncope / Desmaio',
  5: 'Tentativa de autoextermínio', 6: 'Embriaguez', 7: 'Suspeita de AVC',
  8: 'Suspeita de infarto', 9: 'Assistência ao parto', 10: 'Distúrbio psiquiátrico (agitação)',
  11: 'Intoxicação exógena', 12: 'Dispnéia', 13: 'Dor precordial', 14: 'Outro',
};
const PROCEDIMENTO_LABELS = {
  1: 'Desobstrução de vias aéreas', 2: 'Cânula orofaríngea', 3: 'Administração de oxigênio',
  4: 'Colar cervical', 5: 'Oximetria de pulso', 6: 'Prancha longa', 7: 'Massagem Cardíaca (RCP)',
  8: 'Curativos', 9: 'Atadura', 10: 'Bandagem', 11: 'Cobertor Térmico',
  12: 'Desfibrilador Externo Automático (DEA)', 13: 'Ventilação Mecânica com Ambú',
  14: 'KED', 15: 'Maca tipo SKED', 16: 'Talas de imobilização', 17: 'Outro',
};
const ABERTURA_OCULAR_LABELS  = { 1: 'Ausente (1pt)', 2: 'À dor (2pt)', 3: 'À voz (3pt)', 4: 'Espontânea (4pt)' };
const RESPOSTA_VERBAL_LABELS  = { 1: 'Ausente (1pt)', 2: 'Incompreensível (2pt)', 3: 'Desconexo (3pt)', 4: 'Confuso (4pt)', 5: 'Orientado (5pt)' };
const RESPOSTA_MOTORA_LABELS  = { 1: 'Ausente (1pt)', 2: 'Extensão (2pt)', 3: 'Flexão (3pt)', 4: 'Retira à dor (4pt)', 5: 'Adequada (5pt)', 6: 'Obedece comandos (6pt)' };
const UF_LABELS = {
  1:'AC',2:'AL',3:'AP',4:'AM',5:'BA',6:'CE',7:'DF',8:'ES',9:'GO',10:'MA',
  11:'MT',12:'MS',13:'MG',14:'PA',15:'PB',16:'PR',17:'PE',18:'PI',19:'RJ',
  20:'RN',21:'RS',22:'RO',23:'RR',24:'SC',25:'SP',26:'SE',27:'TO',
};

const toTime = (iso) => iso ? iso.split('T')[1]?.slice(0, 5) || '' : '';

// ── Modal de Edição da Ocorrência (apenas Rascunho) ───────────────────────────
const EditOcorrenciaModal = ({ ocorrencia, onClose, onSaved }) => {
  const [form, setForm] = useState({
    idTipoOcorrencia:   ocorrencia.idTipoOcorrencia?.toString() || '1',
    dataOcorrencia:     ocorrencia.dataOcorrencia ? ocorrencia.dataOcorrencia.split('T')[0] : '',
    horaTransmissao:    toTime(ocorrencia.horaTransmissao),
    horaChegadaLocal:   toTime(ocorrencia.horaChegadaLocal),
    horaChegadaHospital: toTime(ocorrencia.horaChegadaHospital),
    endereco:           ocorrencia.endereco        || '',
    numero:             ocorrencia.numero?.toString() || '',
    complemento:        ocorrencia.complemento     || '',
    bairro:             ocorrencia.bairro          || '',
    cidade:             ocorrencia.cidade          || '',
    cep:                ocorrencia.cep             || '',
    pontoReferencia:    ocorrencia.pontoReferencia || '',
    relatoFinal:        ocorrencia.relatoFinal     || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dataOcorrencia) { setError('Informe a data da ocorrência.'); return; }
    setSaving(true);
    setError('');
    const db = form.dataOcorrencia;
    const toISO = (t) => t ? `${db}T${t}:00.000Z` : undefined;
    try {
      await ocorrenciaApi.update({
        idOcorrencia:       ocorrencia.idOcorrencia,
        idTipoOcorrencia:   Number(form.idTipoOcorrencia),
        dataOcorrencia:     new Date(form.dataOcorrencia).toISOString(),
        ...(form.horaTransmissao    && { horaTransmissao:    toISO(form.horaTransmissao) }),
        ...(form.horaChegadaLocal   && { horaChegadaLocal:   toISO(form.horaChegadaLocal) }),
        ...(form.horaChegadaHospital && { horaChegadaHospital: toISO(form.horaChegadaHospital) }),
        ...(form.endereco           && { endereco:           form.endereco }),
        ...(form.numero             && { numero:             Number(form.numero) }),
        ...(form.complemento        && { complemento:        form.complemento }),
        ...(form.bairro             && { bairro:             form.bairro }),
        ...(form.cidade             && { cidade:             form.cidade }),
        ...(form.cep                && { cep:                form.cep.replace(/\D/g, '') }),
        ...(form.pontoReferencia    && { pontoReferencia:    form.pontoReferencia }),
        ...(form.relatoFinal        && { relatoFinal:        form.relatoFinal }),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Editar Ocorrência #{ocorrencia.idOcorrencia}</h3>
          <button className="modal__close" onClick={onClose}><FontAwesomeIcon icon="xmark" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {error && (
              <div className="modal-error" style={{ marginBottom: 12 }}>
                <FontAwesomeIcon icon="triangle-exclamation" /> {error}
              </div>
            )}

            <p className="perfis-list__label" style={{ marginBottom: 8 }}>TIPO E DATA</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field">
                <label htmlFor="edit-tipoOcorrencia">Tipo de Ocorrência</label>
                <select id="edit-tipoOcorrencia" value={form.idTipoOcorrencia} onChange={set('idTipoOcorrencia')} disabled={saving}>
                  <option value="1">Simplificado</option>
                  <option value="2">Incêndio</option>
                  <option value="3">Resgate / Salvamento</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="edit-dataOcorrencia">Data da Ocorrência *</label>
                <input type="date" id="edit-dataOcorrencia" value={form.dataOcorrencia} onChange={set('dataOcorrencia')} disabled={saving} />
              </div>
            </div>

            <p className="perfis-list__label" style={{ marginTop: 16, marginBottom: 8 }}>HORÁRIOS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-field">
                <label htmlFor="edit-horaTransmissao">Hora Transmissão</label>
                <input type="time" id="edit-horaTransmissao" value={form.horaTransmissao} onChange={set('horaTransmissao')} disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-horaChegadaLocal">Hora Chegada ao Local</label>
                <input type="time" id="edit-horaChegadaLocal" value={form.horaChegadaLocal} onChange={set('horaChegadaLocal')} disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-horaChegadaHospital">Hora Chegada ao Hospital</label>
                <input type="time" id="edit-horaChegadaHospital" value={form.horaChegadaHospital} onChange={set('horaChegadaHospital')} disabled={saving} />
              </div>
            </div>

            <p className="perfis-list__label" style={{ marginTop: 16, marginBottom: 8 }}>LOCAL DA OCORRÊNCIA</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="edit-endereco">Endereço</label>
                <input type="text" id="edit-endereco" value={form.endereco} onChange={set('endereco')} disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-numero">Número</label>
                <input type="number" id="edit-numero" value={form.numero} onChange={set('numero')} disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-complemento">Complemento</label>
                <input type="text" id="edit-complemento" value={form.complemento} onChange={set('complemento')} placeholder="Apto, Bloco..." disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-bairro">Bairro</label>
                <input type="text" id="edit-bairro" value={form.bairro} onChange={set('bairro')} disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-cidade">Cidade</label>
                <input type="text" id="edit-cidade" value={form.cidade} onChange={set('cidade')} disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-cep">CEP</label>
                <input type="text" id="edit-cep" value={form.cep} onChange={set('cep')} placeholder="00000-000" disabled={saving} />
              </div>
              <div className="form-field">
                <label htmlFor="edit-pontoReferencia">Ponto de Referência</label>
                <input type="text" id="edit-pontoReferencia" value={form.pontoReferencia} onChange={set('pontoReferencia')} disabled={saving} />
              </div>
            </div>

            <p className="perfis-list__label" style={{ marginTop: 16, marginBottom: 8 }}>RELATO FINAL</p>
            <div className="form-field">
              <label htmlFor="edit-relatoFinal" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Relato Final</label>
              <textarea
                id="edit-relatoFinal"
                value={form.relatoFinal}
                onChange={set('relatoFinal')}
                rows={4}
                placeholder="Descreva o ocorrido..."
                disabled={saving}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Arquivos são enviados e excluídos na hora, sem esperar o "Salvar Alterações". */}
            <GaleriaMidias idOcorrencia={ocorrencia.idOcorrencia} editavel />
            <TermosRecusa idOcorrencia={ocorrencia.idOcorrencia} editavel />
          </div>
          <div className="modal__footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><FontAwesomeIcon icon="sync" spin /> Salvando...</> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal de Detalhes (visualização completa) ─────────────────────────────────
const OcorrenciaDetailModal = ({ ocorrencia, onClose }) => {
  if (!ocorrencia) return null;

  const Row = ({ label, value }) => value != null && value !== '' ? (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--borda, #f1f5f9)' }}>
      <span style={{ minWidth: 170, color: 'var(--texto-secundario)', fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13 }}>{value}</span>
    </div>
  ) : null;

  const Sec = ({ children }) => (
    <p className="perfis-list__label" style={{ marginTop: 16, marginBottom: 8 }}>{children}</p>
  );

  const Tag = ({ children }) => (
    <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500, marginRight: 4, marginBottom: 4 }}>
      {children}
    </span>
  );

  const origemLabel = ocorrencia.idTipoOrigemChamado
    ? (ORIGEM_LABELS[ocorrencia.idTipoOrigemChamado] || '-') + (ocorrencia.origemChamadoOutro ? ` — ${ocorrencia.origemChamadoOutro}` : '')
    : null;

  const localLabel = ocorrencia.idTipoLocalOcorrencia
    ? (TIPO_LOCAL_LABELS[ocorrencia.idTipoLocalOcorrencia] || '-') + (ocorrencia.localOcorrenciaOutro ? ` — ${ocorrencia.localOcorrenciaOutro}` : '')
    : null;

  const subtipoLabel = ocorrencia.idTipoOcorrencia === 1 && ocorrencia.idTipoOcorrenciaSimplificado
    ? (TIPO_SIMPLIFICADO_LABELS[ocorrencia.idTipoOcorrenciaSimplificado] || '-') + (ocorrencia.ocorrenciaSimplificadoOutro ? ` — ${ocorrencia.ocorrenciaSimplificadoOutro}` : '')
    : null;

  const hasEndereco = ocorrencia.endereco || ocorrencia.cidade || ocorrencia.bairro || ocorrencia.cep;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3>Ocorrência #{ocorrencia.idOcorrencia}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-secundario)' }}>
              {TIPO_OCORRENCIA[ocorrencia.idTipoOcorrencia] || '-'}
              {subtipoLabel && ` — ${subtipoLabel}`}
            </p>
          </div>
          <button className="modal__close" onClick={onClose}><FontAwesomeIcon icon="xmark" /></button>
        </div>

        <div className="modal__body">
          {/* Status */}
          <div style={{ marginBottom: 14 }}>
            <span className={`status-pill ${STATUS_CLASS[ocorrencia.idTipoStatus] || ''}`} style={{ cursor: 'default' }}>
              {TIPO_STATUS[ocorrencia.idTipoStatus] || '-'}
            </span>
            {ocorrencia.idTipoStatus === 3 && (
              <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--texto-secundario)' }}>
                <FontAwesomeIcon icon="lock" style={{ marginRight: 4 }} />Status final
              </span>
            )}
          </div>

          {/* Horários */}
          <Sec>HORÁRIOS</Sec>
          <Row label="Data da Ocorrência"      value={formatDate(ocorrencia.dataOcorrencia)} />
          <Row label="Hora Transmissão"         value={formatDateTime(ocorrencia.horaTransmissao)} />
          <Row label="Hora Chegada ao Local"    value={formatDateTime(ocorrencia.horaChegadaLocal)} />
          <Row label="Hora Chegada ao Hospital" value={formatDateTime(ocorrencia.horaChegadaHospital)} />

          {/* Chamado */}
          {(origemLabel || localLabel) && (
            <>
              <Sec>CHAMADO</Sec>
              <Row label="Origem do Chamado" value={origemLabel} />
              <Row label="Tipo de Local"     value={localLabel} />
            </>
          )}

          {/* Local */}
          {hasEndereco && (
            <>
              <Sec>LOCAL DA OCORRÊNCIA</Sec>
              <Row label="CEP"                  value={ocorrencia.cep} />
              <Row label="Endereço"             value={ocorrencia.endereco} />
              <Row label="Número"               value={ocorrencia.numero} />
              <Row label="Complemento"          value={ocorrencia.complemento} />
              <Row label="Bairro"               value={ocorrencia.bairro} />
              <Row label="Cidade / UF"          value={[ocorrencia.cidade, UF_LABELS[ocorrencia.idUf]].filter(Boolean).join(' — ') || null} />
              <Row label="Ponto de Referência"  value={ocorrencia.pontoReferencia} />
            </>
          )}

          {/* Relato */}
          {ocorrencia.relatoFinal && (
            <>
              <Sec>RELATO FINAL</Sec>
              <p style={{ fontSize: 13, lineHeight: 1.6, background: '#f8fafc', padding: 12, borderRadius: 8, margin: 0 }}>
                {ocorrencia.relatoFinal}
              </p>
            </>
          )}

          {/* Vítimas */}
          {ocorrencia.vitimas?.length > 0 && (
            <>
              <Sec>VÍTIMAS ({ocorrencia.vitimas.length})</Sec>
              {ocorrencia.vitimas.map((v, idx) => {
                const AO = { 1:1,2:2,3:3,4:4 };
                const RV = { 1:1,2:2,3:3,4:4,5:5 };
                const RM = { 1:1,2:2,3:3,4:4,5:5,6:6 };
                const glasgowTotal = (AO[v.idAberturaOcular] ?? 0) + (RV[v.idRespostaVerbal] ?? 0) + (RM[v.idRespostaMotora] ?? 0) || null;
                const hasVitais = v.pressaoSistolica || v.pulso || v.respiracao || v.temperatura || v.saturacao;
                const hasGlasgow = v.idAberturaOcular || v.idRespostaVerbal || v.idRespostaMotora;

                return (
                  <div key={v.idVitima || idx} style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cor-primaria, #c53030)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{idx + 1}</div>
                        <div>
                          <strong style={{ fontSize: 14 }}>{v.nome || 'Sem nome'}</strong>
                          {v.cpf && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>CPF: {v.cpf}</span>}
                        </div>
                      </div>
                      {glasgowTotal ? <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>Glasgow: {glasgowTotal}/15</span> : null}
                    </div>

                    <div style={{ padding: '10px 16px' }}>
                      <Row label="Data de Nascimento" value={v.dataNascimento ? formatDate(v.dataNascimento) : null} />
                      <Row label="Gênero"       value={GENERO_LABELS[v.idGenero]} />
                      <Row label="Nome Social"  value={v.nomeSocial} />
                      <Row label="Nome da Mãe"  value={v.nomeMae} />
                      <Row label="Telefone"     value={v.telefone} />

                      {hasVitais && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--texto-secundario)', margin: '12px 0 4px', textTransform: 'uppercase' }}>Sinais Vitais</p>
                          {(v.pressaoSistolica != null || v.pressaoDiastolica != null) && (
                            <Row label="Pressão Arterial" value={`${v.pressaoSistolica ?? '-'}/${v.pressaoDiastolica ?? '-'} mmHg`} />
                          )}
                          <Row label="Pulso"              value={v.pulso        ? `${v.pulso} bpm`    : null} />
                          <Row label="Respiração"         value={v.respiracao   ? `${v.respiracao} irpm` : null} />
                          <Row label="Temperatura"        value={v.temperatura  ? `${v.temperatura} °C`  : null} />
                          <Row label="Saturação"          value={v.saturacao    ? `${v.saturacao}%`       : null} />
                          <Row label="Saturação c/ O₂"   value={v.saturacaoOxigenio ? `${v.saturacaoOxigenio} L/min` : null} />
                        </>
                      )}

                      {hasGlasgow && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--texto-secundario)', margin: '12px 0 4px', textTransform: 'uppercase' }}>Escala de Glasgow</p>
                          <Row label="Abertura Ocular" value={ABERTURA_OCULAR_LABELS[v.idAberturaOcular]} />
                          <Row label="Resposta Verbal" value={RESPOSTA_VERBAL_LABELS[v.idRespostaVerbal]} />
                          <Row label="Resposta Motora" value={RESPOSTA_MOTORA_LABELS[v.idRespostaMotora]} />
                          {glasgowTotal && <Row label="Total Glasgow" value={`${glasgowTotal} / 15`} />}
                        </>
                      )}

                      {v.traumas?.length > 0 && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--texto-secundario)', margin: '12px 0 4px', textTransform: 'uppercase' }}>Traumas</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
                            {v.traumas.map(id => <Tag key={id}>{TRAUMA_LABELS[id] || id}{id === 17 && v.traumaOutro ? `: ${v.traumaOutro}` : ''}</Tag>)}
                          </div>
                        </>
                      )}

                      {v.emergencias?.length > 0 && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--texto-secundario)', margin: '12px 0 4px', textTransform: 'uppercase' }}>Emergências Clínicas</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
                            {v.emergencias.map(id => <Tag key={id}>{EMERGENCIA_LABELS[id] || id}{id === 14 && v.emergenciaOutro ? `: ${v.emergenciaOutro}` : ''}</Tag>)}
                          </div>
                        </>
                      )}

                      {v.procedimentos?.length > 0 && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--texto-secundario)', margin: '12px 0 4px', textTransform: 'uppercase' }}>Procedimentos</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
                            {v.procedimentos.map(id => <Tag key={id}>{PROCEDIMENTO_LABELS[id] || id}{id === 17 && v.procedimentoOutro ? `: ${v.procedimentoOutro}` : ''}</Tag>)}
                          </div>
                        </>
                      )}

                      <Row label="Destino"     value={DESTINO_LABELS[v.idTipoDestino]} />
                      <Row label="Prontuário"  value={v.numeroProntuario} />
                      <Row label="Médico Receptor" value={v.nomeMedicoReceptor} />
                      <Row label="CRM"         value={v.crm} />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <GaleriaMidias idOcorrencia={ocorrencia.idOcorrencia} />
          <TermosRecusa idOcorrencia={ocorrencia.idOcorrencia} />

          {/* Registro */}
          <Sec>REGISTRO</Sec>
          <Row label="Cadastrado em"  value={formatDateTime(ocorrencia.dataCadastro)} />
          {ocorrencia.dataValidado  && <Row label="Validado em"   value={formatDateTime(ocorrencia.dataValidado)} />}
          {ocorrencia.dataArquivado && <Row label="Arquivado em"  value={formatDateTime(ocorrencia.dataArquivado)} />}
        </div>

        <div className="modal__footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

// ── Tabela ────────────────────────────────────────────────────────────────────
const TabTodas = ({ data, loading, error, onView, onEdit, onDelete, onStatusClick, canManage, canChangeStatus, search, filterTipo, onSearchChange, onFilterTipoChange }) => {
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-secundario)' }}>
      <FontAwesomeIcon icon="sync" spin style={{ marginRight: 8 }} />Carregando ocorrências...
    </div>
  );
  if (error) return (
    <div style={{ padding: 24 }}>
      <div className="modal-error"><FontAwesomeIcon icon="triangle-exclamation" /> {error}</div>
    </div>
  );

  return (
    <>
      <div className="filters-row">
        <div className="search-input-flex">
          <FontAwesomeIcon icon="search" />
          <input
            type="text"
            aria-label="Buscar ocorrências"
            placeholder="Buscar por local, tipo, nome ou CPF da vítima..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <select className="filter-select" aria-label="Filtrar por tipo de ocorrência" value={filterTipo} onChange={e => onFilterTipoChange(e.target.value)}>
          <option value="">Todos os Tipos</option>
          <option value="1">Simplificado</option>
          <option value="2">Incêndio</option>
          <option value="3">Resgate</option>
        </select>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--texto-secundario)' }}>
          Nenhuma ocorrência registrada.
        </div>
      ) : (
        <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Local</th>
              <th>Tipo</th>
              <th>Vítimas</th>
              <th>Data</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => {
              const hasNext = !!(STATUS_OPTIONS[item.idTipoStatus]?.length);
              const local = [item.cidade, item.bairro].filter(Boolean).join(' / ') || item.endereco || '-';
              const totalVitimas = item.vitimas?.length ?? 0;
              const primeiraVitima = item.vitimas?.[0];
              return (
                <tr key={item.idOcorrencia}>
                  <td>{local}</td>
                  <td className="font-medium">{TIPO_OCORRENCIA[item.idTipoOcorrencia] || '-'}</td>
                  <td>
                    {totalVitimas === 0
                      ? <span style={{ color: 'var(--texto-secundario)', fontSize: 12 }}>—</span>
                      : <>
                          <span>{primeiraVitima?.nome || 'Sem nome'}</span>
                          {totalVitimas > 1 && (
                            <span style={{ fontSize: 11, color: 'var(--texto-secundario)', marginLeft: 5 }}>
                              +{totalVitimas - 1}
                            </span>
                          )}
                        </>
                    }
                  </td>
                  <td>{formatDate(item.dataOcorrencia)}</td>
                  <td>
                    <span
                      className={`status-pill ${STATUS_CLASS[item.idTipoStatus] || ''}`}
                      title={canChangeStatus && hasNext ? 'Clique para alterar status' : undefined}
                      style={{ cursor: canChangeStatus && hasNext ? 'pointer' : 'default' }}
                      onClick={() => canChangeStatus && hasNext && onStatusClick(item)}
                    >
                      {TIPO_STATUS[item.idTipoStatus] || '-'}
                      {canChangeStatus && hasNext && (
                        <FontAwesomeIcon icon="chevron-right" style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }} />
                      )}
                    </span>
                  </td>
                  <td className="actions-cell text-right">
                    <button type="button" className="action-btn" title="Visualizar" onClick={() => onView(item)}>
                      <FontAwesomeIcon icon="eye" />
                    </button>
                    {canManage && item.idTipoStatus === 1 && (
                      <button type="button" className="action-btn" title="Editar" onClick={() => onEdit(item)}>
                        <FontAwesomeIcon icon="pencil" />
                      </button>
                    )}
                    {canManage && (
                      <button type="button" className="action-btn delete" title="Excluir" onClick={() => onDelete(item.idOcorrencia)}>
                        <FontAwesomeIcon icon="trash" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
      <div className="pagination">
        <span>Exibindo {data.length} resultado{data.length !== 1 ? 's' : ''}</span>
      </div>
    </>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
const ControleOcorrencias = () => {
  const [activeTab,      setActiveTab]      = useState('tab-todas');
  const [isModalOpen,    setIsModalOpen]    = useState(false);
  const [viewTarget,     setViewTarget]     = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [statusTarget,   setStatusTarget]   = useState(null);
  const [toast,          setToast]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [filterTipo,     setFilterTipo]     = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCorporacao, user } = useAuth();
  const { canManageUsers, canValidateOcorrencias } = usePermissions();
  const idCorporacao = selectedCorporacao?.idCorporacao;

  useEffect(() => {
    if (location.pathname === '/ocorrencias/nova') setIsModalOpen(true);
  }, [location]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (location.pathname === '/ocorrencias/nova') navigate('/ocorrencias');
  };

  // ── Carregar ──────────────────────────────────────────────────────────────
  const [occurrences, setOccurrences] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const loadOccurrences = useCallback(async () => {
    if (!idCorporacao) return;
    setLoading(true); setError('');
    try {
      const res = await ocorrenciaApi.list(idCorporacao);
      setOccurrences(res?.Ocorrencias ?? []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar ocorrências.');
    } finally {
      setLoading(false);
    }
  }, [idCorporacao]);

  useEffect(() => { loadOccurrences(); }, [loadOccurrences]);

  const statusCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    occurrences.forEach(o => { if (c[o.idTipoStatus] !== undefined) c[o.idTipoStatus]++; });
    return c;
  }, [occurrences]);

  const filteredOccurrences = useMemo(() => {
    let list = occurrences;
    if (filterTipo) {
      list = list.filter(o => o.idTipoOcorrencia === Number(filterTipo));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      list = list.filter(o => {
        const local = [o.cidade, o.bairro, o.endereco].filter(Boolean).join(' ').toLowerCase();
        const tipo = (TIPO_OCORRENCIA[o.idTipoOcorrencia] || '').toLowerCase();
        if (local.includes(q) || tipo.includes(q)) return true;
        return o.vitimas?.some(v => {
          const nome = (v.nome || '').toLowerCase();
          const cpf = (v.cpf || '').replace(/\D/g, '');
          return nome.includes(q) || (qDigits && cpf.includes(qDigits));
        });
      });
    }
    return list;
  }, [occurrences, search, filterTipo]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Excluir ───────────────────────────────────────────────────────────────
  const handleDelete = async (idOcorrencia) => {
    if (!window.confirm(`Excluir ocorrência #${idOcorrencia}? Esta ação não pode ser desfeita.`)) return;
    try {
      await ocorrenciaApi.delete(idOcorrencia);
      await loadOccurrences();
      showToast('Ocorrência excluída com sucesso.');
    } catch (err) {
      showToast(err.message || 'Erro ao excluir.', 'error');
    }
  };

  // ── Confirmar mudança de status ───────────────────────────────────────────
  const ACTION_LABELS = {
    validar: 'Ocorrência validada com sucesso.',
    arquivar: 'Ocorrência arquivada com sucesso.',
    invalidar: 'Ocorrência devolvida para revisão.',
    resubmeter: 'Ocorrência resubmetida para validação.',
    revalidar: 'Ocorrência revalidada com sucesso.',
  };

  const handleStatusConfirm = async (idOcorrencia, action) => {
    if (action === 'validar')    await ocorrenciaApi.validar(idOcorrencia);
    else if (action === 'arquivar')   await ocorrenciaApi.arquivar(idOcorrencia);
    else if (action === 'invalidar')  await ocorrenciaApi.invalidar(idOcorrencia);
    else if (action === 'resubmeter') await ocorrenciaApi.resubmeter(idOcorrencia);
    else if (action === 'revalidar')  await ocorrenciaApi.revalidar(idOcorrencia);
    setStatusTarget(null);
    await loadOccurrences();
    showToast(ACTION_LABELS[action] || 'Status atualizado com sucesso.');
  };

  return (
    <main className="main-content">
      <header className="main-header">
        <h2>Controle de Ocorrências</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <FontAwesomeIcon icon="plus" /> Nova Ocorrência
        </button>
      </header>

      <section className="kpi-container">
        <div className="kpi-card">
          <div className="kpi-icon urgent"><FontAwesomeIcon icon="file-pen" /></div>
          <div className="kpi-info"><span className="kpi-label">Rascunho</span><h3 className="kpi-value">{statusCounts[1]}</h3></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon progress"><FontAwesomeIcon icon="check-double" /></div>
          <div className="kpi-info"><span className="kpi-label">Validado</span><h3 className="kpi-value">{statusCounts[2]}</h3></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon archived"><FontAwesomeIcon icon="box-archive" /></div>
          <div className="kpi-info"><span className="kpi-label">Arquivado</span><h3 className="kpi-value">{statusCounts[3]}</h3></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon pending"><FontAwesomeIcon icon="clock" /></div>
          <div className="kpi-info"><span className="kpi-label">Pend. Validação</span><h3 className="kpi-value">{statusCounts[4]}</h3></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon pend-arq"><FontAwesomeIcon icon="hourglass-half" /></div>
          <div className="kpi-info"><span className="kpi-label">Pend. Arquivamento</span><h3 className="kpi-value">{statusCounts[5]}</h3></div>
        </div>
      </section>

      <section className="panel">
        <div className="tabs">
          <button className={`tab-link ${activeTab === 'tab-todas' ? 'active' : ''}`} onClick={() => setActiveTab('tab-todas')}>
            Todas as Ocorrências
          </button>
        </div>
        <div className="tab-content">
          <TabTodas
            data={filteredOccurrences}
            loading={loading}
            error={error}
            onView={setViewTarget}
            onEdit={setEditTarget}
            onDelete={handleDelete}
            onStatusClick={setStatusTarget}
            canManage={canManageUsers}
            canChangeStatus={canValidateOcorrencias}
            search={search}
            filterTipo={filterTipo}
            onSearchChange={setSearch}
            onFilterTipoChange={setFilterTipo}
          />
        </div>
      </section>

      {/* Modais */}
      <NovaOcorrenciaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaved={loadOccurrences}
        idCorporacao={idCorporacao}
        idResponsavel={user?.sub}
      />

      {viewTarget && (
        <OcorrenciaDetailModal ocorrencia={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {editTarget && (
        <EditOcorrenciaModal
          ocorrencia={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { await loadOccurrences(); showToast('Ocorrência atualizada com sucesso!'); }}
        />
      )}

      {statusTarget && (
        <StatusConfirmModal
          ocorrencia={statusTarget}
          onConfirm={handleStatusConfirm}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {toast && (
        <div className="toast-container">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </main>
  );
};

export default ControleOcorrencias;
