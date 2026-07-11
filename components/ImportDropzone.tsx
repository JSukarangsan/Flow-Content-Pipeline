import React, { useState, useCallback } from 'react';
import { fileWatcher } from '../services/fileWatcher';
import { importEvissaFromFile } from '../services/evissaImport';

interface ImportDropzoneProps {
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function ImportDropzone({ onClose, onImportSuccess }: ImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    setIsImporting(true);
    setImportStatus(null);

    try {
      let totalImported = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          // Try Evissa import first (for import-data.json format)
          console.log(`Attempting to import ${file.name}...`);

          // Read the file to check its format
          const content = await file.text();
          const data = JSON.parse(content);

          let result;

          // Check if it's Evissa format (has timestamp and ideas array with title/coreIdea)
          if (data.timestamp && data.ideas && data.ideas[0]?.title && data.ideas[0]?.coreIdea) {
            console.log('Detected Evissa format, using Evissa importer');
            result = await importEvissaFromFile(file);
          } else {
            console.log('Using standard fileWatcher importer');
            await fileWatcher.importFromFile(file);
            result = { success: true, imported: 1, failed: 0, errors: [] };
          }

          if (result.imported > 0) {
            totalImported += result.imported;
          }
          if (result.failed > 0) {
            totalFailed += result.failed;
            errors.push(...(result.errors || []));
          }

        } catch (error) {
          totalFailed++;
          const errorMsg = `Failed to import ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Show status based on results
      if (totalImported > 0 && totalFailed === 0) {
        setImportStatus({
          type: 'success',
          message: `Successfully imported ${totalImported} idea${totalImported > 1 ? 's' : ''}`
        });
        onImportSuccess?.();

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (totalImported > 0 && totalFailed > 0) {
        setImportStatus({
          type: 'error',
          message: `Imported ${totalImported} idea${totalImported > 1 ? 's' : ''}, ${totalFailed} failed`
        });
      } else {
        setImportStatus({
          type: 'error',
          message: errors[0] || `Failed to import file${files.length > 1 ? 's' : ''}`
        });
      }
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Import failed. Please check the file format.'
      });
    } finally {
      setIsImporting(false);
    }
  }, [onImportSuccess, onClose]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter((f: File) => f.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
      setImportStatus({ type: 'error', message: 'Please drop JSON files only' });
      return;
    }

    await processFiles(jsonFiles);
  }, [processFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  }, [processFiles]);

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 w-[600px] rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Import Ideas</h3>
            <p className="text-sm text-gray-500">Import ideas from Evissa or Claude Code JSON files</p>
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
        <div className="p-6">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center transition-all
              ${isDragging
                ? 'border-accent-500 bg-accent-500/10'
                : 'border-gray-700 hover:border-gray-600'
              }
              ${isImporting ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              type="file"
              accept=".json"
              multiple
              onChange={handleFileSelect}
              disabled={isImporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <svg
              className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-accent-500' : 'text-gray-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            {isImporting ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 animate-spin text-accent-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <p className="text-sm text-gray-400">Importing...</p>
              </div>
            ) : (
              <>
                <p className="text-gray-300 mb-2">
                  Drag and drop digest JSON files here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports Claude Code digest format (.json)
                </p>
              </>
            )}
          </div>

          {/* Status Message */}
          {importStatus && (
            <div
              className={`
                mt-4 p-3 rounded-lg text-sm
                ${importStatus.type === 'success'
                  ? 'bg-green-900/20 text-green-400 border border-green-900'
                  : 'bg-red-900/20 text-red-400 border border-red-900'
                }
              `}
            >
              {importStatus.message}
            </div>
          )}

          {/* Example Format */}
          <details className="mt-6">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
              View expected JSON formats
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-xs text-gray-500">Evissa Import Format:</p>
              <pre className="p-3 bg-gray-950 border border-gray-800 rounded text-xs text-gray-400 overflow-x-auto">
{`{
  "timestamp": "2025-02-20T10:30:00Z",
  "ideas": [
    {
      "title": "Idea Title",
      "coreIdea": "Full content of the idea...",
      "topic": "Strategy",
      "tags": ["tag1", "tag2"],
      "hooks": ["Hook 1", "Hook 2"],
      "source": {
        "type": "evissa",
        "title": "Source title"
      }
    }
  ]
}`}
              </pre>
              <p className="text-xs text-gray-500">Standard Digest Format:</p>
              <pre className="p-3 bg-gray-950 border border-gray-800 rounded text-xs text-gray-400 overflow-x-auto">
{`{
  "generated_at": "2025-02-20T10:30:00Z",
  "ideas": [
    {
      "id": "unique-id",
      "pillar": "Strategy Name",
      "gist": "Core insight in one sentence",
      "hooks": ["Hook 1", "Hook 2"],
      "source": {
        "type": "notion",
        "url": "https://...",
        "title": "Source title"
      },
      "content": "Full content...",
      "tags": ["tag1", "tag2"]
    }
  ]
}`}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}