// src/services/api.js
// Camada de serviço centralizada para comunicação com a API

const BASE_URL = process.env.REACT_APP_AUTH_API_URL || 'http://localhost:3000';
const OCCURRENCE_URL = process.env.REACT_APP_OCCURRENCE_API_URL || 'http://localhost:3002';
const INVENTORY_URL = process.env.REACT_APP_INVENTORY_API_URL || 'http://localhost:3004';

export const TOKEN_KEY = '@sisgera:accessToken';
export const REFRESH_TOKEN_KEY = '@sisgera:refreshToken';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

let _refreshingPromise = null;

async function tryRefreshToken() {
  if (_refreshingPromise) return _refreshingPromise;

  _refreshingPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('Sem refresh token');

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error('Refresh inválido');

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken ?? refreshToken);
    return data.accessToken;
  })().finally(() => { _refreshingPromise = null; });

  return _refreshingPromise;
}

async function parseResponse(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// `publica`: rotas de login e MFA. Um 401 nelas é a resposta (senha ou código
// errado, mfaToken expirado), não sessão vencida, então não tenta o refresh e
// a mensagem da API chega à tela.
async function request(path, { publica = false, ...options } = {}, baseUrl = BASE_URL) {
  const token = publica ? null : getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${baseUrl}${path}`, { ...options, headers });

  if (response.status === 401 && !publica) {
    try {
      const newToken = await tryRefreshToken();
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } catch {
      clearTokens();
      window.dispatchEvent(new Event('sisgera:session-expired'));
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!response.ok) {
    let errorMessage = `Erro ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return parseResponse(response);
}

const occ = (path, options = {}) => request(path, options, OCCURRENCE_URL);
const inv = (path, options = {}) => request(path, options, INVENTORY_URL);

// Endpoints de autenticação
export const authApi = {
  // Com a senha certa devolve { etapa: 'mfa' | 'cadastro_mfa', mfaToken };
  // os tokens só vêm depois do código.
  login: (email, senha) =>
    request('/auth/login', {
      method: 'POST',
      publica: true,
      body: JSON.stringify({ email, senha }),
    }),

  mfaIniciarCadastro: (mfaToken) =>
    request('/auth/mfa/cadastro/iniciar', {
      method: 'POST',
      publica: true,
      body: JSON.stringify({ mfaToken }),
    }),

  mfaConfirmarCadastro: (mfaToken, codigo) =>
    request('/auth/mfa/cadastro/confirmar', {
      method: 'POST',
      publica: true,
      body: JSON.stringify({ mfaToken, codigo }),
    }),

  // `codigo` é o TOTP de 6 dígitos ou um código de recuperação (XXXX-XXXX)
  mfaVerificar: (mfaToken, codigo) =>
    request('/auth/mfa/verificar', {
      method: 'POST',
      publica: true,
      body: JSON.stringify({ mfaToken, codigo }),
    }),

  // Envia o refresh token para a API revogá-lo; sem isso ele continuaria
  // valendo por até 7 dias depois do logout.
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    }),

  refresh: (refreshToken) =>
    request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: () => request('/auth/me'),
};

