import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

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
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleSelect = (nextValue) => {
    setIsOpen(false);
    onChange?.(nextValue);
  };

  return (
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

      {isOpen ? (
        <div className={`select-panel ${menuClassName}`.trim()} role="listbox">
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
        </div>
      ) : null}
    </div>
  );
}
