import { useEffect, useMemo, useState } from 'react';

export const TAMANHO_PAGINA_PADRAO = 10;

/**
 * PaginaÃ§Ã£o no cliente.
 * Recebe a lista jÃ¡ filtrada e devolve apenas os itens da pÃ¡gina atual.
 * Volta para a pÃ¡gina 1 quando a lista muda de tamanho (ex.: nova busca)
 * e corrige a pÃ¡gina caso ela deixe de existir (ex.: exclusÃ£o do Ãºltimo item).
 */
export function usePagination(items, pageSize = TAMANHO_PAGINA_PADRAO) {
    const [page, setPage] = useState(1);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => { setPage(1); }, [total]);

    const currentPage = Math.min(page, totalPages);

    const pageItems = useMemo(
        () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [items, currentPage, pageSize]
    );

    return { page: currentPage, setPage, totalPages, total, pageSize, pageItems };
}
