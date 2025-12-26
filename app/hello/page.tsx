'use client';

import { useState } from 'react';

export default function HelloPage() {
  const [accordionOpen, setAccordionOpen] = useState<string | null>('triagem');
  const [selectedTeam, setSelectedTeam] = useState('Equipe B');
  const [selectedEscavacao, setSelectedEscavacao] = useState('Manual');
  const [status, setStatus] = useState<'aberto' | 'andamento' | 'concluida'>('aberto');
  const [prioridade, setPrioridade] = useState<'normal' | 'alta' | 'urgente'>('alta');

  // Tipo de problema: 1-Vazamento, 2-Nova Ligação, 3-Qualidade de Água, 4-Falta d'Água
  const [tipoproblema, setTipoproblema] = useState(1);

  // Modal de sinalização
  const [showModalSinalizacao, setShowModalSinalizacao] = useState(false);
  const [showModalQualidadeAgua, setShowModalQualidadeAgua] = useState(false);
  const [fotoSinalizacao, setFotoSinalizacao] = useState(false);

  // Verifica se deve mostrar a seção de sinalização (apenas para vazamento e nova ligação)
  const mostrarSinalizacao = tipoproblema === 1 || tipoproblema === 2;

  const toggleAccordion = (section: string) => {
    setAccordionOpen(accordionOpen === section ? null : section);
  };

  const handleIniciar = () => {
    if (tipoproblema === 1 || tipoproblema === 2) {
      // Vazamento ou Nova Ligação - exibir modal de sinalização
      setShowModalSinalizacao(true);
    } else if (tipoproblema === 3) {
      // Qualidade de Água - exibir modal informativo
      setShowModalQualidadeAgua(true);
      setStatus('andamento');
    } else {
      // Falta d'Água - apenas mudar status
      setStatus('andamento');
    }
  };

  const handleFinalizar = () => {
    setStatus('concluida');
  };

  const handleFotoSinalizacao = () => {
    // Simula tirar foto
    setFotoSinalizacao(true);
  };

  const handleFecharModalSinalizacao = () => {
    if (fotoSinalizacao) {
      setShowModalSinalizacao(false);
      setStatus('andamento');
    }
  };

  const handleFecharModalQualidadeAgua = () => {
    setShowModalQualidadeAgua(false);
  };

  const tiposProblema = [
    { id: 1, nome: '1 - Vazamento' },
    { id: 2, nome: '2 - Nova Ligação' },
    { id: 3, nome: '3 - Qualidade de Água' },
    { id: 4, nome: '4 - Falta d\'Água' }
  ];

  return (
    <>
      <style jsx global>{`
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding-bottom: 80px;
        }

        .header {
            background: white;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo img {
            height: 40px;
        }

        .os-number {
            background: white;
            padding: 20px;
            margin: 10px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .os-header {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
        }

        .os-title {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            color: white;
            flex-shrink: 0;
        }

        .os-title.aberto {
            background: #f44336;
        }

        .os-title.andamento {
            background: #4CAF50;
        }

        .os-title.concluida {
            background: #2196F3;
        }

        .os-code {
            font-size: 24px;
            font-weight: bold;
        }

        .os-code.aberto {
            color: #f44336;
        }

        .os-code.andamento {
            color: #4CAF50;
        }

        .os-code.concluida {
            color: #2196F3;
        }

        .info-card {
            background: white;
            margin: 10px;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 6px solid #ccc;
        }

        .info-card.aberto {
            border-left-color: #f44336;
        }

        .info-card.andamento {
            border-left-color: #4CAF50;
        }

        .info-card.concluida {
            border-left-color: #2196F3;
        }

        .info-top-row {
            display: flex;
            gap: 30px;
            margin-bottom: 15px;
        }

        .info-row {
            display: flex;
            align-items: flex-start;
        }

        .info-row.full-width {
            margin-top: 10px;
        }

        .info-icon {
            font-size: 20px;
            margin-right: 8px;
            min-width: 24px;
        }

        .info-content {
            flex: 1;
        }

        .info-label {
            font-size: 11px;
            color: #999;
            margin-bottom: 2px;
            text-transform: uppercase;
            display: none;
        }

        .info-value {
            font-size: 15px;
            font-weight: 500;
        }

        .info-row.full-width .info-value {
            font-size: 19px;
            font-weight: 700;
        }

        .info-card.aberto .info-value {
            color: #f44336;
        }

        .info-card.andamento .info-value {
            color: #4CAF50;
        }

        .info-card.concluida .info-value {
            color: #2196F3;
        }

        .info-value a {
            color: #2196F3;
            text-decoration: none;
        }

        .problem-card {
            background: white;
            margin: 10px;
            padding: 10px 15px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .problem-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
            display: none;
        }

        .problem-card.aberto .problem-title {
            color: #f44336;
        }

        .problem-card.andamento .problem-title {
            color: #4CAF50;
        }

        .problem-card.concluida .problem-title {
            color: #2196F3;
        }

        .problem-desc {
            font-weight: 700;
            line-height: 1.5;
            font-size: 19px;
        }

        .problem-card.aberto .problem-desc {
            color: #f44336;
        }

        .problem-card.andamento .problem-desc {
            color: #4CAF50;
        }

        .problem-card.concluida .problem-desc {
            color: #2196F3;
        }

        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: white;
            margin: 20px 10px 10px 10px;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-group {
            background: white;
            margin: 0 10px 10px 10px;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;
            display: block;
            font-weight: 500;
        }

        .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: 14px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            font-family: inherit;
            background: #fafafa;
            transition: all 0.3s;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-textarea {
            resize: vertical;
            min-height: 100px;
        }

        .chip-group {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 8px;
        }

        .chip {
            padding: 8px 16px;
            border: 1px solid #ddd;
            border-radius: 20px;
            background: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 400;
            transition: all 0.3s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .chip-compact {
            padding: 6px 10px;
            border-radius: 14px;
            font-size: 13px;
            min-height: 32px;
        }

        .chip:active {
            transform: scale(0.95);
        }

        .chip.selected {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .photo-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 15px;
            background: #f5f5f5;
            border: 2px dashed #ccc;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #666;
            transition: all 0.2s;
        }

        .photo-button:active {
            background: #e0e0e0;
        }

        .photo-preview {
            display: flex;
            gap: 10px;
            margin-top: 10px;
            overflow-x: auto;
        }

        .photo-thumb {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #999;
        }

        .action-buttons {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            padding: 15px;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
            display: flex;
            gap: 10px;
        }

        .btn {
            flex: 1;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .btn:active {
            transform: scale(0.97);
        }

        .btn-primary {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
        }

        .btn-secondary {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
        }

        .priority-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }

        .priority-normal {
            background: #E8F5E9;
            color: #2E7D32;
        }

        .priority-alta {
            background: #FF9800;
            color: white;
        }

        .priority-urgente {
            background: #f44336;
            color: white;
        }

        .accordion-section {
            margin: 10px;
        }

        .accordion-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 18px;
            font-weight: bold;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            transition: all 0.3s;
        }

        .accordion-header:active {
            transform: scale(0.98);
        }

        .accordion-header.closed {
            background: #f5f5f5;
            color: #666;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .accordion-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s ease;
        }

        .accordion-content.open {
            max-height: 2000px;
        }

        .accordion-icon {
            transition: transform 0.3s;
            font-size: 20px;
        }

        .accordion-icon.open {
            transform: rotate(180deg);
        }

        /* Modal Overlay */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        }

        .modal-content {
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }

        .modal-icon {
            font-size: 60px;
            margin-bottom: 20px;
        }

        .modal-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }

        .modal-message {
            font-size: 16px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 25px;
        }

        .modal-foto-preview {
            width: 100%;
            height: 200px;
            border-radius: 12px;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            border: 2px dashed #ccc;
        }

        .modal-foto-preview.uploaded {
            border: 2px solid #4CAF50;
            background: #E8F5E9;
        }

        .modal-buttons {
            display: flex;
            gap: 10px;
        }

        .modal-btn {
            flex: 1;
            padding: 14px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .modal-btn-camera {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .modal-btn-close {
            background: #4CAF50;
            color: white;
        }

        .modal-btn-close:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .modal-btn-ok {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
        }
      `}</style>

      <div>
        {/* Header */}
        <div className="header">
          <div className="logo">
            <span style={{ fontSize: '24px' }}>☰</span>
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 60'%3E%3Ctext x='10' y='35' font-family='Arial' font-size='24' font-weight='bold' fill='%23333'%3EContrata%3C/text%3E%3C/svg%3E" alt="Contrata" />
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            <span style={{ fontSize: '24px' }}>⋮</span>
          </div>
        </div>

        {/* OS Number com status em cor */}
        <div className="os-number">
          <div className="os-header">
            <div className={`os-title ${status}`}>OS</div>
            <div className={`os-code ${status}`}>00023 / 2512</div>
            <span className={`priority-badge priority-${prioridade}`}>
              {prioridade === 'urgente' ? 'URGENTE' : prioridade === 'alta' ? 'ALTA' : 'NORMAL'}
            </span>
          </div>
        </div>

        {/* Informações principais */}
        <div className={`info-card ${status}`}>
          <div className="info-top-row">
            <div className="info-row">
              <div className="info-icon">👤</div>
              <div className="info-content">
                <div className="info-label">Solicitante</div>
                <div className="info-value">Daniel Gonçalves</div>
              </div>
            </div>

            <div className="info-row">
              <div className="info-icon">📞</div>
              <div className="info-content">
                <div className="info-label">Telefone</div>
                <div className="info-value"><a href="tel:35992052324">(35) 99205-2324</a></div>
              </div>
            </div>
          </div>

          <div className="info-row full-width">
            <div className="info-icon">📍</div>
            <div className="info-content">
              <div className="info-label">Local de Ocorrência</div>
              <div className="info-value">Rua Example, 123 - Centro</div>
            </div>
          </div>
        </div>

        {/* Descrição do Problema */}
        <div className={`problem-card ${status}`}>
          <div className="problem-title">🚨 Tipo de Problema</div>
          <select
            className="form-select"
            style={{
              marginTop: '0',
              marginBottom: '8px',
              border: 'none',
              background: 'transparent',
              textAlign: 'center',
              padding: '0',
              cursor: 'pointer',
              fontSize: '19px',
              fontWeight: '700'
            }}
            value={tipoproblema}
            onChange={(e) => setTipoproblema(Number(e.target.value))}
          >
            {tiposProblema.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>
          <div className="problem-desc">
            {tipoproblema === 1 && 'Vazamento de água na rede'}
            {tipoproblema === 2 && 'Solicitação de nova ligação'}
            {tipoproblema === 3 && 'Água Turva e com cheiro de BHC'}
            {tipoproblema === 4 && 'Ausência de água no local'}
          </div>
        </div>

        {/* Accordion: Triagem */}
        <div className="accordion-section">
          <div
            className={`accordion-header ${accordionOpen === 'triagem' ? '' : 'closed'}`}
            onClick={() => toggleAccordion('triagem')}
          >
            <span>📋 Triagem</span>
            <span className={`accordion-icon ${accordionOpen === 'triagem' ? 'open' : ''}`}>▼</span>
          </div>
          <div className={`accordion-content ${accordionOpen === 'triagem' ? 'open' : ''}`}>
            <div className="form-group">
              <label className="form-label">Grau de Prioridade</label>
              <div className="chip-group">
                {[
                  { key: 'normal' as const, label: 'NORMAL' },
                  { key: 'alta' as const, label: 'ALTA' },
                  { key: 'urgente' as const, label: 'URGENTE' }
                ].map((item) => (
                  <div
                    key={item.key}
                    className={`chip ${prioridade === item.key ? 'selected' : ''}`}
                    onClick={() => setPrioridade(item.key)}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Responsável pela Execução</label>
              <div className="chip-group">
                {['Equipe A', 'Equipe B', 'Exec. Individual'].map((team) => (
                  <div
                    key={team}
                    className={`chip ${selectedTeam === team ? 'selected' : ''}`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    {team}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Accordion: Sinalização do Local (condicional) */}
        {mostrarSinalizacao && (
          <div className="accordion-section">
            <div
              className={`accordion-header ${accordionOpen === 'sinalizacao' ? '' : 'closed'}`}
              onClick={() => toggleAccordion('sinalizacao')}
            >
              <span>🚧 Sinalização do Local</span>
              <span className={`accordion-icon ${accordionOpen === 'sinalizacao' ? 'open' : ''}`}>▼</span>
            </div>
            <div className={`accordion-content ${accordionOpen === 'sinalizacao' ? 'open' : ''}`}>
              <div className="form-group">
                <label className="form-label">Tipo de Sinalização</label>
                <div className="chip-group">
                  {['Cone', 'Fita Zebrada', 'Cavalete', 'Placa'].map((tipo) => (
                    <div
                      key={tipo}
                      className="chip chip-compact"
                    >
                      {tipo}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Material Utilizado</label>
                <div className="chip-group">
                  {['Tubo PVC', 'Tubo PEAD', 'Registro', 'Conexões', 'Abraçadeira'].map((material) => (
                    <div
                      key={material}
                      className="chip chip-compact"
                    >
                      {material}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantidade / Observações</label>
                <textarea className="form-textarea" placeholder="Descreva as quantidades utilizadas e observações..."></textarea>
              </div>
            </div>
          </div>
        )}

        {/* Accordion: Informações Adicionais */}
        <div className="accordion-section">
          <div
            className={`accordion-header ${accordionOpen === 'info-adicionais' ? '' : 'closed'}`}
            onClick={() => toggleAccordion('info-adicionais')}
          >
            <span>ℹ️ Informações Adicionais</span>
            <span className={`accordion-icon ${accordionOpen === 'info-adicionais' ? 'open' : ''}`}>▼</span>
          </div>
          <div className={`accordion-content ${accordionOpen === 'info-adicionais' ? 'open' : ''}`}>
            <div className="form-group">
              <label className="form-label">Tipo de Escavação</label>
              <div className="chip-group">
                {['Manual', 'Mecânica'].map((tipo) => (
                  <div
                    key={tipo}
                    className={`chip ${selectedEscavacao === tipo ? 'selected' : ''}`}
                    onClick={() => setSelectedEscavacao(tipo)}
                  >
                    {tipo}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Diâmetro (mm)</label>
              <select className="form-select">
                <option>Selecione...</option>
                <option>50mm</option>
                <option>75mm</option>
                <option>100mm</option>
                <option>150mm</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accordion: Execução */}
        <div className="accordion-section">
          <div
            className={`accordion-header ${accordionOpen === 'execucao' ? '' : 'closed'}`}
            onClick={() => toggleAccordion('execucao')}
          >
            <span>🔧 Execução</span>
            <span className={`accordion-icon ${accordionOpen === 'execucao' ? 'open' : ''}`}>▼</span>
          </div>
          <div className={`accordion-content ${accordionOpen === 'execucao' ? 'open' : ''}`}>
            <div className="form-group">
              <label className="form-label">📷 Registros Fotográficos</label>
              <div className="photo-button">
                <span>📸</span>
                <span>Adicionar Fotos</span>
              </div>
              <div className="photo-preview">
                <div className="photo-thumb">Foto 1</div>
                <div className="photo-thumb">Foto 2</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">✅ Solução / Observações</label>
              <textarea className="form-textarea" placeholder="Descreva a solução aplicada ou observações relevantes..."></textarea>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="action-buttons">
          {status === 'aberto' && (
            <button className="btn btn-primary" onClick={handleIniciar}>
              <span>▶</span>
              Iniciar Atendimento
            </button>
          )}
          {status === 'andamento' && (
            <button className="btn btn-primary" onClick={handleFinalizar}>
              <span>✓</span>
              Finalizar OS
            </button>
          )}
          {status === 'concluida' && (
            <button className="btn btn-secondary">
              <span>📤</span>
              Compartilhar
            </button>
          )}
        </div>

        {/* Modal de Sinalização */}
        {showModalSinalizacao && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-icon">🚧</div>
              <div className="modal-title">Sinalização Obrigatória</div>
              <div className="modal-message">
                Por favor, sinalize o local de trabalho antes de iniciar o atendimento.
                Tire uma foto da sinalização para prosseguir.
              </div>

              <div className={`modal-foto-preview ${fotoSinalizacao ? 'uploaded' : ''}`}>
                {fotoSinalizacao ? (
                  <div style={{ fontSize: '48px' }}>✓</div>
                ) : (
                  <div style={{ color: '#999' }}>📸 Aguardando foto...</div>
                )}
              </div>

              <div className="modal-buttons">
                {!fotoSinalizacao ? (
                  <button className="modal-btn modal-btn-camera" onClick={handleFotoSinalizacao}>
                    <span>📷</span> Tirar Foto
                  </button>
                ) : (
                  <button className="modal-btn modal-btn-close" onClick={handleFecharModalSinalizacao}>
                    <span>✓</span> Continuar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Qualidade de Água */}
        {showModalQualidadeAgua && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-icon">💧</div>
              <div className="modal-title">Coleta de Água</div>
              <div className="modal-message">
                Para atendimento de qualidade de água, realize a coleta da amostra conforme procedimento padrão.
                <br /><br />
                <strong>Procedimento:</strong><br />
                1. Utilize recipiente esterilizado<br />
                2. Deixe a água correr por 2 minutos<br />
                3. Colete a amostra e identifique<br />
                4. Envie para análise laboratorial
              </div>

              <div className="modal-buttons">
                <button className="modal-btn modal-btn-ok" onClick={handleFecharModalQualidadeAgua}>
                  <span>✓</span> Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
