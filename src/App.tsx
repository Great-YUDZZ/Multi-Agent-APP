import { useState, useEffect } from 'react';
import { TopMenuBar } from './components/TopMenuBar';
import { Sidebar } from './components/Sidebar';
import { ChatFeed } from './components/ChatFeed';
import { PromptBar } from './components/PromptBar';
import { AgentSelectorModal } from './components/AgentSelectorModal';
import { SettingsModal } from './components/SettingsModal';
import { BuildTaskGraphView } from './components/BuildTaskGraphView';
import { HistoryView } from './components/HistoryView';
import { FileEditorView } from './components/FileEditorView';
import { TerminalView } from './components/TerminalView';
import { DashboardView } from './components/DashboardView';
import { initialSessions, initialUserProfile } from './data/mockData';
import { globalOrchestrator } from './orchestrator/Orchestrator';
import { CommandApprovalModal } from './components/CommandApprovalModal';
import { SessionStore } from './storage/SessionStore';
import { AgentStore } from './storage/AgentStore';
import { HelpDocumentationModal, type HelpTabType } from './components/HelpDocumentationModal';
import { ShortcutSetupModal } from './components/ShortcutSetupModal';
import type { Agent, Session, SessionMessage, UserProfile, DiscussionModeType, CommandApprovalRequest, AttachedFile } from './types';
import { selectFolderDialog, selectFileDialog, selectSaveFileDialog, readFileContent, saveFileContent, listDirectory, detectObsidianVaults, type FileEntry } from './tauri/fsBridge';
import { ProviderStore } from './storage/ProviderStore';
import { ObsidianStore } from './storage/ObsidianStore';
import { globalVaultManager } from './obsidian/VaultManager';
import { ApiKeyMissingError, ApiKeyInvalidError } from './llm/errors';
import { Box, FileText, CheckCircle2, Terminal as TerminalIcon, Copy, Check, Download, Paperclip, BookOpen, PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './components/Tooltip';
import { ToastContainer, type ToastMessage } from './components/Toast';

export function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>(() => {
    return AgentStore.loadAgents();
  });
  
  // Load sessions from SessionStore with fallback
  const [sessions, setSessions] = useState<Session[]>(() => {
    const loaded = SessionStore.loadSessions();
    if (loaded && loaded.length > 0) return loaded;
    SessionStore.saveSessions(initialSessions);
    return initialSessions;
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || initialSessions[0].id;
  });

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = (urlParams?.get('tab') as any) || 'chat';
  const initialTerminal = urlParams?.get('terminal') === '1';
  const initialSettings = urlParams?.get('settings') === '1';
  const initialFile = urlParams?.get('file')
    ? { name: urlParams.get('file')!, path: urlParams.get('file')!, is_dir: false, size: 1024 }
    : null;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'history' | 'artifact' | 'file'>(initialTab);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(initialFile);
  const [workspacePath, setWorkspacePath] = useState<string>(() => {
    return localStorage.getItem('multi_agent_workspace_dir') || '';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('multi_agent_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('multi_agent_sidebar_open', String(next));
      return next;
    });
  };

  const handleOpenFolder = async () => {
    try {
      const selected = await selectFolderDialog();
      if (selected) {
        setWorkspacePath(selected);
        localStorage.setItem('multi_agent_workspace_dir', selected);
        setActiveTab('file');
        addToast('success', `Workspace dibuka: ${selected}`);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
      addToast('error', 'Gagal membuka dialog folder');
    }
  };

  const handleCloseFolder = () => {
    setWorkspacePath('');
    localStorage.removeItem('multi_agent_workspace_dir');
    setSelectedFile(null);
    addToast('info', 'Folder workspace ditutup');
  };

  // Terminal state
  const [isTerminalOpen, setIsTerminalOpen] = useState(initialTerminal);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);

  // Modals & Orchestrator state
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialSettings);
  const [typingAgent, setTypingAgent] = useState<Agent | null>(null);
  const [discussionStrategy, setDiscussionStrategy] = useState<DiscussionModeType>('round-robin');
  const [commandApprovalRequest, setCommandApprovalRequest] = useState<CommandApprovalRequest | null>(null);
  const [approvalResolver, setApprovalResolver] = useState<((approved: boolean) => void) | null>(null);

  // Zoom & Onboarding Modals
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpInitialTab, setHelpInitialTab] = useState<HelpTabType>('overview');
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

  // First-launch shortcut configuration check
  useEffect(() => {
    const prompted = localStorage.getItem('multi_agent_shortcut_setup_prompted');
    if (!prompted) {
      setIsShortcutModalOpen(true);
    }
  }, []);

  // Inisialisasi deteksi otomatis Obsidian Vault di komputer pengguna
  useEffect(() => {
    const config = ObsidianStore.loadConfig();
    if (!config.vaultPath) {
      detectObsidianVaults().then((vaults) => {
        if (vaults && vaults.length > 0) {
          const target = vaults.find((v) => v.is_open) || vaults[0];
          if (target) {
            globalVaultManager.scanVault(target.path).then((notes) => {
              ObsidianStore.saveConfig({
                vaultPath: target.path,
                enabled: true,
                notesCache: notes,
                lastIndexedAt: Date.now(),
              });
              addToast('info', `Obsidian Vault otomatis terhubung: ${target.name} (${notes.length} catatan)`, 'Obsidian Siap');
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  }, []);

  const handleResolveCommandApproval = (approved: boolean, alwaysAllow?: boolean) => {
    if (commandApprovalRequest && alwaysAllow) {
      setAvailableAgents((prev) =>
        prev.map((a) => {
          if (a.id === commandApprovalRequest.agentId) {
            const currentAllow = a.permissions.terminalAccess.alwaysAllow || [];
            return {
              ...a,
              permissions: {
                ...a.permissions,
                terminalAccess: {
                  ...a.permissions.terminalAccess,
                  alwaysAllow: [...currentAllow, commandApprovalRequest.command],
                },
              },
            };
          }
          return a;
        })
      );
    }
    if (approvalResolver) {
      approvalResolver(approved);
      setApprovalResolver(null);
    }
    setCommandApprovalRequest(null);
  };

  // Daftarkan handler permintaan izin terminal ke central Orchestrator
  useEffect(() => {
    globalOrchestrator.setRequestApprovalHandler((req) => {
      return new Promise<boolean>((resolve) => {
        setCommandApprovalRequest(req);
        setApprovalResolver(() => resolve);
      });
    });
  }, []);

  const handleZoomChange = (type: 'in' | 'out' | 'reset') => {
    if (type === 'in') {
      setZoomLevel((prev) => {
        const next = Math.min(prev + 10, 200);
        addToast('info', `Tingkat Zoom: ${next}%`);
        return next;
      });
    } else if (type === 'out') {
      setZoomLevel((prev) => {
        const next = Math.max(prev - 10, 50);
        addToast('info', `Tingkat Zoom: ${next}%`);
        return next;
      });
    } else {
      setZoomLevel(100);
      addToast('info', 'Tingkat Zoom direset ke 100%');
    }
  };

  const handleFileAction = async (action: 'new-file' | 'new-text-file' | 'new-window' | 'open-file' | 'open-folder' | 'open-recent' | 'open-workspace' | 'save' | 'save-as') => {
    switch (action) {
      case 'new-file':
      case 'new-text-file':
        if (workspacePath) {
          window.dispatchEvent(new CustomEvent('app:create-workspace-file'));
          addToast('info', 'Ketik nama berkas baru di workspace lalu tekan Enter');
        } else {
          setSelectedFile({ name: 'untitled.txt', path: 'untitled.txt', is_dir: false, size: 0 });
          setActiveTab('file');
          addToast('info', 'Editor berkas teks baru dibuka (Gunakan Save As untuk menyimpan ke disk)');
        }
        break;
      case 'new-window':
        addToast('info', 'Jendela Multi-Agent aktif');
        break;
      case 'open-file':
        try {
          const selected = await selectFileDialog();
          if (selected) {
            const fileName = selected.split(/[\/\\]/).pop() || selected;
            setSelectedFile({ name: fileName, path: selected, is_dir: false, size: 0 });
            setActiveTab('file');
            addToast('success', `Berkas dibuka: ${fileName}`);
          }
        } catch (err) {
          console.error('Failed to open file:', err);
          addToast('error', 'Gagal membuka dialog berkas');
        }
        break;
      case 'open-folder':
      case 'open-workspace':
        handleOpenFolder();
        break;
      case 'open-recent':
        setActiveTab('history');
        addToast('info', 'Menampilkan riwayat sesi terkini');
        break;
      case 'save':
        if (activeTab === 'file' && selectedFile) {
          window.dispatchEvent(new CustomEvent('app:editor-action', { detail: { action: 'save' } }));
        }
        SessionStore.saveSessions(sessions);
        addToast('success', 'Penyimpanan berhasil');
        break;
      case 'save-as':
        if (activeTab === 'file' && selectedFile) {
          try {
            const targetPath = await selectSaveFileDialog(selectedFile.name);
            if (targetPath) {
              const content = await readFileContent(selectedFile.path);
              const ok = await saveFileContent(targetPath, content);
              if (ok) {
                const newName = targetPath.split(/[\/\\]/).pop() || targetPath;
                setSelectedFile({ name: newName, path: targetPath, is_dir: false, size: 0 });
                addToast('success', `Berkas disimpan sebagai: ${newName}`);
              }
            }
          } catch (err) {
            console.error('Failed to save as:', err);
            addToast('error', 'Gagal menyimpan berkas');
          }
        } else if (currentSession.walkthrough) {
          handleDownloadMarkdown(`walkthrough-${currentSession.id}.md`, currentSession.walkthrough);
        } else {
          SessionStore.saveSessions(sessions);
          addToast('success', 'Sesi aktif berhasil disimpan');
        }
        break;
    }
  };

  const handleEditAction = (action: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'find' | 'replace') => {
    if (action === 'find' || action === 'replace') {
      if (activeTab !== 'file') {
        setActiveTab('file');
      }
    }
    window.dispatchEvent(new CustomEvent('app:editor-action', { detail: { action } }));
    if (action === 'copy') {
      addToast('info', 'Aksi salin (copy) dijalankan');
    } else if (action === 'paste') {
      addToast('info', 'Aksi tempel (paste) dijalankan');
    }
  };

  // Keyboard shortcut listener (Ctrl+`, F1, Zoom, Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setHelpInitialTab('overview');
        setIsHelpOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomChange('in');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomChange('out');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomChange('reset');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        SessionStore.saveSessions(sessions);
        addToast('success', 'Workspace berhasil disimpan');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessions]);

  // Sync sessions changes to SessionStore
  useEffect(() => {
    SessionStore.saveSessions(sessions);
  }, [sessions]);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0] || initialSessions[0];

  const activeAgents = availableAgents.filter((a) =>
    currentSession.participantAgentIds?.includes(a.id)
  );

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  };

  const handleApplyAgents = (selectedIds: string[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, participantAgentIds: selectedIds }
          : s
      )
    );
  };

  const handleToggleMode = (mode: 'plan' | 'build') => {
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, mode } : s))
    );
    setActiveTab('chat');
  };

  const handleNewSession = () => {
    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: 'Sesi Baru',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      mode: 'plan',
      participantAgentIds: ['agent-a', 'agent-b'],
      attachedFiles: [],
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveTab('chat');
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = SessionStore.deleteSession(sessionId);
    setSessions(updated.length > 0 ? updated : initialSessions);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(updated[0]?.id || initialSessions[0].id);
    }
  };

  const handleSendMessage = async (
    text: string,
    mentionedAgentId?: string,
    attachments?: AttachedFile[]
  ) => {
    const userMessage: SessionMessage = {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      speaker: { type: 'user' },
      content: text,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };

    // Auto generate title if it's the first user message
    const fallbackTitle = attachments?.[0]?.fileName ? `File: ${attachments[0].fileName}` : 'New Discussion';
    const updatedTitle =
      currentSession.messages.filter((m) => m.speaker.type === 'user').length === 0
        ? SessionStore.generateTitle(text.trim() || fallbackTitle)
        : currentSession.title;

    // Add user message & update attachedFiles
    const updatedMessages = [...currentSession.messages, userMessage];
    const updatedAttachments = attachments && attachments.length > 0
      ? [...(currentSession.attachedFiles || []), ...attachments]
      : currentSession.attachedFiles;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: updatedTitle,
              messages: updatedMessages,
              attachedFiles: updatedAttachments,
              lastActiveAt: Date.now(),
            }
          : s
      )
    );

    // Pengecekan awal konfigurasi API Key sebelum menjalankan orkestrasi
    const allProviders = ProviderStore.loadProviders();
    const hasAnyConfiguredApiKey = allProviders.some((p) => p.apiKey && p.apiKey.trim().length > 0);

    const participatingProviders = activeAgents.map((ag) => {
      let prov = allProviders.find((p) => p.id === ag.llmProviderId);
      if (!prov) {
        if (ag.llmProviderId === 'anthropic-claude') prov = allProviders.find((p) => p.id === 'prov-anthropic' || p.providerType === 'anthropic');
        else if (ag.llmProviderId === 'openai-gpt4o') prov = allProviders.find((p) => p.id === 'prov-openai');
        else if (ag.llmProviderId === 'local-lm-studio') prov = allProviders.find((p) => p.id === 'prov-lm-studio');
      }
      return { agent: ag, provider: prov };
    });

    const targetWithMissingKey = participatingProviders.find(({ provider }) => {
      // Jika provider adalah cloud endpoint dan apiKey kosong
      if (provider && provider.category === 'endpoint' && (!provider.apiKey || !provider.apiKey.trim())) {
        return true;
      }
      // Jika provider tidak terdaftar dan belum ada API key apapun di sistem
      if (!provider && !hasAnyConfiguredApiKey) {
        return true;
      }
      return false;
    });

    if (targetWithMissingKey) {
      const sysMsg: SessionMessage = {
        id: `msg-sys-missing-key-${Date.now()}`,
        timestamp: Date.now(),
        speaker: { type: 'system', event: 'api-key-missing' },
        content: 'Silakan masukkan API key Anda terlebih dahulu untuk memulai percakapan.',
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: [...s.messages, sysMsg],
                lastActiveAt: Date.now(),
              }
            : s
        )
      );
      addToast('warning', 'Silakan masukkan API key Anda terlebih dahulu di Pengaturan.', 'API Key Diperlukan');
      return; // STOP! Tanpa mock atau respon palsu!
    }

    // Resolusi wikilink [[...]] dari Obsidian jika ada di dalam teks pengguna
    let enrichedText = text;
    const wikilinkMatches = Array.from(text.matchAll(/\[\[(.*?)\]\]/g));
    if (wikilinkMatches.length > 0) {
      for (const match of wikilinkMatches) {
        const noteTitle = match[1].trim();
        try {
          const noteData = await globalVaultManager.readNote(noteTitle);
          enrichedText += `\n\n[Konteks Terlampir dari Obsidian: [[${noteData.title}]] (~${noteData.tokenEstimate} token)]:\n${noteData.content}`;
        } catch {
          // Lewatkan jika catatan tidak ditemukan di vault
        }
      }
    }

    // Orchestrated Multi-Agent Turn-Taking via Central Orchestrator
    if (activeAgents.length > 0) {
      globalOrchestrator.setStrategy(discussionStrategy);

      // Siapkan workspaceContext jika workspacePath aktif
      let workspaceContext: { path: string; files: string[] } | undefined = undefined;
      if (workspacePath) {
        try {
          const entries = await listDirectory(workspacePath);
          workspaceContext = {
            path: workspacePath,
            files: entries.map((e: FileEntry) => e.name),
          };
        } catch (err) {
          console.warn('Gagal membaca berkas direktori workspace:', err);
          workspaceContext = { path: workspacePath, files: [] };
        }
      }

      try {
        await globalOrchestrator.executePlanDiscussion(
          enrichedText,
          1,
          activeAgents,
          userProfile,
          updatedMessages,
          {
            onAgentStartThinking: (agent) => {
              setTypingAgent(agent);
            },
            onAgentMessage: (agentMsg) => {
              setTypingAgent(null);
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === currentSessionId
                    ? {
                        ...s,
                        messages: [...s.messages, agentMsg],
                        lastActiveAt: Date.now(),
                      }
                    : s
                )
              );
            },
            onRoundComplete: (_roundNum, evaluation) => {
              setTypingAgent(null);
              if (evaluation.planDocument) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === currentSessionId
                      ? {
                          ...s,
                          planDocument: evaluation.planDocument,
                        }
                      : s
                  )
                );
              }
            },
            onPlanGenerated: (evaluation) => {
              if (evaluation.planDocument) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === currentSessionId
                      ? {
                          ...s,
                          planDocument: evaluation.planDocument,
                        }
                      : s
                  )
                );
                addToast('success', 'PlanDocument disepakati oleh tim multi-agent.', 'Konsensus Selesai');
              }
            },
          },
          mentionedAgentId,
          workspaceContext
        );
      } catch (err: unknown) {
        setTypingAgent(null);
        if (err instanceof ApiKeyMissingError) {
          const sysMsg: SessionMessage = {
            id: `msg-sys-missing-key-${Date.now()}`,
            timestamp: Date.now(),
            speaker: { type: 'system', event: 'api-key-missing' },
            content: 'Silakan masukkan API key Anda terlebih dahulu untuk memulai percakapan.',
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, messages: [...s.messages, sysMsg], lastActiveAt: Date.now() }
                : s
            )
          );
          addToast('warning', 'Silakan masukkan API key Anda terlebih dahulu di Pengaturan.', 'API Key Diperlukan');
        } else if (err instanceof ApiKeyInvalidError) {
          const sysMsg: SessionMessage = {
            id: `msg-sys-invalid-key-${Date.now()}`,
            timestamp: Date.now(),
            speaker: { type: 'system', event: 'api-key-error' },
            content: 'Ada sesuatu yang salah pada API key Anda. Silakan periksa kembali API key atau kuota Anda di Pengaturan.',
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, messages: [...s.messages, sysMsg], lastActiveAt: Date.now() }
                : s
            )
          );
          addToast('error', 'Ada sesuatu yang salah pada API key Anda.', 'API Key Error');
        } else {
          const errDetail = err instanceof Error ? err.message : String(err);
          const isKeyIssue =
            errDetail.includes('401') ||
            errDetail.includes('403') ||
            errDetail.toLowerCase().includes('api key') ||
            errDetail.toLowerCase().includes('unauthorized') ||
            errDetail.toLowerCase().includes('authentication') ||
            errDetail.toLowerCase().includes('quota');

          if (isKeyIssue) {
            const sysMsg: SessionMessage = {
              id: `msg-sys-invalid-key-${Date.now()}`,
              timestamp: Date.now(),
              speaker: { type: 'system', event: 'api-key-error' },
              content: 'Ada sesuatu yang salah pada API key Anda. Silakan periksa kembali API key atau kuota Anda di Pengaturan.',
            };
            setSessions((prev) =>
              prev.map((s) =>
                s.id === currentSessionId
                  ? { ...s, messages: [...s.messages, sysMsg], lastActiveAt: Date.now() }
                  : s
              )
            );
            addToast('error', 'Ada sesuatu yang salah pada API key Anda.', 'API Key Error');
          } else {
            addToast('error', `Gagal menghubungkan agen: ${errDetail}`, 'Error Provider');
          }
        }
      }
    }
  };

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      title,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveWalkthrough = (summary: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              walkthrough: summary,
              lastActiveAt: Date.now(),
            }
          : s
      )
    );
    addToast('success', 'Ringkasan eksekusi tersimpan permanen di artefak sesi.', 'Build Selesai 100%');
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedArtifactId(id);
    setTimeout(() => setCopiedArtifactId(null), 2000);
    addToast('info', 'Konten markdown disalin ke clipboard sistem.', 'Disalin');
  };

  const handleDownloadMarkdown = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToObsidian = async (title: string, content: string) => {
    const config = ObsidianStore.loadConfig();
    if (!config.vaultPath) {
      addToast('warning', 'Hubungkan Obsidian Vault terlebih dahulu di Pengaturan.', 'Vault Belum Terhubung');
      setIsSettingsOpen(true);
      return;
    }
    try {
      const res = await globalVaultManager.writeNote(title, content, config.sessionExportFolder || 'MultiAgent/Sessions');
      addToast('success', res.message, 'Tersimpan di Obsidian');
    } catch (err: any) {
      addToast('error', `Gagal menyimpan: ${err.message}`, 'Gagal Menyimpan');
    }
  };

  return (
    <div
      className="flex flex-col w-screen h-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden select-none font-sans"
      style={{ zoom: `${zoomLevel}%` }}
    >
      {/* Top Menu Bar */}
      <TopMenuBar
        onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
        isTerminalOpen={isTerminalOpen}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onFileAction={handleFileAction}
        onEditAction={handleEditAction}
        onZoomChange={handleZoomChange}
        zoomPercent={zoomLevel}
        onOpenHelp={(tab) => {
          setHelpInitialTab(tab || 'overview');
          setIsHelpOpen(true);
        }}
        onOpenShortcutSetup={() => setIsShortcutModalOpen(true)}
        onOpenAbout={() => {
          setHelpInitialTab('overview');
          setIsHelpOpen(true);
        }}
      />

      {/* Main Workspace: Sidebar + Center Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar with Smooth Slide Collapse/Expand */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="h-full overflow-hidden shrink-0"
            >
              <Sidebar
                onNewSession={handleNewSession}
                onOpenSettings={() => setIsSettingsOpen(true)}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedFile={selectedFile}
                onSelectFile={(file) => setSelectedFile(file)}
                onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
                isTerminalOpen={isTerminalOpen}
                workspacePath={workspacePath}
                onOpenFolder={handleOpenFolder}
                onCloseFolder={handleCloseFolder}
                onToggleSidebar={handleToggleSidebar}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Reopen Button when Sidebar is Closed */}
        {!isSidebarOpen && (
          <Tooltip content="Buka Sidebar (Ctrl+B)" position="right">
            <button
              onClick={handleToggleSidebar}
              className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-[#252526]/95 hover:bg-[#2d2d2d] active:scale-95 text-[#cccccc] hover:text-white border border-[#3c3c3c] rounded-xl shadow-xl backdrop-blur-md transition-all cursor-pointer text-xs group"
            >
              <PanelLeftOpen size={14} className="text-[#007acc] group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-medium">Buka Sidebar</span>
            </button>
          </Tooltip>
        )}

        {/* Center Main Stage + Terminal Dock */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {activeTab === 'dashboard' ? (
              <DashboardView
                sessions={sessions}
                availableAgents={availableAgents}
                currentSessionId={currentSessionId}
                onSelectSession={(id) => {
                  setCurrentSessionId(id);
                  setActiveTab('chat');
                }}
                onNewSession={handleNewSession}
                onOpenAgentModal={() => setIsAgentModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            ) : activeTab === 'file' ? (
              <FileEditorView
                selectedFile={selectedFile}
                onClose={() => setActiveTab('chat')}
              />
            ) : activeTab === 'history' ? (
              <HistoryView
                sessions={sessions}
                currentSessionId={currentSessionId}
                availableAgents={availableAgents}
                onSelectSession={(id) => {
                  setCurrentSessionId(id);
                  setActiveTab('chat');
                }}
                onDeleteSession={handleDeleteSession}
              />
            ) : activeTab === 'artifact' ? (
              <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6 font-sans">
                <div className="flex items-center justify-between border-b border-[#333333] pb-3">
                  <div className="flex items-center gap-2">
                    <Box size={18} className="text-[#4ec9b0]" />
                    <h2 className="text-xs font-bold text-[#ffffff] uppercase tracking-wider">
                      Session Artifacts & Deliverables
                    </h2>
                  </div>
                  <span className="text-[11px] text-[#858585] font-mono">
                    Session ID: {currentSession.id}
                  </span>
                </div>

                {/* 1. Walkthrough Report Artifact (Blueprint 15.2) */}
                {currentSession.walkthrough && (
                  <div className="bg-[#252526] border border-[#333333] rounded p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[#4ec9b0]" />
                        <span className="text-xs font-semibold text-[#ffffff]">
                          walkthrough.md (Build Mode Execution Summary)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyText('walkthrough', currentSession.walkthrough!)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded text-xs transition-colors cursor-pointer border border-[#3c3c3c]"
                        >
                          {copiedArtifactId === 'walkthrough' ? (
                            <>
                              <Check size={12} className="text-[#4ec9b0]" />
                              <span className="text-[#4ec9b0]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy MD</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSaveToObsidian(`walkthrough-${currentSession.id}`, currentSession.walkthrough!)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#1e3a2f] hover:bg-[#284f40] text-[#4ec9b0] rounded text-xs transition-colors cursor-pointer border border-[#2b5a48]"
                        >
                          <BookOpen size={12} />
                          <span>Simpan ke Obsidian</span>
                        </button>
                        <button
                          onClick={() => handleDownloadMarkdown(`walkthrough-${currentSession.id}.md`, currentSession.walkthrough!)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#094771] text-white rounded text-xs transition-colors cursor-pointer"
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#1e1e1e] border border-[#333333] rounded p-3 text-xs font-mono text-[#cccccc] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {currentSession.walkthrough}
                    </div>
                  </div>
                )}

                {/* 2. PlanDocument Artifact */}
                {currentSession.planDocument && (
                  <div className="bg-[#252526] border border-[#333333] rounded p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#9cdcfe]" />
                        <div>
                          <div className="text-xs font-semibold text-[#ffffff]">
                            {currentSession.planDocument.goal}
                          </div>
                          <div className="text-[10px] text-[#858585]">
                            {currentSession.planDocument.tasks.length} Planned Tasks · Created at {new Date(currentSession.planDocument.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1e3a2f] text-[#4ec9b0] rounded">
                          PlanDocument
                        </span>
                        <button
                          onClick={() => {
                            const markdown = `# Plan: ${currentSession.planDocument?.goal}\n\n` +
                              currentSession.planDocument?.tasks.map((t, i) => `### Task ${i+1}: ${t.description}\n- **Assigned:** ${t.assignedAgentId}\n- **Criteria:** ${t.successCriteria}\n`).join('\n');
                            handleSaveToObsidian(`plan-${currentSession.id}`, markdown);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#1e3a2f] hover:bg-[#284f40] text-[#4ec9b0] rounded text-xs transition-colors cursor-pointer border border-[#2b5a48]"
                        >
                          <BookOpen size={12} />
                          <span>Simpan ke Obsidian</span>
                        </button>
                        <button
                          onClick={() => {
                            const markdown = `# Plan: ${currentSession.planDocument?.goal}\n\n` +
                              currentSession.planDocument?.tasks.map((t, i) => `### Task ${i+1}: ${t.description}\n- **Assigned:** ${t.assignedAgentId}\n- **Criteria:** ${t.successCriteria}\n`).join('\n');
                            handleCopyText('plan', markdown);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded text-xs transition-colors cursor-pointer border border-[#3c3c3c]"
                        >
                          {copiedArtifactId === 'plan' ? (
                            <>
                              <Check size={12} className="text-[#4ec9b0]" />
                              <span className="text-[#4ec9b0]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy MD</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-[#858585] pt-1 border-t border-[#333333]">
                      {currentSession.planDocument.tasks.map((t, idx) => (
                        <div key={t.id} className="flex items-start gap-2 bg-[#1e1e1e] p-2.5 rounded border border-[#2d2d2d]">
                          <CheckCircle2 size={14} className="text-[#4ec9b0] shrink-0 mt-0.5" />
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="text-[#cccccc] font-medium">
                              #{idx + 1}: {t.description}
                            </div>
                            <div className="text-[10px] text-[#777777] font-mono flex items-center gap-3">
                              <span>Agent: <strong className="text-[#9cdcfe]">{t.assignedAgentId}</strong></span>
                              <span>Criteria: {t.successCriteria}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Session Attached Files & Media */}
                {currentSession.attachedFiles && currentSession.attachedFiles.length > 0 && (
                  <div className="bg-[#252526] border border-[#333333] rounded p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip size={16} className="text-[#dcdcaa]" />
                        <span className="text-xs font-semibold text-[#ffffff]">
                          Attached Files & Assets ({currentSession.attachedFiles.length})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-[#333333]">
                      {currentSession.attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2.5 p-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded"
                        >
                          {file.content.type === 'image' ? (
                            <img
                              src={file.content.base64}
                              alt={file.fileName}
                              className="w-10 h-10 object-cover rounded border border-[#333333] shrink-0"
                            />
                          ) : (
                            <FileText size={20} className="text-[#4ec9b0] shrink-0 ml-1" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono text-[#cccccc] truncate">{file.fileName}</div>
                            <div className="text-[10px] text-[#777777]">
                              {Math.round(file.sizeBytes / 1024) || 1} KB · {file.mimeType}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!currentSession.walkthrough && !currentSession.planDocument && (!currentSession.attachedFiles || currentSession.attachedFiles.length === 0) && (
                  <div className="text-center py-16 text-xs text-[#858585] bg-[#252526] border border-[#333333] rounded">
                    <FileText size={36} className="mx-auto mb-3 text-[#3c3c3c]" />
                    <div className="font-semibold text-[#cccccc] mb-1">Belum Ada Artifacts</div>
                    <p className="max-w-xs mx-auto text-[11px] text-[#777777]">
                      Diskusikan proyek di Plan Mode atau jalankan Build Mode untuk menghasilkan PlanDocument, deliverables, dan walkthrough otomatis.
                    </p>
                  </div>
                )}
              </div>
            ) : currentSession.mode === 'build' ? (
              <BuildTaskGraphView
                planDocument={currentSession.planDocument}
                availableAgents={availableAgents}
                workspacePath={workspacePath}
                onSwitchToPlan={() => handleToggleMode('plan')}
                onSaveWalkthrough={handleSaveWalkthrough}
                onOpenFileInEditor={(filePath) => {
                  const fileName = filePath.split(/[\/\\]/).pop() || filePath;
                  setSelectedFile({ name: fileName, path: filePath, is_dir: false, size: 0 });
                  setActiveTab('file');
                }}
              />
            ) : (
              <>
                <ChatFeed
                  messages={currentSession.messages}
                  currentMode={currentSession.mode}
                  typingAgent={typingAgent}
                  userDisplayName={userProfile.displayName}
                  planDocument={currentSession.planDocument}
                  availableAgents={availableAgents}
                  onSwitchToBuild={() => handleToggleMode('build')}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />

                <PromptBar
                  onSendMessage={handleSendMessage}
                  onOpenAgentSelector={() => setIsAgentModalOpen(true)}
                  activeAgents={activeAgents}
                  currentMode={currentSession.mode}
                  onToggleMode={handleToggleMode}
                  discussionStrategy={discussionStrategy}
                  onToggleDiscussionStrategy={setDiscussionStrategy}
                />
              </>
            )}
          </main>

          {/* Integrated Execution Terminal Dock */}
          <TerminalView
            isOpen={isTerminalOpen}
            onClose={() => setIsTerminalOpen(false)}
            isMaximized={isTerminalMaximized}
            onToggleMaximize={() => setIsTerminalMaximized((prev) => !prev)}
          />
        </div>
      </div>

      {/* Sleek Harmonious Bottom Status Bar */}
      <footer className="h-6 bg-[#181818] border-t border-[#2d2d2d] text-[#858585] flex items-center justify-between px-2 text-[11px] select-none font-sans shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTerminalOpen((prev) => !prev)}
            className="flex items-center gap-1.5 hover:text-white hover:bg-[#2a2d2e] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
          >
            <TerminalIcon size={12} className="text-[#22c55e]" />
            <span className="font-mono text-[#cccccc]">Terminal</span>
          </button>
          <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <span>git:(main)</span>
          </span>
          <span className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0]" />
            <span>0 errors</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[#cccccc]">{activeAgents.length} Agents Active</span>
          <span className="px-1.5 py-0.5 bg-[#252526] text-[#4ec9b0] border border-[#333333] rounded font-mono capitalize">
            Mode: {discussionStrategy}
          </span>
          <span>UTF-8</span>
          <span className="text-[#666666]">Tauri v2 + React 19</span>
        </div>
      </footer>

      {/* Modals */}
      <CommandApprovalModal
        request={commandApprovalRequest}
        onConfirm={handleResolveCommandApproval}
      />

      <AgentSelectorModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        availableAgents={availableAgents}
        selectedAgentIds={currentSession.participantAgentIds || []}
        onApply={handleApplyAgents}
        onUpdateAgents={setAvailableAgents}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
      />

      <HelpDocumentationModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTab={helpInitialTab}
      />

      <ShortcutSetupModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        onSuccessToast={(msg) => addToast('success', msg)}
      />

      {/* Boundary State Toast System */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
