import { useState, useEffect, useCallback } from 'react';
import { Swap, FolderSimple, X, CloudArrowUp, File, VideoCamera, Image } from '@phosphor-icons/react';
import { useLanguage } from '../i18n';

interface FileItem {
  path: string;
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
}

function FlipperPage() {
  const { t } = useLanguage();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    // Listen for progress updates
    const cleanup = window.electronAPI?.onFlipperProgress?.((progress: any) => {
      setFiles(prev => prev.map(f =>
        f.path === progress.file
          ? { ...f, status: progress.status, progress: progress.percent || 0, error: progress.error }
          : f
      ));
    });

    return () => {
      cleanup?.();
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).map(f => f.path);
    const validFiles = await window.electronAPI?.getDroppedFiles?.(droppedFiles) || [];
    addFiles(validFiles);
  }, []);

  const handleSelectFiles = async () => {
    const selectedFiles = await window.electronAPI?.selectFlipperFiles?.() || [];
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles: string[]) => {
    setFiles(prev => {
      const existingPaths = new Set(prev.map(f => f.path));
      const newItems = newFiles
        .filter(path => !existingPaths.has(path))
        .map(path => ({
          path,
          name: path.split(/[\\/]/).pop() || path,
          status: 'pending' as const,
          progress: 0
        }));
      return [...prev, ...newItems];
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI?.selectOutputFolder?.();
    if (folder) {
      setOutputFolder(folder);
    }
  };

  const handleFlip = async () => {
    if (isProcessing || files.length === 0 || !outputFolder) return;

    setIsProcessing(true);

    // Reset all files to pending
    setFiles(prev => prev.map(f => ({ ...f, status: 'pending' as const, progress: 0 })));

    try {
      const filePaths = files.map(f => f.path);
      const results = await window.electronAPI?.processFlipperFiles?.(filePaths, outputFolder) || [];

      // Update file statuses based on results
      setFiles(prev => prev.map((f, index) => ({
        ...f,
        status: results[index]?.success ? 'done' : 'error',
        error: results[index]?.error
      })));
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mp4', 'mov', 'mkv', 'avi', 'webm'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

    if (videoExts.includes(ext)) return <VideoCamera size={16} weight="bold" />;
    if (imageExts.includes(ext)) return <Image size={16} weight="bold" />;
    return <File size={16} weight="bold" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'var(--accent-green)';
      case 'error': return 'var(--accent-red)';
      case 'processing': return 'var(--accent-blue)';
      default: return 'var(--text-tertiary)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return t('flipper.done');
      case 'error': return t('flipper.error');
      default: return t('flipper.pending');
    }
  };

  const overallProgress = files.length > 0
    ? files.reduce((acc, f) => {
        if (f.status === 'done' || f.status === 'error') return acc + 100;
        if (f.status === 'processing') return acc + f.progress;
        return acc;
      }, 0) / files.length
    : 0;

  return (
    <main className="pl-4 pr-6 pb-6 flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('flipper.title')}
        </h1>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {t('flipper.subtitle')}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        className={`rounded-3xl p-8 text-center transition-all cursor-pointer ${files.length > 0 ? 'py-4' : ''}`}
        style={{
          background: isDragOver ? 'rgba(10, 132, 255, 0.1)' : 'var(--bg-secondary)',
          border: `2px dashed ${isDragOver ? 'var(--accent-blue)' : 'var(--border-light)'}`,
          borderRadius: '34px',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFiles}
      >
        <CloudArrowUp
          size={files.length > 0 ? 24 : 40}
          weight="light"
          color={isDragOver ? 'var(--accent-blue)' : 'var(--text-tertiary)'}
          className="mx-auto mb-2"
        />
        <p className="text-sm" style={{ color: isDragOver ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
          {files.length > 0 ? t('flipper.dropMoreFiles') : t('flipper.dropFilesOrClick')}
        </p>
        {files.length === 0 && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {t('flipper.supportedFormats')}
          </p>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {files.length === 1
                ? t('flipper.filesSelected', { count: files.length })
                : t('flipper.filesSelectedPlural', { count: files.length })}
            </span>
            {!isProcessing && (
              <button
                onClick={(e) => { e.stopPropagation(); clearFiles(); }}
                className="text-xs px-3 py-1 rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('flipper.clearAll')}
              </button>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto space-y-2 max-h-[300px]"
            style={{ borderRadius: '20px' }}
          >
            {files.map((file, index) => (
              <div
                key={file.path}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                }}
              >
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'rgba(142, 142, 147, 0.12)', color: 'var(--text-tertiary)' }}
                >
                  {getFileIcon(file.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }} title={file.path}>
                    {file.name}
                  </p>
                  {file.status === 'processing' && (
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(142, 142, 147, 0.12)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${file.progress}%`, background: 'var(--accent-blue)' }}
                      />
                    </div>
                  )}
                </div>
                {file.status !== 'processing' && (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: file.status === 'done' ? 'rgba(48, 209, 88, 0.15)'
                        : file.status === 'error' ? 'rgba(255, 69, 58, 0.15)'
                        : 'rgba(142, 142, 147, 0.12)',
                      color: getStatusColor(file.status)
                    }}
                  >
                    {getStatusLabel(file.status)}
                  </span>
                )}
                {!isProcessing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Section */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={(e) => { e.stopPropagation(); handleSelectFolder(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-colors hover:bg-white/10"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              <FolderSimple size={16} weight="bold" />
              {outputFolder ? t('flipper.changeFolder') : t('flipper.selectOutputFolder')}
            </button>
            {outputFolder && (
              <span className="text-xs truncate flex-1" style={{ color: 'var(--text-tertiary)' }}>
                {outputFolder}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t('flipper.processing')}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(142, 142, 147, 0.12)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${overallProgress}%`, background: 'var(--accent-blue)' }}
                />
              </div>
            </div>
          )}

          {/* Flip Button */}
          <button
            onClick={handleFlip}
            disabled={files.length === 0 || !outputFolder || isProcessing}
            className="w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: files.length === 0 || !outputFolder || isProcessing ? 'var(--chip-bg)' : 'var(--btn-primary-bg)',
              color: files.length === 0 || !outputFolder || isProcessing ? 'var(--text-tertiary)' : 'var(--btn-primary-color)',
              cursor: files.length === 0 || !outputFolder || isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            {isProcessing ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-current rounded-full"
                  style={{
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                {t('flipper.processing')}
              </>
            ) : (
              <>
                <Swap size={18} weight="bold" />
                {t('flipper.flipAll')}
              </>
            )}
          </button>
        </div>
      )}
    </main>
  );
}

export default FlipperPage;
