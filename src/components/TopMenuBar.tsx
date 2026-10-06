import React from 'react';

interface TopMenuBarProps {
  onToggleTerminal?: () => void;
  isTerminalOpen?: boolean;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onToggleTerminal,
  isTerminalOpen = false,
}) => {
  return (
    <div className="h-8 w-full bg-[#1f1f1f] border-b border-[#2d2d2d] flex items-center px-3 space-x-3 text-xs text-[#969696] select-none z-10 font-sans">
      <div className="flex items-center gap-2 mr-2">
        <img src="/logo.png" alt="Multi-Agent Logo" className="w-4 h-4 rounded-sm object-cover shadow-sm" />
        <span className="font-semibold text-[#cccccc] hover:text-white cursor-pointer transition-colors">
          Multi-Agent Desktop
        </span>
      </div>
      <span className="hover:text-white hover:bg-[#2a2d2e] px-2 py-0.5 rounded cursor-pointer transition-colors">File</span>
      <span className="hover:text-white hover:bg-[#2a2d2e] px-2 py-0.5 rounded cursor-pointer transition-colors">Edit</span>
      <span className="hover:text-white hover:bg-[#2a2d2e] px-2 py-0.5 rounded cursor-pointer transition-colors">View</span>
      <button
        onClick={onToggleTerminal}
        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
          isTerminalOpen
            ? 'bg-[#37373d] text-white font-medium'
            : 'hover:text-white hover:bg-[#2a2d2e]'
        }`}
      >
        Terminal
      </button>
      <span className="hover:text-white hover:bg-[#2a2d2e] px-2 py-0.5 rounded cursor-pointer transition-colors">Help</span>

      <div className="flex-1 flex justify-center">
        <div className="bg-[#2d2d2d] hover:bg-[#383838] px-16 py-0.5 rounded text-[11px] text-[#cccccc] border border-[#3c3c3c] cursor-pointer flex items-center gap-1.5 transition-colors">
          <svg className="w-3 h-3 text-[#858585]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Multi-Agent Workspace — Plan Mode</span>
        </div>
      </div>
    </div>
  );
};
