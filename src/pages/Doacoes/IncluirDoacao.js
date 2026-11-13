import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doacaoApi } from '../../services/api';
import { hojeLocal } from '../../utils/datas';
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import './Doacoes.css';

// idTipoDoacao: 1=Dinheiro, 2=Material, 3=Serviço
// idTipoPessoa: 1=Anônima, 2=Pessoa Física, 3=Pessoa Jurídica

const IncluirDoacao = () => {
    const { selectedCorporacao } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        idTipoDoacao: 1,
        idTipoPessoa: 1,
        nomeDoador: '',
        cpfDoador: '',
        dataDoacao: hojeLocal(),
        valor: '',
        quantidade: '1',
        descricao: '',
        observacao: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const isDinheiro = form.idTipoDoacao === 1;
            const payload = {
                idCorporacao: selectedCorporacao?.idCorporacao,
                idTipoDoacao: form.idTipoDoacao,
                idTipoPessoa: form.idTipoPessoa,
                nomeDoador: form.idTipoPessoa !== 1 ? (form.nomeDoador || null) : null,
                cpfDoador: form.idTipoPessoa !== 1 ? (form.cpfDoador || null) : null,
                dataDoacao: form.dataDoacao,
                // Dinheiro: valor doado. Material/Serviço: valor unitário (0 se desconhecido).
                valor: form.valor !== '' ? Number(form.valor) : 0,
                quantidade: isDinheiro ? 1 : Math.max(1, parseInt(form.quantidade, 10) || 1),
                observacao: isDinheiro ? (form.observacao || null) : (form.descricao || null),
            };
            await doacaoApi.create(payload);
            navigate('/doacoes');
        } catch (err) {
            setError(err.message || 'Erro ao cadastrar doação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDinheiro = form.idTipoDoacao === 1;
    const isAnonima = form.idTipoPessoa === 1;

    return (
        <main className="main-content">
            <div className="form-centered-container">
                <header className="main-header">
                    <h2>Cadastrar Nova Doação</h2>
                    <p style={{ color: '#475569', marginTop: '4px' }}>Preencha os dados abaixo para registrar uma nova entrada.</p>
                </header>

                {error && (
                    <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                        {error}
                    </div>
                )}

                <form className="form-panel" onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                    <div className="form-panel-header">
                        <h3>Detalhes da Doação</h3>
                    </div>
                    <div className="form-panel-body">
                        <div className="form-grid">

                            {/* TIPO DE DOAÇÃO */}
                            <div className="form-group full-width">
                                <label>Qual o tipo da doação?*</label>
                                <div className="chip-group">
                                    <div className={`chip-option ${form.idTipoDoacao === 1 ? 'active' : ''}`} onClick={() => handleChange('idTipoDoacao', 1)}>
                                        <FontAwesomeIcon icon="hand-holding-heart" /> Dinheiro
                                    </div>
                                    <div className={`chip-option ${form.idTipoDoacao === 2 ? 'active' : ''}`} onClick={() => handleChange('idTipoDoacao', 2)}>
                                        <FontAwesomeIcon icon="box-archive" /> Material
                                    </div>
                                    <div className={`chip-option ${form.idTipoDoacao === 3 ? 'active' : ''}`} onClick={() => handleChange('idTipoDoacao', 3)}>
                                        <FontAwesomeIcon icon="helmet-safety" /> Serviço
                                    </div>
                                </div>
                            </div>

                            {/* TIPO DE PESSOA */}
                            <div className="form-group full-width">
                                <label>Quem está doando?*</label>
                                <div className="chip-group">
                                    <div className={`chip-option ${form.idTipoPessoa === 1 ? 'active' : ''}`} onClick={() => handleChange('idTipoPessoa', 1)}>
                                        <FontAwesomeIcon icon="users" /> Anônima
                                    </div>
                                    <div className={`chip-option ${form.idTipoPessoa === 2 ? 'active' : ''}`} onClick={() => handleChange('idTipoPessoa', 2)}>
                                        <FontAwesomeIcon icon="user" /> Pessoa Física
                                    </div>
                                    <div className={`chip-option ${form.idTipoPessoa === 3 ? 'active' : ''}`} onClick={() => handleChange('idTipoPessoa', 3)}>
                                        <FontAwesomeIcon icon="building" /> Pessoa Jurídica
                                    </div>
                                </div>
                            </div>

                            {/* DADOS DO DOADOR (se não anônimo) */}
                            {!isAnonima && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="donor">Nome do Doador</label>
                                        <input
                                            type="text"
                                            id="donor"
                                            placeholder="Nome completo ou Razão Social"
                                            value={form.nomeDoador}
                                            onChange={e => handleChange('nomeDoador', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cpf">{form.idTipoPessoa === 3 ? 'CNPJ' : 'CPF'}</label>
                                        <input
                                            type="text"
                                            id="cpf"
                                            placeholder={form.idTipoPessoa === 3 ? '00.000.000/0000-00' : '000.000.000-00'}
                                            value={form.cpfDoador}
                                            onChange={e => handleChange('cpfDoador', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {/* DATA */}
                            <div className="form-group">
                                <label htmlFor="date">Data da Doação*</label>
                                <input
                                    type="date"
                                    id="date"
                                    required
                                    value={form.dataDoacao}
                                    onChange={e => handleChange('dataDoacao', e.target.value)}
                                />
                            </div>

                            {/* VALOR (só para Dinheiro) */}
                            {isDinheiro && (
                                <div className="form-group">
                                    <label htmlFor="value">Valor da Doação (R$)*</label>
                                    <CurrencyInput
                                        id="value"
                                        required
                                        value={form.valor}
                                        onChange={val => handleChange('valor', val)}
                                    />
                                </div>
                            )}

                            {/* DESCRIÇÃO (Material ou Serviço) */}
                            {!isDinheiro && (
                                <div className="form-group full-width">
                                    <label htmlFor="description">
                                        Descrição do {form.idTipoDoacao === 2 ? 'Item' : 'Serviço'}*
                                    </label>
                                    <input
                                        type="text"
                                        id="description"
                                        required
                                        placeholder={form.idTipoDoacao === 2 ? 'Ex: Luvas de procedimento G — 20 caixas' : 'Ex: Manutenção da viatura VTR-01'}
                                        value={form.descricao}
                                        onChange={e => handleChange('descricao', e.target.value)}
                                    />
                                </div>
                            )}

                            {/* QUANTIDADE E VALOR (Material ou Serviço) */}
                            {!isDinheiro && (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="quantidade">
                                            {form.idTipoDoacao === 2 ? 'Quantidade do material' : 'Quantas vezes foi realizado'}
                                        </label>
                                        <input
                                            type="number"
                                            id="quantidade"
                                            min="1"
                                            step="1"
                                            value={form.quantidade}
                                            onChange={e => handleChange('quantidade', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="valor-unitario">
                                            {form.idTipoDoacao === 2 ? 'Valor unitário do material (R$)' : 'Valor do serviço por vez (R$)'}
                                        </label>
                                        <CurrencyInput
                                            id="valor-unitario"
                                            value={form.valor}
                                            onChange={val => handleChange('valor', val)}
                                        />
                                    </div>
                                    {form.valor !== '' && (
                                        <p className="form-group full-width" style={{ fontSize: '13px', color: 'var(--cor-texto-secundario)' }}>
                                            Valor total estimado:{' '}
                                            <strong>
                                                {(Number(form.valor) * (parseInt(form.quantidade, 10) || 1))
                                                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </strong>
                                        </p>
                                    )}
                                </>
                            )}

                            {/* OBSERVAÇÃO (Dinheiro) */}
                            {isDinheiro && (
                                <div className="form-group full-width">
                                    <label htmlFor="obs">Observações (Opcional)</label>
                                    <input
                                        type="text"
                                        id="obs"
                                        placeholder="Detalhes adicionais..."
                                        value={form.observacao}
                                        onChange={e => handleChange('observacao', e.target.value)}
                                    />
                                </div>
                            )}

                        </div>
                    </div>
                    <div className="form-panel-footer">
                        <Link to="/doacoes" className="btn-outline-secondary">
                            <FontAwesomeIcon icon="arrow-left" style={{ marginRight: '8px' }} />
                            Voltar
                        </Link>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ marginLeft: '12px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? <><FontAwesomeIcon icon="sync" spin style={{ marginRight: '8px' }} />Salvando...</>
                                : <><FontAwesomeIcon icon="check" style={{ marginRight: '8px' }} />Confirmar Doação</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
};

export default IncluirDoacao;
