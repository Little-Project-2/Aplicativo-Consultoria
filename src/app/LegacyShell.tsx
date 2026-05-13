import { useEffect } from 'react';

import { loadLegacyAppScript } from '../legacy/bootstrapLegacyApp';
import { useAppShellStore } from '../store/appShellStore';

const legacyPages = [
  'pages/profile-create.html',
  'pages/profile-setup.html',
  'pages/student-login.html',
  'pages/student-confirm.html',
  'pages/student-questionnaire.html',
  'pages/student-dashboard.html',
  'pages/student-workout.html',
  'pages/student-diet.html'
];

export function LegacyShell() {
  const setLegacyReady = useAppShellStore((state) => state.setLegacyReady);

  useEffect(() => {
    let mounted = true;

    loadLegacyAppScript()
      .then(() => {
        if (mounted) setLegacyReady(true);
      })
      .catch((error: unknown) => {
        console.error('Falha ao carregar app legado:', error);
      });

    return () => {
      mounted = false;
    };
  }, [setLegacyReady]);

  return (
    <>
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />
      <div id="app">
        {legacyPages.map((page) => (
          <div data-page={page} key={page} />
        ))}
      </div>
    </>
  );
}
