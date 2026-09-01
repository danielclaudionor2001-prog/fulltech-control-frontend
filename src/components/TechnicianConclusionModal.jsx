import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ClipboardCheck, Images, Trash2 } from 'lucide-react';
import ButtonSpinner from './ButtonSpinner';
import ModalShell from './ModalShell';
import SelectField from './SelectField';
import { useToast } from './ToastContext';

const DEFECT_OPTIONS = [
  { label: 'Sim', value: 'yes' },
  { label: 'Não', value: 'no' },
];

const OS_STATUS_OPTIONS = [
  { label: 'Finalizado', value: 'DONE' },
  { label: 'Com pendência', value: 'WITH_PENDING' },
];

const DEFECT_SOLUTION_OPTIONS = [
  {
    label: 'Substituição de Peça(s) / Componente(s)',
    value: 'replacement',
  },
  {
    label: 'Ajuste',
    value: 'adjustment',
  },
  {
    label: 'Programar Reparo',
    value: 'repair',
  },
];

const EQUIPMENT_STATUS_OPTIONS = [
  {
    label: 'Elevador funcionando',
    value: 'running',
  },
  {
    label: 'Elevador parado',
    value: 'stopped',
  },
];

const MAX_PHOTO_SIZE = 1280;
const PHOTO_QUALITY = 0.72;
const SIGNATURE_HEIGHT = 180;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const fileToOptimizedDataUrl = async (file) => {
  const dataUrl = await fileToDataUrl(file);

  try {
    const image = await loadImage(dataUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(
      1,
      MAX_PHOTO_SIZE / sourceWidth,
      MAX_PHOTO_SIZE / sourceHeight,
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
  } catch {
    return dataUrl;
  }
};

export default function TechnicianConclusionModal({
  isSubmitting,
  onClose,
  onSubmit,
  os,
}) {
  const { showWarning } = useToast();
  const canvasRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const signatureContextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const hasSignatureRef = useRef(false);
  const [completionDescription, setCompletionDescription] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [defectAdjusted, setDefectAdjusted] = useState('');
  const [defectSolution, setDefectSolution] = useState('');
  const [equipmentStatus, setEquipmentStatus] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [serviceOrderStatus, setServiceOrderStatus] = useState('');

  const configureSignatureCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(
      Math.round(rect.width || canvas.parentElement?.clientWidth || 640),
      320,
    );
    const previousSignature = hasSignatureRef.current ? canvas.toDataURL() : null;

    canvas.width = width * ratio;
    canvas.height = SIGNATURE_HEIGHT * ratio;
    canvas.style.height = `${SIGNATURE_HEIGHT}px`;

    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2;
    context.strokeStyle = '#0f172a';
    signatureContextRef.current = context;

    if (previousSignature) {
      const image = await loadImage(previousSignature);
      context.drawImage(image, 0, 0, width, SIGNATURE_HEIGHT);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    void configureSignatureCanvas();

    const resizeObserver = new ResizeObserver(() => {
      void configureSignatureCanvas();
    });
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [configureSignatureCanvas]);

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const beginSignature = (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const canvas = canvasRef.current;
    const context = signatureContextRef.current || canvas.getContext('2d');
    const point = getCanvasPoint(event);

    isDrawingRef.current = true;
    activePointerIdRef.current = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.01, point.y + 0.01);
    context.stroke();
    hasSignatureRef.current = true;
    setHasSignature(true);
  };

  const drawSignature = (event) => {
    if (!isDrawingRef.current) {
      return;
    }

    if (
      activePointerIdRef.current !== null &&
      event.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const canvas = canvasRef.current;
    const context = signatureContextRef.current || canvas.getContext('2d');
    const point = getCanvasPoint(event);

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const endSignature = (event) => {
    if (
      event?.pointerId !== undefined &&
      activePointerIdRef.current !== null &&
      event.pointerId !== activePointerIdRef.current
    ) {
      return;
    }

    if (activePointerIdRef.current !== null) {
      canvasRef.current?.releasePointerCapture?.(activePointerIdRef.current);
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = signatureContextRef.current || canvas.getContext('2d');

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
    hasSignatureRef.current = false;
    setHasSignature(false);
  };

  const handlePhotosChange = async (event) => {
    const files = Array.from(event.target.files || []);

    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const images = await Promise.all(files.map(fileToOptimizedDataUrl));
    setCompletionPhotos((currentPhotos) => [...currentPhotos, ...images]);
  };

  const removeCompletionPhoto = (photoIndex) => {
    setCompletionPhotos((currentPhotos) =>
      currentPhotos.filter((_, index) => index !== photoIndex),
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!completionDescription.trim()) {
      showWarning('Descreva o que foi feito no atendimento.');
      return;
    }

    if (!defectAdjusted) {
      showWarning('Informe se o defeito foi ajustado.');
      return;
    }

    if (!serviceOrderStatus) {
      showWarning('Informe o status da OS.');
      return;
    }

    if (!defectSolution) {
      showWarning('Informe a solução do defeito.');
      return;
    }

    if (!equipmentStatus) {
      showWarning('Informe o status do equipamento.');
      return;
    }

    if (!hasSignature) {
      showWarning('Colete a assinatura do cliente para finalizar a OS.');
      return;
    }

    const adjusted = defectAdjusted === 'yes';
    onSubmit({
      completionDescription,
      completionPhotos,
      customerSignature: canvasRef.current.toDataURL('image/png'),
      defectAdjusted: adjusted,
      defectSolution,
      equipmentStatus,
      status: serviceOrderStatus,
    });
  };

  return (
    <ModalShell
      className="technician-conclusion-modal"
      description={os.identifier ? `OS #${os.identifier}` : `OS #${os.id.slice(0, 8)}`}
      icon={ClipboardCheck}
      onClose={onClose}
      open
      title="Conclusão do Técnico"
    >
      <form className="simple-form technician-conclusion-form" onSubmit={handleSubmit}>
        <div className="technician-conclusion-scroll">
          <label className="simple-form-field">
            <span>Descrição do atendimento *</span>
            <textarea
              className="os-textarea"
              maxLength={5000}
              onChange={(event) => setCompletionDescription(event.target.value)}
              placeholder="Explique o que foi feito, peças verificadas e resultado do atendimento."
              value={completionDescription}
            />
          </label>

          <label className="simple-form-field">
            <span>O defeito foi ajustado? *</span>
            <SelectField
              onChange={setDefectAdjusted}
              options={DEFECT_OPTIONS}
              placeholder="Selecione"
              value={defectAdjusted}
            />
          </label>

          <label className="simple-form-field">
            <span>Status da OS *</span>
            <SelectField
              onChange={setServiceOrderStatus}
              options={OS_STATUS_OPTIONS}
              placeholder="Selecione"
              value={serviceOrderStatus}
            />
          </label>

          <label className="simple-form-field">
            <span>Solução do defeito *</span>
            <SelectField
              onChange={setDefectSolution}
              options={DEFECT_SOLUTION_OPTIONS}
              placeholder="Selecione"
              value={defectSolution}
            />
          </label>

          <label className="simple-form-field">
            <span>Status do elevador *</span>
            <SelectField
              onChange={setEquipmentStatus}
              options={EQUIPMENT_STATUS_OPTIONS}
              placeholder="Selecione"
              value={equipmentStatus}
            />
          </label>

          <label className="simple-form-field">
            <span>Fotos do atendimento</span>
            <div className="photo-picker-actions">
              <button
                className="btn btn-secondary"
                onClick={() => cameraInputRef.current?.click()}
                type="button"
              >
                <Camera size={18} />
                Tirar foto
              </button>

              <button
                className="btn btn-outline"
                onClick={() => galleryInputRef.current?.click()}
                type="button"
              >
                <Images size={18} />
                Galeria
              </button>
            </div>
            <input
              accept="image/*"
              capture="environment"
              className="photo-picker-input"
              multiple
              onChange={(event) => void handlePhotosChange(event)}
              ref={cameraInputRef}
              type="file"
            />
            <input
              accept="image/*"
              className="photo-picker-input"
              multiple
              onChange={(event) => void handlePhotosChange(event)}
              ref={galleryInputRef}
              type="file"
            />
            <small className="section-subtitle">
              Fotos de peças, problema identificado e serviço realizado.
            </small>
          </label>

          {completionPhotos.length ? (
            <div className="completion-photo-panel">
              <div className="os-card-meta-item">
                <Camera size={16} />
                <span>{completionPhotos.length} foto(s) selecionada(s)</span>
              </div>

              <div className="completion-photo-grid">
                {completionPhotos.map((photo, index) => (
                  <figure className="completion-photo-card" key={`${photo}-${index}`}>
                    <img alt={`Foto ${index + 1}`} src={photo} />
                    <button
                      aria-label={`Remover foto ${index + 1}`}
                      className="completion-photo-remove"
                      onClick={() => removeCompletionPhoto(index)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}

          <div className="simple-form-field">
            <span>Assinatura do cliente *</span>
            <canvas
              onPointerCancel={endSignature}
              onPointerDown={beginSignature}
              onLostPointerCapture={endSignature}
              onPointerMove={drawSignature}
              onPointerUp={endSignature}
              className="signature-canvas"
              ref={canvasRef}
            />
            <button
              className="btn btn-secondary btn-compact"
              onClick={clearSignature}
              type="button"
            >
              Limpar assinatura
            </button>
          </div>
        </div>

        <div className="modal-actions technician-conclusion-actions">
          <button
            className="btn btn-secondary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>

          <button className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <ButtonSpinner /> : null}
            {isSubmitting ? 'Finalizando...' : 'Finalizar OS'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
