import { createContext, type ReactNode, useContext } from 'react';
import { useWorkbenchController } from '../hooks/useWorkbenchController';

const Context = createContext<ReturnType<typeof useWorkbenchController> | null>(null);
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useWorkbenchController()}>{children}</Context.Provider>;
}
export function useWorkbench() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkbenchProvider is required');
  return value;
}
