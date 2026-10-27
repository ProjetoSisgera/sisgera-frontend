import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Ocorrencias.css';
import useAutoSave, { chaveRascunho } from '../../hooks/useAutoSave';
import { ocorrenciaApi, vitimaApi, veiculoOcorrenciaApi, hospitalApi, usuarioApi } from '../../services/api';

// ── Enums mapeados do backend ──────────────────────────────────────────────
const TIPO_OCC_MAP = { simplificado: 1, incendio: 2, salvamento: 3 };

const TIPO_OCC_SIMPLIFICADO = [
    { id: 1, label: 'Vistoria e inspeção' },
    { id: 2, label: 'Corte de árvore' },
    { id: 3, label: 'Desobstrução de via' },
    { id: 4, label: 'Eventos da defesa civil' },
    { id: 5, label: 'Transporte intra-hospitalar' },
    { id: 6, label: 'Cobertura em evento (público)' },
    { id: 7, label: 'Cobertura em evento (privado)' },
    { id: 8, label: 'Transporte para o domicílio' },
    { id: 9, label: 'Outro' },
];

const TRANSPORTE_OPTS = [
    { id: 1, label: 'VTR (ASB)' }, { id: 2, label: 'VTR (ABS)' },
    { id: 3, label: 'SAMU' }, { id: 4, label: 'Aéreo' }, { id: 5, label: 'Outros' },
    { id: 6, label: 'USB-BV' }, { id: 7, label: 'USB-SAMU' }, { id: 8, label: 'USA-SAMU' },
];

const ORIGEM_OPTS = [
    { id: 1, label: '193 (Bombeiros)' }, { id: 2, label: 'Rádio' },
    { id: 3, label: 'App/Online' }, { id: 4, label: 'Presencial' },
    { id: 5, label: 'Outro' }, { id: 6, label: 'CECOM' },
    { id: 7, label: 'SAMU' }, { id: 8, label: 'PMMG' },
    { id: 9, label: 'BMMG' }, { id: 10, label: 'PRF' },
];

const TIPO_LOCAL_OPTS = [
    { id: 1, label: 'Via pública' }, { id: 2, label: 'Via rural' },
    { id: 3, label: 'Rodovia' }, { id: 4, label: 'Residência' }, { id: 5, label: 'Outro' },
];

const TIPO_DESTINO_OPTS = [
    { id: 1, label: 'Óbito no local' },
    { id: 2, label: 'Vítima atendida no local' },
    { id: 3, label: 'Evadiu do local' },
    { id: 4, label: 'Recusou atendimento' },
    { id: 5, label: 'Encaminhado ao hospital' },
    { id: 6, label: 'Recusou encaminhamento ao hospital' },
];

const GENERO_OPTS = [
    { id: 1, label: 'Masculino' }, { id: 2, label: 'Feminino' }, { id: 3, label: 'Não Informado' },
];

const TIPO_VEICULO_OPTS = [
    { id: 1, label: 'Automóvel' }, { id: 2, label: 'Motocicleta' }, { id: 3, label: 'Ônibus' },
    { id: 4, label: 'Caminhão' }, { id: 5, label: 'Van/Micro-ônibus' }, { id: 6, label: 'Bicicleta' },
    { id: 7, label: 'Outros' },
];

const UF_OPTS = [
    { id: 1, uf: 'AC' }, { id: 2, uf: 'AL' }, { id: 3, uf: 'AP' }, { id: 4, uf: 'AM' },
    { id: 5, uf: 'BA' }, { id: 6, uf: 'CE' }, { id: 7, uf: 'DF' }, { id: 8, uf: 'ES' },
    { id: 9, uf: 'GO' }, { id: 10, uf: 'MA' }, { id: 11, uf: 'MT' }, { id: 12, uf: 'MS' },
    { id: 13, uf: 'MG' }, { id: 14, uf: 'PA' }, { id: 15, uf: 'PB' }, { id: 16, uf: 'PR' },
    { id: 17, uf: 'PE' }, { id: 18, uf: 'PI' }, { id: 19, uf: 'RJ' }, { id: 20, uf: 'RN' },
    { id: 21, uf: 'RS' }, { id: 22, uf: 'RO' }, { id: 23, uf: 'RR' }, { id: 24, uf: 'SC' },
    { id: 25, uf: 'SP' }, { id: 26, uf: 'SE' }, { id: 27, uf: 'TO' },
];

const TRAUMAS = [
    { id: 1,  label: 'Queda de altura (+2m)' },
    { id: 2,  label: 'Queda da própria altura' },
    { id: 3,  label: 'Ferimento por arma de fogo' },
    { id: 4,  label: 'Ferimento por arma branca' },
    { id: 5,  label: 'Colisão veicular' },
    { id: 6,  label: 'Atropelamento' },
    { id: 7,  label: 'Capotamento' },
    { id: 8,  label: 'Colisão entre veículo/animal' },
    { id: 9,  label: 'Choque elétrico' },
    { id: 10, label: 'Agressão por animal' },
    { id: 11, label: 'Agressão por animal peçonhento' },
    { id: 12, label: 'Agressão física' },
    { id: 13, label: 'Soterramento' },
    { id: 14, label: 'Desabamento' },
    { id: 15, label: 'Afogamento' },
    { id: 16, label: 'Queimadura' },
    { id: 17, label: 'Outro' },
];

const PROCEDIMENTOS = [
    { id: 1,  label: 'Desobstrução de vias aéreas' },
    { id: 2,  label: 'Cânula orofaríngea' },
    { id: 3,  label: 'Administração de oxigênio' },
    { id: 4,  label: 'Colar cervical' },
    { id: 5,  label: 'Oximetria de pulso' },
    { id: 6,  label: 'Prancha longa' },
    { id: 7,  label: 'Massagem Cardíaca (RCP)' },
    { id: 8,  label: 'Curativos' },
    { id: 9,  label: 'Atadura' },
    { id: 10, label: 'Bandagem' },
    { id: 11, label: 'Cobertor Térmico' },
    { id: 12, label: 'Desfibrilador Externo Automático (DEA)' },
    { id: 13, label: 'Ventilação Mecânica com Ambú' },
    { id: 14, label: 'KED' },
    { id: 15, label: 'Maca tipo SKED' },
    { id: 16, label: 'Talas de imobilização' },
    { id: 17, label: 'Outro' },
];

const EMERGENCIAS = [
    { id: 1,  label: 'Parada cardiorrespiratória (PCR)' },
    { id: 2,  label: 'OVACE' },
    { id: 3,  label: 'Convulsão' },
    { id: 4,  label: 'Síncope / Desmaio' },
    { id: 5,  label: 'Tentativa de autoextermínio' },
    { id: 6,  label: 'Embriaguez' },
    { id: 7,  label: 'Suspeita de AVC' },
    { id: 8,  label: 'Suspeita de infarto' },
    { id: 9,  label: 'Assistência ao parto' },
    { id: 10, label: 'Distúrbio psiquiátrico (agitação)' },
    { id: 11, label: 'Intoxicação exógena' },
    { id: 12, label: 'Dispnéia' },
    { id: 13, label: 'Dor precordial' },
    { id: 14, label: 'Outro' },
];

const ABERTURA_OCULAR = [
    { id: 1, pts: 1, label: 'Ausente (1pt)' }, { id: 2, pts: 2, label: 'À dor (2pt)' },
    { id: 3, pts: 3, label: 'À voz (3pt)' }, { id: 4, pts: 4, label: 'Espontânea (4pt)' },
];
const RESPOSTA_VERBAL = [
    { id: 1, pts: 1, label: 'Ausente (1pt)' }, { id: 2, pts: 2, label: 'Incompreensível (2pt)' },
    { id: 3, pts: 3, label: 'Desconexo (3pt)' }, { id: 4, pts: 4, label: 'Confuso (4pt)' },
    { id: 5, pts: 5, label: 'Orientado (5pt)' },
];
const RESPOSTA_MOTORA = [
    { id: 1, pts: 1, label: 'Ausente (1pt)' }, { id: 2, pts: 2, label: 'Extensão (2pt)' },
    { id: 3, pts: 3, label: 'Flexão (3pt)' }, { id: 4, pts: 4, label: 'Retira à dor (4pt)' },
    { id: 5, pts: 5, label: 'Adequada (5pt)' }, { id: 6, pts: 6, label: 'Obedece comandos (6pt)' },
];

