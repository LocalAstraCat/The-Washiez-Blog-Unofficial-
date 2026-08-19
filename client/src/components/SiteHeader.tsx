import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ChronicleAccountDialog } from "@/components/ChronicleAccountDialog";
import { BookOpenText, LogOut, MessageSquareText, PenLine, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

export function SiteHeader() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const canWrite = user?.role === "writer" || user?.role === "admin";
  return <header className="site-header"><div className="site-header__inner"><Link href="/" className="brand" aria-label="The Washiez Chronicle home"><span className="brand-mark"><BookOpenText size={18} strokeWidth={1.8} /></span><span><strong>The Washiez</strong><em> Chronicle</em></span></Link><nav className="main-nav" aria-label="Main navigation"><Link href="/" className="main-nav__link">Posts</Link><Link href="/about" className="main-nav__link">Guidelines</Link></nav><div className="header-actions">{!loading && !isAuthenticated && <ChronicleAccountDialog />}{!loading && isAuthenticated && <><span className="signed-in-name">{user?.name ?? "Account"}</span>{user?.pendingEmail && !user.emailVerified && <span className="verify-email">Email saved</span>}{canWrite && <Button variant="outline" size="sm" onClick={() => setLocation("/workspace")}><PenLine size={14} /> My drafts</Button>}{canWrite && <Button variant="outline" size="sm" onClick={() => setLocation("/chat")}><MessageSquareText size={14} /> Staff chat</Button>}{user?.role === "admin" && <Button variant="ghost" size="icon" aria-label="Open admin tools" onClick={() => setLocation("/admin")}><ShieldCheck size={17} /></Button>}<Button variant="ghost" size="icon" aria-label="Sign out" onClick={logout}><LogOut size={17} /></Button></>}</div></div></header>;
}
