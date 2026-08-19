import { BookMarked, Scale, SearchCheck } from "lucide-react";

export default function EditorialPolicy() {
  return <main className="policy-shell">
    <div className="page-intro"><span className="section-kicker"><BookMarked size={15} /> Editorial policy</span><h1>A public record, handled with care.</h1><p>The Washiez Chronicle is structured as a community reference and blog. It is intended to make the game’s history, updates, and discussions easier to find—not to amplify unverified claims.</p></div>
    <div className="policy-grid">
      <article><SearchCheck size={22} /><h2>Source-aware writing</h2><p>Writers should link to primary materials when they are available, identify speculation as such, and provide enough context for readers to reach their own conclusions.</p></article>
      <article><Scale size={22} /><h2>Fair presentation</h2><p>Posts should separate documented events from commentary, avoid harassment, and use measured language for contested topics or ongoing disputes.</p></article>
      <article><BookMarked size={22} /><h2>Editorial review</h2><p>New contributors apply before receiving writer access. The site owner can revise access, unpublish content, or moderate comments when the standards are not met.</p></article>
    </div>
  </main>;
}
