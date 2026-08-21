import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type SectorAnswer = {
  demerito: number | null;
  observaciones: string;
};

type AnswersState = {
  [sectorName: string]: {
    [itemIndex: number]: SectorAnswer;
  };
};

type PatientExperienceState = {
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

interface WeekendAuditContextProps {
  answers: AnswersState;
  patientExperience: PatientExperienceState;
  setAnswer: (sectorName: string, itemIndex: number, answer: SectorAnswer) => void;
  setPatientExperience: (data: Partial<PatientExperienceState>) => void;
  resetAudit: () => void;
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

const WeekendAuditContext = createContext<WeekendAuditContextProps | undefined>(undefined);

export const WeekendAuditProvider = ({ children }: { children: ReactNode }) => {
  const [answers, setAnswers] = useState<AnswersState>({});
  const [patientExperience, setPatientExperienceState] = useState<PatientExperienceState>(defaultPatientExperience);

  const setAnswer = (sectorName: string, itemIndex: number, answer: SectorAnswer) => {
    setAnswers(prev => ({
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

  const resetAudit = () => {
    setAnswers({});
    setPatientExperienceState(defaultPatientExperience);
  };

  // Basic completeness check: at least some sectors answered or we just return true for now and let UI handle validation
  const isAuditComplete = Object.keys(answers).length > 0;

  return (
    <WeekendAuditContext.Provider value={{
      answers,
      patientExperience,
      setAnswer,
      setPatientExperience,
      resetAudit,
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
