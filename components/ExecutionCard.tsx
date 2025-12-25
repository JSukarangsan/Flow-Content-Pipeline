import React from 'react';
import { Execution } from '../types';
import { PLATFORM_CONFIG } from '../constants';

interface ExecutionCardProps {
  execution: Execution;
  isActive: boolean;
  onClick: () => void;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'twitter': return <span className="text-lg">𝕏</span>;
    case 'linkedin': return <span className="text-lg">In</span>;
    case 'youtube': return <span className="text-lg">▶</span>;
    case 'newsletter': return <span className="text-lg">✉</span>;
    default: return <span className="text-lg">●</span>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-400 bg-green-500/10';
  if (score >= 40) return 'text-yellow-400 bg-yellow-500/10';
  return 'text-red-400 bg-red-500/10';
};

export const ExecutionCard: React.FC<ExecutionCardProps> = ({ execution, isActive, onClick }) => {
  const config = PLATFORM_CONFIG[execution.platform];

  return (
    <div
      onClick={onClick}
      className={`
        group p-4 border-b border-gray-800 cursor-pointer transition-colors duration-150
        ${isActive ? 'bg-gray-800 border-l-4 border-l-accent-500' : 'bg-transparent hover:bg-gray-900 border-l-4 border-l-transparent'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center space-x-2 ${config.color}`}>
            <PlatformIcon platform={execution.platform} />
            <span className="text-xs font-semibold tracking-wide opacity-80">{config.label}</span>
        </div>
        <div className="flex items-center space-x-2">
          {execution.performanceScore !== undefined && (
            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getScoreColor(execution.performanceScore)}`}>
              {execution.performanceScore}
            </div>
          )}
          <div className={`text-[10px] uppercase border px-1.5 py-0.5 rounded ${
            execution.status === 'published' ? 'border-green-800 text-green-500' :
            execution.status === 'scheduled' ? 'border-yellow-800 text-yellow-500' :
            'border-gray-700 text-gray-600'
          }`}>
            {execution.status}
          </div>
        </div>
      </div>
      <p className={`text-xs line-clamp-3 font-mono leading-relaxed ${isActive ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-400'}`}>
        {execution.content || "(Empty draft)"}
      </p>
      {execution.performanceMetrics && (
        <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-gray-500">
          {execution.performanceMetrics.impressions !== undefined && (
            <span>{execution.performanceMetrics.impressions.toLocaleString()} views</span>
          )}
          {execution.performanceMetrics.engagementRate !== undefined && (
            <span>{execution.performanceMetrics.engagementRate.toFixed(1)}% eng</span>
          )}
          {execution.performanceMetrics.openRate !== undefined && (
            <span>{execution.performanceMetrics.openRate.toFixed(1)}% opens</span>
          )}
        </div>
      )}
    </div>
  );
};