import React from 'react';
import { Play } from '../types';

interface PlayCardProps {
  play: Play;
  onClick: () => void;
}

export const PlayCard: React.FC<PlayCardProps> = ({ play, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-accent-500/50 hover:bg-gray-800 transition-all group"
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{play.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white group-hover:text-accent-400 transition-colors">
            {play.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {play.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {play.outputs.map((output) => (
              <span
                key={output.platform}
                className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded"
              >
                {output.platform}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
};
