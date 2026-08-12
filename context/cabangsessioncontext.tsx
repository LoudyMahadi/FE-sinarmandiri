'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type ActiveStaff = {
  staff_pin_id: string;
  staff_name: string;
  is_supervisor: boolean;
};

type CabangSessionContextType = {
  activeStaff: ActiveStaff | null;
  setActiveStaff: (staff: ActiveStaff | null) => void;
};

const CabangSessionContext = createContext<CabangSessionContextType | undefined>(undefined);

export function CabangSessionProvider({ children }: { children: ReactNode }) {
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);

  return (
    <CabangSessionContext.Provider value={{ activeStaff, setActiveStaff }}>
      {children}
    </CabangSessionContext.Provider>
  );
}

export function useCabangSession() {
  const context = useContext(CabangSessionContext);
  if (!context) {
    throw new Error('useCabangSession harus dipakai di dalam CabangSessionProvider');
  }
  return context;
}