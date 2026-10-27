import { useEffect, useCallback } from 'react';

// Todo rascunho salvo no navegador usa este prefixo, para o logout conseguir
// apagar todos de uma vez. Os rascunhos guardam dados de vítimas (saúde), então
// não podem ficar no computador depois que o usuário sai.
export const PREFIXO_RASCUNHO = 'sisgera_draft_';

// A chave leva o id do usuário: num computador compartilhado, quem entra depois
// não recebe o rascunho de outra pessoa.
export const chaveRascunho = (nome, idUsuario) => `${PREFIXO_RASCUNHO}${nome}_${idUsuario}`;

// Apaga os rascunhos do navegador. Com `idUsuarioManter`, preserva os desse
// usuário (o que acabou de entrar) e apaga os de quem usou o computador antes.
export function limparRascunhos(idUsuarioManter) {
    try {
        const sufixoManter = idUsuarioManter != null ? `_${idUsuarioManter}` : null;
        Object.keys(localStorage)
            .filter((chave) => chave.startsWith(PREFIXO_RASCUNHO))
            .filter((chave) => !sufixoManter || !chave.endsWith(sufixoManter))
            .forEach((chave) => localStorage.removeItem(chave));
    } catch (error) {
        console.error('Erro ao limpar rascunhos:', error);
    }
}

const useAutoSave = (key, dataToSave, shouldSave = true) => {
    useEffect(() => {
        if (!shouldSave) return;

        const handler = setTimeout(() => {
            if (dataToSave) {
                localStorage.setItem(key, JSON.stringify(dataToSave));
            }
        }, 1500);

        return () => clearTimeout(handler);
    }, [key, dataToSave, shouldSave]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(key);
    }, [key]);

    const getDraft = useCallback(() => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Erro ao ler rascunho:', error);
            return null;
        }
    }, [key]);

    return { clearDraft, getDraft };
};

export default useAutoSave;
