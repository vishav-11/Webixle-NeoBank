/**
 * SettingsPanelContext.tsx
 *
 * Provides openSettings / closeSettings globally so Header (deep child)
 * can trigger the panel that lives at AppShell level (above BottomNav).
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface SettingsPanelContextValue {
  isOpen:        boolean;
  openSettings:  () => void;
  closeSettings: () => void;
}

const SettingsPanelContext = createContext<SettingsPanelContextValue | undefined>(undefined);

export function SettingsPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openSettings  = useCallback(() => setIsOpen(true),  []);
  const closeSettings = useCallback(() => setIsOpen(false), []);

  return (
    <SettingsPanelContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
    </SettingsPanelContext.Provider>
  );
}

export function useSettingsPanel(): SettingsPanelContextValue {
  const ctx = useContext(SettingsPanelContext);
  if (!ctx) throw new Error('useSettingsPanel must be used within SettingsPanelProvider');
  return ctx;
}