// ── Vítima vazia (template) ───────────────────────────────────────────────
const novaVitima = (n) => ({
    uid: Date.now() + n,
    cpf: '', nome: '', nomeSocial: '', nascimento: '', telefone: '', idGenero: '', nomeMae: '',
    pas: '', pad: '', pulso: '', respiracao: '', temperatura: '', saturacao: '', saturacaoOxigenio: '',
    idAberturaOcular: '', idRespostaVerbal: '', idRespostaMotora: '',
    traumas: [], emergencias: [], procedimentos: [],
    traumaOutro: '', emergenciaOutro: '', procedimentoOutro: '',
    idTipoDestino: '',
    idTipoTransporte: '', prefixoPlaca: '', idHospital: '', numeroProntuario: '', nomeMedicoReceptor: '', crm: '',
    caminhoArquivoRecusa: '',
    idVeiculoUid: '',
    expanded: true,
});

// ── Veículo vazio (template) ──────────────────────────────────────────────
const novoVeiculo = (n) => ({
    uid: Date.now() + n + 1,
    idTipoVeiculo: '', descricao: '', placa: '', cor: '',
});

// ── Placa helpers ────────────────────────────────────────────────────────
const formatPlaca = (raw) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    if (clean.length < 4 || !/\d/.test(clean[3])) return clean;
    if (clean.length >= 5 && /[A-Z]/.test(clean[4])) return clean; // Mercosul: ABC1D23
    return clean.slice(0, 3) + '-' + clean.slice(3);              // Antigo: ABC-1234
};
const isValidPlaca = (p) => /^[A-Z]{3}-\d{4}$/.test(p) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(p);

// ── Masks ────────────────────────────────────────────────────────────────
const formatCpf = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};
const formatCep = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.length <= 5 ? d : `${d.slice(0,5)}-${d.slice(5)}`;
};
const formatCelular = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

// ── Cálculo do Glasgow total ──────────────────────────────────────────────
const calcGlasgow = (v) => {
    const ao = ABERTURA_OCULAR.find(x => x.id === Number(v.idAberturaOcular))?.pts ?? 0;
    const rv = RESPOSTA_VERBAL.find(x => x.id === Number(v.idRespostaVerbal))?.pts ?? 0;
    const rm = RESPOSTA_MOTORA.find(x => x.id === Number(v.idRespostaMotora))?.pts ?? 0;
    return ao + rv + rm || null;
};

