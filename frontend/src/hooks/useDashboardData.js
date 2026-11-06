import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { createDashboardSync, emptyData } from '../services/dashboardSync';

const initialState = () => ({
  data: emptyData(),
  loading: false,
  errors: {},
  queryLatency: null,
  lastSync: null,
  checked: false,
  realtime: 'polling',
});

export function useDashboardData(enabled) {
  const [state, setState] = useState(initialState);
  const syncRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const sync = createDashboardSync(getSupabaseClient(), (patch) => {
      setState((previous) => ({ ...previous, ...patch }));
    });
    syncRef.current = sync;
    const refresh = () => void sync.refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      sync.stop();
      syncRef.current = null;
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  const refresh = useCallback(() => syncRef.current?.refresh(), []);
  return { ...state, refresh };
}