// Endpoints de Usuário
export const usuarioApi = {
  list: (idCorporacao) =>
    request(`/usuario/listUsuarioByCorporacao?idCorporacao=${idCorporacao}`),

  create: (data) =>
    request('/usuario/createUsuario', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (data) =>
    request('/usuario/updateUsuario', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (idUsuario, idCorporacao) =>
    request(`/usuario/deleteUsuario?idUsuario=${idUsuario}&idCorporacao=${idCorporacao}`, {
      method: 'DELETE',
    }),

  // Apaga o MFA do usuário; ele configura de novo no próximo login
  resetarMfa: (idUsuario) =>
    request('/usuario/resetarMfa', {
      method: 'PUT',
      body: JSON.stringify({ idUsuario }),
    }),
};

// Endpoints de Perfil
export const perfilApi = {
  list: (idCorporacao) =>
    request(`/perfil/listPerfilByCorporacao?idCorporacao=${idCorporacao}`),

  create: (data) =>
    request('/perfil/createPerfil', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (data) =>
    request('/perfil/updatePerfil', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (idPerfil, idCorporacao) =>
    request(`/perfil/deletePerfil?idPerfil=${idPerfil}&idCorporacao=${idCorporacao}`, {
      method: 'DELETE',
    }),
};

// Endpoints de Permissão
export const permissaoApi = {
  list: () => request('/permissao/listPermissao'),
};

// Endpoints de Perfil-Permissão
export const perfilPermissaoApi = {
  list: (idPerfil, idCorporacao) =>
    request(`/perfilPermissao/listPerfilPermissao?idPerfil=${idPerfil}&idCorporacao=${idCorporacao}`),

  assign: (idPerfil, idPermissao, idCorporacao) =>
    request('/perfilPermissao/assignPerfilPermissao', {
      method: 'POST',
      body: JSON.stringify({ idPerfil, idPermissao, idCorporacao }),
    }),

  remove: (idPerfil, idPermissao, idCorporacao) =>
    request(`/perfilPermissao/removePerfilPermissao?idPerfil=${idPerfil}&idPermissao=${idPermissao}&idCorporacao=${idCorporacao}`, {
      method: 'DELETE',
    }),
};

// Endpoints de Corporação
export const corporacaoApi = {
  list: () =>
    request('/corporacao/listCorporacao'),

  get: (idCorporacao) =>
    request(`/corporacao/getCorporacao?idCorporacao=${idCorporacao}`),

  create: (data) =>
    request('/corporacao/createCorporacao', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (data) =>
    request('/corporacao/updateCorporacao', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (idCorporacao) =>
    request(`/corporacao/deleteCorporacao?idCorporacao=${idCorporacao}`, {
      method: 'DELETE',
    }),
};

// ── Occurrence API (porta 3002) ───────────────────────────────────────────────

export const ocorrenciaApi = {
  estatisticas: (idCorporacao) =>
    occ(`/ocorrencia/obterEstatisticasOcorrenciaCorporacao?idCorporacao=${idCorporacao}`),

  list: (idCorporacao) =>
    occ(`/ocorrencia/listOcorrenciaByCorporacao?idCorporacao=${idCorporacao}`),

  get: (idOcorrencia) =>
    occ(`/ocorrencia/getOcorrencia?idOcorrencia=${idOcorrencia}`),

  create: (data) =>
    occ('/ocorrencia/createOcorrencia', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    occ('/ocorrencia/updateOcorrencia', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idOcorrencia) =>
    occ(`/ocorrencia/deleteOcorrencia?idOcorrencia=${idOcorrencia}`, { method: 'DELETE' }),

  validar: (idOcorrencia) =>
    occ('/ocorrencia/validarOcorrencia', { method: 'PATCH', body: JSON.stringify({ idOcorrencia }) }),

  arquivar: (idOcorrencia) =>
    occ('/ocorrencia/arquivarOcorrencia', { method: 'PATCH', body: JSON.stringify({ idOcorrencia }) }),

  invalidar: (idOcorrencia) =>
    occ('/ocorrencia/invalidarOcorrencia', { method: 'PATCH', body: JSON.stringify({ idOcorrencia }) }),

  resubmeter: (idOcorrencia) =>
    occ('/ocorrencia/resubmeterOcorrencia', { method: 'PATCH', body: JSON.stringify({ idOcorrencia }) }),

  revalidar: (idOcorrencia) =>
    occ('/ocorrencia/revalidarOcorrencia', { method: 'PATCH', body: JSON.stringify({ idOcorrencia }) }),
};

export const produtoApi = {
  estatisticas: (idCorporacao) =>
    inv(`/produto/obterEstatisticasProdutoCorporacao?idCorporacao=${idCorporacao}`),

  list: (idCorporacao) =>
    inv(`/produto/listProdutoByCorporacao?idCorporacao=${idCorporacao}`),

  get: (idProduto) =>
    inv(`/produto/getProduto?idProduto=${idProduto}`),

  create: (data) =>
    inv('/produto/createProduto', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    inv('/produto/updateProduto', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idProduto) =>
    inv(`/produto/deleteProduto?idProduto=${idProduto}`, { method: 'DELETE' }),
};

export const patrimonioApi = {
  estatisticas: (idCorporacao) =>
    inv(`/patrimonio/obterEstatisticasPatrimonioCorporacao?idCorporacao=${idCorporacao}`),

  list: (idCorporacao) =>
    inv(`/patrimonio/listPatrimonioByCorporacao?idCorporacao=${idCorporacao}`),

  get: (idPatrimonio) =>
    inv(`/patrimonio/getPatrimonio?idPatrimonio=${idPatrimonio}`),

  create: (data) =>
    inv('/patrimonio/createPatrimonio', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    inv('/patrimonio/updatePatrimonio', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idPatrimonio) =>
    inv(`/patrimonio/deletePatrimonio?idPatrimonio=${idPatrimonio}`, { method: 'DELETE' }),
};

export const doacaoApi = {
  estatisticas: (idCorporacao) =>
    inv(`/doacao/obterEstatisticasDoacaoCorporacao?idCorporacao=${idCorporacao}`),

  list: (idCorporacao) =>
    inv(`/doacao/listDoacaoByCorporacao?idCorporacao=${idCorporacao}`),

  get: (idDoacao) =>
    inv(`/doacao/getDoacao?idDoacao=${idDoacao}`),

  create: (data) =>
    inv('/doacao/createDoacao', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    inv('/doacao/updateDoacao', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idDoacao) =>
    inv(`/doacao/deleteDoacao?idDoacao=${idDoacao}`, { method: 'DELETE' }),
};

export const movimentoEstoqueApi = {
  listByProduto: (idProduto) =>
    inv(`/movimentoEstoque/listByProduto?idProduto=${idProduto}`),

  saldo: (idProduto) =>
    inv(`/movimentoEstoque/saldo?idProduto=${idProduto}`),

  create: (data) =>
    inv('/movimentoEstoque/createMovimento', { method: 'POST', body: JSON.stringify(data) }),

  delete: (idMovimentoEstoque) =>
    inv(`/movimentoEstoque/deleteMovimento?idMovimentoEstoque=${idMovimentoEstoque}`, { method: 'DELETE' }),
};

export const vitimaApi = {
  list: (idOcorrencia) =>
    occ(`/vitima/listVitimaByOcorrencia?idOcorrencia=${idOcorrencia}`),

  create: (data) =>
    occ('/vitima/createVitima', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    occ('/vitima/updateVitima', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idVitima) =>
    occ(`/vitima/deleteVitima?idVitima=${idVitima}`, { method: 'DELETE' }),
};

// Auditoria: cada API guarda a sua (auth: usuários, perfis e corporação;
// occurrence: ocorrências; inventory: estoque, patrimônio e doações). A tela
// junta as três. `filtros` vira query string; valores vazios são ignorados.
const auditQuery = (filtros) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, valor);
  });
  return `/audit/listAudit?${params.toString()}`;
};

export const auditApi = {
  listAuth: (filtros) => request(auditQuery(filtros)),
  listOcorrencia: (filtros) => occ(auditQuery(filtros)),
  listInventario: (filtros) => inv(auditQuery(filtros)),
  // Só os ids dos usuários globais, para mostrar "Administrador do sistema".
  usuariosGlobais: () => request('/audit/usuariosGlobais'),
};

export const hospitalApi = {
  list: (idCorporacao) =>
    occ(`/hospital/listHospitalByCorporacao?idCorporacao=${idCorporacao}`),

  create: (data) =>
    occ('/hospital/createHospital', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    occ('/hospital/updateHospital', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idHospital) =>
    occ(`/hospital/deleteHospital?idHospital=${idHospital}`, { method: 'DELETE' }),
};

export const veiculoOcorrenciaApi = {
  list: (idOcorrencia) =>
    occ(`/veiculoOcorrencia/listByOcorrencia?idOcorrencia=${idOcorrencia}`),

  create: (data) =>
    occ('/veiculoOcorrencia/createVeiculo', { method: 'POST', body: JSON.stringify(data) }),

  update: (data) =>
    occ('/veiculoOcorrencia/updateVeiculo', { method: 'PUT', body: JSON.stringify(data) }),

  delete: (idVeiculoOcorrencia) =>
    occ(`/veiculoOcorrencia/deleteVeiculo?idVeiculoOcorrencia=${idVeiculoOcorrencia}`, { method: 'DELETE' }),
};
