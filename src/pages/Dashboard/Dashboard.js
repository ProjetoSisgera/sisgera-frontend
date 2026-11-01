import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../contexts/AuthContext';
import { ocorrenciaApi } from '../../services/api';
import StatCard from '../../components/StatCard/StatCard';
import { formatarDataSemHora } from '../../utils/datas';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './Dashboard.css';

const STAT_CONFIG = [
    { key: 'NumeroPendentes', title: 'Pendentes',      type: 'pendente', icon: 'triangle-exclamation' },
    { key: 'EmAtendimento',   title: 'Em Atendimento', type: 'arquivado', icon: 'clock' },
    { key: 'TotalMes',        title: 'Total do Mês',   type: 'validado',  icon: 'chart-bar' },
];

const STATUS_COLORS = {
    pendente: '#f59e0b',
    arquivado: '#10b981',
    validado: '#3b82f6',
};

const TIPO_OCORRENCIA = { 1: 'Simplificado', 2: 'Incêndio', 3: 'Resgate' };
const TIPO_STATUS_LABEL = { 1: 'Rascunho', 4: 'Pend. Validação' };
const STATUS_CLASS      = { 1: 'urgente',   4: 'pendente' };


const Dashboard = () => {
    const { selectedCorporacao } = useAuth();

    const [statsData,          setStatsData]          = useState(null);
    const [priorities,         setPriorities]         = useState([]);
    const [loadingPriorities,  setLoadingPriorities]  = useState(true);

    useEffect(() => {
        const idCorporacao = selectedCorporacao?.idCorporacao;
        if (!idCorporacao) return;

        ocorrenciaApi.estatisticas(idCorporacao)
            .then(setStatsData)
            .catch(() => setStatsData(null));

        setLoadingPriorities(true);
        ocorrenciaApi.list(idCorporacao)
            .then(res => {
                const list = res?.Ocorrencias ?? [];
                const filtered = list.filter(o => o.idTipoStatus === 1 || o.idTipoStatus === 4);
                setPriorities(filtered.slice(0, 8));
            })
            .catch(() => setPriorities([]))
            .finally(() => setLoadingPriorities(false));
    }, [selectedCorporacao?.idCorporacao]);

    const cards = STAT_CONFIG.map(cfg => ({
        ...cfg,
        count: statsData?.[cfg.key] ?? 0,
    }));

    const chartData = cards.map(card => ({
        name: card.title,
        value: card.count,
        color: STATUS_COLORS[card.type] || '#9ca3af',
    }));

    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const dataCapitalizada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

    return (
        <main className="main-content">
            <header className="main-header">
                <div>
                    <h2>{selectedCorporacao?.nome || 'Dashboard'}</h2>
                    <p style={{ color: 'var(--cor-texto-secundario)' }}>{dataCapitalizada}</p>
                </div>
                <div className="header-actions">
                    <Link to="/ocorrencias/nova" className="btn-primary">
                        <FontAwesomeIcon icon="plus" />
                        Nova Ocorrência
                    </Link>
                </div>
            </header>

            {/* CARDS DE ESTATÍSTICAS */}
            <section className="stats-grid">
                {cards.map((card, index) => (
                    <StatCard
                        key={index}
                        title={card.title}
                        count={card.count}
                        icon={card.icon}
                        type={card.type}
                    />
                ))}
            </section>

            {/* LAYOUT DIVIDIDO: TABELA E GRÁFICO */}
            <div className="dashboard-content">
                {/* PAINEL DE AÇÕES PRIORITÁRIAS */}
                <section className="priorities-section panel">
                    <div className="priorities-header">
                        <h3>
                            <FontAwesomeIcon icon="list-check" style={{ color: 'var(--cor-pendente)' }} />
                            Ações Prioritárias
                        </h3>
                    </div>
                    <div className="table-wrapper">
                        {loadingPriorities ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
                                <FontAwesomeIcon icon="sync" spin style={{ marginRight: 8 }} />
                                Carregando...
                            </div>
                        ) : priorities.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
                                <FontAwesomeIcon icon="check-circle" style={{ fontSize: 32, marginBottom: 12, display: 'block', color: '#10b981' }} />
                                Nenhuma ocorrência pendente de ação.
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tipo</th>
                                        <th>Data</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priorities.map((item) => (
                                        <tr key={item.idOcorrencia} className={item.idTipoStatus === 1 ? 'row-urgente' : ''}>
                                            <td>{TIPO_OCORRENCIA[item.idTipoOcorrencia] || '-'}</td>
                                            <td>{formatarDataSemHora(item.dataOcorrencia)}</td>
                                            <td>
                                                <span className={`status-badge ${STATUS_CLASS[item.idTipoStatus]}`}>
                                                    {TIPO_STATUS_LABEL[item.idTipoStatus]}
                                                </span>
                                            </td>
                                            <td>
                                                <Link to="/ocorrencias" className="btn-outline">
                                                    <span>Abrir</span>
                                                    <FontAwesomeIcon icon="arrow-right" style={{ fontSize: '12px' }} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                {/* PAINEL DE GRÁFICO */}
                <aside className="charts-section">
                    <div className="chart-container">
                        <div className="section-title-row">
                            <h3 className="chart-title">Ocorrências por Status</h3>
                        </div>
                        <div style={{ width: '100%', height: 260 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="40%"
                                        cy="45%"
                                        innerRadius={52}
                                        outerRadius={75}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--cor-painel)', borderRadius: '8px', border: '1px solid var(--cor-borda)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '13px' }}
                                        itemStyle={{ fontWeight: 500 }}
                                    />
                                    <Legend
                                        layout="vertical"
                                        align="right"
                                        verticalAlign="middle"
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => (
                                            <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)', lineHeight: '1.6' }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default Dashboard;
