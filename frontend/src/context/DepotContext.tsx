import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Depot } from '../types/depot';
import { listDepots, getDepot } from '../services/depotsService';
import { getErrorMessage } from '../utils/errorUtils';

const ACTIVE_DEPOT_KEY = 'active_depot_id';

export interface DepotContextValue {
  depots: Depot[];
  activeDepot: Depot | null;
  isLoading: boolean;
  error: string | null;
  setActiveDepot: (depot: Depot | null) => void;
  setActiveDepotById: (depotId: string) => Promise<void>;
  refreshDepots: () => Promise<void>;
}

export const DepotContext = createContext<DepotContextValue | null>(null);

function getStoredDepotId(): string | null {
  return localStorage.getItem(ACTIVE_DEPOT_KEY);
}

function storeDepotId(depotId: string): void {
  localStorage.setItem(ACTIVE_DEPOT_KEY, depotId);
}

function clearDepotId(): void {
  localStorage.removeItem(ACTIVE_DEPOT_KEY);
}

interface DepotProviderProps {
  children: React.ReactNode;
}

export function DepotProvider({ children }: DepotProviderProps): React.ReactElement {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [activeDepot, setActiveDepotState] = useState<Depot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDepots = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listDepots({ page: 1, pageSize: 200 });
      setDepots(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setDepots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await listDepots({ page: 1, pageSize: 200 });
        if (!cancelled) {
          setDepots(response.data);

          const storedId = getStoredDepotId();
          if (storedId) {
            const found = response.data.find((d) => d.id === storedId) ?? null;
            if (found) {
              setActiveDepotState(found);
            } else {
              // Try fetching directly in case it's not on the first page
              try {
                const fetched = await getDepot(storedId);
                if (!cancelled) {
                  setActiveDepotState(fetched);
                }
              } catch {
                // Stored depot no longer accessible — clear it
                clearDepotId();
                setActiveDepotState(null);
              }
            }
          } else if (response.data.length > 0) {
            // Default to the first available depot
            setActiveDepotState(response.data[0]);
            storeDepotId(response.data[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setDepots([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveDepot = useCallback((depot: Depot | null): void => {
    setActiveDepotState(depot);
    if (depot) {
      storeDepotId(depot.id);
    } else {
      clearDepotId();
    }
  }, []);

  const setActiveDepotById = useCallback(
    async (depotId: string): Promise<void> => {
      setError(null);
      const existing = depots.find((d) => d.id === depotId);
      if (existing) {
        setActiveDepot(existing);
        return;
      }
      try {
        const fetched = await getDepot(depotId);
        setActiveDepot(fetched);
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [depots, setActiveDepot],
  );

  const value = useMemo<DepotContextValue>(
    () => ({
      depots,
      activeDepot,
      isLoading,
      error,
      setActiveDepot,
      setActiveDepotById,
      refreshDepots,
    }),
    [depots, activeDepot, isLoading, error, setActiveDepot, setActiveDepotById, refreshDepots],
  );

  return <DepotContext.Provider value={value}>{children}</DepotContext.Provider>;
}

export default DepotProvider;
