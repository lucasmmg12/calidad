import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import React from 'react';

export type SectorAnswer = {
  cumple: boolean | null;
  demerito: number | null;
  observaciones: string;
};

export type AnswersState = {
  [sectorName: string]: {
    [itemIndex: number]: SectorAnswer;
  };
};

export type PatientExperienceState = {
  email: string;
  name: string;
  service: string;
  ratingGoogle: string;
  evaluation: string;
  information: string;
  recommend: string;
  recommendYesReasons: string[];
  recommendNoReasons: string[];
  finalRating: number | null;
};

type AuditMetadata = {
  auditorName: string;
  auditDate: string;
};

interface WeekendAuditContextProps {
  answers: AnswersState;
  patientExperience: PatientExperienceState;
  metadata: AuditMetadata;
  setAnswer: (sectorName: string, itemIndex: number, answer: SectorAnswer) => void;
  setPatientExperience: (data: Partial<PatientExperienceState>) => void;
  setMetadata: (data: Partial<AuditMetadata>) => void;
  resetAudit: () => void;
  saveToHistory: () => void;
  isAuditComplete: boolean;
}

const defaultPatientExperience: PatientExperienceState = {
  email: '',
  name: '',
  service: '',
  ratingGoogle: '',
  evaluation: '',
  information: '',
  recommend: '',
  recommendYesReasons: [],
  recommendNoReasons: [],
  finalRating: null,
};

const defaultMetadata: AuditMetadata = {
  auditorName: '',
  auditDate: new Date().toISOString().split('T')[0]
};

const STORAGE_KEY = 'weekend_audit_data';

export const WeekendAuditContext = createContext<WeekendAuditContextProps | undefined>(undefined);

export const WeekendAuditProvider = ({ children }: { children: ReactNode }) => {
  const [answers, setAnswersState] = useState<AnswersState>({});
  const [patientExperience, setPatientExperienceState] = useState<PatientExperienceState>(defaultPatientExperience);
  const [metadata, setMetadataState] = useState<AuditMetadata>(defaultMetadata);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.answers) setAnswersState(parsed.answers);
        if (parsed.patientExperience) setPatientExperienceState(parsed.patientExperience);
        if (parsed.metadata) setMetadataState(parsed.metadata);
      }
    } catch (e) {
      console.error('Failed to load audit from localStorage', e);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  React.useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, patientExperience, metadata }));
    }
  }, [answers, patientExperience, metadata, isLoaded]);

  const saveToHistory = () => {
    try {
      const historyStr = localStorage.getItem('weekend_audit_history');
      let history = historyStr ? JSON.parse(historyStr) : [];
      
      const newEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        date: new Date().toISOString(),
        answers,
        patientExperience,
        metadata
      };
      
      history.push(newEntry);
      localStorage.setItem('weekend_audit_history', JSON.stringify(history));
      
      // Limpiar el actual
      setAnswersState({});
      setPatientExperienceState(defaultPatientExperience);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const setAnswer = (sectorName: string, itemIndex: number, answer: SectorAnswer) => {
    setAnswersState(prev => ({
      ...prev,
      [sectorName]: {
        ...(prev[sectorName] || {}),
        [itemIndex]: answer
      }
    }));
  };

  const setPatientExperience = (data: Partial<PatientExperienceState>) => {
    setPatientExperienceState(prev => ({ ...prev, ...data }));
  };

  const setMetadata = (data: Partial<AuditMetadata>) => {
    setMetadataState(prev => ({ ...prev, ...data }));
  };

  const resetAudit = () => {
    setAnswersState({});
    setPatientExperienceState(defaultPatientExperience);
    // Keep metadata but you could reset it too if needed
    localStorage.removeItem(STORAGE_KEY);
  };

  const isAuditComplete = Object.keys(answers).length > 0;

  return (
    <WeekendAuditContext.Provider value={{
      answers,
      patientExperience,
      metadata,
      setAnswer,
      setPatientExperience,
      setMetadata,
      resetAudit,
      saveToHistory,
      isAuditComplete
    }}>
      {children}
    </WeekendAuditContext.Provider>
  );
};

export const useWeekendAudit = () => {
  const context = useContext(WeekendAuditContext);
  if (context === undefined) {
    throw new Error('useWeekendAudit must be used within a WeekendAuditProvider');
  }
  return context;
};
