import { useCallback, useEffect, useState } from 'react';

function getCurrentPath(): string {
  return window.location.pathname === '/' ? '/dashboard' : window.location.pathname;
}

export function useRoute() {
  const [path, setPath] = useState(getCurrentPath);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }

    setPath(getCurrentPath());
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(getCurrentPath());

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { path, navigate };
}
