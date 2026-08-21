import { useState, useEffect, useCallback } from 'react';
import { DiagramData } from './diagramUtils';

interface PersistedDiagramData extends Omit<DiagramData, 'icons'> {
  // We omit icons from persisted data to save space
}

export const usePersistedDiagram = (
  icons: any[],
  enabled: boolean = true
) => {
  // Helper to add icons back to diagram data
  const addIconsToDiagram = useCallback((data: PersistedDiagramData): DiagramData => {
    if (!enabled) {
      return data as DiagramData;
    }
    return {
      ...data,
      icons: icons
    };
  }, [icons, enabled]);

  // Helper to remove icons before persisting
  const removeIconsFromDiagram = useCallback((data: DiagramData): PersistedDiagramData => {
    const { icons: _, ...dataWithoutIcons } = data;
    return dataWithoutIcons;
  }, []);

  // Safe localStorage operations
  const safeSetItem = useCallback((key: string, value: string) => {
    if (!enabled) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`Failed to save to localStorage (${key}):`, e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        // Try to clear some space
        const keysToCheck = ['fossflow-last-opened-data', 'fossflow-temp-data'];
        keysToCheck.forEach(k => {
          if (k !== key) {
            localStorage.removeItem(k);
          }
        });
        // Try again
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (e2) {
          console.error('Still failed after clearing space:', e2);
          return false;
        }
      }
      return false;
    }
  }, [enabled]);

  const safeGetItem = useCallback((key: string): string | null => {
    if (!enabled) return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`Failed to read from localStorage (${key}):`, e);
      return null;
    }
  }, [enabled]);

  return {
    addIconsToDiagram,
    removeIconsFromDiagram,
    safeSetItem,
    safeGetItem
  };
};