import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { BookOpenText, LogOut, PenLine, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export function SiteHeader() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const canWrite = user?.role === "writer" || user?.role === "admin";

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="The Washiez Chronicle home">
          <span className="brand-mark"><BookOpenText size={19} strokeWidth={1.8} /></span>
          <span><strong>The Washiez</strong><em> Chronicle</em></span>
        </Link>
        <nav className="main-nav" aria-label="Primary navigation">
          <Link href="/" className="main-nav__link">Archive</Link>
          <Link href="/about" className="main-nav__link">Editorial policy</Link>
        </nav>
        <div className="header-actions">
          {!loading && !isAuthenticated && (
            <Button size="sm" className="nav-cta" onClick={() => startLogin()}>Sign in</Button>
          )}
          {!loading && isAuthenticated && (
            <>
              <span className="signed-in-name">{user?.name ?? "Account"}</span>
              {canWrite && <Button variant="outline" size="sm" onClick={() => setLocation("/workspace")}><PenLine size={14} /> Write</Button>}
              {user?.role === "admin" && <Button variant="ghost" size="icon" aria-label="Open moderation" onClick={() => setLocation("/admin")}><ShieldCheck size={17} /></Button>}
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={logout}><LogOut size={17} /></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
