import React, { useState } from 'react';
import {
  Check,
  Plus,
  X,
  Edit2,
  Trash2,
  Cpu,
  Globe,
  Terminal,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Send,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Agent, ProviderConfig, TrustLevel, Skill } from '../types';
import { ProviderStore } from '../storage/ProviderStore';
import { AgentStore } from '../storage/AgentStore';
import { globalSkillRegistry } from '../skills/SkillRegistry';
import { globalProviderRegistry } from '../llm/ProviderRegistry';

interface AgentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAgents: Agent[];
  selectedAgentIds: string[];
  onApply: (selectedIds: string[]) => void;
  onUpdateAgents?: (agents: Agent[]) => void;
}

const VSCODE_COLORS = [
  '#569cd6', // Blue (Researcher)
  '#4ec9b0', // Teal (Reviewer)
  '#ce9178', // Terracotta/Orange (QA)
  '#c586c0', // Purple (DevOps)
  '#dcdcaa', // Yellow/Gold
  '#4fc1ff', // Light Blue
  '#9cdcfe', // Cyan
  '#d16969', // Red
];

export const AgentSelectorModal: React.FC<AgentSelectorModalProps> = ({
  isOpen,
  onClose,
  availableAgents,
  selectedAgentIds,
  onApply,
  onUpdateAgents,
}) => {
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedAgentIds);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  // Wizard Step State (1: Identitas, 2: Instruksi, 3: Skills, 4: Permissions, 5: Review & Test Chat)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formInitial, setFormInitial] = useState('');
  const [formColor, setFormColor] = useState(VSCODE_COLORS[0]);
  const [formInstructions, setFormInstructions] = useState('');
  const [formProviderId, setFormProviderId] = useState('');
  const [formSkillIds, setFormSkillIds] = useState<string[]>(['web-search']);
  const [formTrustLevel, setFormTrustLevel] = useState<TrustLevel>('review-driven');
  const [formInternetAccess, setFormInternetAccess] = useState<'allowed' | 'ask-every-time' | 'denied'>('ask-every-time');
  const [formTerminalAccess, setFormTerminalAccess] = useState<'allowed' | 'whitelist-safe' | 'ask-every-time'>('whitelist-safe');
  const [formAlwaysAsk, setFormAlwaysAsk] = useState<string>('rm, sudo, del, format, curl');

  // Inline New Skill State
  const [isCreatingNewSkill, setIsCreatingNewSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillContent, setNewSkillContent] = useState('');

  // Draft Agent Test Chat State (Step 5)
  const [draftMessages, setDraftMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [draftInput, setDraftInput] = useState('');
  const [isDraftThinking, setIsDraftThinking] = useState(false);

  const providers: ProviderConfig[] = ProviderStore.loadProviders();
  const allSkills: Skill[] = globalSkillRegistry.getAll();

  const toggleAgent = (agentId: string) => {
    setCurrentSelection((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (currentSelection.length === availableAgents.length) {
      setCurrentSelection([]);
    } else {
      setCurrentSelection(availableAgents.map((a) => a.id));
    }
  };

  const handleApply = () => {
    onApply(currentSelection);
    onClose();
  };

  const applyTrustLevelPreset = (level: TrustLevel) => {
    setFormTrustLevel(level);
    switch (level) {
      case 'secure':
        setFormInternetAccess('ask-every-time');
        setFormTerminalAccess('ask-every-time');
        setFormAlwaysAsk('rm, sudo, del, format, powershell, curl');
        break;
      case 'review-driven':
        setFormInternetAccess('ask-every-time');
        setFormTerminalAccess('whitelist-safe');
        setFormAlwaysAsk('rm, sudo, del, format, curl');
        break;
      case 'agent-driven':
        setFormInternetAccess('allowed');
        setFormTerminalAccess('allowed');
        setFormAlwaysAsk('rm, sudo, del, format');
        break;
      case 'custom':
        break;
    }
  };

  const handleOpenCreateAgent = () => {
    setEditingAgentId(null);
    setWizardStep(1);
    setFormName('Agent Baru');
    setFormRole('Software Architect & Systems Specialist');
    setFormInitial('A');
    setFormColor(VSCODE_COLORS[0]);
    setFormInstructions('Kamu adalah asisten AI teknis yang fokus memberikan analisis mendalam, struktur modular, dan kriteria sukses teruji.');
    setFormProviderId(providers[0]?.id || 'mock-offline');
    setFormSkillIds(['web-search', 'code-audit']);
    applyTrustLevelPreset('review-driven');
    setDraftMessages([]);
    setIsEditing(true);
  };

  const handleOpenEditAgent = (e: React.MouseEvent, agent: Agent) => {
    e.stopPropagation();
    setEditingAgentId(agent.id);
    setWizardStep(1);
    setFormName(agent.name);
    setFormRole(agent.role);
    setFormInitial(agent.initial);
    setFormColor(agent.color);
    setFormInstructions(agent.instructions);
    setFormProviderId(agent.llmProviderId || providers[0]?.id || 'mock-offline');
    setFormSkillIds(agent.skillIds || ['web-search']);
    setFormInternetAccess(agent.permissions?.internetAccess || 'ask-every-time');
    setFormTerminalAccess(agent.permissions?.terminalAccess?.mode || 'whitelist-safe');
    setFormAlwaysAsk(agent.permissions?.terminalAccess?.alwaysAsk?.join(', ') || 'rm, sudo');
    setFormTrustLevel('custom');
    setDraftMessages([]);
    setIsEditing(true);
  };

  const handleDeleteAgent = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    const updated = AgentStore.deleteAgent(agentId);
    if (onUpdateAgents) onUpdateAgents(updated);
    setCurrentSelection((prev) => prev.filter((id) => id !== agentId));
  };

  const handleSaveInlineSkill = () => {
    if (!newSkillName.trim()) return;
    const skillId = `skill-${Date.now()}`;
    const raw = `---
name: ${newSkillName.trim()}
description: ${newSkillDesc.trim()}
---
${newSkillContent.trim()}`;

    globalSkillRegistry.registerFromMarkdown(skillId, raw);
    setFormSkillIds((prev) => [...prev, skillId]);
    setIsCreatingNewSkill(false);
    setNewSkillName('');
    setNewSkillDesc('');
    setNewSkillContent('');
  };

  const handleSendDraftTest = async () => {
    if (!draftInput.trim() || isDraftThinking) return;
    const userText = draftInput.trim();
    setDraftInput('');
    const newHistory = [...draftMessages, { role: 'user' as const, content: userText }];
    setDraftMessages(newHistory);
    setIsDraftThinking(true);

    try {
      const skillsPrompt = globalSkillRegistry.formatSkillsPrompt(formSkillIds);
      const res = await globalProviderRegistry.sendMessageWithFallback(
        formProviderId || 'local-lm-studio',
        ['local-lm-studio', 'mock-offline'],
        [
          { role: 'system', content: `${formInstructions}\nKamu sedang diuji coba dalam mode Draft Agent.${skillsPrompt}` },
          ...newHistory.map((m) => ({ role: m.role, content: m.content })),
        ]
      );
      setDraftMessages((prev) => [...prev, { role: 'assistant', content: res.response.content }]);
    } catch (err) {
      setDraftMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[Error Simulasi Provider]: ${String(err)}` },
      ]);
    } finally {
      setIsDraftThinking(false);
    }
  };

  const handleSaveAgent = () => {
    if (!formName.trim()) return;

    const alwaysAskArray = formAlwaysAsk
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const agentData: Partial<Agent> = {
      name: formName.trim(),
      role: formRole.trim(),
      initial: (formInitial.trim().toUpperCase() || formName[0]?.toUpperCase() || 'A').slice(0, 2),
      color: formColor,
      instructions: formInstructions.trim(),
      skillIds: formSkillIds,
      llmProviderId: formProviderId,
      permissions: {
        internetAccess: formInternetAccess,
        terminalAccess: {
          mode: formTerminalAccess,
          alwaysAsk: alwaysAskArray,
        },
      },
    };

    if (editingAgentId) {
      const updated = AgentStore.updateAgent(editingAgentId, agentData);
      if (onUpdateAgents) onUpdateAgents(updated);
    } else {
      const newAgent: Agent = {
        id: `agent-${Date.now()}`,
        name: agentData.name!,
        role: agentData.role!,
        initial: agentData.initial!,
        color: agentData.color!,
        instructions: agentData.instructions!,
        skillIds: agentData.skillIds!,
        llmProviderId: agentData.llmProviderId!,
        permissions: agentData.permissions!,
      };
      const updated = AgentStore.addAgent(newAgent);
      if (onUpdateAgents) onUpdateAgents(updated);
      setCurrentSelection((prev) => [...prev, newAgent.id]);
    }

    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-sans select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#333333] flex items-center justify-between bg-[#1f1f1f]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-[#1e3a2f] flex items-center justify-center text-[#4ec9b0]">
                  <Cpu size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    {isEditing
                      ? editingAgentId
                        ? `Edit Agent — Langkah ${wizardStep} dari 5`
                        : `Agent Builder Wizard — Langkah ${wizardStep} dari 5`
                      : 'Pilih Partisipan Tim Agent'}
                  </h2>
                  <p className="text-[11px] text-[#858585]">
                    {isEditing
                      ? 'Konfigurasi identitas, instruksi, skills, permissions, dan test chat'
                      : 'Centang agen yang berpartisipasi dalam sesi diskusi dan build'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={handleSelectAll}
                    className="text-[11px] text-[#4ec9b0] hover:underline"
                  >
                    {currentSelection.length === availableAgents.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                )}
                <button
                  onClick={() => (isEditing ? setIsEditing(false) : onClose())}
                  className="text-[#858585] hover:text-white p-1 rounded hover:bg-[#2a2d2e] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* View 1: List Selection View */}
            {!isEditing ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                  {availableAgents.map((agent) => {
                    const isSelected = currentSelection.includes(agent.id);

                    return (
                      <div
                        key={agent.id}
                        onClick={() => toggleAgent(agent.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1e2a38] border-[#007acc]'
                            : 'bg-[#1e1e1e] border-[#333333] hover:border-[#444444]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs shrink-0 shadow"
                            style={{ backgroundColor: agent.color }}
                          >
                            {agent.initial}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white truncate">
                                {agent.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#2d2d2d] text-[#858585] rounded">
                                {agent.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#858585] truncate mt-0.5">
                              {agent.instructions}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={(e) => handleOpenEditAgent(e, agent)}
                            title="Edit Agent"
                            className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteAgent(e, agent.id)}
                            title="Hapus Agent"
                            className="p-1.5 text-[#858585] hover:text-[#ce9178] hover:bg-[#382626] rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-[#007acc] border-[#007acc] text-white'
                                : 'border-[#444444] bg-[#252526]'
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-[#1f1f1f] border-t border-[#333333] flex items-center justify-between">
                  <button
                    onClick={handleOpenCreateAgent}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#3c3c3c] text-white rounded text-xs transition-colors"
                  >
                    <Plus size={13} />
                    <span>Buat Agent Baru (Wizard)</span>
                  </button>

                  <button
                    onClick={handleApply}
                    className="px-4 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-xs font-semibold shadow transition-colors"
                  >
                    Terapkan ({currentSelection.length} Terpilih)
                  </button>
                </div>
              </div>
            ) : (
              /* View 2: 5-Step Wizard View */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Step Indicator Header */}
                <div className="bg-[#181818] px-5 py-2 border-b border-[#2d2d2d] flex items-center justify-between text-[11px]">
                  {[
                    { s: 1, label: '1. Identitas & Preset' },
                    { s: 2, label: '2. Instruksi' },
                    { s: 3, label: '3. Skills' },
                    { s: 4, label: '4. Permissions' },
                    { s: 5, label: '5. Review & Test' },
                  ].map((stepItem) => (
                    <button
                      key={stepItem.s}
                      onClick={() => setWizardStep(stepItem.s as any)}
                      className={`px-2 py-1 rounded transition-colors ${
                        wizardStep === stepItem.s
                          ? 'bg-[#0e639c] text-white font-bold'
                          : 'text-[#858585] hover:text-[#cccccc]'
                      }`}
                    >
                      {stepItem.label}
                    </button>
                  ))}
                </div>

                {/* Step Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                            Nama Agent:
                          </label>
                          <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Contoh: Agent S — Security Auditor"
                            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] rounded px-3 py-1.5 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                            Inisial:
                          </label>
                          <input
                            type="text"
                            value={formInitial}
                            maxLength={2}
                            onChange={(e) => setFormInitial(e.target.value)}
                            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] rounded px-3 py-1.5 text-xs text-white outline-none text-center font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                          Role & Spesialisasi:
                        </label>
                        <input
                          type="text"
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value)}
                          placeholder="Contoh: Cloud Infrastructure & Container Specialist"
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] rounded px-3 py-1.5 text-xs text-[#cccccc] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                          Warna Aksen Avatar:
                        </label>
                        <div className="flex items-center gap-2">
                          {VSCODE_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setFormColor(c)}
                              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                                formColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                          LLM Provider Backend:
                        </label>
                        <select
                          value={formProviderId}
                          onChange={(e) => setFormProviderId(e.target.value)}
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded px-3 py-1.5 text-xs text-white outline-none"
                        >
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label} ({p.model})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Trust Level Presets */}
                      <div className="space-y-1.5 pt-2 border-t border-[#333333]">
                        <label className="block text-[11px] font-bold text-[#858585] uppercase">
                          Trust Level Preset (Blueprint 15.3):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {
                              id: 'secure',
                              title: 'Secure',
                              desc: 'Konfirmasi tiap perintah terminal & internet.',
                              icon: Shield,
                            },
                            {
                              id: 'review-driven',
                              title: 'Review-driven (Rekomendasi)',
                              desc: 'Perintah aman otomatis, blokir berbahaya.',
                              icon: ShieldCheck,
                            },
                            {
                              id: 'agent-driven',
                              title: 'Agent-driven',
                              desc: 'Otonom penuh kecuali command sangat fatal.',
                              icon: ShieldAlert,
                            },
                            {
                              id: 'custom',
                              title: 'Custom',
                              desc: 'Konfigurasi bebas granular di Langkah 4.',
                              icon: Sliders,
                            },
                          ].map((preset) => {
                            const isChosen = formTrustLevel === preset.id;
                            const IconComponent = preset.icon;

                            return (
                              <div
                                key={preset.id}
                                onClick={() => applyTrustLevelPreset(preset.id as TrustLevel)}
                                className={`p-2.5 rounded border cursor-pointer transition-all ${
                                  isChosen
                                    ? 'bg-[#1e2a38] border-[#007acc]'
                                    : 'bg-[#1e1e1e] border-[#333333] hover:border-[#444444]'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                                  <IconComponent size={14} className="text-[#4ec9b0]" />
                                  <span>{preset.title}</span>
                                </div>
                                <p className="text-[10px] text-[#858585] mt-1">{preset.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                          Instruksi Sistem (System Prompt):
                        </label>
                        <p className="text-[11px] text-[#858585] mb-2">
                          Tentukan persona, gaya analisis, dan fokus teknis yang harus selalu dipatuhi oleh agent ini.
                        </p>
                        <textarea
                          rows={10}
                          value={formInstructions}
                          onChange={(e) => setFormInstructions(e.target.value)}
                          placeholder="Kamu adalah asisten AI..."
                          className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007fd4] rounded p-3 text-xs text-[#cccccc] font-sans leading-relaxed resize-none outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-[11px] font-bold text-[#858585] uppercase">
                            Pilih Skills (.md Reusable):
                          </label>
                          <p className="text-[11px] text-[#858585]">
                            Skill disisipkan ke context agent saat diskusi & build mode aktif.
                          </p>
                        </div>
                        <button
                          onClick={() => setIsCreatingNewSkill(!isCreatingNewSkill)}
                          className="text-xs text-[#4ec9b0] hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} />
                          <span>Tulis Skill Baru</span>
                        </button>
                      </div>

                      {/* Inline New Skill Form */}
                      {isCreatingNewSkill && (
                        <div className="p-3 bg-[#1e1e1e] border border-[#4ec9b0]/40 rounded-lg space-y-2">
                          <input
                            type="text"
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            placeholder="Nama Skill (mis. Git Workflow Pro)"
                            className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-white outline-none"
                          />
                          <input
                            type="text"
                            value={newSkillDesc}
                            onChange={(e) => setNewSkillDesc(e.target.value)}
                            placeholder="Deskripsi kapan skill ini relevan"
                            className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-[#cccccc] outline-none"
                          />
                          <textarea
                            rows={3}
                            value={newSkillContent}
                            onChange={(e) => setNewSkillContent(e.target.value)}
                            placeholder="Isi instruksi pedoman teknis markdown..."
                            className="w-full bg-[#252526] border border-[#3c3c3c] rounded p-2 text-xs text-[#cccccc] font-mono outline-none resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setIsCreatingNewSkill(false)}
                              className="px-2.5 py-1 bg-[#333333] text-xs text-[#cccccc] rounded"
                            >
                              Batal
                            </button>
                            <button
                              onClick={handleSaveInlineSkill}
                              className="px-3 py-1 bg-[#4ec9b0] text-[#1e1e1e] font-bold text-xs rounded"
                            >
                              Simpan ke Registry
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Skills Checklist */}
                      <div className="space-y-2">
                        {allSkills.map((skill) => {
                          const isChecked = formSkillIds.includes(skill.id);
                          return (
                            <div
                              key={skill.id}
                              onClick={() => {
                                setFormSkillIds((prev) =>
                                  prev.includes(skill.id)
                                    ? prev.filter((id) => id !== skill.id)
                                    : [...prev, skill.id]
                                );
                              }}
                              className={`p-3 rounded border flex items-start justify-between cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-[#1e2a38] border-[#007acc]'
                                  : 'bg-[#1e1e1e] border-[#333333] hover:border-[#444444]'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <FileCode size={13} className="text-[#4ec9b0]" />
                                  <span className="text-xs font-semibold text-white">{skill.name}</span>
                                </div>
                                <p className="text-[11px] text-[#858585]">{skill.description}</p>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-1"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <div className="p-3 bg-[#1e1e1e] rounded border border-[#333333] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <Globe size={14} className="text-[#569cd6]" />
                              <span>Akses Internet:</span>
                            </div>
                            <p className="text-[11px] text-[#858585]">
                              Web fetch/search dengan sanitasi tag &lt;tool_result&gt;.
                            </p>
                          </div>
                          <select
                            value={formInternetAccess}
                            onChange={(e) => setFormInternetAccess(e.target.value as any)}
                            className="bg-[#252526] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-white"
                          >
                            <option value="allowed">Allowed (Otonom)</option>
                            <option value="ask-every-time">Ask Every Time (Konfirmasi)</option>
                            <option value="denied">Denied (Ditolak)</option>
                          </select>
                        </div>

                        <div className="pt-2 border-t border-[#2d2d2d] flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                              <Terminal size={14} className="text-[#4ec9b0]" />
                              <span>Akses Terminal:</span>
                            </div>
                            <p className="text-[11px] text-[#858585]">
                              Eksekusi command shell sistem (Linux & Windows).
                            </p>
                          </div>
                          <select
                            value={formTerminalAccess}
                            onChange={(e) => setFormTerminalAccess(e.target.value as any)}
                            className="bg-[#252526] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-white"
                          >
                            <option value="whitelist-safe">Whitelist Safe (Perintah Aman Otomatis)</option>
                            <option value="ask-every-time">Ask Every Time (Selalu Konfirmasi)</option>
                            <option value="allowed">Allowed</option>
                          </select>
                        </div>

                        <div className="pt-2 border-t border-[#2d2d2d]">
                          <label className="block text-[11px] font-bold text-[#ce9178] mb-1">
                            Always Ask (Command Destruktif Wajib Izin):
                          </label>
                          <input
                            type="text"
                            value={formAlwaysAsk}
                            onChange={(e) => setFormAlwaysAsk(e.target.value)}
                            className="w-full bg-[#252526] border border-[#3c3c3c] rounded px-2.5 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {wizardStep === 5 && (
                    <div className="space-y-4">
                      {/* Summary Card */}
                      <div className="p-3 bg-[#1e1e1e] border border-[#333333] rounded-lg space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{formName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1e3a2f] text-[#4ec9b0] rounded">
                            Trust: {formTrustLevel}
                          </span>
                        </div>
                        <div className="text-[#858585] text-[11px]">{formRole}</div>
                        <div className="text-[11px] text-[#cccccc] flex items-center gap-3 pt-1">
                          <span>Skills: {formSkillIds.length} aktif</span>
                          <span>Internet: {formInternetAccess}</span>
                          <span>Terminal: {formTerminalAccess}</span>
                        </div>
                      </div>

                      {/* Draft Agent Live Test Chat (In-Memory Only) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#858585] uppercase flex items-center gap-1">
                            <Sparkles size={12} className="text-[#007acc]" />
                            <span>Draft Test Chat (Uji Coba Gaya Bicara):</span>
                          </span>
                          <span className="text-[10px] text-[#858585]">
                            Percakapan memori tanpa akses tool nyata
                          </span>
                        </div>

                        <div className="h-44 bg-[#1e1e1e] border border-[#333333] rounded-lg p-3 overflow-y-auto space-y-2 text-xs">
                          {draftMessages.length === 0 ? (
                            <div className="text-center py-8 text-[#666666] text-[11px]">
                              Ketik pesan uji coba di bawah untuk mengecek respons agen draft ini.
                            </div>
                          ) : (
                            draftMessages.map((msg, i) => (
                              <div
                                key={i}
                                className={`p-2 rounded max-w-[85%] text-xs leading-relaxed ${
                                  msg.role === 'user'
                                    ? 'bg-[#0e639c] text-white ml-auto'
                                    : 'bg-[#252526] text-[#cccccc] border border-[#333333]'
                                }`}
                              >
                                {msg.content}
                              </div>
                            ))
                          )}
                          {isDraftThinking && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#858585]">
                              <Loader2 size={11} className="animate-spin" />
                              <span>Agent sedang berpikir...</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={draftInput}
                            onChange={(e) => setDraftInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendDraftTest()}
                            placeholder="Kirim pesan tes ke draft agent..."
                            className="flex-1 bg-[#1e1e1e] border border-[#333333] rounded px-3 py-1.5 text-xs text-white outline-none"
                          />
                          <button
                            onClick={handleSendDraftTest}
                            disabled={!draftInput.trim() || isDraftThinking}
                            className="p-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded disabled:opacity-40"
                          >
                            <Send size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Wizard Footer Navigation */}
                <div className="p-4 bg-[#1f1f1f] border-t border-[#333333] flex items-center justify-between">
                  <button
                    disabled={wizardStep === 1}
                    onClick={() => setWizardStep((prev) => Math.max(1, prev - 1) as any)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] disabled:opacity-30 text-[#cccccc] rounded text-xs transition-colors"
                  >
                    <ArrowLeft size={13} />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {wizardStep < 5 ? (
                      <button
                        onClick={() => setWizardStep((prev) => Math.min(5, prev + 1) as any)}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white rounded text-xs font-semibold transition-colors"
                      >
                        <span>Lanjut</span>
                        <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveAgent}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#4ec9b0] hover:bg-[#5fd7be] text-[#1e1e1e] font-bold rounded text-xs transition-colors shadow"
                      >
                        <Check size={14} />
                        <span>Simpan Agent ke Registry</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
