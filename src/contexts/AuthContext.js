// src/contexts/AuthContext.js

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authApi, corporacaoApi, setTokens, clearTokens, getToken, getRefreshToken, decodeJwt, tryRefreshToken,
} from '../services/api';
import { limparRascunhos } from '../hooks/useAutoSave';

const AuthContext = createContext(null);

function isAdminPayload(payload) {
  return payload?.permissoes?.some(
    p => p.entidade === 'Corporacao' && p.acao === 'Cadastrar'
  ) ?? false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCorporacao, setSelectedCorporacao] = useState(() => {
    try {
      const stored = localStorage.getItem('@sisgera:selectedCorporacao');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Inicializa o estado de auth a partir do token armazenado
  useEffect(() => {
    // Access token vencido não encerra a sessão: o refresh token ainda pode
    // valer, e sem ele a pessoa teria de passar pelo MFA de novo.
    const sessaoAtual = async () => {
      const payload = decodeJwt(getToken());
      if (payload && payload.exp * 1000 > Date.now()) return payload;
      if (!getRefreshToken()) return null;
      try {
        return decodeJwt(await tryRefreshToken());
      } catch {
        return null;
      }
    };

    let cancelado = false;
    sessaoAtual().then(payload => {
      if (cancelado) return;
      if (payload) {
        setUser(payload);

        // Para não-admins, garante que a corporação armazenada bate com o JWT
        if (!isAdminPayload(payload) && payload?.idCorporacao) {
          setSelectedCorporacao(prev => {
            if (prev && prev.idCorporacao !== payload.idCorporacao) {
              localStorage.removeItem('@sisgera:selectedCorporacao');
              return null;
            }
            return prev;
          });
        }
      } else if (getToken() || getRefreshToken()) {
        clearTokens();
        localStorage.removeItem('@sisgera:selectedCorporacao');
        setSelectedCorporacao(null);
      }
      setLoading(false);
    });
    return () => { cancelado = true; };
  }, []);

  // Desloga automaticamente quando o refresh token também expirar
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setSelectedCorporacao(null);
      localStorage.removeItem('@sisgera:selectedCorporacao');
      // O rascunho fica: a sessão pode cair no meio do preenchimento, e o
      // usuário continua de onde parou ao entrar de novo. Se outra pessoa
      // entrar, o login dela apaga.
    };
    window.addEventListener('sisgera:session-expired', handler);
    return () => window.removeEventListener('sisgera:session-expired', handler);
  }, []);

  const selectCorporacao = useCallback((corporacao) => {
    setSelectedCorporacao(corporacao);
    if (corporacao) {
      localStorage.setItem('@sisgera:selectedCorporacao', JSON.stringify(corporacao));
    } else {
      localStorage.removeItem('@sisgera:selectedCorporacao');
    }
  }, []);

  // Recebe os tokens que a API só entrega depois do MFA e abre a sessão
  const concluirLogin = useCallback(async ({ accessToken, refreshToken }) => {
    setTokens(accessToken, refreshToken);
    const payload = decodeJwt(accessToken);
    setUser(payload);

    const isAdmin = isAdminPayload(payload);

    // Limpa corporação armazenada para evitar usar dados de sessão anterior inválida
    selectCorporacao(null);

    // Apaga rascunhos que outro usuário deixou neste navegador sem fazer logout
    limparRascunhos(payload?.sub);

    // Para usuários não-admin, auto-seleciona a corporação via idCorporacao do JWT
    if (!isAdmin && payload?.idCorporacao) {
      try {
        const result = await corporacaoApi.get(payload.idCorporacao);
        const corp = result?.Corporacao ?? result?.corporacao ?? result;
        if (corp && corp.idCorporacao) {
          selectCorporacao(corp);
        } else {
          selectCorporacao({ idCorporacao: payload.idCorporacao, nome: 'Minha Corporação' });
        }
      } catch {
        selectCorporacao({ idCorporacao: payload.idCorporacao, nome: 'Minha Corporação' });
      }
    }

    return { payload, isAdmin };
  }, [selectCorporacao]);

  // Só confere a senha: devolve { etapa: 'mfa' | 'cadastro_mfa', mfaToken }.
  // O mfaToken fica no estado da tela de login, nunca no localStorage.
  const login = useCallback(async (email, senha) => {
    const { etapa, mfaToken } = await authApi.login(email, senha);
    return { etapa, mfaToken };
  }, []);

  const verificarMfa = useCallback(async (mfaToken, codigo) => {
    const tokens = await authApi.mfaVerificar(mfaToken, codigo);
    return concluirLogin(tokens);
  }, [concluirLogin]);

  const iniciarCadastroMfa = useCallback(
    (mfaToken) => authApi.mfaIniciarCadastro(mfaToken),
    []
  );

  // A sessão só abre em `concluir`, depois de a pessoa guardar os códigos de
  // recuperação: abrir antes faria a tela de login redirecionar na hora.
  const confirmarCadastroMfa = useCallback(async (mfaToken, codigo) => {
    const { codigosRecuperacao, accessToken, refreshToken } =
      await authApi.mfaConfirmarCadastro(mfaToken, codigo);
    return {
      codigosRecuperacao,
      concluir: () => concluirLogin({ accessToken, refreshToken }),
    };
  }, [concluirLogin]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignora erros de logout (token já pode ter expirado)
    }
    clearTokens();
    localStorage.removeItem('@sisgera:selectedCorporacao');
    limparRascunhos();
    setUser(null);
    setSelectedCorporacao(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: isAdminPayload(user),
      selectedCorporacao,
      login,
      verificarMfa,
      iniciarCadastroMfa,
      confirmarCadastroMfa,
      logout,
      selectCorporacao,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
