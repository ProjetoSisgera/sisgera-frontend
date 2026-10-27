import { chaveRascunho, limparRascunhos } from './useAutoSave';

describe('limparRascunhos', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem(chaveRascunho('ocorrencia', 5), '{}');
        localStorage.setItem(chaveRascunho('ocorrencia', 15), '{}');
        localStorage.setItem('sisgera_draft_ocorrencia', '{}');
        localStorage.setItem('theme', 'dark');
    });

    it('apaga todos os rascunhos e mantém o resto', () => {
        limparRascunhos();

        expect(Object.keys(localStorage)).toEqual(['theme']);
    });

    it('mantém só os rascunhos do usuário informado', () => {
        limparRascunhos(5);

        expect(Object.keys(localStorage).sort()).toEqual(
            [chaveRascunho('ocorrencia', 5), 'theme'].sort()
        );
    });
});
