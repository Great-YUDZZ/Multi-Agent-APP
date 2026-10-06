import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Users, 
  Star, 
  Search, 
  ShieldAlert, 
  Sun, 
  Database, 
  Keyboard,
  Server,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile, ProviderConfig, ProviderType, ProviderCategory, Agent } from '../types';
import { ProviderRegistry } from '../llm/ProviderRegistry';
import { ProviderStore } from '../storage/ProviderStore';
import { AgentStore } from '../storage/AgentStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

type SettingsTab = 
  | 'providers' 
  | 'agents' 
  | 'skills' 
  | 'retrieval' 
  | 'experimental' 
  | 'appearance' 
  | 'data-privacy' 
  | 'shortcuts';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
  const [nameInput, setNameInput] = useState(userProfile.displayName);

  const tabs = [
    { id: 'providers', label: 'Providers', icon: Layers },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'skills', label: 'Skills', icon: Star },
    { id: 'retrieval', label: 'Retrieval', icon: Search },
    { id: 'experimental', label: 'Experimental Features', icon: ShieldAlert },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'data-privacy', label: 'Data & Privacy', icon: Database },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ];

  const [providers, setProviders] = useState<ProviderConfig[]>(() => {
    return ProviderStore.loadProviders();
  });
  const [agentsList, setAgentsList] = useState<Agent[]>(() => {
    return AgentStore.loadAgents();
  });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latencyMs?: number }>>({});

  // Add API Key Form State & Categories
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [sourceCategory, setSourceCategory] = useState<ProviderCategory>('endpoint');
  const [providerFilter, setProviderFilter] = useState<'all' | 'local' | 'endpoint'>('all');

  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<ProviderType>('openai-compatible');
  const [newBaseUrl, setNewBaseUrl] = useState('https://api.deepseek.com');
  const [newModel, setNewModel] = useState('deepseek-chat');
  const [newApiKey, setNewApiKey] = useState('');

  const selectSourceCategory = (cat: ProviderCategory) => {
    setSourceCategory(cat);
    if (cat === 'local') {
      applyLocalPreset('ollama');
    } else {
      applyEndpointPreset('deepseek');
    }
  };

  const applyLocalPreset = (preset: 'ollama' | 'lm-studio' | 'vllm' | 'custom-local') => {
    setSourceCategory('local');
    switch (preset) {
      case 'ollama':
        setNewLabel('Ollama (Lokal)');
        setNewType('openai-compatible');
        setNewBaseUrl('http://localhost:11434/v1');
        setNewModel('llama3.2');
        setNewApiKey('');
        break;
      case 'lm-studio':
        setNewLabel('LM Studio (Lokal)');
        setNewType('lm-studio');
        setNewBaseUrl('http://localhost:1234/v1');
        setNewModel('local-model');
        setNewApiKey('');
        break;
      case 'vllm':
        setNewLabel('vLLM Server Lokal');
        setNewType('openai-compatible');
        setNewBaseUrl('http://localhost:8000/v1');
        setNewModel('meta-llama/Llama-3-8B');
        setNewApiKey('');
        break;
      case 'custom-local':
        setNewLabel('Localhost Server');
        setNewType('openai-compatible');
        setNewBaseUrl('http://127.0.0.1:5000/v1');
        setNewModel('local-model');
        setNewApiKey('');
        break;
    }
  };

  const applyEndpointPreset = (preset: 'deepseek' | 'openrouter' | 'groq' | 'openai' | 'anthropic' | 'custom') => {
    setSourceCategory('endpoint');
    switch (preset) {
      case 'deepseek':
        setNewLabel('DeepSeek API');
        setNewType('openai-compatible');
        setNewBaseUrl('https://api.deepseek.com');
        setNewModel('deepseek-chat');
        break;
      case 'openrouter':
        setNewLabel('OpenRouter API');
        setNewType('openai-compatible');
        setNewBaseUrl('https://openrouter.ai/api/v1');
        setNewModel('auto');
        break;
      case 'groq':
        setNewLabel('Groq Fast API');
        setNewType('openai-compatible');
        setNewBaseUrl('https://api.groq.com/openai/v1');
        setNewModel('llama-3.3-70b-versatile');
        break;
      case 'openai':
        setNewLabel('OpenAI API');
        setNewType('openai-compatible');
        setNewBaseUrl('https://api.openai.com/v1');
        setNewModel('gpt-4o');
        break;
      case 'anthropic':
        setNewLabel('Anthropic Claude');
        setNewType('anthropic');
        setNewBaseUrl('https://api.anthropic.com/v1');
        setNewModel('claude-3-5-sonnet-20241022');
        break;
      case 'custom':
        setNewLabel('Custom Cloud Endpoint');
        setNewType('openai-compatible');
        setNewBaseUrl('https://api.yourdomain.com/v1');
        setNewModel('custom-model');
        break;
    }
  };

  const handleSaveNewProvider = () => {
    if (!newLabel.trim()) return;

    const newProvider: ProviderConfig = {
      id: `prov-${Date.now()}`,
      category: sourceCategory,
      label: newLabel.trim(),
      providerType: newType,
      baseUrl: newBaseUrl.trim(),
      model: newModel.trim() || 'default-model',
      apiKey: newApiKey.trim(),
    };

    const updated = ProviderStore.addProvider(newProvider);
    setProviders(updated);
    setIsAddingKey(false);
    setNewLabel('');
    setNewApiKey('');
  };

  const handleDeleteProvider = (id: string) => {
    const updated = ProviderStore.deleteProvider(id);
    setProviders(updated);
  };

  const handleTestConnection = async (providerConfig: ProviderConfig) => {
    setTestingId(providerConfig.id);
    const instance = ProviderRegistry.createFromConfig(providerConfig);
    const result = await instance.testConnection();
    setTestResults((prev) => ({ ...prev, [providerConfig.id]: result }));
    setTestingId(null);
  };

  const handleUpdateProvider = (id: string, updated: Partial<ProviderConfig>) => {
    const res = ProviderStore.updateProvider(id, updated);
    setProviders(res);
  };

  const handleNameBlur = () => {
    onUpdateProfile({ displayName: nameInput });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-4xl h-[620px] bg-[#252526] border border-[#3c3c3c] rounded shadow-2xl flex flex-col overflow-hidden select-none"
          >
            {/* Header (VS Code Settings Header) */}
            <div className="h-10 border-b border-[#2d2d2d] flex items-center justify-between px-4 bg-[#1f1f1f]">
              <span className="text-xs font-semibold text-[#cccccc]">Settings — Preferences</span>
              <button
                onClick={onClose}
                className="text-[#858585] hover:text-white p-1 rounded hover:bg-[#2a2d2e] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body: Sidebar + Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar */}
              <div className="w-52 border-r border-[#2d2d2d] p-2 space-y-0.5 bg-[#252526]">
                <div className="text-[10px] font-bold text-[#858585] uppercase tracking-wider px-2 py-1">
                  CATEGORIES
                </div>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-[#37373d] text-white font-medium border-l-2 border-[#007acc]'
                          : 'text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-[#007acc]' : 'text-[#858585]'} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right Content Pane (VS Code Editor Surface) */}
              <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e]">
                {activeTab === 'providers' && (
                  <div className="max-w-2xl space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-base font-semibold text-[#ffffff] mb-1">
                          API Keys & Providers
                        </h1>
                        <p className="text-xs text-[#858585]">
                          Pilih antara <strong>Local LLM</strong> (Ollama, LM Studio) atau <strong>API Key dari Suatu Endpoint</strong> (DeepSeek, Groq, OpenRouter, cloud/custom URL).
                        </p>
                      </div>

                      {!isAddingKey && (
                        <button
                          onClick={() => {
                            setIsAddingKey(true);
                            selectSourceCategory('endpoint');
                          }}
                          className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white text-xs font-medium rounded shadow transition-colors"
                        >
                          + Tambahkan API Key
                        </button>
                      )}
                    </div>

                    {/* Add API Key Form Card */}
                    {isAddingKey && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#252526] border-2 border-[#007acc] rounded p-4 space-y-4 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-[#333333] pb-2">
                          <span className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
                            Tambah Sumber LLM / API Key
                          </span>
                          <button
                            onClick={() => setIsAddingKey(false)}
                            className="text-[#858585] hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Dua Pilihan Utama: Local LLM vs API Key Endpoint */}
                        <div>
                          <label className="block text-[11px] text-[#858585] mb-1.5 font-bold uppercase tracking-wider">
                            PILIH TIPE SUMBER:
                          </label>
                          <div className="grid grid-cols-2 gap-2.5">
                            {/* Option 1: Local LLM */}
                            <button
                              type="button"
                              onClick={() => selectSourceCategory('local')}
                              className={`p-3 rounded border text-left flex items-start gap-3 transition-all ${
                                sourceCategory === 'local'
                                  ? 'bg-[#1b2f3d] border-[#007acc] ring-1 ring-[#007acc]'
                                  : 'bg-[#1e1e1e] border-[#333333] hover:border-[#555555]'
                              }`}
                            >
                              <div className={`p-2 rounded shrink-0 ${sourceCategory === 'local' ? 'bg-[#007acc]/20 text-[#4ec9b0]' : 'bg-[#252526] text-[#858585]'}`}>
                                <Server size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">Local LLM</span>
                                  {sourceCategory === 'local' && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#007acc] text-white rounded font-bold">Dipilih</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#858585] mt-1 leading-snug">
                                  Model lokal (Ollama, LM Studio, vLLM, localhost). Bebas biaya token, API key opsional.
                                </p>
                              </div>
                            </button>

                            {/* Option 2: API Key dari Suatu Endpoint */}
                            <button
                              type="button"
                              onClick={() => selectSourceCategory('endpoint')}
                              className={`p-3 rounded border text-left flex items-start gap-3 transition-all ${
                                sourceCategory === 'endpoint'
                                  ? 'bg-[#1b2f3d] border-[#007acc] ring-1 ring-[#007acc]'
                                  : 'bg-[#1e1e1e] border-[#333333] hover:border-[#555555]'
                              }`}
                            >
                              <div className={`p-2 rounded shrink-0 ${sourceCategory === 'endpoint' ? 'bg-[#007acc]/20 text-[#569cd6]' : 'bg-[#252526] text-[#858585]'}`}>
                                <Globe size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">API Key dari Suatu Endpoint</span>
                                  {sourceCategory === 'endpoint' && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#007acc] text-white rounded font-bold">Dipilih</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#858585] mt-1 leading-snug">
                                  API Key online / cloud endpoint (DeepSeek, OpenRouter, Groq, OpenAI, Anthropic, Custom URL).
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Presets Quick Fill */}
                        <div>
                          <label className="block text-[11px] text-[#858585] mb-1 font-semibold">
                            {sourceCategory === 'local' ? 'Preset Server Lokal:' : 'Preset Cloud Provider:'}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {sourceCategory === 'local' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('ollama')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  Ollama (11434)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('lm-studio')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  LM Studio (1234)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('vllm')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  Local vLLM (8000)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('custom-local')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  Custom Localhost
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('deepseek')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  DeepSeek
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('openrouter')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  OpenRouter
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('groq')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  Groq
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('openai')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  OpenAI
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('anthropic')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  Anthropic
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('custom')}
                                  className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded text-[11px] text-[#cccccc]"
                                >
                                  Custom Endpoint
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Name / Label Field */}
                        <div>
                          <label className="block text-[11px] text-[#858585] mb-1 font-semibold">
                            {sourceCategory === 'local' ? 'Nama Local LLM / Label:' : 'Nama API Key / Label:'}
                          </label>
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder={sourceCategory === 'local' ? 'Contoh: Ollama Llama 3.2, LM Studio Qwen' : 'Contoh: DeepSeek Utama, Groq Personal, Endpoint Tim'}
                            className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded"
                          />
                        </div>

                        {/* Format / Protocol & Model */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-[#858585] mb-1 font-semibold">
                              Format / Protokol
                            </label>
                            <select
                              value={newType}
                              onChange={(e) => setNewType(e.target.value as ProviderType)}
                              className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded"
                            >
                              <option value="openai-compatible">OpenAI-Compatible (Ollama, DeepSeek, Groq, dll)</option>
                              <option value="anthropic">Anthropic Messages API</option>
                              <option value="lm-studio">LM Studio Native</option>
                              <option value="custom">Custom Endpoint</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-[#858585] mb-1 font-semibold">
                              Nama Model (Model ID)
                            </label>
                            <input
                              type="text"
                              value={newModel}
                              onChange={(e) => setNewModel(e.target.value)}
                              placeholder={sourceCategory === 'local' ? 'mis. llama3.2, qwen2.5-coder' : 'mis. deepseek-chat, gpt-4o, llama-3.3'}
                              className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded font-mono"
                            />
                          </div>
                        </div>

                        {/* Base URL */}
                        <div>
                          <label className="block text-[11px] text-[#858585] mb-1 font-semibold">
                            {sourceCategory === 'local' ? 'Base URL Localhost:' : 'Base URL Endpoint:'}
                          </label>
                          <input
                            type="text"
                            value={newBaseUrl}
                            onChange={(e) => setNewBaseUrl(e.target.value)}
                            placeholder={sourceCategory === 'local' ? 'http://localhost:11434/v1' : 'https://api...'}
                            className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded font-mono"
                          />
                        </div>

                        {/* API Key */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] text-[#858585] font-semibold">
                              {sourceCategory === 'local' ? 'API Key (Opsional untuk Localhost):' : 'API Key (Token Rahasia - Wajib):'}
                            </label>
                            {sourceCategory === 'local' && (
                              <span className="text-[10px] text-[#4ec9b0]">Boleh kosong jika server lokal tanpa password</span>
                            )}
                          </div>
                          <input
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder={sourceCategory === 'local' ? 'Kosongkan jika tidak memerlukan token autentikasi' : 'Masukkan API Key (sk-...)'}
                            className="w-full px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded font-mono"
                          />
                        </div>

                        {/* Save / Cancel buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#333333]">
                          <button
                            type="button"
                            onClick={() => setIsAddingKey(false)}
                            className="px-3 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-xs text-[#cccccc] rounded"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewProvider}
                            disabled={!newLabel.trim()}
                            className="px-4 py-1 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#333333] disabled:text-[#666666] text-white text-xs font-semibold rounded shadow"
                          >
                            Simpan API Key
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Filter Bar: Semua | Local LLM | Endpoint */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-[#333333]">
                      <button
                        onClick={() => setProviderFilter('all')}
                        className={`px-2.5 py-1 text-xs rounded transition-colors ${
                          providerFilter === 'all'
                            ? 'bg-[#37373d] text-white font-semibold'
                            : 'text-[#858585] hover:text-white'
                        }`}
                      >
                        Semua ({providers.length})
                      </button>
                      <button
                        onClick={() => setProviderFilter('local')}
                        className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
                          providerFilter === 'local'
                            ? 'bg-[#1e3a2f] text-[#4ec9b0] font-semibold border border-[#265946]'
                            : 'text-[#858585] hover:text-[#4ec9b0]'
                        }`}
                      >
                        <Server size={12} /> Local LLM ({providers.filter((p) => p.category === 'local').length})
                      </button>
                      <button
                        onClick={() => setProviderFilter('endpoint')}
                        className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
                          providerFilter === 'endpoint'
                            ? 'bg-[#1e2d3d] text-[#569cd6] font-semibold border border-[#1b4368]'
                            : 'text-[#858585] hover:text-[#569cd6]'
                        }`}
                      >
                        <Globe size={12} /> Cloud Endpoint ({providers.filter((p) => p.category !== 'local').length})
                      </button>
                    </div>

                    {/* Configured API Keys List */}
                    <div className="space-y-3">
                      {providers
                        .filter((p) => {
                          if (providerFilter === 'all') return true;
                          if (providerFilter === 'local') return p.category === 'local';
                          if (providerFilter === 'endpoint') return p.category !== 'local';
                          return true;
                        })
                        .map((p) => {
                          const result = testResults[p.id];
                          const isTesting = testingId === p.id;
                          const isLocal = p.category === 'local';

                          return (
                            <div
                              key={p.id}
                              className="bg-[#252526] border border-[#333333] rounded p-3.5 space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 mr-2">
                                  {isLocal ? (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1e3a2f] text-[#4ec9b0] rounded border border-[#265946] flex items-center gap-1 shrink-0 font-bold">
                                      <Server size={10} /> LOCAL LLM
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1e2d3d] text-[#569cd6] rounded border border-[#1b4368] flex items-center gap-1 shrink-0 font-bold">
                                      <Globe size={10} /> ENDPOINT
                                    </span>
                                  )}

                                  <input
                                    type="text"
                                    value={p.label}
                                    onChange={(e) => handleUpdateProvider(p.id, { label: e.target.value })}
                                    placeholder="Nama API Key..."
                                    className="bg-transparent hover:bg-[#1e1e1e] focus:bg-[#1e1e1e] border border-transparent focus:border-[#007fd4] hover:border-[#333333] px-1.5 py-0.5 rounded text-xs font-semibold text-[#ffffff] outline-none max-w-[200px]"
                                    title="Klik untuk mengubah nama API Key"
                                  />
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1e1e1e] text-[#9cdcfe] rounded border border-[#333333] uppercase shrink-0">
                                    {p.providerType}
                                  </span>
                                </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleTestConnection(p)}
                                  disabled={isTesting}
                                  className="px-2.5 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-xs font-medium text-[#cccccc] hover:text-white rounded border border-[#3c3c3c] transition-colors"
                                >
                                  {isTesting ? 'Menguji...' : 'Uji Koneksi'}
                                </button>

                                {providers.length > 1 && (
                                  <button
                                    onClick={() => handleDeleteProvider(p.id)}
                                    title="Hapus API Key"
                                    className="p-1 text-[#858585] hover:text-[#ce9178] hover:bg-[#382626] rounded transition-colors"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-[#858585] block">Model:</span>
                                <input
                                  type="text"
                                  value={p.model}
                                  onChange={(e) => handleUpdateProvider(p.id, { model: e.target.value })}
                                  className="w-full bg-[#1e1e1e] border border-[#333333] px-2 py-1 rounded text-xs text-[#9cdcfe] font-mono"
                                />
                              </div>

                              <div>
                                <span className="text-[10px] text-[#858585] block">Base URL:</span>
                                <input
                                  type="text"
                                  value={p.baseUrl || ''}
                                  onChange={(e) => handleUpdateProvider(p.id, { baseUrl: e.target.value })}
                                  className="w-full bg-[#1e1e1e] border border-[#333333] px-2 py-1 rounded text-xs text-[#cccccc] font-mono"
                                />
                              </div>
                            </div>

                            {p.providerType !== 'lm-studio' && (
                              <div>
                                <span className="text-[10px] text-[#858585] block mb-0.5">API Key:</span>
                                <input
                                  type="password"
                                  value={p.apiKey || ''}
                                  placeholder="sk-..."
                                  onChange={(e) => handleUpdateProvider(p.id, { apiKey: e.target.value })}
                                  className="w-full px-2.5 py-1 bg-[#1e1e1e] border border-[#333333] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded font-mono"
                                />
                              </div>
                            )}

                            {result && (
                              <div
                                className={`text-xs px-2.5 py-1.5 rounded flex items-center justify-between ${
                                  result.success
                                    ? 'bg-[#1e3a2f] text-[#4ec9b0] border border-[#265946]'
                                    : 'bg-[#3b2020] text-[#ce9178] border border-[#593030]'
                                }`}
                              >
                                <span>{result.message}</span>
                                {result.latencyMs !== undefined && (
                                  <span className="font-mono text-[11px]">
                                    {result.latencyMs}ms
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="max-w-2xl space-y-6">
                    <div>
                      <h1 className="text-base font-semibold text-[#ffffff] mb-1">Appearance</h1>
                      <p className="text-xs text-[#858585]">
                        Atur nama panggilan, tema warna, dan tampilan antarmuka percakapan.
                      </p>
                    </div>

                    {/* Section: PROFIL */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">
                        PROFIL
                      </div>
                      <div className="bg-[#252526] border border-[#333333] rounded p-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-[#ffffff]">Nama Panggilan</div>
                          <div className="text-[11px] text-[#858585]">
                            Nama ini dipakai semua agent saat menyapamu dalam percakapan.
                          </div>
                        </div>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          onBlur={handleNameBlur}
                          className="w-40 px-2 py-1 bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded text-right"
                        />
                      </div>
                    </div>

                    {/* Section: TEMA */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">
                        TEMA
                      </div>
                      <div className="bg-[#252526] border border-[#333333] rounded p-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-[#ffffff]">Mode Warna</div>
                          <div className="text-[11px] text-[#858585]">
                            Pilih tampilan terang atau gelap (VS Code Dark Modern aktif).
                          </div>
                        </div>
                        <div className="flex bg-[#1e1e1e] border border-[#333333] p-0.5 rounded text-xs">
                          <button
                            onClick={() => onUpdateProfile({ theme: 'light' })}
                            className={`px-3 py-1 rounded transition-colors ${
                              userProfile.theme === 'light'
                                ? 'bg-[#0e639c] text-white font-medium'
                                : 'text-[#858585] hover:text-white'
                            }`}
                          >
                            Light
                          </button>
                          <button
                            onClick={() => onUpdateProfile({ theme: 'dark' })}
                            className={`px-3 py-1 rounded transition-colors ${
                              userProfile.theme === 'dark'
                                ? 'bg-[#0e639c] text-white font-medium'
                                : 'text-[#858585] hover:text-white'
                            }`}
                          >
                            Dark Modern
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section: PERCAKAPAN */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">
                        PERCAKAPAN
                      </div>
                      <div className="bg-[#252526] border border-[#333333] rounded p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-[#ffffff]">Ukuran Font Chat</div>
                            <div className="text-[11px] text-[#858585]">
                              Sesuaikan ukuran teks di area percakapan.
                            </div>
                          </div>
                          <select
                            value={userProfile.fontSize}
                            onChange={(e) =>
                              onUpdateProfile({
                                fontSize: e.target.value as 'Kecil' | 'Sedang' | 'Besar',
                              })
                            }
                            className="bg-[#3c3c3c] border border-[#3c3c3c] focus:border-[#007fd4] text-xs text-[#cccccc] px-2.5 py-1 rounded outline-none cursor-pointer"
                          >
                            <option value="Kecil">Kecil (12px)</option>
                            <option value="Sedang">Sedang (13px)</option>
                            <option value="Besar">Besar (15px)</option>
                          </select>
                        </div>

                        <div className="border-t border-[#333333] pt-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-[#ffffff]">Animasi Mengetik</div>
                            <div className="text-[11px] text-[#858585]">
                              Tampilkan indikator titik-titik saat agent sedang memproses respons.
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              onUpdateProfile({
                                typingAnimation: !userProfile.typingAnimation,
                              })
                            }
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                              userProfile.typingAnimation ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                                userProfile.typingAnimation ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'agents' && (
                  <div className="max-w-2xl space-y-4">
                    <div>
                      <h1 className="text-base font-semibold text-[#ffffff] mb-1">
                        Registry Agen
                      </h1>
                      <p className="text-xs text-[#858585]">
                        Kelola persona, instruksi, dan tautkan masing-masing agen ke model/provider LLM (Local LLM atau Cloud Endpoint).
                      </p>
                    </div>

                    <div className="space-y-3">
                      {agentsList.map((agent) => (
                        <div
                          key={agent.id}
                          className="bg-[#252526] border border-[#333333] rounded p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs shadow-sm"
                                style={{ backgroundColor: agent.color }}
                              >
                                {agent.initial}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-white">{agent.name}</div>
                                <div className="text-[11px] text-[#858585]">{agent.role}</div>
                              </div>
                            </div>

                            {/* Model / Provider Dropdown */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#858585]">Model:</span>
                              <select
                                value={agent.llmProviderId}
                                onChange={(e) => {
                                  const updated = AgentStore.updateAgent(agent.id, {
                                    llmProviderId: e.target.value,
                                  });
                                  setAgentsList(updated);
                                }}
                                className="bg-[#1e1e1e] border border-[#333333] px-2 py-1 rounded text-xs text-[#9cdcfe] outline-none max-w-[200px]"
                              >
                                {providers.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.category === 'local' ? '🖥️' : '🌐'} {p.label} ({p.model})
                                  </option>
                                ))}
                                <option value="mock-offline">Simulasi Offline (Mock)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-[#858585] block mb-1">Instruksi Persona:</span>
                            <textarea
                              rows={2}
                              value={agent.instructions}
                              onChange={(e) => {
                                const updated = AgentStore.updateAgent(agent.id, {
                                  instructions: e.target.value,
                                });
                                setAgentsList(updated);
                              }}
                              className="w-full bg-[#1e1e1e] border border-[#333333] p-2 rounded text-xs text-[#cccccc] outline-none resize-none font-sans"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab !== 'appearance' && activeTab !== 'providers' && activeTab !== 'agents' && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[#858585]">
                    <div className="text-sm font-semibold text-[#cccccc] mb-1">
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </div>
                    <div className="text-xs max-w-sm">
                      Kategori ini siap diintegrasikan pada fase lanjutan (Obsidian Vault, Granular Permissions, Shortcuts).
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
