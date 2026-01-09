import { useState, useEffect } from 'react';
import { Gear, Copy, ArrowClockwise, Check, Trash, Download, Warning, Terminal, Smiley, Lightbulb, MaskHappy, Heart, SealQuestion, SmileySad } from '@phosphor-icons/react';

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

const DEFAULT_RULES = `Reply in 1-2 casual sentences only. Be brief. Sound human. No advice essays. No "I understand". No em dashes. Just a quick friendly reaction like "damn thats rough, hope it works out" or "honestly id just ignore them at this point"`;

const SUGGESTED_MODELS = ['llama3.2:3b'];

interface StyleOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  promptAdd: string;
  promptRemove?: string;
}

const STYLE_OPTIONS: { id: string; label: string; Icon: typeof Smiley; promptAdd: string; promptRemove?: string }[] = [
  { id: 'emoji', label: 'Emojis', Icon: Smiley, promptAdd: 'Use 1-2 relevant emojis', promptRemove: 'No emojis' },
  { id: 'advice', label: 'Advice', Icon: Lightbulb, promptAdd: 'Give helpful advice', promptRemove: 'No advice' },
  { id: 'joke', label: 'Joking', Icon: MaskHappy, promptAdd: 'Be funny and make a joke', promptRemove: '' },
  { id: 'supportive', label: 'Supportive', Icon: Heart, promptAdd: 'Be warm and supportive', promptRemove: '' },
  { id: 'sarcastic', label: 'Sarcastic', Icon: SmileySad, promptAdd: 'Be slightly sarcastic', promptRemove: '' },
  { id: 'question', label: 'Question', Icon: SealQuestion, promptAdd: 'End with a question to engage', promptRemove: '' },
];

