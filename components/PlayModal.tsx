import React, { useState, useEffect, useRef } from 'react';
import { Play, Pillar, PlayInput } from '../types';

interface PlayModalProps {
  play: Play;
  pillars: Pillar[];
  isLoading: boolean;
  onClose: () => void;
  onExecute: (inputValues: Record<string, string>) => void;
}

export const PlayModal: React.FC<PlayModalProps> = ({
  play,
  pillars,
  isLoading,
  onClose,
  onExecute,
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    // Initialize with empty values
    const initial: Record<string, string> = {};
    play.inputs.forEach((input) => {
      initial[input.id] = '';
    });
    setInputValues(initial);

    // Focus first input
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [play]);

  const handleInputChange = (inputId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [inputId]: value }));
  };

  const handleSubmit = () => {
    // Validate required fields
    const missingRequired = play.inputs
      .filter((input) => input.required && !inputValues[input.id]?.trim())
      .map((input) => input.label);

    if (missingRequired.length > 0) {
      alert(`Please fill in: ${missingRequired.join(', ')}`);
      return;
    }

    onExecute(inputValues);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  const renderInput = (input: PlayInput, index: number) => {
    const isFirst = index === 0;
    const commonProps = {
      value: inputValues[input.id] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleInputChange(input.id, e.target.value),
      placeholder: input.placeholder,
      disabled: isLoading,
      className:
        'w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none disabled:opacity-50',
    };

    if (input.type === 'pillar-select') {
      return (
        <select
          {...commonProps}
          ref={isFirst ? (firstInputRef as React.RefObject<HTMLSelectElement>) : undefined}
          className={`${commonProps.className} cursor-pointer`}
        >
          <option value="">Select a pillar...</option>
          {pillars
            .filter((p) => p.status === 'active')
            .map((pillar) => (
              <option key={pillar.id} value={pillar.id}>
                {pillar.title}
              </option>
            ))}
        </select>
      );
    }

    if (input.type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          ref={isFirst ? (firstInputRef as React.RefObject<HTMLTextAreaElement>) : undefined}
          rows={3}
          className={`${commonProps.className} resize-none`}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type="text"
        ref={isFirst ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
      />
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-[10vh] justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-gray-900 border border-gray-800 w-[600px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{play.icon}</span>
            <div>
              <h3 className="text-lg font-medium text-white">{play.name}</h3>
              <p className="text-sm text-gray-500">{play.description}</p>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {play.inputs.map((input, index) => (
            <div key={input.id}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {input.label}
                {input.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {renderInput(input, index)}
            </div>
          ))}

          {/* Outputs Preview */}
          <div className="pt-4 border-t border-gray-800">
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-3">
              What you'll get
            </label>
            <div className="space-y-2">
              {play.outputs.map((output) => (
                <div
                  key={output.platform}
                  className="flex items-center space-x-2 text-sm text-gray-400"
                >
                  <span className="w-2 h-2 rounded-full bg-accent-500/50" />
                  <span className="capitalize font-medium">{output.platform}:</span>
                  <span className="text-gray-500">{output.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-600 font-mono">Cmd+Enter to run</span>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded hover:bg-accent-500 transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Running Play...
                </>
              ) : (
                <>Run {play.name}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
