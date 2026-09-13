import Link from "next/link";
import type { ReactNode } from "react";

export type DocumentSection = { id: string; title: string; content: ReactNode };

export function DocumentPage({ title, intro, notice, sections, date = "Last reviewed 13 September 2026" }: {
  title: string; intro: string; notice?: string; sections: DocumentSection[]; date?: string;
}) {
  return <main id="main-content" tabIndex={-1}>
    <header className="pp-shell pp-guide-hero pp-document-hero">
      <h1 className="pp-inner-h1">{title}</h1><p className="pp-lead">{intro}</p>
      <p className="pp-small pp-document-date">{date}</p>
      {notice && <p className="pp-document-notice">{notice}</p>}
    </header>
    <div className="pp-shell pp-document-layout">
      <nav className="pp-document-contents" aria-label="On this page"><h2 className="pp-footer-label">On this page</h2><ol>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav>
      <div className="pp-document-body">{sections.map((section) => <section key={section.id} id={section.id} tabIndex={-1} aria-labelledby={`${section.id}-heading`}>
        <h2 className="pp-h3" id={`${section.id}-heading`}>{section.title}</h2><div className="pp-document-copy">{section.content}</div>
      </section>)}<p className="pp-document-end">Questions about this information? <Link href="/contact" prefetch={false}>Visit the contact page</Link>.</p></div>
    </div>
  </main>;
}
