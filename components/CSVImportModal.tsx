import React, { useState, useRef } from 'react';
import {
  parseCSVFile,
  ImportedPerformanceData,
  matchToExecutions,
} from '../services/csvImportService';
import { Execution } from '../types';

interface CSVImportModalProps {
  executions: Execution[];
  onClose: () => void;
  onImport: (updates: Map<string, ImportedPerformanceData>) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  executions,
  onClose,
  onImport,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [csvType, setCsvType] = useState<'linkedin' | 'kit' | 'unknown' | null>(null);
  const [importedData, setImportedData] = useState<ImportedPerformanceData[]>([]);
  const [matches, setMatches] = useState<Map<string, ImportedPerformanceData>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSVFile(text);

      if (result.type === 'unknown') {
        setError('Could not detect CSV format. Please use LinkedIn or Kit (ConvertKit) exports.');
        return;
      }

      setCsvType(result.type);
      setImportedData(result.data);

      // Auto-match to existing executions
      const autoMatches = matchToExecutions(result.data, executions);
      setMatches(autoMatches);
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (matches.size > 0) {
      onImport(matches);
      onClose();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMatchedExecution = (data: ImportedPerformanceData) => {
    for (const [execId, matchedData] of matches.entries()) {
      if (matchedData === data) {
        return executions.find((e) => e.id === execId);
      }
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start pt-[10vh] justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 w-[700px] max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Import Performance Data</h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload a CSV export from LinkedIn or Kit (newsletter)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!csvType ? (
            // Upload area
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-accent-500 bg-accent-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="space-y-4">
                <div className="text-4xl">📊</div>
                <div>
                  <p className="text-gray-300">Drop your CSV file here, or</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-accent-400 hover:text-accent-300 font-medium"
                  >
                    browse to upload
                  </button>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Supported formats:</p>
                  <p>• LinkedIn: Posts analytics export</p>
                  <p>• Kit: Newsletter broadcasts export</p>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            // Results view
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{csvType === 'linkedin' ? '💼' : '📧'}</span>
                  <div>
                    <p className="text-white font-medium capitalize">{csvType} Data</p>
                    <p className="text-sm text-gray-500">
                      {importedData.length} entries found, {matches.size} matched to executions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCsvType(null);
                    setImportedData([]);
                    setMatches(new Map());
                  }}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Upload different file
                </button>
              </div>

              {/* Matched entries */}
              {matches.size > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Matched Entries ({matches.size})
                  </h4>
                  <div className="space-y-2">
                    {importedData
                      .filter((data) => getMatchedExecution(data))
                      .map((data, i) => {
                        const execution = getMatchedExecution(data);
                        return (
                          <div
                            key={i}
                            className="p-3 bg-gray-800/50 rounded-lg border border-green-500/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{data.contentSnippet}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  → Matched to: {execution?.content.slice(0, 50)}...
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                                  {data.score}
                                </p>
                                <p className="text-xs text-gray-500">score</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                              {data.metrics.impressions !== undefined && (
                                <span>{data.metrics.impressions.toLocaleString()} impressions</span>
                              )}
                              {data.metrics.reactions !== undefined && (
                                <span>{data.metrics.reactions} reactions</span>
                              )}
                              {data.metrics.openRate !== undefined && (
                                <span>{data.metrics.openRate.toFixed(1)}% open rate</span>
                              )}
                              {data.metrics.clickRate !== undefined && (
                                <span>{data.metrics.clickRate.toFixed(1)}% click rate</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Unmatched entries */}
              {importedData.filter((data) => !getMatchedExecution(data)).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Unmatched Entries ({importedData.length - matches.size})
                  </h4>
                  <div className="space-y-2 opacity-60">
                    {importedData
                      .filter((data) => !getMatchedExecution(data))
                      .slice(0, 5)
                      .map((data, i) => (
                        <div key={i} className="p-3 bg-gray-800/30 rounded-lg">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-gray-400 truncate flex-1">
                              {data.contentSnippet}
                            </p>
                            <p className={`text-sm font-medium ml-4 ${getScoreColor(data.score)}`}>
                              {data.score}
                            </p>
                          </div>
                        </div>
                      ))}
                    {importedData.filter((data) => !getMatchedExecution(data)).length > 5 && (
                      <p className="text-xs text-gray-600 text-center">
                        +{importedData.filter((data) => !getMatchedExecution(data)).length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex justify-between items-center">
          <span className="text-xs text-gray-600">
            {matches.size > 0
              ? `${matches.size} execution(s) will be updated with performance data`
              : 'No matches found yet'}
          </span>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={matches.size === 0}
              className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded hover:bg-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import {matches.size} Match{matches.size !== 1 ? 'es' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
