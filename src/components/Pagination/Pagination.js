import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Gera a lista de páginas com reticências: 1 … 4 5 6 … 20
const buildPages = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 3) { pages.add(2); pages.add(3); pages.add(4); }
    if (current >= total - 2) { pages.add(total - 1); pages.add(total - 2); pages.add(total - 3); }
    const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) result.push('gap-' + p);
        result.push(p);
    });
    return result;
};

/**
 * Paginação numerada (1, 2, 3…) acessível.
 * Props: page, totalPages, total, pageSize, onPageChange, label (nome da lista).
 */
const Pagination = ({ page, totalPages, total, pageSize, onPageChange, label = 'resultados' }) => {
    const inicio = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const fim = Math.min(page * pageSize, total);

    return (
        <div className="pagination">
            <span aria-live="polite">
                Mostrando {inicio}–{fim} de {total} {label}
            </span>
            {totalPages > 1 && (
                <nav className="pagination-controls" aria-label={`Paginação de ${label}`}>
                    <button
                        type="button"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        aria-label="Página anterior"
                    >
                        <FontAwesomeIcon icon="chevron-left" />
                    </button>
                    {buildPages(page, totalPages).map(p =>
                        typeof p === 'string' ? (
                            <span key={p} className="pagination-gap" aria-hidden="true">…</span>
                        ) : (
                            <button
                                type="button"
                                key={p}
                                className={p === page ? 'active' : ''}
                                onClick={() => onPageChange(p)}
                                aria-label={`Página ${p}`}
                                aria-current={p === page ? 'page' : undefined}
                            >
                                {p}
                            </button>
                        )
                    )}
                    <button
                        type="button"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Próxima página"
                    >
                        <FontAwesomeIcon icon="chevron-right" />
                    </button>
                </nav>
            )}
        </div>
    );
};

export default Pagination;

