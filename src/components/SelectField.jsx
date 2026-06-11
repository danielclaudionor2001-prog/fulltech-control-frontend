import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export default function SelectField({
  buttonClassName = '',
  className = '',
  disabled = false,
  menuClassName = '',
  name,
  onChange,
  options,
  placeholder = 'Selecione',
  value,
}) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickedInsideTrigger = rootRef.current?.contains(event.target);
      const clickedInsidePanel = panelRef.current?.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsidePanel) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPanelStyle(null);
      return undefined;
    }

    const updatePanelPosition = () => {
      if (!rootRef.current) {
        return;
      }

      const triggerRect = rootRef.current.getBoundingClientRect();
      const viewportPadding = 16;
      const defaultGap = 8;
      const estimatedPanelHeight = Math.min(options.length * 52 + 12, 320);
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
      const spaceAbove = triggerRect.top - viewportPadding;
      const openUpward =
        spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        140,
        openUpward ? spaceAbove - defaultGap : spaceBelow - defaultGap,
      );

      const nextTop = openUpward
        ? Math.max(
            viewportPadding,
            triggerRect.top - Math.min(estimatedPanelHeight, maxHeight) - defaultGap,
          )
        : triggerRect.bottom + defaultGap;

      setPanelStyle({
        left: triggerRect.left,
        maxHeight,
        minWidth: triggerRect.width,
        position: 'fixed',
        top: nextTop,
        width: triggerRect.width,
        zIndex: 120,
      });
    };

    updatePanelPosition();

    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen, options.length]);

  const handleSelect = (nextValue) => {
    setIsOpen(false);
    onChange?.(nextValue);
  };

  const panel = isOpen && panelStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          className={`select-panel is-floating ${menuClassName}`.trim()}
          ref={panelRef}
          role="listbox"
          style={panelStyle}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={`select-option ${isSelected ? 'is-selected' : ''}`.trim()}
                key={option.value}
                onClick={() => handleSelect(option.value)}
                role="option"
                type="button"
              >
                <span className="select-option-copy">
                  <span>{option.label}</span>
                </span>

                {isSelected ? <Check size={16} /> : null}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        className={`select-field ${isOpen ? 'is-open' : ''} ${
          disabled ? 'is-disabled' : ''
        } ${className}`.trim()}
        ref={rootRef}
      >
        {name ? <input type="hidden" name={name} value={value || ''} /> : null}

        <button
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={`select-trigger ${buttonClassName}`.trim()}
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="select-trigger-copy">
            <span
              className={`select-trigger-label ${
                selectedOption ? '' : 'is-placeholder'
              }`.trim()}
            >
              {selectedOption?.label || placeholder}
            </span>
          </span>

          <ChevronDown className="select-trigger-icon" size={18} />
        </button>
      </div>

      {panel}
    </>
  );
}
