import React, { useState } from 'react';
import { Pillar } from '../types';

interface PillarCardProps {
  pillar: Pillar;
  isActive: boolean;
  onClick: () => void;
  onArchive: () => void;
  onUpdateThemes: (themes: string[]) => void;
}

export const PillarCard: React.FC<PillarCardProps> = ({ pillar, isActive, onClick, onArchive, onUpdateThemes }) => {
  const [isEditingThemes, setIsEditingThemes] = useState(false);
  const [themeInput, setThemeInput] = useState('');

  const handleAddTheme = () => {
    if (themeInput.trim()) {
      const newThemes = [...(pillar.themes || []), themeInput.trim()];
      onUpdateThemes(newThemes);
      setThemeInput('');
    }
  };

  const handleRemoveTheme = (themeToRemove: string) => {
    const newThemes = (pillar.themes || []).filter(t => t !== themeToRemove);
    onUpdateThemes(newThemes);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTheme();
    } else if (e.key === 'Escape') {
      setIsEditingThemes(false);
      setThemeInput('');
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative p-4 border-b border-gray-800 cursor-pointer transition-colors duration-150
        ${pillar.status === 'archived' ? 'opacity-50' : ''}
        ${isActive ? 'bg-gray-800 border-l-4 border-l-accent-500' : 'bg-transparent hover:bg-gray-900 border-l-4 border-l-transparent'}
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase tracking-wider font-mono text-gray-500">{pillar.topic}</span>
          {pillar.status === 'archived' && (
            <span className="text-[9px] px-1 py-0.5 bg-gray-700 text-gray-400 rounded">Archived</span>
          )}
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title={pillar.status === 'archived' ? 'Unarchive' : 'Archive'}
          >
            {pillar.status === 'archived' ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            )}
          </button>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />}
        </div>
      </div>
      <h3 className={`font-medium text-sm mb-2 ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
        {pillar.title}
      </h3>

      {/* Themes with editing */}
      <div className="flex flex-wrap gap-1 mb-2">
        {(pillar.themes || []).map(theme => (
          <span
            key={theme}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center group/theme"
          >
            {theme}
            {isEditingThemes && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveTheme(theme); }}
                className="ml-1 text-indigo-400 hover:text-red-400"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {isEditingThemes ? (
          <input
            type="text"
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { handleAddTheme(); setIsEditingThemes(false); }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Add theme..."
            className="px-1.5 py-0.5 rounded text-[10px] bg-gray-900 border border-gray-700 text-white outline-none focus:border-indigo-500 w-20"
            autoFocus
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditingThemes(true); }}
            className="px-1.5 py-0.5 rounded text-[10px] text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 transition-colors"
          >
            + theme
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
        {pillar.coreIdea}
      </p>
    </div>
  );
};
