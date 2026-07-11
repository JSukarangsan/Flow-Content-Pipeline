import React, { useState, useEffect } from 'react';
import { Play } from '../services/database';
import { playsService } from '../services/playsService';
import { Pillar, Platform } from '../types';

interface PlaySelectorProps {
  pillar: Pillar;
  onClose: () => void;
  onExecute: (results: Array<{ platform: Platform; content: string }>) => void;
  settings?: any;
}

export function PlaySelector({ pillar, onClose, onExecute, settings }: PlaySelectorProps) {
  const [plays, setPlays] = useState<Play[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlays();
  }, []);

  useEffect(() => {
    if (selectedPlay) {
      // Initialize inputs with defaults
      const defaultInputs: Record<string, any> = {
        core_idea: pillar.coreIdea,
        controversial_opinion: pillar.coreIdea,
        case_study: pillar.coreIdea
      };
      setInputs(defaultInputs);
    }
  }, [selectedPlay, pillar]);

  const loadPlays = async () => {
    const availablePlays = await playsService.getAllPlays();
    setPlays(availablePlays);
  };

  const handleExecute = async () => {
    if (!selectedPlay) return;

    // Validate inputs
    const errors = playsService.validateInputs(selectedPlay, inputs);
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const results = await playsService.executePlay(selectedPlay, inputs, settings);
      onExecute(results);
      onClose();
    } catch (err) {
      setError('Failed to execute play. Please try again.');
      console.error('Play execution failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const getPlayIcon = (trigger: string) => {
    const icons: Record<string, string> = {
      'long-form': '📚',
      'hot-take': '🔥',
      'case-study': '📊',
      'idea': '💡',
      'question': '❓',
      'recap': '📅'
    };
    return icons[trigger] || '🎭';
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 w-[700px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Select a Play</h3>
            <p className="text-sm text-gray-500">
              Multiply "{pillar.title}" into platform-specific content
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedPlay ? (
            // Play List
            <div className="grid gap-4">
              {plays.map(play => (
                <button
                  key={play.id}
                  onClick={() => setSelectedPlay(play)}
                  className="text-left p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-lg transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl mt-1">{getPlayIcon(play.trigger)}</span>
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{play.name}</h4>
                      <p className="text-sm text-gray-400 mb-2">{play.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {play.outputs.map((output, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-gray-900 border border-gray-700 rounded"
                          >
                            {output.count}× {output.platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Play Configuration
            <div className="space-y-6">
              {/* Selected Play Info */}
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getPlayIcon(selectedPlay.trigger)}</span>
                  <div>
                    <h4 className="text-white font-medium">{selectedPlay.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{selectedPlay.description}</p>
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                {selectedPlay.inputs.map(input => (
                  <div key={input.name}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      {input.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {input.type === 'select' && input.options ? (
                      <select
                        value={inputs[input.name] || ''}
                        onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                      >
                        <option value="">Select...</option>
                        {input.options.map(option => (
                          <option key={option} value={option}>
                            {option.replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={inputs[input.name] || ''}
                        onChange={(e) => setInputs({ ...inputs, [input.name]: e.target.value })}
                        placeholder={input.name === 'core_idea' ? pillar.coreIdea : `Enter ${input.name.replace(/_/g, ' ')}...`}
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none resize-none"
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Expected Outputs */}
              <div>
                <h5 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Will Generate</h5>
                <div className="grid grid-cols-2 gap-3">
                  {selectedPlay.outputs.map((output, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-800 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white capitalize">{output.platform}</span>
                        <span className="text-xs text-accent-500 font-medium">
                          {output.count} {output.count > 1 ? 'pieces' : 'piece'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{output.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-900 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center">
          {selectedPlay ? (
            <>
              <button
                onClick={() => setSelectedPlay(null)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Back to plays
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={isExecuting}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isExecuting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Play</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-600 font-mono">Select a play to continue</span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}