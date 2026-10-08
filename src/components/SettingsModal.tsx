import React, { useState, useEffect } from 'react';
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
  Globe,
  BookOpen,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Cpu,
  Plus,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile, ProviderConfig, ProviderType, ProviderCategory, Agent } from '../types';
import { ProviderRegistry } from '../llm/ProviderRegistry';
import { ProviderStore } from '../storage/ProviderStore';
import { AgentStore } from '../storage/AgentStore';
import { ObsidianStore } from '../storage/ObsidianStore';
import { globalVaultManager } from '../obsidian/VaultManager';
import { selectFolderDialog, detectObsidianVaults, type DetectedVault } from '../tauri/fsBridge';
import { discoverModels } from '../llm/modelDiscovery';

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

  // Obsidian Vault State
  const [obsidianConfig, setObsidianConfig] = useState(() => ObsidianStore.loadConfig());
  const [detectedVaults, setDetectedVaults] = useState<DetectedVault[]>([]);
  const [isDetectingVaults, setIsDetectingVaults] = useState(false);
  const [isScanningVault, setIsScanningVault] = useState(false);
  const [obsidianStatusMsg, setObsidianStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !obsidianConfig.vaultPath) {
      detectObsidianVaults().then((v) => {
        if (v && v.length > 0) setDetectedVaults(v);
      }).catch(() => {});
    }
  }, [isOpen, obsidianConfig.vaultPath]);

  const handleAutoDetectVaults = async () => {
    setIsDetectingVaults(true);
    setObsidianStatusMsg(null);
    try {
      const vaults = await detectObsidianVaults();
      setDetectedVaults(vaults);
      if (vaults.length === 0) {
        setObsidianStatusMsg('Tidak ditemukan konfigurasi Obsidian di sistem. Silakan pilih folder manual.');
      } else {
        setObsidianStatusMsg(`Ditemukan ${vaults.length} Vault Obsidian di perangkat.`);
      }
    } catch (e: any) {
      setObsidianStatusMsg(`Gagal mendeteksi: ${e?.message || e}`);
    } finally {
      setIsDetectingVaults(false);
    }
  };

  const handleConnectVault = async (targetPath: string) => {
    setIsScanningVault(true);
    setObsidianStatusMsg(`Memindai berkas Markdown di "${targetPath}"...`);
    try {
      const notes = await globalVaultManager.scanVault(targetPath);
      const updated = ObsidianStore.saveConfig({
        vaultPath: targetPath,
        enabled: true,
        notesCache: notes,
        lastIndexedAt: Date.now(),
      });
      setObsidianConfig(updated);
      setObsidianStatusMsg(`Berhasil terhubung! ${notes.length} catatan terindeks.`);
    } catch (e: any) {
      setObsidianStatusMsg(`Gagal menghubungkan vault: ${e?.message || e}`);
    } finally {
      setIsScanningVault(false);
    }
  };

  const handleSelectVaultFolder = async () => {
    try {
      const selected = await selectFolderDialog();
      if (selected) {
        await handleConnectVault(selected);
      }
    } catch (e: any) {
      setObsidianStatusMsg(`Gagal memilih folder: ${e?.message || e}`);
    }
  };

  const handleRefreshVault = async () => {
    if (!obsidianConfig.vaultPath) return;
    setIsScanningVault(true);
    try {
      const notes = await globalVaultManager.scanVault(obsidianConfig.vaultPath);
      setObsidianConfig(ObsidianStore.loadConfig());
      setObsidianStatusMsg(`Penyegaran selesai! ${notes.length} catatan terindeks.`);
    } catch (e: any) {
      setObsidianStatusMsg(`Gagal menyegarkan: ${e?.message || e}`);
    } finally {
      setIsScanningVault(false);
    }
  };

  const handleDisconnectVault = () => {
    const updated = ObsidianStore.saveConfig({
      vaultPath: '',
      enabled: false,
      notesCache: [],
      lastIndexedAt: 0,
    });
    setObsidianConfig(updated);
    setObsidianStatusMsg('Koneksi Obsidian Vault diputuskan.');
  };

  // Add API Key Form State & Categories
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [sourceCategory, setSourceCategory] = useState<ProviderCategory>('endpoint');
  const [providerFilter, setProviderFilter] = useState<'all' | 'local' | 'endpoint'>('all');

  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<ProviderType>('openai-compatible');
  const [newBaseUrl, setNewBaseUrl] = useState('https://api.deepseek.com');
  const [newModel, setNewModel] = useState('deepseek-chat');
  const [newApiKey, setNewApiKey] = useState('');

  // Model Discovery & Multi-Model States
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveringId, setDiscoveringId] = useState<string | null>(null);
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState<boolean>(false);
  const [discoveryTargetProvider, setDiscoveryTargetProvider] = useState<ProviderConfig | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [discoverySearch, setDiscoverySearch] = useState<string>('');
  const [selectedDiscoveredModels, setSelectedDiscoveredModels] = useState<Set<string>>(new Set());
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryNotice, setDiscoveryNotice] = useState<string | null>(null);

  // Selected models during creation of new provider
  const [newDiscoveredSelected, setNewDiscoveredSelected] = useState<string[]>([]);

  // Inline manual model addition state
  const [addingModelToId, setAddingModelToId] = useState<string | null>(null);
  const [manualModelInput, setManualModelInput] = useState<string>('');

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
    setNewDiscoveredSelected([]);
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
    setNewDiscoveredSelected([]);
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

  const handleTriggerDiscovery = async (target: 'new' | ProviderConfig) => {
    const isNew = target === 'new';
    const providerType = isNew ? newType : target.providerType;
    const baseUrl = isNew ? newBaseUrl : target.baseUrl;
    const apiKey = isNew ? newApiKey : target.apiKey;
    const targetId = isNew ? 'new' : target.id;

    setIsDiscovering(true);
    setDiscoveringId(targetId);
    setDiscoveryError(null);
    setDiscoveryTargetProvider(isNew ? null : target);
    setDiscoverySearch('');

    const activeList = isNew
      ? (newDiscoveredSelected.length > 0 ? newDiscoveredSelected : [newModel].filter(Boolean))
      : (target.models && target.models.length > 0 ? target.models : [target.model]);
    setSelectedDiscoveredModels(new Set(activeList));

    try {
      const models = await discoverModels({ providerType, baseUrl, apiKey });
      setDiscoveredModels(models);
      setDiscoveryModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDiscoveryError(msg);
      setDiscoveredModels([]);
      setDiscoveryModalOpen(true);
    } finally {
      setIsDiscovering(false);
      setDiscoveringId(null);
    }
  };

  const handleApplyDiscoveredModels = () => {
    const selectedArray = Array.from(selectedDiscoveredModels);
    if (selectedArray.length === 0) return;

    if (discoveryTargetProvider) {
      const defaultModel = selectedArray.includes(discoveryTargetProvider.model)
        ? discoveryTargetProvider.model
        : selectedArray[0];

      const updated = ProviderStore.updateProvider(discoveryTargetProvider.id, {
        models: selectedArray,
        model: defaultModel,
        detectedModels: discoveredModels.length > 0 ? discoveredModels : discoveryTargetProvider.detectedModels,
      });
      setProviders(updated);
      setDiscoveryNotice(`${selectedArray.length} model aktif berhasil diperbarui untuk ${discoveryTargetProvider.label}`);
    } else {
      setNewModel(selectedArray[0]);
      setNewDiscoveredSelected(selectedArray);
      setDiscoveryNotice(`${selectedArray.length} model dipilih untuk provider baru`);
    }

    setDiscoveryModalOpen(false);
  };

  const handleSetDefaultModel = (providerId: string, modelName: string) => {
    const updated = ProviderStore.updateProvider(providerId, { model: modelName });
    setProviders(updated);
  };

  const handleRemoveModelFromProvider = (providerId: string, modelName: string) => {
    const target = providers.find((p) => p.id === providerId);
    if (!target) return;
    const currentList = target.models && target.models.length > 0 ? target.models : [target.model];
    if (currentList.length <= 1) return;

    const nextList = currentList.filter((m) => m !== modelName);
    const nextDefault = target.model === modelName ? nextList[0] : target.model;
    const updated = ProviderStore.updateProvider(providerId, {
      models: nextList,
      model: nextDefault,
    });
    setProviders(updated);
  };

  const handleAddManualModel = (providerId: string) => {
    const trimmed = manualModelInput.trim();
    if (!trimmed) return;
    const target = providers.find((p) => p.id === providerId);
    if (!target) return;

    const currentList = target.models && target.models.length > 0 ? target.models : [target.model];
    if (!currentList.includes(trimmed)) {
      const nextList = [...currentList, trimmed];
      const updated = ProviderStore.updateProvider(providerId, { models: nextList });
      setProviders(updated);
    }
    setManualModelInput('');
    setAddingModelToId(null);
  };

  const handleSaveNewProvider = () => {
    if (!newLabel.trim()) return;

    const chosenModel = newModel.trim() || 'default-model';
    const allModels = newDiscoveredSelected.length > 0
      ? Array.from(new Set([chosenModel, ...newDiscoveredSelected]))
      : [chosenModel];

    const newProvider: ProviderConfig = {
      id: `prov-${Date.now()}`,
      category: sourceCategory,
      label: newLabel.trim(),
      providerType: newType,
      baseUrl: newBaseUrl.trim(),
      model: chosenModel,
      models: allModels,
      detectedModels: discoveredModels.length > 0 ? discoveredModels : undefined,
      apiKey: newApiKey.trim(),
    };

    const updated = ProviderStore.addProvider(newProvider);
    setProviders(updated);
    setIsAddingKey(false);
    setNewLabel('');
    setNewApiKey('');
    setNewDiscoveredSelected([]);
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
            className="w-full max-w-4xl h-[620px] bg-[#252526] border border-[#3c3c3c] rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none"
          >
            {/* Header (VS Code Settings Header) */}
            <div className="h-10 border-b border-[#2d2d2d] flex items-center justify-between px-4 bg-[#1f1f1f]">
              <span className="text-xs font-semibold text-[#cccccc]">Settings — Preferences</span>
              <button
                onClick={onClose}
                className="text-[#858585] hover:text-white p-1.5 rounded-xl hover:bg-[#2a2d2e] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body: Sidebar + Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar */}
              <div className="w-52 border-r border-[#2d2d2d] p-2 space-y-1 bg-[#252526]">
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
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
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
                          className="px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#007acc] text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
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
                        className="bg-[#252526] border-2 border-[#007acc] rounded-2xl p-4 space-y-4 shadow-lg"
                      >
                        <div className="flex items-center justify-between border-b border-[#333333] pb-2">
                          <span className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
                            Tambah Sumber LLM / API Key
                          </span>
                          <button
                            onClick={() => setIsAddingKey(false)}
                            className="text-[#858585] hover:text-white p-1 rounded-lg hover:bg-white/10"
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
                              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                                sourceCategory === 'local'
                                  ? 'bg-[#1b2f3d] border-[#007acc] ring-1 ring-[#007acc]'
                                  : 'bg-[#1e1e1e] border-[#333333] hover:border-[#555555]'
                              }`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 ${sourceCategory === 'local' ? 'bg-[#007acc]/20 text-[#4ec9b0]' : 'bg-[#252526] text-[#858585]'}`}>
                                <Server size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">Local LLM</span>
                                  {sourceCategory === 'local' && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#007acc] text-white rounded-full font-bold">Dipilih</span>
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
                              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                                sourceCategory === 'endpoint'
                                  ? 'bg-[#1b2f3d] border-[#007acc] ring-1 ring-[#007acc]'
                                  : 'bg-[#1e1e1e] border-[#333333] hover:border-[#555555]'
                              }`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 ${sourceCategory === 'endpoint' ? 'bg-[#007acc]/20 text-[#569cd6]' : 'bg-[#252526] text-[#858585]'}`}>
                                <Globe size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">API Key dari Suatu Endpoint</span>
                                  {sourceCategory === 'endpoint' && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#007acc] text-white rounded-full font-bold">Dipilih</span>
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
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  Ollama (11434)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('lm-studio')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  LM Studio (1234)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('vllm')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  Local vLLM (8000)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyLocalPreset('custom-local')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  Custom Localhost
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('deepseek')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  DeepSeek
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('openrouter')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  OpenRouter
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('groq')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  Groq
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('openai')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  OpenAI
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('anthropic')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
                                >
                                  Anthropic
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyEndpointPreset('custom')}
                                  className="px-3 py-1 bg-[#1e1e1e] hover:bg-[#37373d] border border-[#333333] rounded-full text-[11px] text-[#cccccc] transition-colors"
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
                            className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded-xl"
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
                              className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded-xl"
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
                              className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded-xl font-mono"
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
                            className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded-xl font-mono"
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
                            className="w-full px-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] outline-none text-xs text-[#cccccc] rounded-xl font-mono"
                          />
                        </div>

                          {/* Auto Discover Banner in New Provider Form */}
                          <div className="flex items-center justify-between p-2.5 bg-[#1e1e1e] border border-[#333333] rounded-xl">
                            <div className="min-w-0 flex-1 mr-2">
                              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                                <Cpu size={14} className="text-[#9cdcfe]" />
                                <span>Deteksi Model dari API Key:</span>
                              </span>
                              <p className="text-[11px] text-[#858585] truncate mt-0.5">
                                {newDiscoveredSelected.length > 0
                                  ? `${newDiscoveredSelected.length} model dipilih (${newDiscoveredSelected.slice(0, 3).join(', ')}${newDiscoveredSelected.length > 3 ? '...' : ''})`
                                  : 'Hubungi endpoint untuk membaca katalog model yang didukung.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTriggerDiscovery('new')}
                              disabled={isDiscovering && discoveringId === 'new'}
                              className="px-3 py-1.5 bg-[#2a2d2e] hover:bg-[#37373d] text-[#9cdcfe] hover:text-white border border-[#3c3c3c] rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                            >
                              {isDiscovering && discoveringId === 'new' ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin text-[#007acc]" />
                                  <span>Mendeteksi...</span>
                                </>
                              ) : (
                                <>
                                  <Search size={12} />
                                  <span>Deteksi Model</span>
                                </>
                              )}
                            </button>
                          </div>

                        {/* Save / Cancel buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#333333]">
                          <button
                            type="button"
                            onClick={() => setIsAddingKey(false)}
                            className="px-3.5 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-xs text-[#cccccc] rounded-xl transition-colors"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewProvider}
                            disabled={!newLabel.trim()}
                            className="px-4 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#333333] disabled:text-[#666666] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                          >
                            Simpan API Key
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {discoveryNotice && (
                      <div className="p-3 bg-[#1e2a38] border border-[#007acc]/40 rounded-xl text-xs text-[#9cdcfe] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-[#4ec9b0]" />
                          <span>{discoveryNotice}</span>
                        </div>
                        <button
                          onClick={() => setDiscoveryNotice(null)}
                          className="text-[#858585] hover:text-white p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    {/* Filter Bar: Semua | Local LLM | Endpoint */}
                    <div className="flex items-center gap-2 pb-2 border-b border-[#333333]">
                      <button
                        onClick={() => setProviderFilter('all')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          providerFilter === 'all'
                            ? 'bg-[#37373d] text-white font-semibold'
                            : 'text-[#858585] hover:text-white'
                        }`}
                      >
                        Semua ({providers.length})
                      </button>
                      <button
                        onClick={() => setProviderFilter('local')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                          providerFilter === 'local'
                            ? 'bg-[#1e3a2f] text-[#4ec9b0] font-semibold border border-[#265946]'
                            : 'text-[#858585] hover:text-[#4ec9b0]'
                        }`}
                      >
                        <Server size={12} /> Local LLM ({providers.filter((p) => p.category === 'local').length})
                      </button>
                      <button
                        onClick={() => setProviderFilter('endpoint')}
                        className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
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
                          const isDiscoveringCard = isDiscovering && discoveringId === p.id;
                          const isLocal = p.category === 'local';
                          const activeModels = p.models && p.models.length > 0 ? p.models : [p.model];

                          return (
                            <div
                              key={p.id}
                              className="bg-[#252526] border border-[#333333] rounded-2xl p-4 space-y-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 mr-2">
                                  {isLocal ? (
                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1e3a2f] text-[#4ec9b0] rounded-full border border-[#265946] flex items-center gap-1 shrink-0 font-bold">
                                      <Server size={10} /> LOCAL LLM
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1e2d3d] text-[#569cd6] rounded-full border border-[#1b4368] flex items-center gap-1 shrink-0 font-bold">
                                      <Globe size={10} /> ENDPOINT
                                    </span>
                                  )}

                                  <input
                                    type="text"
                                    value={p.label}
                                    onChange={(e) => handleUpdateProvider(p.id, { label: e.target.value })}
                                    placeholder="Nama API Key..."
                                    className="bg-transparent hover:bg-[#1e1e1e] focus:bg-[#1e1e1e] border border-transparent focus:border-[#007fd4] hover:border-[#333333] px-2 py-0.5 rounded-lg text-xs font-semibold text-[#ffffff] outline-none max-w-[200px]"
                                  />
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1e1e1e] text-[#9cdcfe] rounded-full border border-[#333333] uppercase shrink-0">
                                    {p.providerType}
                                  </span>
                                </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTriggerDiscovery(p)}
                                  disabled={isDiscoveringCard}
                                  className="px-3 py-1 bg-[#2a2d2e] hover:bg-[#37373d] text-xs font-medium text-[#9cdcfe] hover:text-white rounded-xl border border-[#3c3c3c] transition-colors flex items-center gap-1.5"
                                >
                                  {isDiscoveringCard ? (
                                    <>
                                      <RefreshCw size={11} className="animate-spin text-[#007acc]" />
                                      <span>Mendeteksi...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Search size={11} />
                                      <span>Deteksi Model</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleTestConnection(p)}
                                  disabled={isTesting}
                                  className="px-3 py-1 bg-[#333333] hover:bg-[#3c3c3c] text-xs font-medium text-[#cccccc] hover:text-white rounded-xl border border-[#3c3c3c] transition-colors"
                                >
                                  {isTesting ? 'Menguji...' : 'Uji Koneksi'}
                                </button>

                                {providers.length > 1 && (
                                  <button
                                    onClick={() => handleDeleteProvider(p.id)}
                                    className="p-1.5 text-[#858585] hover:text-[#ce9178] hover:bg-[#382626] rounded-xl transition-colors"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-[#858585] block">Model Default:</span>
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

                            {/* Multi-Model Section */}
                            <div className="pt-2 border-t border-[#333333] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#858585] flex items-center gap-1.5">
                                  <Cpu size={12} className="text-[#9cdcfe]" />
                                  <span>Model Aktif ({activeModels.length}):</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerDiscovery(p)}
                                    className="text-[10px] text-[#4ec9b0] hover:underline flex items-center gap-1"
                                    title="Pilih dan aktifkan lebih dari satu model dari API Key ini"
                                  >
                                    <Search size={10} /> Kelola / Deteksi Model
                                  </button>
                                  {addingModelToId !== p.id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAddingModelToId(p.id);
                                        setManualModelInput('');
                                      }}
                                      className="text-[10px] text-[#9cdcfe] hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={10} /> Tambah Manual
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Manual model input box */}
                              {addingModelToId === p.id && (
                                <div className="flex items-center gap-1.5 p-1.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl">
                                  <input
                                    type="text"
                                    value={manualModelInput}
                                    onChange={(e) => setManualModelInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddManualModel(p.id);
                                      if (e.key === 'Escape') setAddingModelToId(null);
                                    }}
                                    placeholder="Masukkan ID model (misal: gpt-4o-mini, llama-3.3-70b)..."
                                    className="flex-1 bg-transparent text-xs text-white outline-none px-1.5 font-mono"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddManualModel(p.id)}
                                    disabled={!manualModelInput.trim()}
                                    className="px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-50 text-white text-[11px] font-medium rounded-lg transition-colors"
                                  >
                                    Tambah
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAddingModelToId(null)}
                                    className="p-1 text-[#858585] hover:text-white"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}

                              {/* List of active models as chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {activeModels.map((m) => {
                                  const isDefault = m === p.model;
                                  return (
                                    <div
                                      key={m}
                                      className={`px-2.5 py-1 rounded-xl text-xs font-mono flex items-center gap-1.5 border transition-all ${
                                        isDefault
                                          ? 'bg-[#1e2a38] text-[#9cdcfe] border-[#007acc]/60 shadow-sm'
                                          : 'bg-[#1e1e1e] text-[#cccccc] border-[#333333]'
                                      }`}
                                    >
                                      <Cpu size={11} className={isDefault ? 'text-[#4ec9b0]' : 'text-[#858585]'} />
                                      <span>{m}</span>
                                      {isDefault ? (
                                        <span className="text-[9px] font-sans font-bold bg-[#1e3a2f] text-[#4ec9b0] px-1 py-0.2 rounded border border-[#265946]">
                                          Utama
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          title="Jadikan model utama"
                                          onClick={() => handleSetDefaultModel(p.id, m)}
                                          className="text-[10px] font-sans text-[#858585] hover:text-[#4ec9b0] ml-1"
                                        >
                                          Set Utama
                                        </button>
                                      )}

                                      {activeModels.length > 1 && (
                                        <button
                                          type="button"
                                          title="Hapus model dari daftar aktif"
                                          onClick={() => handleRemoveModelFromProvider(p.id, m)}
                                          className="text-[#858585] hover:text-[#ce9178] p-0.5 ml-0.5 transition-colors"
                                        >
                                          <X size={11} />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

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
                                className="bg-[#1e1e1e] border border-[#333333] px-2 py-1 rounded text-xs text-[#9cdcfe] outline-none max-w-[220px]"
                              >
                                {providers.map((p) => {
                                  const activeModels = p.models && p.models.length > 0 ? p.models : [p.model];
                                  return (
                                    <optgroup key={p.id} label={`${p.label} (${p.category === 'local' ? 'Local' : 'Cloud'})`}>
                                      {activeModels.map((m) => {
                                        const val = m === p.model ? p.id : `${p.id}:::${m}`;
                                        return (
                                          <option key={val} value={val}>
                                            {m} {m === p.model ? '(Utama)' : ''}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  );
                                })}
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
                          {/* Obsidian Permission Dropdown */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#858585]">
                              <BookOpen className="w-3.5 h-3.5 text-[#9cdcfe]" />
                              <span>Akses Obsidian Vault:</span>
                            </div>
                            <select
                              value={agent.permissions?.obsidianAccess || 'read-only'}
                              onChange={(e) => {
                                const updated = AgentStore.updateAgent(agent.id, {
                                  permissions: {
                                    ...agent.permissions,
                                    obsidianAccess: e.target.value as 'denied' | 'read-only' | 'read-write',
                                  },
                                });
                                setAgentsList(updated);
                              }}
                              className="bg-[#1e1e1e] border border-[#333333] px-2 py-1 rounded text-xs text-[#cccccc] outline-none"
                            >
                              <option value="read-only">Read-Only (Aman - Hanya Baca)</option>
                              <option value="read-write">Read-Write (Boleh Baca &amp; Buat Catatan)</option>
                              <option value="denied">Denied (Nonaktif)</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'retrieval' && (
                  <div className="max-w-2xl space-y-4">
                    <div>
                      <h1 className="text-base font-semibold text-[#ffffff] mb-1 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-[#9cdcfe]" />
                        Obsidian Vault &amp; Retrieval (Token Optimizer)
                      </h1>
                      <p className="text-xs text-[#858585]">
                        Hubungkan basis pengetahuan lokal Obsidian agar AI Agent dapat secara otonom mencari, membaca, dan menulis catatan proyek, menghemat konsumsi token hingga 90%.
                      </p>
                    </div>

                    {obsidianStatusMsg && (
                      <div className="p-2.5 bg-[#1b2b34] border border-[#2c4756] rounded text-xs text-[#5fb3b3] flex items-center justify-between">
                        <span>{obsidianStatusMsg}</span>
                        <button
                          onClick={() => setObsidianStatusMsg(null)}
                          className="text-[#858585] hover:text-white p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    {/* Status Koneksi Vault */}
                    <div className="bg-[#252526] border border-[#333333] rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-2">
                            Folder Obsidian Vault
                            {obsidianConfig.vaultPath ? (
                              <span className="px-2.5 py-0.5 bg-[#173822] text-[#4ec9b0] text-[10px] rounded-full font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Terhubung
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-[#3c2a1a] text-[#ce9178] text-[10px] rounded-full font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Belum Terhubung
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#858585] mt-0.5">
                            {obsidianConfig.vaultPath ? (
                              <span className="font-mono text-[#9cdcfe]">{obsidianConfig.vaultPath}</span>
                            ) : (
                              'Pilih atau deteksi folder Vault Obsidian di perangkat komputer Anda.'
                            )}
                          </div>
                        </div>

                        {obsidianConfig.vaultPath ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleRefreshVault}
                              disabled={isScanningVault}
                              className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] border border-[#444] rounded-xl text-xs text-[#cccccc] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isScanningVault ? 'animate-spin' : ''}`} />
                              Pindai Ulang
                            </button>
                            <button
                              onClick={handleDisconnectVault}
                              className="px-3 py-1.5 bg-[#3a1d1d] hover:bg-[#5a2a2a] border border-[#742a2a] rounded-xl text-xs text-[#f48771] flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Putuskan
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleAutoDetectVaults}
                              disabled={isDetectingVaults}
                              className="px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] rounded-xl text-xs text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                              <Cpu className={`w-3.5 h-3.5 ${isDetectingVaults ? 'animate-spin' : ''}`} />
                              Deteksi Otomatis
                            </button>
                            <button
                              onClick={handleSelectVaultFolder}
                              disabled={isScanningVault}
                              className="px-3.5 py-1.5 bg-[#2d2d2d] hover:bg-[#3c3c3c] border border-[#444] rounded-xl text-xs text-[#cccccc] flex items-center gap-1.5 transition-colors"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-[#e5c07b]" />
                              Pilih Folder
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Jika terdeteksi vault otomatis dari obsidian.json */}
                      {!obsidianConfig.vaultPath && detectedVaults.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#333333] space-y-2">
                          <div className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
                            Vault Terdeteksi di Komputer:
                          </div>
                          {detectedVaults.map((v, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-[#1e1e1e] border border-[#333333] rounded-xl hover:border-[#007acc] transition-colors"
                            >
                              <div className="overflow-hidden pr-2">
                                <div className="text-xs font-semibold text-white">{v.name}</div>
                                <div className="text-[11px] text-[#858585] truncate font-mono">{v.path}</div>
                              </div>
                              <button
                                onClick={() => handleConnectVault(v.path)}
                                disabled={isScanningVault}
                                className="px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] rounded-xl text-xs text-white whitespace-nowrap transition-colors font-medium shadow-sm"
                              >
                                Hubungkan Vault
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Info statistik catatan */}
                      {obsidianConfig.vaultPath && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="p-3 bg-[#1e1e1e] border border-[#333333] rounded-xl">
                            <div className="text-[10px] text-[#858585] uppercase">Total Catatan Terindeks</div>
                            <div className="text-base font-bold text-white mt-0.5">
                              {obsidianConfig.notesCache?.length || 0} berkas .md
                            </div>
                          </div>
                          <div className="p-3 bg-[#1e1e1e] border border-[#333333] rounded-xl">
                            <div className="text-[10px] text-[#858585] uppercase">Sinkronisasi Terakhir</div>
                            <div className="text-xs font-medium text-[#cccccc] mt-1">
                              {obsidianConfig.lastIndexedAt
                                ? new Date(obsidianConfig.lastIndexedAt).toLocaleTimeString()
                                : 'Belum pernah'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pengaturan Token Budget */}
                    <div className="bg-[#252526] border border-[#333333] rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="text-xs font-semibold text-white">
                        Batas Token per Catatan (Token Budget Capper)
                      </div>
                      <div className="text-[11px] text-[#858585]">
                        Saat AI Agent membaca catatan Obsidian, sistem otomatis memotong isi catatan agar tidak melebihi batas ini. Ini mencegah jendela konteks LLM membengkak dan memangkas biaya token.
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        <input
                          type="range"
                          min={100}
                          max={800}
                          step={50}
                          value={obsidianConfig.maxTokensPerSnippet || 300}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = ObsidianStore.saveConfig({ maxTokensPerSnippet: val });
                            setObsidianConfig(updated);
                          }}
                          className="flex-1 accent-[#007acc] cursor-pointer"
                        />
                        <span className="font-mono text-xs px-3 py-1 bg-[#1e1e1e] border border-[#333333] rounded-xl text-[#9cdcfe] min-w-[90px] text-center font-semibold">
                          {obsidianConfig.maxTokensPerSnippet || 300} token
                        </span>
                      </div>
                      <div className="text-[10px] text-[#858585]">
                        Rekomendasi: <b>250–350 token</b> (setara ~1.000–1.400 karakter). Cukup untuk 1–2 bab spesifik tanpa pemborosan.
                      </div>
                    </div>

                    {/* Folder Ekspor Sesi */}
                    <div className="bg-[#252526] border border-[#333333] rounded-2xl p-4 space-y-2 shadow-sm">
                      <div className="text-xs font-semibold text-white">
                        Folder Tujuan Ekspor Sesi & Deliverable
                      </div>
                      <div className="text-[11px] text-[#858585]">
                        Sub-folder di dalam Vault Obsidian tempat AI Agent menyimpan ringkasan dan keputusan arsitektur.
                      </div>
                      <input
                        type="text"
                        value={obsidianConfig.sessionExportFolder || 'MultiAgent/Sessions'}
                        onChange={(e) => {
                          const updated = ObsidianStore.saveConfig({ sessionExportFolder: e.target.value });
                          setObsidianConfig(updated);
                        }}
                        className="w-full bg-[#1e1e1e] border border-[#333333] p-2.5 rounded-xl text-xs text-[#cccccc] font-mono outline-none focus:border-[#007fd4]"
                        placeholder="MultiAgent/Sessions"
                      />
                    </div>
                  </div>
                )}

                {activeTab !== 'appearance' && activeTab !== 'providers' && activeTab !== 'agents' && activeTab !== 'retrieval' && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-[#858585]">
                    <div className="text-sm font-semibold text-[#cccccc] mb-1">
                      {tabs.find((t) => t.id === activeTab)?.label}
                    </div>
                    <div className="text-xs max-w-sm">
                      Kategori ini siap diintegrasikan pada fase lanjutan (Granular Permissions, Shortcuts).
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Model Discovery & Multi-Select Picker Dialog */}
      <AnimatePresence>
        {discoveryModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl bg-[#252526] border border-[#3c3c3c] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-[#333333] flex items-center justify-between bg-[#1f1f1f]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#1e2d3d] flex items-center justify-center text-[#569cd6]">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                      Deteksi &amp; Pilih Model LLM
                    </h2>
                    <p className="text-[11px] text-[#858585]">
                      {discoveryTargetProvider
                        ? `Provider: ${discoveryTargetProvider.label} (${discoveryTargetProvider.providerType})`
                        : `Provider Baru: ${newLabel || 'Endpoint'}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDiscoveryModalOpen(false)}
                  className="text-[#858585] hover:text-white p-1.5 rounded-xl hover:bg-[#2a2d2e] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {/* Boundary State 1: Loading Skeleton */}
                {isDiscovering && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <RefreshCw size={28} className="animate-spin text-[#007acc]" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Menghubungi endpoint provider...
                      </p>
                      <p className="text-[11px] text-[#858585] mt-0.5">
                        Membaca katalog model yang didukung oleh API Key ini.
                      </p>
                    </div>
                  </div>
                )}

                {/* Boundary State 2: Error Boundary + Retry */}
                {discoveryError && !isDiscovering && (
                  <div className="p-4 bg-[#3b2020] border border-[#593030] rounded-xl space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-[#f48771] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-xs font-bold text-[#f48771]">Gagal Mendeteksi Model</h3>
                        <p className="text-[11px] text-[#cccccc] mt-1 leading-relaxed">
                          {discoveryError}
                        </p>
                        <p className="text-[11px] text-[#858585] mt-1">
                          Pastikan API Key sudah benar, kuota akun mencukupi, dan Base URL dapat dijangkau.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#593030]">
                      <button
                        type="button"
                        onClick={() => setDiscoveryModalOpen(false)}
                        className="px-3 py-1 bg-[#2a2d2e] hover:bg-[#333333] text-xs text-[#cccccc] rounded-xl transition-colors"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerDiscovery(discoveryTargetProvider || 'new')}
                        className="px-3.5 py-1 bg-[#d16969] hover:bg-[#e07b7b] text-xs text-white font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw size={12} /> Coba Lagi
                      </button>
                    </div>
                  </div>
                )}

                {/* Normal Discovery Results */}
                {!isDiscovering && !discoveryError && (
                  <>
                    {/* Filter bar & Quick action buttons */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585]" />
                          <input
                            type="text"
                            value={discoverySearch}
                            onChange={(e) => setDiscoverySearch(e.target.value)}
                            placeholder="Cari model (misal: gpt-4, claude, llama, deepseek)..."
                            className="w-full pl-9 pr-3 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] text-xs text-white rounded-xl outline-none"
                          />
                          {discoverySearch && (
                            <button
                              onClick={() => setDiscoverySearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#858585] hover:text-white"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-[#858585] px-2.5 py-1 bg-[#1e1e1e] rounded-xl border border-[#333333] shrink-0 font-mono">
                          {discoveredModels.length} Model Ditemukan
                        </span>
                      </div>

                      {/* Quick Selection Toolbar */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const popularKeywords = ['gpt-4', 'claude-3', 'llama-3', 'deepseek', 'mistral', 'gemini', 'qwen'];
                              const populars = discoveredModels.filter((m) =>
                                popularKeywords.some((kw) => m.toLowerCase().includes(kw))
                              );
                              setSelectedDiscoveredModels(new Set([...selectedDiscoveredModels, ...populars]));
                            }}
                            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#333333] border border-[#333333] rounded-xl text-[11px] text-[#9cdcfe] transition-colors"
                          >
                            Pilih Populer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = discoveredModels.filter((m) =>
                                m.toLowerCase().includes(discoverySearch.toLowerCase())
                              );
                              setSelectedDiscoveredModels(new Set([...selectedDiscoveredModels, ...filtered]));
                            }}
                            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#333333] border border-[#333333] rounded-xl text-[11px] text-[#cccccc] transition-colors"
                          >
                            Pilih Semua Hasil
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDiscoveredModels(new Set())}
                            className="px-2.5 py-1 bg-[#1e1e1e] hover:bg-[#333333] border border-[#333333] rounded-xl text-[11px] text-[#858585] hover:text-white transition-colors"
                          >
                            Batal Semua
                          </button>
                        </div>
                        <span className="text-[11px] text-[#4ec9b0] font-semibold">
                          {selectedDiscoveredModels.size} Dipilih
                        </span>
                      </div>
                    </div>

                    {/* Models List / Grid */}
                    <div className="border border-[#333333] rounded-xl max-h-[360px] overflow-y-auto bg-[#1e1e1e] divide-y divide-[#2d2d2d]">
                      {(() => {
                        const filtered = discoveredModels.filter((m) =>
                          m.toLowerCase().includes(discoverySearch.toLowerCase())
                        );

                        // Boundary State 3: Empty State
                        if (filtered.length === 0) {
                          return (
                            <div className="py-12 text-center space-y-2">
                              <Search size={22} className="mx-auto text-[#858585]" />
                              <p className="text-xs text-[#cccccc]">
                                Tidak ada model yang sesuai dengan kata kunci &quot;{discoverySearch}&quot;
                              </p>
                              <button
                                type="button"
                                onClick={() => setDiscoverySearch('')}
                                className="text-[11px] text-[#007acc] hover:underline"
                              >
                                Reset Filter
                              </button>
                            </div>
                          );
                        }

                        return filtered.map((m) => {
                          const isChecked = selectedDiscoveredModels.has(m);
                          return (
                            <label
                              key={m}
                              className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                                isChecked ? 'bg-[#1e2a38]/60 hover:bg-[#1e2a38]' : 'hover:bg-[#252526]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const next = new Set(selectedDiscoveredModels);
                                    if (e.target.checked) {
                                      next.add(m);
                                    } else {
                                      next.delete(m);
                                    }
                                    setSelectedDiscoveredModels(next);
                                  }}
                                  className="rounded accent-[#007acc] w-4 h-4 cursor-pointer"
                                />
                                <span className="font-mono text-xs text-white truncate">
                                  {m}
                                </span>
                              </div>
                              {isChecked && (
                                <span className="text-[10px] text-[#4ec9b0] font-sans font-medium px-2 py-0.5 rounded-full bg-[#1e3a2f] border border-[#265946] shrink-0">
                                  Terpilih
                                </span>
                              )}
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[#333333] flex items-center justify-between bg-[#1f1f1f]">
                <span className="text-xs text-[#858585]">
                  {selectedDiscoveredModels.size} model akan ditambahkan ke daftar aktif.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscoveryModalOpen(false)}
                    className="px-3.5 py-1.5 bg-[#2a2d2e] hover:bg-[#333333] text-xs text-[#cccccc] rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyDiscoveredModels}
                    disabled={selectedDiscoveredModels.size === 0 || isDiscovering}
                    className="px-4 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#333333] disabled:text-[#666666] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Check size={14} /> Simpan Model Terpilih ({selectedDiscoveredModels.size})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};
