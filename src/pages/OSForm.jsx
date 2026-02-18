import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createServiceOrder } from '../services/api';
import { Folder, Sparkles, X, Info, UserPlus, ChevronDown } from 'lucide-react';
import '../../src/index.css';

export default function OSForm() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('geral');
    const [showBanner, setShowBanner] = useState(true);

    const [formData, setFormData] = useState({
        identifier: '',
        osType: '',
        deadline: '',
        customer: '',
        description: '',
        durationMinutes: '',
        scheduleDate: '2026-02-17',
        scheduleTime: '',
        collaborator: '',
        address: ''
    });

    const descriptionCount = formData.description.length;

    const canSubmit = useMemo(() => {
        return Boolean(
            formData.osType &&
            formData.customer &&
            formData.description &&
            formData.durationMinutes &&
            formData.scheduleDate
        );
    }, [formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        await createServiceOrder(formData);
        navigate('/admin');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="os-shell">
            <div className="os-header">
                <div className="os-header-left">
                    <Folder size={20} />
                    <div className="os-header-title">Nova atividade</div>
                </div>

                <div className="os-header-actions">
                    <button type="button" className="os-pill" onClick={() => {}}>
                        <Sparkles size={16} />
                        Testar novo layout
                    </button>

                    <button type="button" className="os-icon-btn" onClick={() => navigate('/admin')} aria-label="Fechar">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="os-tabs">
                <button
                    type="button"
                    className={`os-tab ${activeTab === 'geral' ? 'active' : ''}`}
                    onClick={() => setActiveTab('geral')}
                >
                    GERAL
                </button>
                <button
                    type="button"
                    className={`os-tab ${activeTab === 'localizacao' ? 'active' : ''}`}
                    onClick={() => setActiveTab('localizacao')}
                >
                    LOCALIZAÇÃO
                </button>
                <button
                    type="button"
                    className={`os-tab ${activeTab === 'anexos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('anexos')}
                >
                    ANEXOS
                </button>
            </div>

            <div className="os-content">
                {showBanner && (
                    <div className="os-banner">
                        <div className="os-banner-left">
                            <Info size={18} color="#1a73e8" />
                            <span>
                                Estamos repaginando a ordem de serviço.{' '}
                                <a href="#" onClick={(e) => e.preventDefault()}>
                                    Clique aqui
                                </a>{' '}
                                para deixar sua contribuição.
                            </span>
                        </div>
                        <button type="button" className="os-banner-close" onClick={() => setShowBanner(false)} aria-label="Fechar aviso">
                            <X size={18} />
                        </button>
                    </div>
                )}

                <form className="os-form" onSubmit={handleSubmit}>
                    {activeTab === 'geral' && (
                        <div className="os-form-inner">
                            <div className="os-row cols-3">
                                <div className="os-field">
                                    <label className="os-label">Identificador</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="text"
                                            name="identifier"
                                            value={formData.identifier}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="os-field">
                                    <label className="os-label">Selecione um tipo de OS *</label>
                                    <div className="os-underline">
                                        <select
                                            className="os-select"
                                            name="osType"
                                            required
                                            value={formData.osType}
                                            onChange={handleChange}
                                        >
                                            <option value="" disabled />
                                            <option value="instalacao">Instalação</option>
                                            <option value="manutencao">Manutenção</option>
                                            <option value="vistoria">Vistoria</option>
                                            <option value="suporte">Suporte</option>
                                        </select>
                                        <span className="os-caret">
                                            <ChevronDown size={18} />
                                        </span>
                                    </div>
                                </div>

                                <div className="os-field">
                                    <label className="os-label">Prazo</label>
                                    <div className="os-underline">
                                        <select
                                            className="os-select"
                                            name="deadline"
                                            value={formData.deadline}
                                            onChange={handleChange}
                                        >
                                            <option value="" disabled />
                                            <option value="sem_prazo">Prazo</option>
                                            <option value="1_dia">1 dia</option>
                                            <option value="3_dias">3 dias</option>
                                            <option value="7_dias">7 dias</option>
                                            <option value="15_dias">15 dias</option>
                                            <option value="30_dias">30 dias</option>
                                        </select>
                                        <span className="os-caret">
                                            <ChevronDown size={18} />
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="os-row cols-1 os-client-row">
                                <div className="os-field">
                                    <label className="os-label">Cliente *</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="text"
                                            name="customer"
                                            required
                                            value={formData.customer}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="os-client-action"
                                    onClick={() => {}}
                                    aria-label="Selecionar cliente"
                                >
                                    <UserPlus size={20} />
                                </button>
                            </div>

                            <div className="os-textarea-wrap">
                                <textarea
                                    className="os-textarea"
                                    name="description"
                                    placeholder="Descrição da ordem de serviço"
                                    maxLength={5000}
                                    required
                                    value={formData.description}
                                    onChange={handleChange}
                                />
                                <div className="os-counter">({descriptionCount} / 5000)</div>
                            </div>

                            <div className="os-row cols-3b">
                                <div className="os-field">
                                    <label className="os-label">Duração estimada (min) *</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="number"
                                            min="1"
                                            name="durationMinutes"
                                            required
                                            value={formData.durationMinutes}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="os-field">
                                    <label className="os-label">Data do agendamento *</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="date"
                                            name="scheduleDate"
                                            required
                                            value={formData.scheduleDate}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="os-field">
                                    <label className="os-label">Hora do agendamento</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="time"
                                            name="scheduleTime"
                                            value={formData.scheduleTime}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="os-row cols-1">
                                <div className="os-field">
                                    <label className="os-label">Colaborador</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="text"
                                            name="collaborator"
                                            value={formData.collaborator}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="os-divider" />
                        </div>
                    )}

                    {activeTab === 'localizacao' && (
                        <div className="os-form-inner">
                            <div className="os-row cols-1">
                                <div className="os-field">
                                    <label className="os-label">Endereço</label>
                                    <div className="os-underline">
                                        <input
                                            className="os-input"
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="os-divider" />
                        </div>
                    )}

                    {activeTab === 'anexos' && (
                        <div className="os-form-inner">
                            <div className="os-row cols-1">
                                <div className="os-field">
                                    <label className="os-label">Anexos</label>
                                    <div className="os-underline">
                                        <input className="os-input" type="text" value="" readOnly placeholder="Envio de anexos (em breve)" />
                                    </div>
                                </div>
                            </div>
                            <div className="os-divider" />
                        </div>
                    )}

                    <div className="os-actions">
                        <button className="os-create" type="submit" disabled={!canSubmit}>
                            CRIAR
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}