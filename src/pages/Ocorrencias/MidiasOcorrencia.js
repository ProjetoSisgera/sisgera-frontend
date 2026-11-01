import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { midiaApi, vitimaApi } from '../../services/api';
import {
  LIMITE_MIDIAS, ACCEPT_MIDIA, ACCEPT_TERMO, DESTINOS_COM_RECUSA,
  formatarTamanho, problemaMidia, problemaTermo,
} from './midias';

const Titulo = ({ children }) => (
  <p className="perfis-list__label" style={{ marginTop: 16, marginBottom: 8 }}>{children}</p>
);

const Aviso = ({ children }) => (
  <div className="modal-error" style={{ marginBottom: 8 }}>
    <FontAwesomeIcon icon="triangle-exclamation" /> {children}
  </div>
);

// Fotos e vídeos de uma ocorrência. As URLs vêm assinadas da API e valem
// 5 minutos; se uma falhar depois disso, a lista é buscada de novo.
export function GaleriaMidias({ idOcorrencia, editavel = false }) {
  const [midias, setMidias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState('');
  const ultimaCarga = useRef(0);

  const carregar = useCallback(async () => {
    ultimaCarga.current = Date.now();
    try {
      const res = await midiaApi.list(idOcorrencia);
      setMidias(res?.Midias ?? []);
      setErro('');
    } catch (err) {
      setErro(err.message || 'Não foi possível carregar as mídias.');
    } finally {
      setCarregando(false);
    }
  }, [idOcorrencia]);

  useEffect(() => { carregar(); }, [carregar]);

  // URL vencida: busca URLs novas, no máximo uma vez por minuto.
  const aoFalharArquivo = () => {
    if (Date.now() - ultimaCarga.current > 60_000) carregar();
  };

  const adicionar = async (e) => {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (arquivos.length === 0) return;

    const cabem = LIMITE_MIDIAS - midias.length;
    if (arquivos.length > cabem) {
      setAviso(`Cabem só mais ${cabem} mídia(s) nesta ocorrência (máximo de ${LIMITE_MIDIAS}).`);
      return;
    }
    const problemas = arquivos.map(problemaMidia).filter(Boolean);
    if (problemas.length > 0) { setAviso(problemas.join(' ')); return; }

    setAviso('');
    const falhas = [];
    for (let i = 0; i < arquivos.length; i++) {
      setEnviando(`Enviando ${i + 1} de ${arquivos.length}...`);
      try {
        await midiaApi.create(idOcorrencia, arquivos[i]);
      } catch (err) {
        falhas.push(`${arquivos[i].name} (${err.message})`);
      }
    }
    setEnviando('');
    if (falhas.length > 0) setAviso(`Não foi possível enviar: ${falhas.join('; ')}.`);
    await carregar();
  };

  const excluir = async (midia) => {
    if (!window.confirm(`Excluir "${midia.nomeOriginal}" da ocorrência?`)) return;
    try {
      await midiaApi.delete(midia.idMidia);
      await carregar();
    } catch (err) {
      setAviso(err.message || 'Não foi possível excluir a mídia.');
    }
  };

  const cheio = midias.length >= LIMITE_MIDIAS;

  return (
    <>
      <Titulo>MÍDIAS ({midias.length}/{LIMITE_MIDIAS})</Titulo>
      {erro && <Aviso>{erro}</Aviso>}
      {aviso && <Aviso>{aviso}</Aviso>}
      {carregando ? (
        <p className="midias-vazio"><FontAwesomeIcon icon="sync" spin /> Carregando mídias...</p>
      ) : !erro && midias.length === 0 ? (
        <p className="midias-vazio">Nenhuma foto ou vídeo.</p>
      ) : (
        <div className="midias-grid">
          {midias.map(m => (
            <div key={m.idMidia} className="midia-card">
              {m.tipo === 'video' ? (
                <video src={m.url} controls preload="metadata" onError={aoFalharArquivo} />
              ) : (
                <a href={m.url} target="_blank" rel="noopener noreferrer" title="Abrir em tamanho original">
                  <img src={m.url} alt={m.nomeOriginal} loading="lazy" onError={aoFalharArquivo} />
                </a>
              )}
              <div className="midia-card__info">
                <FontAwesomeIcon icon={m.tipo === 'video' ? 'video' : 'image'} />
                <span className="midia-card__nome" title={m.nomeOriginal}>{m.nomeOriginal}</span>
                <span>{formatarTamanho(m.tamanho)}</span>
                {editavel && (
                  <button type="button" className="midia-card__excluir" onClick={() => excluir(m)}
                    aria-label={`Excluir ${m.nomeOriginal}`} disabled={!!enviando}>
                    <FontAwesomeIcon icon="trash" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editavel && (
        <div style={{ marginTop: 10 }}>
          <label className={`btn-secondary midias-adicionar${cheio || enviando ? ' desabilitado' : ''}`}>
            <FontAwesomeIcon icon={enviando ? 'sync' : 'cloud-arrow-up'} spin={!!enviando} />
            {enviando || (cheio ? 'Limite de mídias atingido' : 'Adicionar fotos ou vídeos')}
            <input type="file" multiple accept={ACCEPT_MIDIA} onChange={adicionar}
              disabled={cheio || !!enviando} hidden />
          </label>
          <span className="midias-dica">Fotos até 10 MB (JPG, PNG, WEBP). Vídeos até 100 MB (MP4, MOV, WEBM).</span>
        </div>
      )}
    </>
  );
}

// Abre o termo numa aba nova. A aba é aberta antes de buscar a URL porque o
// navegador bloqueia janela aberta depois de um await (fora do clique).
export async function abrirTermoRecusa(idVitima) {
  const aba = window.open('', '_blank');
  try {
    const { url } = await vitimaApi.urlTermoRecusa(idVitima);
    if (aba) {
      aba.opener = null;
      aba.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (err) {
    aba?.close();
    throw err;
  }
}

// Termos de recusa das vítimas que recusaram atendimento ou encaminhamento.
export function TermosRecusa({ idOcorrencia, editavel = false }) {
  const [vitimas, setVitimas] = useState([]);
  const [aviso, setAviso] = useState('');
  const [enviandoId, setEnviandoId] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const res = await vitimaApi.list(idOcorrencia);
      setVitimas((res?.Vitimas ?? []).filter(v => DESTINOS_COM_RECUSA.includes(v.idTipoDestino)));
    } catch (err) {
      setAviso(err.message || 'Não foi possível carregar os termos de recusa.');
    }
  }, [idOcorrencia]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = async (idVitima) => {
    try {
      await abrirTermoRecusa(idVitima);
    } catch (err) {
      setAviso(err.message || 'Não foi possível abrir o termo.');
    }
  };

  const enviar = async (idVitima, e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const problema = problemaTermo(arquivo);
    if (problema) { setAviso(problema); return; }

    setAviso('');
    setEnviandoId(idVitima);
    try {
      await vitimaApi.enviarTermoRecusa(idVitima, arquivo);
      await carregar();
    } catch (err) {
      setAviso(`Não foi possível enviar o termo: ${err.message}`);
    } finally {
      setEnviandoId(null);
    }
  };

  if (vitimas.length === 0 && !aviso) return null;

  return (
    <>
      <Titulo>TERMOS DE RECUSA</Titulo>
      {aviso && <Aviso>{aviso}</Aviso>}
      {vitimas.map(v => (
        <div key={v.idVitima} className="termo-linha">
          <FontAwesomeIcon icon="file-signature" style={{ color: '#c2410c' }} />
          <span className="termo-linha__nome">{v.nome}</span>
          {v.nomeArquivoRecusa ? (
            <button type="button" className="termo-linha__abrir" onClick={() => abrir(v.idVitima)} title={v.nomeArquivoRecusa}>
              <FontAwesomeIcon icon="paperclip" /> {v.nomeArquivoRecusa}
            </button>
          ) : (
            <span className="midias-dica">Sem termo anexado</span>
          )}
          {editavel && (
            <label className={`btn-secondary btn-xs midias-adicionar${enviandoId ? ' desabilitado' : ''}`}>
              {enviandoId === v.idVitima
                ? <><FontAwesomeIcon icon="sync" spin /> Enviando...</>
                : v.nomeArquivoRecusa ? 'Trocar' : 'Anexar'}
              <input type="file" accept={ACCEPT_TERMO} onChange={e => enviar(v.idVitima, e)}
                disabled={!!enviandoId} hidden />
            </label>
          )}
        </div>
      ))}
    </>
  );
}
