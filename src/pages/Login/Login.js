// src/pages/Login/Login.js

import { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

// Etapas do login: senha, código do autenticador, configuração do MFA no
// primeiro acesso e os códigos de recuperação gerados nessa configuração.
const ETAPA = {
  CREDENCIAIS: 'credenciais',
  CODIGO: 'codigo',
  CADASTRO: 'cadastro',
  RECUPERACAO: 'recuperacao',
};

const CABECALHOS = {
  [ETAPA.CREDENCIAIS]: ['Bem-vindo de volta', 'Faça login para acessar o sistema'],
  [ETAPA.CODIGO]: ['Verificação em duas etapas', 'Confirme que é você para continuar'],
  [ETAPA.CADASTRO]: ['Configure o MFA', 'O acesso ao SisGera exige um aplicativo autenticador'],
  [ETAPA.RECUPERACAO]: ['Códigos de recuperação', 'Guarde estes códigos antes de continuar'],
};

// mfaToken vencido (5 min) ou tentativas esgotadas: a API apaga o token, pede
// "Faça login novamente." e só resta entrar com a senha de novo. Código errado
// mantém a etapa.
function exigeNovoLogin(mensagem) {
  return /faça login novamente|expirad/i.test(mensagem || '');
}

// Mostra a chave em blocos de 4 para facilitar a digitação manual
function formatarChave(chave) {
  return (chave || '').match(/.{1,4}/g)?.join(' ') ?? '';
}

export default function Login() {
  const {
    login, verificarMfa, iniciarCadastroMfa, confirmarCadastroMfa,
    isAuthenticated, isAdmin,
  } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', senha: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [etapa, setEtapa] = useState(ETAPA.CREDENCIAIS);
  // Só em memória: nunca vai para o localStorage
  const [mfaToken, setMfaToken] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [usarRecuperacao, setUsarRecuperacao] = useState(false);
  const [cadastro, setCadastro] = useState(null); // { qrCode, chave }
  const [codigosRecuperacao, setCodigosRecuperacao] = useState([]);
  const [guardeiCodigos, setGuardeiCodigos] = useState(false);
  const [copiado, setCopiado] = useState(''); // 'chave' | 'codigos'
  // Abre a sessão depois que a pessoa guarda os códigos de recuperação
  const concluirRef = useRef(null);

  // Se já estiver autenticado, redireciona conforme o perfil
  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin/corporacoes' : '/'} replace />;
  }

  const irParaInicio = (redirecionar) => {
    navigate(redirecionar ? '/admin/corporacoes' : '/', { replace: true });
  };

  const voltarAoLogin = (mensagem = '') => {
    setEtapa(ETAPA.CREDENCIAIS);
    setMfaToken(null);
    setCodigo('');
    setUsarRecuperacao(false);
    setCadastro(null);
    setForm(prev => ({ ...prev, senha: '' }));
    setError(mensagem);
  };

  // Erros das etapas de MFA: token vencido volta à senha, o resto fica na tela
  const tratarErroMfa = (err, padrao) => {
    const mensagem = err.message || padrao;
    if (exigeNovoLogin(mensagem)) {
      voltarAoLogin(mensagem);
    } else {
      setError(mensagem);
    }
  };

  const copiar = async (texto, qual) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(c => (c === qual ? '' : c)), 2000);
    } catch {
      setError('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  const baixarCodigos = () => {
    const conteudo = [
      'SisGera - Códigos de recuperação do MFA',
      `Conta: ${form.email.trim()}`,
      'Cada código pode ser usado uma única vez.',
      '',
      ...codigosRecuperacao,
      '',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sisgera-codigos-recuperacao.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleCodigoChange = (e) => {
    const valor = usarRecuperacao
      ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9)
      : e.target.value.replace(/\D/g, '').slice(0, 6);
    setCodigo(valor);
    if (error) setError('');
  };

  const alternarRecuperacao = () => {
    setUsarRecuperacao(r => !r);
    setCodigo('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.senha) {
      setError('Preencha todos os campos para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resposta = await login(form.email.trim(), form.senha);
      if (resposta.etapa === 'cadastro_mfa') {
        const dados = await iniciarCadastroMfa(resposta.mfaToken);
        setCadastro(dados);
        setEtapa(ETAPA.CADASTRO);
      } else if (resposta.etapa === 'mfa') {
        setEtapa(ETAPA.CODIGO);
      } else {
        throw new Error('Resposta inesperada do servidor. Tente novamente.');
      }
      setMfaToken(resposta.mfaToken);
      setCodigo('');
    } catch (err) {
      setError(err.message || 'Credenciais inválidas. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificar = async (e) => {
    e.preventDefault();
    const valido = usarRecuperacao ? /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo) : /^\d{6}$/.test(codigo);
    if (!valido) {
      setError(usarRecuperacao
        ? 'Digite o código de recuperação no formato XXXX-XXXX.'
        : 'Digite os 6 dígitos do aplicativo autenticador.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { isAdmin: adminUser } = await verificarMfa(mfaToken, codigo);
      irParaInicio(adminUser);
    } catch (err) {
      setCodigo('');
      tratarErroMfa(err, 'Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarCadastro = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(codigo)) {
      setError('Digite os 6 dígitos que aparecem no aplicativo autenticador.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resultado = await confirmarCadastroMfa(mfaToken, codigo);
      concluirRef.current = resultado.concluir;
      setCodigosRecuperacao(resultado.codigosRecuperacao ?? []);
      setGuardeiCodigos(false);
      // A API consome o mfaToken na confirmação
      setMfaToken(null);
      setCadastro(null);
      setCodigo('');
      setEtapa(ETAPA.RECUPERACAO);
    } catch (err) {
      setCodigo('');
      tratarErroMfa(err, 'Código inválido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = async () => {
    if (!guardeiCodigos || !concluirRef.current) return;
    setLoading(true);
    setError('');
    try {
      const { isAdmin: adminUser } = await concluirRef.current();
      concluirRef.current = null;
      irParaInicio(adminUser);
    } catch (err) {
      setError(err.message || 'Não foi possível concluir o login.');
      setLoading(false);
    }
  };

  const [titulo, subtitulo] = CABECALHOS[etapa];

  const erroAlerta = error && (
    <div className="login-error" role="alert">
      <FontAwesomeIcon icon="triangle-exclamation" />
      <span>{error}</span>
    </div>
  );

  const botaoEnviar = (texto, textoCarregando, icone = 'arrow-right') => (
    <button
      type="submit"
      className={`login-btn${loading ? ' login-btn--loading' : ''}`}
      disabled={loading}
    >
      {loading ? (
        <>
          <span className="login-spinner" />
          {textoCarregando}
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={icone} />
          {texto}
        </>
      )}
    </button>
  );

  const botaoVoltar = (
    <button type="button" className="login-link" onClick={() => voltarAoLogin()} disabled={loading}>
      <FontAwesomeIcon icon="arrow-left" />
      Voltar ao login
    </button>
  );

  return (
    <div className="login-page">

      {/* Painel esquerdo — Marca */}
      <div className="login-brand">
        <div className="login-brand__content">
          <div className="login-brand__logo">
            <FontAwesomeIcon icon="shield-halved" />
          </div>
          <h1 className="login-brand__title">SisGera</h1>
          <p className="login-brand__subtitle">
            Sistema de Gestão para Corpos de Bombeiros Voluntários
          </p>
          <div className="login-brand__features">
            <div className="login-brand__feature">
              <FontAwesomeIcon icon="file-circle-check" />
              <span>Gestão de Ocorrências</span>
            </div>
            <div className="login-brand__feature">
              <FontAwesomeIcon icon="building-shield" />
              <span>Controle Patrimonial</span>
            </div>
            <div className="login-brand__feature">
              <FontAwesomeIcon icon="users" />
              <span>Gerenciamento de Equipes</span>
            </div>
          </div>
        </div>
        <div className="login-brand__circle-bottom" />
        <div className="login-brand__circle-top" />
      </div>

      {/* Painel direito — Formulário */}
      <div className="login-form-panel">
        <div className="login-card">

          {/* Logo visível só no mobile */}
          <div className="login-card__logo-mobile">
            <FontAwesomeIcon icon="shield-halved" />
            <span>SisGera</span>
          </div>

          <div className="login-card__header">
            <h2>{titulo}</h2>
            <p>{subtitulo}</p>
          </div>

          {/* Etapa 1 — Credenciais */}
          {etapa === ETAPA.CREDENCIAIS && (
            <form className="login-form" onSubmit={handleSubmit} noValidate>

              {erroAlerta}

              <div className="login-field">
                <label htmlFor="email">E-mail</label>
                <div className="login-input-wrapper">
                  <FontAwesomeIcon icon="user" className="login-input-icon" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="senha">Senha</label>
                <div className="login-input-wrapper">
                  <FontAwesomeIcon icon="lock" className="login-input-icon" />
                  <input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    name="senha"
                    value={form.senha}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="login-toggle-password"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    tabIndex={-1}
                  >
                    <FontAwesomeIcon icon={showPassword ? 'eye-slash' : 'eye'} />
                  </button>
                </div>
              </div>

              {botaoEnviar('Entrar', 'Entrando...')}

            </form>
          )}

          {/* Etapa 2 — Código do autenticador ou de recuperação */}
          {etapa === ETAPA.CODIGO && (
            <form className="login-form" onSubmit={handleVerificar} noValidate>

              {erroAlerta}

              <p className="login-texto">
                {usarRecuperacao
                  ? 'Digite um dos códigos de recuperação que você guardou ao configurar o MFA. Cada código vale uma única vez.'
                  : 'Abra o aplicativo autenticador no seu celular e digite o código de 6 dígitos do SisGera.'}
              </p>

              <div className="login-field">
                <label htmlFor="codigo">
                  {usarRecuperacao ? 'Código de recuperação' : 'Código de verificação'}
                </label>
                <div className="login-input-wrapper">
                  <FontAwesomeIcon icon={usarRecuperacao ? 'key' : 'mobile-screen'} className="login-input-icon" />
                  <input
                    key={usarRecuperacao ? 'recuperacao' : 'totp'}
                    id="codigo"
                    type="text"
                    className="login-input--codigo"
                    value={codigo}
                    onChange={handleCodigoChange}
                    placeholder={usarRecuperacao ? 'XXXX-XXXX' : '000000'}
                    inputMode={usarRecuperacao ? 'text' : 'numeric'}
                    autoComplete={usarRecuperacao ? 'off' : 'one-time-code'}
                    autoCapitalize="characters"
                    spellCheck={false}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {botaoEnviar('Verificar', 'Verificando...')}

              <div className="login-links">
                {botaoVoltar}
                <button type="button" className="login-link" onClick={alternarRecuperacao} disabled={loading}>
                  <FontAwesomeIcon icon={usarRecuperacao ? 'mobile-screen' : 'key'} />
                  {usarRecuperacao ? 'Usar o aplicativo autenticador' : 'Usar código de recuperação'}
                </button>
              </div>

            </form>
          )}

          {/* Etapa 3 — Configuração do MFA no primeiro acesso */}
          {etapa === ETAPA.CADASTRO && cadastro && (
            <form className="login-form" onSubmit={handleConfirmarCadastro} noValidate>

              {erroAlerta}

              <ol className="login-passos">
                <li>Instale um aplicativo autenticador no celular, como o Google Authenticator ou o Microsoft Authenticator.</li>
                <li>No aplicativo, leia o QR code abaixo ou digite a chave manualmente.</li>
                <li>Digite o código de 6 dígitos que aparece no aplicativo.</li>
              </ol>

              <div className="login-qr">
                <img src={cadastro.qrCode} alt="QR code para configurar o aplicativo autenticador" />
              </div>

              <div className="login-field">
                <span className="login-label">Chave para digitar manualmente</span>
                <div className="login-chave">
                  <code>{formatarChave(cadastro.chave)}</code>
                  <button
                    type="button"
                    className="login-btn-secundario login-btn-secundario--pequeno"
                    onClick={() => copiar(cadastro.chave, 'chave')}
                  >
                    <FontAwesomeIcon icon={copiado === 'chave' ? 'check' : 'copy'} />
                    {copiado === 'chave' ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="codigo">Código de confirmação</label>
                <div className="login-input-wrapper">
                  <FontAwesomeIcon icon="mobile-screen" className="login-input-icon" />
                  <input
                    id="codigo"
                    type="text"
                    className="login-input--codigo"
                    value={codigo}
                    onChange={handleCodigoChange}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    disabled={loading}
                  />
                </div>
              </div>

              {botaoEnviar('Confirmar', 'Confirmando...', 'check')}

              <div className="login-links">
                {botaoVoltar}
              </div>

            </form>
          )}

          {/* Etapa 4 — Códigos de recuperação */}
          {etapa === ETAPA.RECUPERACAO && (
            <div className="login-form">

              {erroAlerta}

              <p className="login-texto">
                Se você perder o acesso ao celular, use um destes códigos no lugar do código do aplicativo.
                Cada código vale uma única vez, e eles não serão mostrados de novo.
              </p>

              <ul className="login-codigos">
                {codigosRecuperacao.map(c => <li key={c}><code>{c}</code></li>)}
              </ul>

              <div className="login-acoes">
                <button
                  type="button"
                  className="login-btn-secundario"
                  onClick={() => copiar(codigosRecuperacao.join('\n'), 'codigos')}
                >
                  <FontAwesomeIcon icon={copiado === 'codigos' ? 'check' : 'copy'} />
                  {copiado === 'codigos' ? 'Copiados' : 'Copiar'}
                </button>
                <button type="button" className="login-btn-secundario" onClick={baixarCodigos}>
                  <FontAwesomeIcon icon="download" />
                  Baixar .txt
                </button>
              </div>

              <label className="login-check">
                <input
                  type="checkbox"
                  checked={guardeiCodigos}
                  onChange={e => setGuardeiCodigos(e.target.checked)}
                  disabled={loading}
                />
                <span>Guardei meus códigos em um lugar seguro</span>
              </label>

              <button
                type="button"
                className={`login-btn${loading ? ' login-btn--loading' : ''}`}
                onClick={handleContinuar}
                disabled={loading || !guardeiCodigos}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon="arrow-right" />
                    Continuar
                  </>
                )}
              </button>

            </div>
          )}

          <p className="login-footer">
            SisGera &copy; {new Date().getFullYear()} &mdash; Todos os direitos reservados
          </p>
        </div>
      </div>

    </div>
  );
}