function AIPage() {
  const [mode, setMode] = useState<'post' | 'comment'>('post');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [commentText, setCommentText] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeStyles, setActiveStyles] = useState<string[]>([]);

  // Settings state
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b');
  const [customRules, setCustomRules] = useState(DEFAULT_RULES);
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [isInstallingOllama, setIsInstallingOllama] = useState(false);
  const [ollamaInstallStatus, setOllamaInstallStatus] = useState('');

  // Load settings from localStorage
  useEffect(() => {
    const savedModel = localStorage.getItem('ai-selected-model');
    const savedRules = localStorage.getItem('ai-custom-rules');
    if (savedModel) setSelectedModel(savedModel);
    if (savedRules) setCustomRules(savedRules);

    checkOllamaStatus();
    loadInstalledModels();
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('ai-selected-model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('ai-custom-rules', customRules);
  }, [customRules]);

  const checkOllamaStatus = async () => {
    try {
      const running = await window.electronAPI?.ollamaIsRunning();
      setOllamaRunning(running ?? false);
      if (running) {
        setOllamaInstallStatus('');
      }
    } catch {
      setOllamaRunning(false);
    }
  };

  const handleInstallOllama = async () => {
    setIsInstallingOllama(true);
    setOllamaInstallStatus('Starting...');

    // Listen for progress updates
    const cleanup = window.electronAPI?.onOllamaInstallProgress?.((progress: string) => {
      setOllamaInstallStatus(progress);
    });

    try {
      const result = await window.electronAPI?.installOllama();
      cleanup?.();

      if (result?.success) {
        setOllamaInstallStatus('');
        await checkOllamaStatus();
        await loadInstalledModels();
      } else {
        setOllamaInstallStatus(result?.error || 'Installation failed');
      }
    } catch (err) {
      cleanup?.();
      setOllamaInstallStatus('Installation failed');
    } finally {
      setIsInstallingOllama(false);
    }
  };

  const loadInstalledModels = async () => {
    try {
      const models = await window.electronAPI?.ollamaListModels();
      setInstalledModels(models || []);
    } catch {
      setInstalledModels([]);
    }
  };

  const toggleStyle = (styleId: string) => {
    setActiveStyles(prev =>
      prev.includes(styleId)
        ? prev.filter(id => id !== styleId)
        : [...prev, styleId]
    );
  };

  const buildSystemPrompt = () => {
    let prompt = customRules;

    // Add active style instructions
    const additions: string[] = [];
    const removals: string[] = [];

    STYLE_OPTIONS.forEach(option => {
      if (activeStyles.includes(option.id)) {
        additions.push(option.promptAdd);
      } else if (option.promptRemove) {
        removals.push(option.promptRemove);
      }
    });

    if (additions.length > 0) {
      prompt += '. ' + additions.join('. ');
    }
    if (removals.length > 0) {
      prompt += '. ' + removals.join('. ');
    }

    return prompt;
  };

  const handleGenerate = async () => {
    if (!postContent.trim()) return;
    if (!ollamaRunning) return;

    setIsGenerating(true);
    setResponse('');

    try {
      const systemPrompt = buildSystemPrompt();
      let userPrompt = '';

      if (mode === 'post') {
        userPrompt = `Write a reply to this Reddit post:

${postContent}

Generate a natural, human-like reply.`;
      } else {
        userPrompt = `Write a reply to this comment on a Reddit post:

Post: ${postContent}

Comment to reply to: ${commentText}

Generate a natural, human-like reply to the comment.`;
      }

      const result = await window.electronAPI?.ollamaGenerate(selectedModel, userPrompt, systemPrompt);
      setResponse(result || 'No response generated');
    } catch (err) {
      console.error('Generation error:', err);
      setResponse('Error: Failed to generate response. Make sure Ollama is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstallModel = async () => {
    if (!newModelName.trim() || isInstalling) return;

    setIsInstalling(true);
    setInstallProgress('Starting download...');

    try {
      await window.electronAPI?.ollamaPullModel(newModelName, (progress: string) => {
        setInstallProgress(progress);
      });
      await loadInstalledModels();
      setNewModelName('');
      setInstallProgress('');
    } catch (err) {
      console.error('Install error:', err);
      setInstallProgress('Failed to install model');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    try {
      await window.electronAPI?.ollamaDeleteModel(modelName);
      await loadInstalledModels();
      if (selectedModel === modelName && installedModels.length > 1) {
        const remaining = installedModels.filter(m => m.name !== modelName);
        if (remaining.length > 0) {
          setSelectedModel(remaining[0].name);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <main className="pl-4 pr-6 pb-6 flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 mt-2 px-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          AI
        </h1>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Generate Reddit replies
        </span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="ml-auto h-9 w-9 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{
            background: showSettings ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-tertiary)',
          }}
        >
          <Gear size={18} weight="bold" />
        </button>
      </div>

      {/* Ollama status warning */}
      {ollamaRunning === false && (
        <div
          className="flex items-center gap-3 px-4 py-3 mb-4 rounded-2xl"
          style={{ background: 'rgba(255, 159, 10, 0.15)' }}
        >
          <Warning size={20} weight="bold" style={{ color: 'var(--accent-orange)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--accent-orange)' }}>
              Ollama not running
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {ollamaInstallStatus || 'Install Ollama to use local AI models'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInstallOllama}
              disabled={isInstallingOllama}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
              style={{
                background: isInstallingOllama ? 'var(--chip-bg)' : 'var(--btn-primary-bg)',
                color: isInstallingOllama ? 'var(--text-tertiary)' : 'var(--btn-primary-color)'
              }}
            >
              {isInstallingOllama ? (
                <>
                  <div
                    className="w-3 h-3 border-2 border-current rounded-full"
                    style={{ borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}
                  />
                  Installing...
                </>
              ) : (
                <>
                  <Terminal size={12} weight="bold" />
                  Install
                </>
              )}
            </button>
            <button
              onClick={checkOllamaStatus}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)' }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-4 flex-1">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Mode Toggle */}
          <div
            className="flex p-1 rounded-full"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <button
              onClick={() => setMode('post')}
              className="flex-1 py-2 text-sm font-medium rounded-full transition-colors"
              style={{
                background: mode === 'post' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: mode === 'post' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              Reply to Post
            </button>
            <button
              onClick={() => setMode('comment')}
              className="flex-1 py-2 text-sm font-medium rounded-full transition-colors"
              style={{
                background: mode === 'comment' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: mode === 'comment' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              Reply to Comment
            </button>
          </div>

          {/* Style Chips */}
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((option) => {
              const isActive = activeStyles.includes(option.id);
              const IconComponent = option.Icon;
              return (
                <button
                  key={option.id}
                  onClick={() => toggleStyle(option.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5"
                  style={{
                    background: isActive
                      ? 'var(--accent-blue)'
                      : 'var(--bg-secondary)',
                    color: isActive
                      ? '#fff'
                      : 'var(--text-tertiary)',
                  }}
                >
                  <IconComponent size={14} weight={isActive ? 'fill' : 'regular'} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Input Fields */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Post Content
              </label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Enter the post content if any..."
                rows={3}
                className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                }}
              />
            </div>

            {mode === 'comment' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Comment to Reply
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Enter the comment you want to reply to..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm rounded-xl outline-none resize-none"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!postContent.trim() || isGenerating || !ollamaRunning}
            className="w-full py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: !postContent.trim() || isGenerating || !ollamaRunning
                ? 'var(--chip-bg)'
                : 'var(--btn-primary-bg)',
              color: !postContent.trim() || isGenerating || !ollamaRunning
                ? 'var(--text-tertiary)'
                : 'var(--btn-primary-color)',
              cursor: !postContent.trim() || isGenerating || !ollamaRunning
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            {isGenerating ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-current rounded-full"
                  style={{
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                Generating...
              </>
            ) : (
              'Generate Reply'
            )}
          </button>

          {/* Response Area */}
          {response && (
            <div
              className="flex-1 rounded-2xl p-4"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Generated Reply
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="p-2 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Regenerate"
                  >
                    <ArrowClockwise size={16} weight="bold" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: copied ? 'var(--accent-green)' : 'var(--text-tertiary)' }}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {response}
              </p>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div
            className="w-72 rounded-2xl p-4 flex flex-col gap-4"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h3>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg outline-none appearance-none cursor-pointer"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                }}
              >
                {installedModels.length > 0 ? (
                  installedModels.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))
                ) : (
                  <option value={selectedModel}>{selectedModel}</option>
                )}
              </select>
            </div>

            {/* Installed Models */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Installed Models
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {installedModels.length > 0 ? (
                  installedModels.map((model) => (
                    <div
                      key={model.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: 'var(--bg-primary)' }}
                    >
                      <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                        {model.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-quaternary)' }}>
                        {formatSize(model.size)}
                      </span>
                      <button
                        onClick={() => handleDeleteModel(model.name)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <Trash size={12} weight="bold" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs py-2" style={{ color: 'var(--text-quaternary)' }}>
                    No models installed
                  </p>
                )}
              </div>
            </div>

            {/* Install Model */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Install Model
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="Model name..."
                  className="flex-1 h-8 px-3 text-xs rounded-lg outline-none"
                  style={{
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                  }}
                />
                <button
                  onClick={handleInstallModel}
                  disabled={!newModelName.trim() || isInstalling || !ollamaRunning}
                  className="h-8 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: newModelName.trim() && !isInstalling && ollamaRunning
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(142, 142, 147, 0.12)',
                    color: newModelName.trim() && !isInstalling && ollamaRunning
                      ? 'var(--text-primary)'
                      : 'var(--text-tertiary)',
                  }}
                >
                  <Download size={14} weight="bold" />
                </button>
              </div>
              {installProgress && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--accent-blue)' }}>
                  {installProgress}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {SUGGESTED_MODELS.map((model) => (
                  <button
                    key={model}
                    onClick={() => setNewModelName(model)}
                    className="px-2 py-0.5 rounded-full text-[10px] transition-colors hover:bg-white/10"
                    style={{
                      background: 'rgba(142, 142, 147, 0.12)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Rules */}
            <div className="flex-1 flex flex-col">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Custom Rules
              </label>
              <textarea
                value={customRules}
                onChange={(e) => setCustomRules(e.target.value)}
                placeholder="One rule per line..."
                className="flex-1 min-h-[100px] px-3 py-2 text-xs rounded-lg outline-none resize-none"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                }}
              />
              <button
                onClick={() => setCustomRules(DEFAULT_RULES)}
                className="mt-2 text-xs transition-colors hover:underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Reset to defaults
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

export default AIPage;