// ── Modal principal ───────────────────────────────────────────────────────
const NovaOcorrenciaModal = ({ isOpen, onClose, onSaved, idCorporacao, idResponsavel }) => {
    const TOTAL_STEPS = 4;
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedBoType, setSelectedBoType] = useState('');
    const [formData, setFormData] = useState({
        data_ocorrencia: '', hora_transmissao: '', hora_chegada_local: '', hora_chegada_hospital: '',
        idTipoOrigemChamado: '', origemChamadoOutro: '',
        idTipoLocalOcorrencia: '', localOcorrenciaOutro: '',
        idTipoOcorrenciaSimplificado: '', ocorrenciaSimplificadoOutro: '',
        cep: '', idUf: '', endereco: '', numero: '', bairro: '',
        cidade: '', ponto_referencia: '', complemento: '',
        relato_final: '',
        equipePlantao: [],
    });
    const [vitimas, setVitimas] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [hospitais, setHospitais] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState('');
    const [usuariosLoading, setUsuariosLoading] = useState(false);
    const [usuariosError, setUsuariosError] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);
    const restoreLock = useRef(false);

    const draftState = { currentStep, selectedBoType, formData, vitimas, veiculos };
    const { clearDraft, getDraft } = useAutoSave(chaveRascunho('ocorrencia', idResponsavel), draftState, isOpen && isInitialized);

    const resetForm = useCallback(() => {
        setCurrentStep(1);
        setSelectedBoType('');
        setFormData({
            data_ocorrencia: new Date().toISOString().split('T')[0],
            hora_transmissao: '', hora_chegada_local: '', hora_chegada_hospital: '',
            idTipoOrigemChamado: '', origemChamadoOutro: '',
            idTipoLocalOcorrencia: '', localOcorrenciaOutro: '',
            idTipoOcorrenciaSimplificado: '', ocorrenciaSimplificadoOutro: '',
            cep: '', idUf: '', endereco: '', numero: '', bairro: '',
            cidade: '', ponto_referencia: '', complemento: '',
            relato_final: '',
            equipePlantao: [],
        });
        setVitimas([]);
        setVeiculos([]);
        setSaveError('');
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (restoreLock.current) return;
            restoreLock.current = true;
            setIsInitialized(false);
            const saved = getDraft();
            const hasData = saved && (saved.selectedBoType || saved.formData?.data_ocorrencia || saved.vitimas?.length);
            if (hasData) {
                setTimeout(() => {
                    if (window.confirm('Encontramos um rascunho anterior não salvo. Deseja continuar?')) {
                        if (saved.currentStep) setCurrentStep(saved.currentStep);
                        if (saved.selectedBoType) setSelectedBoType(saved.selectedBoType);
                        if (saved.formData) setFormData(p => ({ ...p, ...saved.formData }));
                        if (saved.vitimas) setVitimas(saved.vitimas);
                        if (saved.veiculos) setVeiculos(saved.veiculos);
                    } else {
                        clearDraft();
                        resetForm();
                    }
                    setIsInitialized(true);
                }, 10);
            } else {
                resetForm();
                setIsInitialized(true);
            }
        } else {
            restoreLock.current = false;
            setIsInitialized(false);
        }
    }, [isOpen]); // eslint-disable-line

    useEffect(() => {
        if (isOpen && idCorporacao) {
            setUsuariosLoading(true);
            setUsuariosError('');
            usuarioApi.list(idCorporacao)
                .then(res => setUsuarios(res?.Usuarios ?? []))
                .catch(() => setUsuariosError('Não foi possível carregar a equipe. Verifique a conexão.'))
                .finally(() => setUsuariosLoading(false));
            hospitalApi.list(idCorporacao)
                .then(res => setHospitais(res?.Hospitais ?? []))
                .catch(() => {});
        }
    }, [isOpen, idCorporacao]);

    // ── Handlers ────────────────────────────────────────────────────────
    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(p => ({ ...p, [id]: value }));
    };

    const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));

    const toggleEquipe = (idUsuario) => {
        setFormData(p => {
            const arr = p.equipePlantao;
            return { ...p, equipePlantao: arr.includes(idUsuario) ? arr.filter(x => x !== idUsuario) : [...arr, idUsuario] };
        });
    };

    // ── Veículos ─────────────────────────────────────────────────────────
    const addVeiculo = () => setVeiculos(p => [...p, novoVeiculo(p.length)]);
    const removeVeiculo = (uid) => {
        setVeiculos(p => p.filter(v => v.uid !== uid));
        setVitimas(p => p.map(v => v.idVeiculoUid === uid ? { ...v, idVeiculoUid: '' } : v));
    };
    const updateVeiculo = (uid, field, value) => setVeiculos(p => p.map(v => v.uid === uid ? { ...v, [field]: value } : v));

    // ── Vítimas ─────────────────────────────────────────────────────────
    const addVitima = () => setVitimas(p => [...p, novaVitima(p.length)]);
    const removeVitima = (uid) => setVitimas(p => p.filter(v => v.uid !== uid));
    const toggleVitima = (uid) => setVitimas(p => p.map(v => v.uid === uid ? { ...v, expanded: !v.expanded } : v));
    const updateVitima = (uid, field, value) => setVitimas(p => p.map(v => v.uid === uid ? { ...v, [field]: value } : v));
    const toggleArray = (uid, field, id) => {
        setVitimas(p => p.map(v => {
            if (v.uid !== uid) return v;
            const arr = v[field];
            return { ...v, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
        }));
    };

    // ── CEP ─────────────────────────────────────────────────────────────
    const fetchCep = async (cepRaw) => {
        const cep = cepRaw.replace(/\D/g, '');
        if (cep.length !== 8) return;
        setCepLoading(true); setCepError('');
        try {
            const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!r.ok) { setCepError('CEP não encontrado.'); return; }
            const d = await r.json();
            if (d.erro) { setCepError('CEP não encontrado.'); return; }
            const uf = UF_OPTS.find(u => u.uf === d.uf);
            setFormData(p => ({
                ...p,
                endereco: d.logradouro || p.endereco,
                bairro: d.bairro || p.bairro,
                cidade: d.localidade || p.cidade,
                idUf: uf ? String(uf.id) : p.idUf,
            }));
        } catch { setCepError('Erro ao buscar CEP.'); }
        finally { setCepLoading(false); }
    };

    // ── Navegação ────────────────────────────────────────────────────────
    const handleNext = async () => {
        setSaveError('');
        if (currentStep === 1 && !selectedBoType) {
            alert('Selecione o tipo de ocorrência.'); return;
        }
        if (currentStep === 2 && selectedBoType === 'simplificado' && !formData.idTipoOcorrenciaSimplificado) {
            alert('Selecione o sub-tipo da ocorrência simplificada.'); return;
        }
        if (currentStep === 2 && !formData.data_ocorrencia) {
            alert('Informe a data da ocorrência.'); return;
        }
        if (currentStep === 2 && !formData.idTipoOrigemChamado) {
            alert('Selecione a origem do chamado.'); return;
        }
        if (currentStep === 2 && formData.idTipoOrigemChamado === '5' && !formData.origemChamadoOutro.trim()) {
            alert('Descreva a origem do chamado quando selecionar "Outro".'); return;
        }
        if (currentStep === 2 && formData.idTipoOcorrenciaSimplificado === '9' && !formData.ocorrenciaSimplificadoOutro.trim()) {
            alert('Descreva o tipo quando selecionar "Outro" no sub-tipo simplificado.'); return;
        }
        if (currentStep === 2 && formData.idTipoLocalOcorrencia === '5' && !formData.localOcorrenciaOutro.trim()) {
            alert('Descreva o local quando selecionar "Outro".'); return;
        }
        if (currentStep === 3) {
            const erros = [];
            veiculos.forEach((vei, idx) => {
                if (!vei.idTipoVeiculo)
                    erros.push(`Veículo ${idx + 1}: selecione o tipo.`);
            });
            vitimas.forEach((v, idx) => {
                const n = idx + 1;
                const cpfDigits = v.cpf.replace(/\D/g, '');
                if (!v.cpf || !v.nome || !v.nascimento) {
                    erros.push(`Vítima ${n}: CPF, nome e data de nascimento são obrigatórios.`);
                } else if (cpfDigits.length !== 11) {
                    erros.push(`Vítima ${n}: CPF inválido — informe os 11 dígitos.`);
                } else {
                    if (v.traumas.includes(17) && !v.traumaOutro?.trim())
                        erros.push(`Vítima ${n}: descreva o trauma "Outro".`);
                    if (v.emergencias.includes(14) && !v.emergenciaOutro?.trim())
                        erros.push(`Vítima ${n}: descreva a emergência "Outro".`);
                    if (v.procedimentos.includes(17) && !v.procedimentoOutro?.trim())
                        erros.push(`Vítima ${n}: descreva o procedimento "Outro".`);
                }
            });
            if (erros.length > 0) { setSaveError(erros.join(' | ')); return; }
        }
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(p => p + 1);
            return;
        }
        // ── Salvar ──────────────────────────────────────────────────────
        if (!idCorporacao || !idResponsavel) { setSaveError('Corporação ou usuário não identificado.'); return; }

        const errosVitimas = [];
        vitimas.forEach((v, idx) => {
            const n = idx + 1;
            const cpfDigits = v.cpf.replace(/\D/g, '');
            if (!v.cpf || !v.nome || !v.nascimento) {
                errosVitimas.push(`Vítima ${n}: CPF, nome e data de nascimento são obrigatórios.`);
            } else if (cpfDigits.length !== 11) {
                errosVitimas.push(`Vítima ${n}: CPF inválido — informe os 11 dígitos.`);
            } else {
                if (v.traumas.includes(17) && !v.traumaOutro?.trim())
                    errosVitimas.push(`Vítima ${n}: Descreva o trauma selecionado como "Outro".`);
                if (v.emergencias.includes(14) && !v.emergenciaOutro?.trim())
                    errosVitimas.push(`Vítima ${n}: Descreva a emergência selecionada como "Outro".`);
                if (v.procedimentos.includes(17) && !v.procedimentoOutro?.trim())
                    errosVitimas.push(`Vítima ${n}: Descreva o procedimento selecionado como "Outro".`);
            }
        });
        if (errosVitimas.length > 0) {
            setSaveError(errosVitimas.join(' '));
            return;
        }

        setSaving(true);
        try {
            const dataBase = formData.data_ocorrencia;
            const toISO = (time) => time ? `${dataBase}T${time}:00.000Z` : undefined;
            const origemId  = Number(formData.idTipoOrigemChamado);
            const localId   = Number(formData.idTipoLocalOcorrencia);
            const subtipoId = Number(formData.idTipoOcorrenciaSimplificado);

            const occPayload = {
                idCorporacao,
                idTipoOcorrencia: TIPO_OCC_MAP[selectedBoType] ?? 1,
                ...(selectedBoType === 'simplificado' && subtipoId && { idTipoOcorrenciaSimplificado: subtipoId }),
                ...(selectedBoType === 'simplificado' && subtipoId === 9 && formData.ocorrenciaSimplificadoOutro && { ocorrenciaSimplificadoOutro: formData.ocorrenciaSimplificadoOutro }),
                idResponsavel,
                dataOcorrencia: `${dataBase}T00:00:00.000Z`,
                ...(formData.hora_transmissao     && { horaTransmissao:    toISO(formData.hora_transmissao) }),
                ...(formData.hora_chegada_local   && { horaChegadaLocal:   toISO(formData.hora_chegada_local) }),
                ...(formData.hora_chegada_hospital && { horaChegadaHospital: toISO(formData.hora_chegada_hospital) }),
                idTipoOrigemChamado: origemId,
                ...(origemId === 5 && formData.origemChamadoOutro && { origemChamadoOutro: formData.origemChamadoOutro }),
                ...(localId && { idTipoLocalOcorrencia: localId }),
                ...(localId === 5 && formData.localOcorrenciaOutro && { localOcorrenciaOutro: formData.localOcorrenciaOutro }),
                ...(formData.cep              && { cep:             formData.cep.replace(/\D/g, '') }),
                ...(formData.idUf             && { idUf:            Number(formData.idUf) }),
                ...(formData.endereco         && { endereco:        formData.endereco }),
                ...(formData.numero           && { numero:          Number(formData.numero) }),
                ...(formData.bairro           && { bairro:          formData.bairro }),
                ...(formData.cidade           && { cidade:          formData.cidade }),
                ...(formData.ponto_referencia && { pontoReferencia: formData.ponto_referencia }),
                ...(formData.complemento      && { complemento:     formData.complemento }),
                ...(formData.relato_final     && { relatoFinal:     formData.relato_final }),
                ...(formData.equipePlantao?.length && { equipePlantao: formData.equipePlantao }),
            };

            const res = await ocorrenciaApi.create(occPayload);
            const idOcorrencia = res?.Ocorrencia?.idOcorrencia;

            if (!idOcorrencia) {
                throw new Error('A ocorrência foi salva, mas não retornou um identificador válido. Contate o suporte.');
            }

            // Criar veículos e montar mapa uid → idVeiculoOcorrencia
            const veiculoUidToId = {};
            const veiculosValidos = veiculos.filter(v => v.idTipoVeiculo);
            if (veiculosValidos.length > 0) {
                const veiculoResults = await Promise.allSettled(
                    veiculosValidos.map(vei =>
                        veiculoOcorrenciaApi.create({
                            idOcorrencia,
                            idTipoVeiculo: Number(vei.idTipoVeiculo),
                            ...(vei.descricao && { descricao: vei.descricao }),
                            ...(vei.placa     && { placa:     vei.placa }),
                            ...(vei.cor       && { cor:       vei.cor }),
                        }).then(res => ({ uid: vei.uid, id: res?.Veiculo?.idVeiculoOcorrencia }))
                    )
                );
                veiculoResults.forEach(r => {
                    if (r.status === 'fulfilled' && r.value?.id) {
                        veiculoUidToId[r.value.uid] = r.value.id;
                    }
                });
            }

            if (vitimas.length > 0) {
                const results = await Promise.allSettled(
                    vitimas.map(v => {
                        const destinoId = Number(v.idTipoDestino);
                        return vitimaApi.create({
                            idOcorrencia,
                            cpf:            v.cpf.replace(/\D/g, ''),
                            nome:           v.nome,
                            dataNascimento: new Date(v.nascimento).toISOString(),
                            ...(v.nomeSocial        && { nomeSocial:         v.nomeSocial }),
                            ...(v.telefone          && { telefone:           v.telefone.replace(/\D/g, '') }),
                            ...(v.idGenero          && { idGenero:           Number(v.idGenero) }),
                            ...(v.nomeMae           && { nomeMae:            v.nomeMae }),
                            ...(v.pas               && { pressaoSistolica:   Number(v.pas) }),
                            ...(v.pad               && { pressaoDiastolica:  Number(v.pad) }),
                            ...(v.pulso             && { pulso:              Number(v.pulso) }),
                            ...(v.respiracao        && { respiracao:         Number(v.respiracao) }),
                            ...(v.temperatura       && { temperatura:        Math.round(Number(v.temperatura)) }),
                            ...(v.saturacao         && { saturacao:          Number(v.saturacao) }),
                            ...(v.saturacaoOxigenio && { saturacaoOxigenio:  Number(v.saturacaoOxigenio) }),
                            ...(v.idAberturaOcular  && { idAberturaOcular:   Number(v.idAberturaOcular) }),
                            ...(v.idRespostaVerbal  && { idRespostaVerbal:   Number(v.idRespostaVerbal) }),
                            ...(v.idRespostaMotora  && { idRespostaMotora:   Number(v.idRespostaMotora) }),
                            ...(v.traumas.length       && { traumas:         v.traumas }),
                            ...(v.traumas.includes(17) && v.traumaOutro      && { traumaOutro:       v.traumaOutro }),
                            ...(v.emergencias.length   && { emergencias:     v.emergencias }),
                            ...(v.emergencias.includes(14) && v.emergenciaOutro && { emergenciaOutro: v.emergenciaOutro }),
                            ...(v.procedimentos.length && { procedimentos:   v.procedimentos }),
                            ...(v.procedimentos.includes(17) && v.procedimentoOutro && { procedimentoOutro: v.procedimentoOutro }),
                            ...(v.idVeiculoUid && veiculoUidToId[v.idVeiculoUid] && { idVeiculoOcorrencia: veiculoUidToId[v.idVeiculoUid] }),
                            ...(destinoId && { idTipoDestino: destinoId }),
                            ...(destinoId === 5 && v.idTipoTransporte   && { idTipoTransporte:   Number(v.idTipoTransporte) }),
                            ...(destinoId === 5 && v.prefixoPlaca       && { prefixoPlaca:       v.prefixoPlaca }),
                            ...(destinoId === 5 && v.idHospital         && { idHospital:         Number(v.idHospital) }),
                            ...(destinoId === 5 && v.numeroProntuario   && { numeroProntuario:   v.numeroProntuario }),
                            ...(destinoId === 5 && v.nomeMedicoReceptor && { nomeMedicoReceptor: v.nomeMedicoReceptor }),
                            ...(destinoId === 5 && v.crm                && { crm:                v.crm }),
                            ...((destinoId === 4 || destinoId === 6) && v.caminhoArquivoRecusa && { caminhoArquivoRecusa: v.caminhoArquivoRecusa }),
                        });
                    })
                );

                const falhas = results.filter(r => r.status === 'rejected');
                if (falhas.length > 0) {
                    setSaveError(
                        `Ocorrência salva, mas ${falhas.length} vítima(s) não puderam ser registradas. ` +
                        `Verifique os dados e tente novamente.`
                    );
                    setSaving(false);
                    return;
                }
            }

            clearDraft();
            onSaved?.();
            onClose();
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
                setSaveError('Sua sessão expirou. Faça login novamente e tente de novo.');
            } else if (msg.includes('403')) {
                setSaveError('Você não tem permissão para registrar ocorrências.');
            } else if (msg.includes('400')) {
                setSaveError('Dados inválidos. Revise as informações e tente novamente.');
            } else if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
                setSaveError('O servidor está com problemas. Tente novamente em alguns minutos.');
            } else if (!navigator.onLine) {
                setSaveError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
            } else {
                setSaveError(msg || 'Erro ao salvar ocorrência. Tente novamente.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePrev = () => { if (currentStep > 1) setCurrentStep(p => p - 1); };

    if (!isOpen) return null;

    const stepLabels = ['Tipo', 'Atendimento', 'Vítimas', 'Finalização'];

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
            <div className="modal-container" style={{ maxWidth: '900px' }}>
                <div className="modal-header">
                    <h2>Nova Ocorrência</h2>
                    <button className="close-modal-btn" onClick={onClose} aria-label="Fechar"><FontAwesomeIcon icon="times" /></button>
                </div>

                <div className="modal-content">
                    {/* STEPPER */}
                    <div className="stepper">
                        {stepLabels.map((label, i) => {
                            const n = i + 1;
                            return (
                                <div key={n} className={`stepper-item ${currentStep === n ? 'active' : ''} ${currentStep > n ? 'completed' : ''}`}>
                                    <div className="stepper-number">{currentStep > n ? <FontAwesomeIcon icon="check" /> : n}</div>
                                    <div className="stepper-title">{label}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="form-panel-modal">
                        <div className="form-panel-body">

                            {/* ══ PASSO 1: TIPO ══ */}
                            <div className={`form-step ${currentStep === 1 ? 'active' : ''}`}>
                                <h3 style={{ marginBottom: 24, textAlign: 'center' }}>Qual o tipo de ocorrência?</h3>
                                <div className="type-selection">
                                    {[
                                        { key: 'simplificado', icon: 'file-lines',       title: 'Simplificado',         desc: 'Registros rápidos, sem vítima grave.' },
                                        { key: 'incendio',     icon: 'fire-flame-curved', title: 'Combate a Incêndio',   desc: 'Incêndios urbanos, florestais, veiculares.' },
                                        { key: 'salvamento',   icon: 'helmet-safety',     title: 'Salvamento / Resgate', desc: 'APH, traumas, resgate em altura ou água.' },
                                    ].map(({ key, icon, title, desc }) => (
                                        <div
                                            key={key}
                                            className={`type-card ${selectedBoType === key ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedBoType(key);
                                                if (key !== 'simplificado') set('idTipoOcorrenciaSimplificado', '');
                                            }}
                                        >
                                            <FontAwesomeIcon icon={icon} />
                                            <h4>{title}</h4>
                                            <p>{desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ══ PASSO 2: ATENDIMENTO ══ */}
                            <div className={`form-step ${currentStep === 2 ? 'active' : ''}`}>

                                {/* Horários */}
                                <h3 className="section-header"><FontAwesomeIcon icon="clock" style={{ marginRight: 8 }} />Horários</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="data_ocorrencia">Data da Ocorrência *</label>
                                        <input type="date" id="data_ocorrencia" value={formData.data_ocorrencia} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="hora_transmissao">Hora Transmissão</label>
                                        <input type="time" id="hora_transmissao" value={formData.hora_transmissao} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="hora_chegada_local">Hora Chegada ao Local</label>
                                        <input type="time" id="hora_chegada_local" value={formData.hora_chegada_local} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="hora_chegada_hospital">Hora Chegada ao Hospital</label>
                                        <input type="time" id="hora_chegada_hospital" value={formData.hora_chegada_hospital} onChange={handleChange} />
                                    </div>
                                </div>

                                {/* Origem do chamado */}
                                <h3 className="section-header" style={{ marginTop: 24 }}>
                                    <FontAwesomeIcon icon="headset" style={{ marginRight: 8 }} />Origem do Chamado *
                                </h3>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {ORIGEM_OPTS.map(o => (
                                        <div
                                            key={o.id}
                                            className={`toggle-card ${formData.idTipoOrigemChamado === String(o.id) ? 'selected' : ''}`}
                                            style={{ padding: '8px 14px', fontSize: 13 }}
                                            onClick={() => set('idTipoOrigemChamado', String(o.id))}
                                        >
                                            {o.label}
                                            {formData.idTipoOrigemChamado === String(o.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                                {formData.idTipoOrigemChamado === '5' && (
                                    <div className="form-group" style={{ marginTop: 10 }}>
                                        <label htmlFor="origemChamadoOutro">Descreva a origem *</label>
                                        <input
                                            type="text" id="origemChamadoOutro" maxLength={100}
                                            placeholder="Descreva a origem do chamado..."
                                            value={formData.origemChamadoOutro} onChange={handleChange}
                                        />
                                    </div>
                                )}

                                {/* Sub-tipo — apenas para Simplificado */}
                                {selectedBoType === 'simplificado' && (
                                    <div style={{ marginTop: 24, padding: '20px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                        <h3 className="section-header" style={{ marginBottom: 12 }}>
                                            <FontAwesomeIcon icon="list-check" style={{ marginRight: 8 }} />Sub-tipo da Ocorrência *
                                        </h3>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {TIPO_OCC_SIMPLIFICADO.map(t => (
                                                <div
                                                    key={t.id}
                                                    className={`toggle-card ${formData.idTipoOcorrenciaSimplificado === String(t.id) ? 'selected' : ''}`}
                                                    style={{ padding: '8px 14px', fontSize: 13 }}
                                                    onClick={() => set('idTipoOcorrenciaSimplificado', String(t.id))}
                                                >
                                                    {t.label}
                                                    {formData.idTipoOcorrenciaSimplificado === String(t.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                </div>
                                            ))}
                                        </div>
                                        {formData.idTipoOcorrenciaSimplificado === '9' && (
                                            <div className="form-group" style={{ marginTop: 12 }}>
                                                <label htmlFor="ocorrenciaSimplificadoOutro">Descreva o tipo *</label>
                                                <input
                                                    type="text" id="ocorrenciaSimplificadoOutro" maxLength={100}
                                                    placeholder="Descreva o tipo de ocorrência..."
                                                    value={formData.ocorrenciaSimplificadoOutro} onChange={handleChange}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tipo de local */}
                                <h3 className="section-header" style={{ marginTop: 24 }}>
                                    <FontAwesomeIcon icon="map-pin" style={{ marginRight: 8 }} />Local da Ocorrência
                                </h3>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {TIPO_LOCAL_OPTS.map(l => (
                                        <div
                                            key={l.id}
                                            className={`toggle-card ${formData.idTipoLocalOcorrencia === String(l.id) ? 'selected' : ''}`}
                                            style={{ padding: '8px 14px', fontSize: 13 }}
                                            onClick={() => set('idTipoLocalOcorrencia', formData.idTipoLocalOcorrencia === String(l.id) ? '' : String(l.id))}
                                        >
                                            {l.label}
                                            {formData.idTipoLocalOcorrencia === String(l.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                                {formData.idTipoLocalOcorrencia === '5' && (
                                    <div className="form-group" style={{ marginTop: 10 }}>
                                        <label htmlFor="localOcorrenciaOutro">Descreva o local *</label>
                                        <input
                                            type="text" id="localOcorrenciaOutro" maxLength={100}
                                            placeholder="Descreva o local da ocorrência..."
                                            value={formData.localOcorrenciaOutro} onChange={handleChange}
                                        />
                                    </div>
                                )}

                                {/* Endereço */}
                                <h3 className="section-header" style={{ marginTop: 24 }}>
                                    <FontAwesomeIcon icon="search" style={{ marginRight: 8 }} />Endereço
                                </h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="cep">CEP</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                type="text" id="cep" placeholder="00000-000"
                                                value={formData.cep} maxLength={9}
                                                onChange={(e) => {
                                                    const formatted = formatCep(e.target.value);
                                                    set('cep', formatted);
                                                    if (formatted.replace(/\D/g, '').length === 8) fetchCep(formatted);
                                                }}
                                            />
                                            <button type="button" className="btn-secondary" style={{ padding: '0 12px' }}
                                                onClick={() => fetchCep(formData.cep)} disabled={cepLoading} aria-label="Buscar CEP">
                                                <FontAwesomeIcon icon={cepLoading ? 'sync' : 'search'} spin={cepLoading} />
                                            </button>
                                        </div>
                                        {cepError && <span style={{ color: '#ef4444', fontSize: 12 }}>{cepError}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="idUf">UF</label>
                                        <select id="idUf" value={formData.idUf} onChange={handleChange}>
                                            <option value="">— selecione —</option>
                                            {UF_OPTS.map(u => <option key={u.id} value={u.id}>{u.uf}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="endereco">Endereço / Logradouro</label>
                                        <input type="text" id="endereco" value={formData.endereco} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="numero">Número</label>
                                        <input type="number" id="numero" value={formData.numero} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="complemento">Complemento</label>
                                        <input type="text" id="complemento" placeholder="Apto, Bloco..." maxLength={25} value={formData.complemento} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="bairro">Bairro</label>
                                        <input type="text" id="bairro" value={formData.bairro} onChange={handleChange} />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cidade">Cidade</label>
                                        <input type="text" id="cidade" value={formData.cidade} onChange={handleChange} />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <label htmlFor="ponto_referencia">Ponto de Referência</label>
                                        <input type="text" id="ponto_referencia" placeholder="Próximo ao mercado..." value={formData.ponto_referencia} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            {/* ══ PASSO 3: VÍTIMAS ══ */}
                            <div className={`form-step ${currentStep === 3 ? 'active' : ''}`}>
                                {/* Banner informativo por tipo */}
                                {selectedBoType === 'simplificado' && (
                                    <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#166534' }}>
                                        <strong>Simplificado:</strong> vítimas são opcionais. Registre apenas dados básicos (nome, CPF) e o destino. Avaliação clínica não é necessária.
                                    </div>
                                )}
                                {(selectedBoType === 'salvamento' || selectedBoType === 'incendio') && (
                                    <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, fontSize: 13, color: '#713f12' }}>
                                        <strong>Salvamento / Resgate:</strong> registre todas as vítimas com avaliação clínica completa — sinais vitais, Glasgow, traumas, procedimentos e destino.
                                    </div>
                                )}
                                {/* Veículos Envolvidos */}
                                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem' }}>
                                                <FontAwesomeIcon icon="car" style={{ marginRight: 8, color: '#0891b2' }} />Veículos Envolvidos
                                            </h3>
                                            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Opcional — registre os veículos envolvidos na ocorrência.</p>
                                        </div>
                                        <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={addVeiculo}>
                                            <FontAwesomeIcon icon="plus" style={{ marginRight: 6 }} /> Adicionar Veículo
                                        </button>
                                    </div>
                                    {veiculos.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {veiculos.map((vei, idx) => (
                                                <div key={vei.uid} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr auto', gap: 8, alignItems: 'end', background: '#f0f9ff', borderRadius: 8, padding: '12px 16px', border: '1px solid #bae6fd' }}>
                                                    <div className="form-group" style={{ margin: 0 }}>
                                                        <label htmlFor={`veiculo-${vei.uid}-tipo`} style={{ fontSize: 12 }}>Veículo {idx + 1} — Tipo *</label>
                                                        <select id={`veiculo-${vei.uid}-tipo`} value={vei.idTipoVeiculo} onChange={e => updateVeiculo(vei.uid, 'idTipoVeiculo', e.target.value)}>
                                                            <option value="">— selecione —</option>
                                                            {TIPO_VEICULO_OPTS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ margin: 0 }}>
                                                        <label htmlFor={`veiculo-${vei.uid}-descricao`} style={{ fontSize: 12 }}>Descrição</label>
                                                        <input type="text" id={`veiculo-${vei.uid}-descricao`} maxLength={255} placeholder="Ex: Fiat Uno branco"
                                                            value={vei.descricao} onChange={e => updateVeiculo(vei.uid, 'descricao', e.target.value)} />
                                                    </div>
                                                    <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                                                        <label htmlFor={`veiculo-${vei.uid}-placa`} style={{ fontSize: 12 }}>Placa</label>
                                                        <input type="text" id={`veiculo-${vei.uid}-placa`} maxLength={8} placeholder="Ex: ABC-1234"
                                                            value={vei.placa}
                                                            onChange={e => updateVeiculo(vei.uid, 'placa', formatPlaca(e.target.value))} />
                                                        {vei.placa && !isValidPlaca(vei.placa) && (
                                                            <span style={{ fontSize: 11, color: '#d97706', position: 'absolute', top: '100%', left: 0, whiteSpace: 'nowrap', marginTop: 2 }}>
                                                                Formato: ABC-1234 ou ABC1D23
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="form-group" style={{ margin: 0 }}>
                                                        <label htmlFor={`veiculo-${vei.uid}-cor`} style={{ fontSize: 12 }}>Cor</label>
                                                        <input type="text" id={`veiculo-${vei.uid}-cor`} maxLength={30} placeholder="Ex: Prata"
                                                            value={vei.cor} onChange={e => updateVeiculo(vei.uid, 'cor', e.target.value)} />
                                                    </div>
                                                    <button type="button" onClick={() => removeVeiculo(vei.uid)} aria-label="Remover veículo"
                                                        style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', marginBottom: 0, alignSelf: 'end' }}>
                                                        <FontAwesomeIcon icon="trash" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Vítimas</h3>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                                            {selectedBoType === 'simplificado' ? 'Opcional — adicione se houver vítimas.' : 'Adicione todas as vítimas do atendimento.'}
                                        </p>
                                    </div>
                                    <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={addVitima}>
                                        <FontAwesomeIcon icon="plus" style={{ marginRight: 6 }} /> Adicionar Vítima
                                    </button>
                                </div>

                                {vitimas.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px 24px', border: '2px dashed #e2e8f0', borderRadius: 10, color: '#64748b' }}>
                                        <FontAwesomeIcon icon="user" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                                        <p style={{ margin: 0, fontWeight: 600 }}>Nenhuma vítima cadastrada</p>
                                        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Clique em "Adicionar Vítima" acima para registrar.</p>
                                    </div>
                                )}

                                {vitimas.map((v, idx) => {
                                    const glasgow = calcGlasgow(v);
                                    const destinoId = Number(v.idTipoDestino);
                                    return (
                                        <div key={v.uid} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
                                            {/* Cabeçalho accordion */}
                                            <div
                                                onClick={() => toggleVitima(v.uid)}
                                                style={{ background: '#f8fafc', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: v.expanded ? '1px solid #e2e8f0' : 'none' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--cor-primaria, #c53030)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: 14 }}>{v.nome || `Vítima ${idx + 1}`}</strong>
                                                        {v.cpf && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>CPF: {v.cpf}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    {glasgow && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>Glasgow: {glasgow}</span>}
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeVitima(v.uid); }} aria-label="Remover vítima"
                                                        style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                                                        <FontAwesomeIcon icon="trash" />
                                                    </button>
                                                    <FontAwesomeIcon icon={v.expanded ? 'arrow-down' : 'arrow-right'} style={{ color: '#94a3b8', fontSize: 12 }} />
                                                </div>
                                            </div>

                                            {/* Corpo expandido */}
                                            {v.expanded && (
                                                <div style={{ padding: '20px' }}>

                                                    {/* Dados pessoais */}
                                                    <h3 className="section-header"><FontAwesomeIcon icon="user" style={{ marginRight: 8 }} />Dados Pessoais</h3>
                                                    <div className="form-grid">
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-cpf`}>CPF *</label>
                                                            <input type="text" id={`vitima-${v.uid}-cpf`} placeholder="000.000.000-00" maxLength={14} value={v.cpf}
                                                                onChange={e => updateVitima(v.uid, 'cpf', formatCpf(e.target.value))} required />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-nome`}>Nome Completo *</label>
                                                            <input type="text" id={`vitima-${v.uid}-nome`} value={v.nome}
                                                                onChange={e => updateVitima(v.uid, 'nome', e.target.value)} required />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-nomeSocial`}>Nome Social</label>
                                                            <input type="text" id={`vitima-${v.uid}-nomeSocial`} value={v.nomeSocial}
                                                                onChange={e => updateVitima(v.uid, 'nomeSocial', e.target.value)} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-nascimento`}>Data de Nascimento *</label>
                                                            <input type="date" id={`vitima-${v.uid}-nascimento`} value={v.nascimento}
                                                                onChange={e => updateVitima(v.uid, 'nascimento', e.target.value)} required />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-telefone`}>Telefone</label>
                                                            <input type="tel" id={`vitima-${v.uid}-telefone`} placeholder="(00) 00000-0000" maxLength={15} value={v.telefone}
                                                                onChange={e => updateVitima(v.uid, 'telefone', formatCelular(e.target.value))} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-nomeMae`}>Nome da Mãe</label>
                                                            <input type="text" id={`vitima-${v.uid}-nomeMae`} value={v.nomeMae}
                                                                onChange={e => updateVitima(v.uid, 'nomeMae', e.target.value)} />
                                                        </div>
                                                        <div className="form-group full-width">
                                                            <label>Gênero</label>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                {GENERO_OPTS.map(g => (
                                                                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'normal', fontSize: 13 }}>
                                                                        <input type="radio" name={`genero-${v.uid}`} value={g.id}
                                                                            checked={v.idGenero === String(g.id)}
                                                                            onChange={() => updateVitima(v.uid, 'idGenero', String(g.id))} />
                                                                        {g.label}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Vínculo com veículo */}
                                                    {veiculos.length > 0 && (
                                                        <div className="form-group" style={{ marginTop: 12 }}>
                                                            <label htmlFor={`vitima-${v.uid}-veiculo`}>
                                                                <FontAwesomeIcon icon="car" style={{ marginRight: 6, color: '#0891b2' }} />
                                                                Veículo de Origem
                                                            </label>
                                                            <select id={`vitima-${v.uid}-veiculo`} value={v.idVeiculoUid}
                                                                onChange={e => updateVitima(v.uid, 'idVeiculoUid', e.target.value)}>
                                                                <option value="">— não vinculado —</option>
                                                                {veiculos.map((vei, vIdx) => (
                                                                    <option key={vei.uid} value={vei.uid}>
                                                                        Veículo {vIdx + 1}{vei.idTipoVeiculo ? ` — ${TIPO_VEICULO_OPTS.find(t => t.id === Number(vei.idTipoVeiculo))?.label || ''}` : ''}{vei.placa ? ` (${vei.placa})` : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Avaliação clínica — apenas Salvamento/Resgate e Incêndio */}
                                                    {selectedBoType !== 'simplificado' && (<>
                                                    {/* Sinais Vitais */}
                                                    <h3 className="section-header" style={{ marginTop: 20 }}>
                                                        <FontAwesomeIcon icon="stethoscope" style={{ marginRight: 8, color: '#ef4444' }} />Sinais Vitais
                                                    </h3>
                                                    <div className="form-grid">
                                                        <div className="form-group">
                                                            <label><FontAwesomeIcon icon="stethoscope" style={{ marginRight: 4, color: '#ef4444' }} /> Pressão Arterial (mmHg)</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                                                <input type="number" placeholder="PAS" aria-label="Pressão Arterial Sistólica" value={v.pas}
                                                                    onChange={e => updateVitima(v.uid, 'pas', e.target.value)}
                                                                    style={{ border: 'none', textAlign: 'center', flex: 1, padding: '10px 8px' }} />
                                                                <span style={{ color: '#94a3b8', fontWeight: 'bold', padding: '0 4px' }}>/</span>
                                                                <input type="number" placeholder="PAD" aria-label="Pressão Arterial Diastólica" value={v.pad}
                                                                    onChange={e => updateVitima(v.uid, 'pad', e.target.value)}
                                                                    style={{ border: 'none', textAlign: 'center', flex: 1, padding: '10px 8px' }} />
                                                            </div>
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-pulso`}><FontAwesomeIcon icon="heart-pulse" style={{ marginRight: 4, color: '#ef4444' }} /> Pulso (bpm)</label>
                                                            <input type="number" id={`vitima-${v.uid}-pulso`} placeholder="Ex: 72" value={v.pulso}
                                                                onChange={e => updateVitima(v.uid, 'pulso', e.target.value)} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-respiracao`}><FontAwesomeIcon icon="wind" style={{ marginRight: 4, color: '#3b82f6' }} /> Respiração (irpm)</label>
                                                            <input type="number" id={`vitima-${v.uid}-respiracao`} placeholder="Ex: 16" value={v.respiracao}
                                                                onChange={e => updateVitima(v.uid, 'respiracao', e.target.value)} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-temperatura`}><FontAwesomeIcon icon="temperature-high" style={{ marginRight: 4, color: '#f59e0b' }} /> Temperatura (°C)</label>
                                                            <input type="number" id={`vitima-${v.uid}-temperatura`} step="0.1" placeholder="Ex: 36.5" value={v.temperatura}
                                                                onChange={e => updateVitima(v.uid, 'temperatura', e.target.value)} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-saturacao`}><FontAwesomeIcon icon="tint" style={{ marginRight: 4, color: '#3b82f6' }} /> Saturação (%)</label>
                                                            <input type="number" id={`vitima-${v.uid}-saturacao`} placeholder="Ex: 98" min={0} max={100} value={v.saturacao}
                                                                onChange={e => updateVitima(v.uid, 'saturacao', e.target.value)} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-saturacaoO2`}>Saturação c/ O₂ (L/min)</label>
                                                            <input type="number" id={`vitima-${v.uid}-saturacaoO2`} placeholder="Ex: 4" value={v.saturacaoOxigenio}
                                                                onChange={e => updateVitima(v.uid, 'saturacaoOxigenio', e.target.value)} />
                                                        </div>
                                                    </div>

                                                    {/* Glasgow */}
                                                    <h3 className="section-header" style={{ marginTop: 20 }}>
                                                        Escala de Glasgow
                                                        {calcGlasgow(v) !== null && (
                                                            <span style={{ marginLeft: 12, background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '2px 12px', fontSize: 12, fontWeight: 700 }}>
                                                                Total: {calcGlasgow(v)} / 15
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <div className="form-grid">
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-abertura`}>Abertura Ocular (O)</label>
                                                            <select id={`vitima-${v.uid}-abertura`} value={v.idAberturaOcular} onChange={e => updateVitima(v.uid, 'idAberturaOcular', e.target.value)}>
                                                                <option value="">— selecione —</option>
                                                                {ABERTURA_OCULAR.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-verbal`}>Resposta Verbal (V)</label>
                                                            <select id={`vitima-${v.uid}-verbal`} value={v.idRespostaVerbal} onChange={e => updateVitima(v.uid, 'idRespostaVerbal', e.target.value)}>
                                                                <option value="">— selecione —</option>
                                                                {RESPOSTA_VERBAL.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="form-group">
                                                            <label htmlFor={`vitima-${v.uid}-motora`}>Resposta Motora (M)</label>
                                                            <select id={`vitima-${v.uid}-motora`} value={v.idRespostaMotora} onChange={e => updateVitima(v.uid, 'idRespostaMotora', e.target.value)}>
                                                                <option value="">— selecione —</option>
                                                                {RESPOSTA_MOTORA.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Traumas */}
                                                    <h3 className="section-header" style={{ marginTop: 20 }}>🩹 Traumas</h3>
                                                    <div className="toggle-card-grid">
                                                        {TRAUMAS.map(t => (
                                                            <div key={t.id}
                                                                className={`toggle-card ${v.traumas.includes(t.id) ? 'selected' : ''}`}
                                                                onClick={() => toggleArray(v.uid, 'traumas', t.id)}>
                                                                {t.label}
                                                                {v.traumas.includes(t.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {v.traumas.includes(17) && (
                                                        <div className="form-group" style={{ marginTop: 10 }}>
                                                            <label htmlFor={`vitima-${v.uid}-traumaOutro`}>Descreva o trauma *</label>
                                                            <input type="text" id={`vitima-${v.uid}-traumaOutro`} maxLength={100} placeholder="Descreva o trauma..."
                                                                value={v.traumaOutro}
                                                                onChange={e => updateVitima(v.uid, 'traumaOutro', e.target.value)} />
                                                        </div>
                                                    )}

                                                    {/* Emergências */}
                                                    <h3 className="section-header" style={{ marginTop: 20 }}>⚡ Emergências Clínicas</h3>
                                                    <div className="toggle-card-grid">
                                                        {EMERGENCIAS.map(e => (
                                                            <div key={e.id}
                                                                className={`toggle-card ${v.emergencias.includes(e.id) ? 'selected' : ''}`}
                                                                style={v.emergencias.includes(e.id) ? { borderColor: '#7c3aed', background: '#f5f3ff' } : {}}
                                                                onClick={() => toggleArray(v.uid, 'emergencias', e.id)}>
                                                                {e.label}
                                                                {v.emergencias.includes(e.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {v.emergencias.includes(14) && (
                                                        <div className="form-group" style={{ marginTop: 10 }}>
                                                            <label htmlFor={`vitima-${v.uid}-emergenciaOutro`}>Descreva a emergência *</label>
                                                            <input type="text" id={`vitima-${v.uid}-emergenciaOutro`} maxLength={100} placeholder="Descreva a emergência..."
                                                                value={v.emergenciaOutro}
                                                                onChange={e => updateVitima(v.uid, 'emergenciaOutro', e.target.value)} />
                                                        </div>
                                                    )}

                                                    {/* Procedimentos */}
                                                    <h3 className="section-header" style={{ marginTop: 20 }}>🔧 Procedimentos Efetuados</h3>
                                                    <div className="toggle-card-grid">
                                                        {PROCEDIMENTOS.map(p => (
                                                            <div key={p.id}
                                                                className={`toggle-card ${v.procedimentos.includes(p.id) ? 'selected' : ''}`}
                                                                style={v.procedimentos.includes(p.id) ? { borderColor: '#2563eb', background: '#eff6ff' } : {}}
                                                                onClick={() => toggleArray(v.uid, 'procedimentos', p.id)}>
                                                                {p.label}
                                                                {v.procedimentos.includes(p.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {v.procedimentos.includes(17) && (
                                                        <div className="form-group" style={{ marginTop: 10 }}>
                                                            <label htmlFor={`vitima-${v.uid}-procedimentoOutro`}>Descreva o procedimento *</label>
                                                            <input type="text" id={`vitima-${v.uid}-procedimentoOutro`} maxLength={100} placeholder="Descreva o procedimento..."
                                                                value={v.procedimentoOutro}
                                                                onChange={e => updateVitima(v.uid, 'procedimentoOutro', e.target.value)} />
                                                        </div>
                                                    )}
                                                    </>)}

                                                    {/* Destino da vítima */}
                                                    <h3 className="section-header" style={{ marginTop: 20 }}>
                                                        <FontAwesomeIcon icon="route" style={{ marginRight: 8, color: '#0891b2' }} />Destino da Vítima
                                                    </h3>
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        {TIPO_DESTINO_OPTS.map(d => (
                                                            <div
                                                                key={d.id}
                                                                className={`toggle-card ${v.idTipoDestino === String(d.id) ? 'selected' : ''}`}
                                                                style={{
                                                                    padding: '8px 14px', fontSize: 13,
                                                                    ...(v.idTipoDestino === String(d.id) ? { borderColor: '#0891b2', background: '#ecfeff' } : {}),
                                                                }}
                                                                onClick={() => updateVitima(v.uid, 'idTipoDestino', v.idTipoDestino === String(d.id) ? '' : String(d.id))}
                                                            >
                                                                {d.label}
                                                                {v.idTipoDestino === String(d.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Encaminhamento hospitalar */}
                                                    {destinoId === 5 && (
                                                        <div style={{ marginTop: 16, padding: '16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                                                            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#0369a1', fontWeight: 700 }}>
                                                                <FontAwesomeIcon icon="hospital" style={{ marginRight: 8 }} />Dados do Encaminhamento Hospitalar
                                                            </h4>
                                                            <div className="form-grid">
                                                                <div className="form-group full-width">
                                                                    <label>Meio de Transporte</label>
                                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                        {TRANSPORTE_OPTS.map(t => (
                                                                            <div
                                                                                key={t.id}
                                                                                className={`toggle-card ${v.idTipoTransporte === String(t.id) ? 'selected' : ''}`}
                                                                                style={{ padding: '6px 12px', fontSize: 12 }}
                                                                                onClick={() => updateVitima(v.uid, 'idTipoTransporte', v.idTipoTransporte === String(t.id) ? '' : String(t.id))}
                                                                            >
                                                                                {t.label}
                                                                                {v.idTipoTransporte === String(t.id) && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="form-group">
                                                                    <label htmlFor={`vitima-${v.uid}-prefixoPlaca`}>Prefixo / Placa</label>
                                                                    <input type="text" id={`vitima-${v.uid}-prefixoPlaca`} maxLength={8} placeholder="Ex: ABC-1234"
                                                                        value={v.prefixoPlaca}
                                                                        onChange={e => updateVitima(v.uid, 'prefixoPlaca', formatPlaca(e.target.value))} />
                                                                    {v.prefixoPlaca && !isValidPlaca(v.prefixoPlaca) && (
                                                                        <span style={{ fontSize: 11, color: '#d97706', marginTop: 2, display: 'block' }}>
                                                                            Formato: ABC-1234 ou ABC1D23
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="form-group">
                                                                    <label htmlFor={`vitima-${v.uid}-hospital`}>Hospital de Destino</label>
                                                                    <select id={`vitima-${v.uid}-hospital`} value={v.idHospital}
                                                                        onChange={e => updateVitima(v.uid, 'idHospital', e.target.value)}>
                                                                        <option value="">— selecione —</option>
                                                                        {hospitais.map(h => (
                                                                            <option key={h.idHospital} value={h.idHospital}>{h.nome}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="form-group">
                                                                    <label htmlFor={`vitima-${v.uid}-prontuario`}>Nº Prontuário</label>
                                                                    <input type="text" id={`vitima-${v.uid}-prontuario`} maxLength={50} placeholder="Ex: 2024-00123"
                                                                        value={v.numeroProntuario}
                                                                        onChange={e => updateVitima(v.uid, 'numeroProntuario', e.target.value)} />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label htmlFor={`vitima-${v.uid}-medico`}>Nome do Médico Receptor</label>
                                                                    <input type="text" id={`vitima-${v.uid}-medico`} placeholder="Dr(a). Nome completo"
                                                                        value={v.nomeMedicoReceptor}
                                                                        onChange={e => updateVitima(v.uid, 'nomeMedicoReceptor', e.target.value)} />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label htmlFor={`vitima-${v.uid}-crm`}>CRM</label>
                                                                    <input type="text" id={`vitima-${v.uid}-crm`} maxLength={25} placeholder="Ex: MG-123456"
                                                                        value={v.crm}
                                                                        onChange={e => updateVitima(v.uid, 'crm', e.target.value)} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Termo de recusa — Recusou atendimento (4) ou encaminhamento (6) */}
                                                    {(destinoId === 4 || destinoId === 6) && (
                                                        <div style={{ marginTop: 16, padding: '16px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fed7aa' }}>
                                                            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#c2410c', fontWeight: 700 }}>
                                                                <FontAwesomeIcon icon="file-signature" style={{ marginRight: 8 }} />Termo de Recusa
                                                            </h4>
                                                            <div className="form-group" style={{ margin: 0 }}>
                                                                <label htmlFor={`vitima-${v.uid}-recusa`} style={{ fontSize: 12 }}>Anexar arquivo do termo de recusa (PDF, imagem)</label>
                                                                <input type="file" id={`vitima-${v.uid}-recusa`} accept=".pdf,.jpg,.jpeg,.png"
                                                                    onChange={e => updateVitima(v.uid, 'caminhoArquivoRecusa', e.target.files?.[0]?.name ?? '')}
                                                                    style={{ border: '2px dashed #fed7aa', borderRadius: 8, padding: 10, width: '100%', cursor: 'pointer', background: '#fffbf5' }} />
                                                                {v.caminhoArquivoRecusa && (
                                                                    <span style={{ fontSize: 11, color: '#92400e', marginTop: 4, display: 'block' }}>
                                                                        <FontAwesomeIcon icon="check" style={{ marginRight: 4, color: '#16a34a' }} />
                                                                        {v.caminhoArquivoRecusa}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ══ PASSO 4: FINALIZAÇÃO ══ */}
                            <div className={`form-step ${currentStep === 4 ? 'active' : ''}`}>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label htmlFor="relato_final">Relato Final da Ocorrência</label>
                                        <textarea id="relato_final" rows={6}
                                            placeholder={
                                                selectedBoType === 'simplificado'
                                                    ? 'Descreva os fatos: motivo do acionamento, atividades realizadas, desfecho...'
                                                    : 'Descreva cronologicamente os fatos: chegada ao local, estado encontrado, condutas APH adotadas, encaminhamento hospitalar...'
                                            }
                                            value={formData.relato_final} onChange={handleChange} />
                                    </div>

                                    {/* Equipe de Plantão */}
                                    <div className="form-group full-width">
                                        <h3 style={{ margin: '0 0 12px', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, fontSize: '1rem' }}>
                                            <FontAwesomeIcon icon="users" style={{ marginRight: 8 }} /> Equipe de Plantão
                                        </h3>
                                        {usuariosLoading ? (
                                            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                                                <FontAwesomeIcon icon="sync" spin style={{ marginRight: 6 }} />Carregando equipe...
                                            </p>
                                        ) : usuariosError ? (
                                            <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{usuariosError}</p>
                                        ) : usuarios.length === 0 ? (
                                            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Nenhum usuário encontrado para esta corporação.</p>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {usuarios.map(u => {
                                                    const sel = formData.equipePlantao.includes(u.idUsuario);
                                                    return (
                                                        <div
                                                            key={u.idUsuario}
                                                            className={`toggle-card ${sel ? 'selected' : ''}`}
                                                            style={{ padding: '8px 14px', fontSize: 13 }}
                                                            onClick={() => toggleEquipe(u.idUsuario)}
                                                        >
                                                            <FontAwesomeIcon icon="user" style={{ marginRight: 6 }} />
                                                            {u.nome}
                                                            {sel && <FontAwesomeIcon icon="check" className="check-icon" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group full-width">
                                        <h3 style={{ margin: '0 0 12px', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, fontSize: '1rem' }}>
                                            <FontAwesomeIcon icon="camera" style={{ marginRight: 8 }} /> Fotos da Ocorrência
                                        </h3>
                                        <input type="file" multiple accept="image/*" aria-label="Fotos da Ocorrência"
                                            style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: 12, width: '100%', cursor: 'pointer' }} />
                                        <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>Múltiplas fotos permitidas. JPG, PNG, WEBP.</span>
                                    </div>

                                    {/* Resumo */}
                                    <div className="form-group full-width" style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>📋 Resumo</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                            <div><strong>Tipo:</strong> {selectedBoType || '—'}</div>
                                            <div><strong>Data:</strong> {formData.data_ocorrencia || '—'}</div>
                                            <div><strong>Vítimas:</strong> {vitimas.length} cadastradas</div>
                                            <div><strong>Cidade:</strong> {formData.cidade || '—'}</div>
                                            <div><strong>Equipe:</strong> {formData.equipePlantao.length} selecionados</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Erro */}
                        {saveError && (
                            <div className="modal-error" style={{ margin: '0 24px 12px' }}>
                                <FontAwesomeIcon icon="triangle-exclamation" /> {saveError}
                            </div>
                        )}

                        {/* Navegação */}
                        <div className="form-navigation">
                            <button type="button" className="btn btn-secondary" onClick={handlePrev} disabled={currentStep === 1 || saving}>
                                Voltar
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleNext} disabled={saving}>
                                {currentStep === TOTAL_STEPS
                                    ? saving
                                        ? <><FontAwesomeIcon icon="sync" spin style={{ marginRight: 8 }} />Salvando...</>
                                        : <><FontAwesomeIcon icon="check" style={{ marginRight: 8 }} />Salvar Ocorrência</>
                                    : 'Avançar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NovaOcorrenciaModal;
