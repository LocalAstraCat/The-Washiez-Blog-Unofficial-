import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { isValidUsername, signInWithIdentifier, signUpWithUsername } from "@/lib/supabase";
import { CheckCircle2, KeyRound, MailCheck, UserRoundPlus } from "lucide-react";
import { useState } from "react";

export function ChronicleAccountDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const resetState = (nextMode: "sign-in" | "sign-up") => { setMode(nextMode); setError(undefined); setNotice(undefined); setPassword(""); setConfirmPassword(""); };
  const submit = async () => {
    setError(undefined); setNotice(undefined); setBusy(true);
    try {
      if (mode === "sign-in") {
        await signInWithIdentifier(username, password);
        setOpen(false);
      } else {
        if (!isValidUsername(username)) throw new Error("Choose a username with 3–24 letters, numbers, underscores, or hyphens.");
        if (password !== confirmPassword) throw new Error("Your passwords do not match.");
        const result = await signUpWithUsername({ username, password, email });
        setNotice(result.verificationSent ? "Your account is ready. Check your inbox to verify the optional email address." : "Your account is ready. You can add a verified email later from your account." );
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your account request could not be completed."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" className="nav-cta">Sign in</Button></DialogTrigger><DialogContent className="account-dialog"><DialogHeader><span className="section-kicker"><KeyRound size={14} /> Chronicle account</span><DialogTitle>{mode === "sign-in" ? "Welcome back." : "Join the Chronicle."}</DialogTitle><DialogDescription>{mode === "sign-in" ? "Use your username, or a verified email address, and password." : "A username and password are required. Email is optional, but recommended for account recovery and updates."}</DialogDescription></DialogHeader><div className="account-dialog__tabs"><button className={mode === "sign-in" ? "active" : ""} onClick={() => resetState("sign-in")}>Sign in</button><button className={mode === "sign-up" ? "active" : ""} onClick={() => resetState("sign-up")}>Create account</button></div><div className="account-dialog__form"><label>{mode === "sign-in" ? "Username or verified email" : "Username"}<Input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={mode === "sign-in" ? "washiez_reader or you@example.com" : "washiez_reader"} /></label>{mode === "sign-up" && <label>Email <small>Optional, recommended</small><Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>}<label>Password<Input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>{mode === "sign-up" && <label>Confirm password<Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></label>}</div>{mode === "sign-up" && <div className="account-dialog__note"><MailCheck size={16} /><span>When you add an email, we send a verification link. Your username always remains your public Chronicle identity.</span></div>}{error && <p className="form-error">{error}</p>}{notice && <p className="account-dialog__success"><CheckCircle2 size={16} /> {notice}</p>}<Button disabled={busy} onClick={() => void submit()}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}{mode === "sign-in" ? <KeyRound size={15} /> : <UserRoundPlus size={15} />}</Button></DialogContent></Dialog>;
}
