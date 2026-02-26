import { useEnvironment } from '@/hooks/useEnvironment';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Adaptive layout component:
 * - LINE (LIFF): Hides browser-like header for native feel
 * - Web browser: Shows navigation bar with links
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { isLiff, initialized, profile } = useEnvironment();
  const navigate = useNavigate();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">初期化中...</p>
      </div>
    );
  }

  // LIFF mode: no header, native LINE feel
  if (isLiff) {
    return (
      <div className="min-h-screen bg-background pb-4">
        {profile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-xs text-muted-foreground">
            {profile.pictureUrl && (
              <img src={profile.pictureUrl} alt="" className="h-5 w-5 rounded-full" />
            )}
            <span>{profile.displayName}</span>
          </div>
        )}
        {children}
      </div>
    );
  }

  // Web mode: show navigation header
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background">
      {/* Web navigation bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-12 max-w-2xl items-center gap-4 px-4">
          <button
            className="font-bold text-lg text-primary cursor-pointer"
            onClick={() => navigate('/')}
          >
            Nomikai OS
          </button>
          <div className="flex-1" />
          {!isHome && (
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              イベント一覧
            </Button>
          )}
        </div>
      </header>
      <main className="pb-12">
        {children}
      </main>
    </div>
  );
}
