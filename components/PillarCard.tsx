import React from 'react';
import { Pillar } from '../types';

interface PillarCardProps {
  pillar: Pillar;
  isActive: boolean;
  onClick: () => void;
}

export const PillarCard: React.FC<PillarCardProps> = ({ pillar, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        group relative p-4 border-b border-gray-800 cursor-pointer transition-colors duration-150
        ${isActive ? 'bg-gray-800 border-l-4 border-l-accent-500' : 'bg-transparent hover:bg-gray-900 border-l-4 border-l-transparent'}
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] uppercase tracking-wider font-mono text-gray-500">{pillar.topic}</span>
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />}
      </div>
      <h3 className={`font-medium text-sm mb-2 ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
        {pillar.title}
      </h3>
      {pillar.themes && pillar.themes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {pillar.themes.map(theme => (
            <span key={theme} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {theme}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
        {pillar.coreIdea}
      </p>
    </div>
  );
};