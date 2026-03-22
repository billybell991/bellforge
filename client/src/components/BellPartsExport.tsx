/**
 * BellParts Export Button
 * 
 * Drop this component into BellForge or BellBox.
 * It renders a small puzzle-piece icon (fixed bottom-left, next to the debug camera).
 * 
 * 🧩 Puzzle button → exports the ENTIRE current page as a self-contained BellPart
 * 🎯 Bullseye button → enters "pick mode" where user clicks a specific element to export just that piece
 * 
 * Requires: html2canvas (already in BellForge, add to BellBox if needed)
 * 
 * Usage:
 *   <BellPartsExport source="BellForge" />
 *   <BellPartsExport source="BellBox" />
 */

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';

const BELLPARTS_API = 'http://localhost:3141/api/parts';

interface BellPartsExportProps {
  source: 'BellForge' | 'BellBox';
}

type ExportState = 'idle' | 'capturing' | 'picking' | 'success' | 'error';

export function BellPartsExport({ source }: BellPartsExportProps) {
  const [state, setState] = useState<ExportState>('idle');
  const pickTargetRef = useRef<HTMLElement | null>(null);
  const pickSourceDocRef = useRef<Document | null>(null); // tracks which document the picked element is in

  // ── Pick Mode: highlight elements on hover, click to capture ──
  // Attaches listeners to both the parent document AND any same-origin iframes
  useEffect(() => {
    if (state !== 'picking') return;

    let lastHighlighted: HTMLElement | null = null;
    const cleanups: (() => void)[] = [];

    function attachToDoc(doc: Document) {
      const handleMouseMove = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.bellparts-export-btn') || target === doc.body || target === doc.documentElement) return;

        if (lastHighlighted && lastHighlighted !== target) {
          lastHighlighted.style.outline = '';
          lastHighlighted.style.outlineOffset = '';
        }
        target.style.outline = '3px solid rgba(184, 134, 11, 0.8)';
        target.style.outlineOffset = '2px';
        lastHighlighted = target;
        pickTargetRef.current = target;
        pickSourceDocRef.current = doc;
      };

      const handleClick = (e: MouseEvent) => {
        const clicked = e.target as HTMLElement;
        if (clicked.closest('.bellparts-export-btn')) return;

        e.preventDefault();
        e.stopPropagation();

        if (lastHighlighted) {
          lastHighlighted.style.outline = '';
          lastHighlighted.style.outlineOffset = '';
        }

        const target = pickTargetRef.current || clicked;
        setState('idle');
        exportElement(target, pickSourceDocRef.current || doc);
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (lastHighlighted) {
            lastHighlighted.style.outline = '';
            lastHighlighted.style.outlineOffset = '';
          }
          setState('idle');
        }
      };

      doc.addEventListener('mousemove', handleMouseMove, true);
      doc.addEventListener('click', handleClick, true);
      doc.addEventListener('keydown', handleEscape);

      cleanups.push(() => {
        if (lastHighlighted) {
          lastHighlighted.style.outline = '';
          lastHighlighted.style.outlineOffset = '';
        }
        doc.removeEventListener('mousemove', handleMouseMove, true);
        doc.removeEventListener('click', handleClick, true);
        doc.removeEventListener('keydown', handleEscape);
      });
    }

    // Attach to the parent document
    attachToDoc(document);

    // Attach to any same-origin iframes (BellForge preview iframe)
    document.querySelectorAll('iframe').forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) attachToDoc(iframeDoc);
      } catch {
        // Cross-origin iframe — skip
      }
    });

    return () => {
      cleanups.forEach(fn => fn());
    };
  }, [state]);

  // ── Export the Full Page ──
  // If an iframe is present (escape room preview), export the iframe content instead
  async function exportFullPage() {
    setState('capturing');
    try {
      // Check for a same-origin iframe (BellForge preview)
      let targetDoc: Document = document;
      let targetBody: HTMLElement = document.body;
      let targetRoot: HTMLElement = document.documentElement;
      const iframe = document.querySelector('iframe') as HTMLIFrameElement | null;
      if (iframe) {
        try {
          const iDoc = iframe.contentDocument;
          if (iDoc?.body) {
            targetDoc = iDoc;
            targetBody = iDoc.body;
            targetRoot = iDoc.documentElement;
          }
        } catch { /* cross-origin, fall back to parent */ }
      }

      // Capture thumbnail
      const canvas = await html2canvas(targetBody, {
        backgroundColor: '#050509',
        scale: 0.5,
        logging: false,
        useCORS: true,
      });
      const thumbnail = canvas.toDataURL('image/png');

      // Serialize the page as self-contained HTML
      const html = targetDoc === document
        ? serializePage(targetRoot)
        : '<!DOCTYPE html>\n' + targetRoot.outerHTML; // iframe already self-contained

      // Prompt for a name
      const name = prompt('Name this BellPart:', targetDoc.title || document.title || 'Untitled Part');
      if (!name) {
        setState('idle');
        return;
      }

      await sendToBellParts({
        name,
        type: 'FULL_ROOM',
        source,
        html,
        thumbnail,
        context: {
          url: window.location.href,
          title: document.title,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        },
      });

      setState('success');
      setTimeout(() => setState('idle'), 1500);
    } catch (err) {
      console.error('[BellParts] Export failed:', err);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  // ── Export a Specific Element ──
  async function exportElement(el: HTMLElement, sourceDoc: Document) {
    setState('capturing');
    try {
      // Capture thumbnail of just the element
      const canvas = await html2canvas(el, {
        backgroundColor: '#050509',
        scale: 0.5,
        logging: false,
        useCORS: true,
        // html2canvas needs the ownerDocument's window
        windowWidth: el.ownerDocument.defaultView?.innerWidth,
        windowHeight: el.ownerDocument.defaultView?.innerHeight,
      });
      const thumbnail = canvas.toDataURL('image/png');

      // Serialize just this element with all its computed styles
      const html = serializeElement(el, sourceDoc);

      const name = prompt(
        'Name this BellPart:',
        el.id || el.className?.split?.(' ')?.[0] || 'Component'
      );
      if (!name) {
        setState('idle');
        return;
      }

      // Determine type based on element size relative to viewport
      const rect = el.getBoundingClientRect();
      const viewportArea = window.innerWidth * window.innerHeight;
      const elArea = rect.width * rect.height;
      const type = elArea > viewportArea * 0.6 ? 'MINIGAME' : 'COMPONENT';

      await sendToBellParts({
        name,
        type,
        source,
        html,
        thumbnail,
        context: {
          selector: buildSelector(el),
          originalRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        },
      });

      setState('success');
      setTimeout(() => setState('idle'), 1500);
    } catch (err) {
      console.error('[BellParts] Element export failed:', err);
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  // ── Shared button style ──
  const btnBase: React.CSSProperties = {
    position: 'fixed',
    bottom: '16px',
    zIndex: 9999,
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(10, 10, 20, 0.75)',
    backdropFilter: 'blur(8px)',
    color: '#a09b99',
    fontSize: '18px',
    cursor: state === 'capturing' ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: 0,
    outline: 'none',
  };

  const puzzleIcon = state === 'capturing' ? '⏳' : state === 'success' ? '✅' : state === 'error' ? '❌' : '🧩';

  return (
    <>
      {/* 🧩 Export full page */}
      <button
        className="bellparts-export-btn"
        onClick={() => { if (state === 'idle') exportFullPage(); }}
        disabled={state === 'capturing' || state === 'picking'}
        title="Export entire page as a BellPart"
        style={{
          ...btnBase,
          left: '64px',
          border: `1px solid ${state === 'success' ? '#22c55e' : state === 'error' ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
          opacity: state === 'idle' ? 0.5 : 1,
          boxShadow: state === 'success'
            ? '0 0 16px rgba(34, 197, 94, 0.4)'
            : state === 'error'
            ? '0 0 12px rgba(239, 68, 68, 0.4)'
            : 'none',
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { if (state === 'idle') (e.target as HTMLElement).style.opacity = '0.5'; }}
      >
        {puzzleIcon}
      </button>

      {/* 🎯 Pick mode */}
      <button
        className="bellparts-export-btn bellparts-pick-btn"
        onClick={() => setState(state === 'picking' ? 'idle' : 'picking')}
        disabled={state === 'capturing'}
        title={state === 'picking' ? 'Cancel pick mode (or press ESC)' : 'Pick a specific element to export'}
        style={{
          ...btnBase,
          left: '112px',
          border: `1px solid ${state === 'picking' ? '#b8860b' : 'rgba(255,255,255,0.15)'}`,
          opacity: state === 'picking' ? 1 : 0.5,
          boxShadow: state === 'picking' ? '0 0 12px rgba(184, 134, 11, 0.4)' : 'none',
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { if (state !== 'picking') (e.target as HTMLElement).style.opacity = '0.5'; }}
      >
        🎯
      </button>
    </>
  );
}


// ════════════════════════════════════════════════════════════
// Serialization Utilities
// ════════════════════════════════════════════════════════════

/**
 * Serialize the entire page into a self-contained HTML string.
 * Captures all stylesheets, inline styles, and scripts.
 */
function serializePage(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;

  // Remove the BellParts export button from the clone
  clone.querySelectorAll('.bellparts-export-btn').forEach(el => el.remove());
  // Remove the debug screenshot button too
  clone.querySelectorAll('.debug-screenshot-btn').forEach(el => el.remove());

  // Gather all computed styles into a single <style> block
  const styles = gatherAllStyles();

  // Build the self-contained HTML
  const head = clone.querySelector('head');
  if (head) {
    // Remove external stylesheets (we've inlined them)
    head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      // Keep Google Fonts links
      const href = link.getAttribute('href') || '';
      if (!href.includes('fonts.googleapis.com') && !href.includes('fonts.gstatic.com')) {
        link.remove();
      }
    });
    // Inject inlined styles
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-bellparts', 'captured');
    styleEl.textContent = styles;
    head.appendChild(styleEl);
  }

  return '<!DOCTYPE html>\n' + clone.outerHTML;
}

/**
 * Serialize a specific element into a standalone HTML page.
 * Captures its computed styles, children, and any relevant scripts.
 */
function serializeElement(el: HTMLElement, sourceDoc: Document = document): string {
  const clone = el.cloneNode(true) as HTMLElement;

  // Gather styles relevant to this element tree
  const styles = gatherElementStyles(el, sourceDoc);

  // Try to capture any inline <script> logic that references this element
  const scripts = gatherRelevantScripts(el, sourceDoc);

  // Find Google Font links (check both parent and source doc)
  const fontLinks = Array.from(sourceDoc.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]'))
    .map(link => link.outerHTML)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BellPart</title>
  ${fontLinks}
  <style data-bellparts="captured">
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #050509;
      overflow: auto;
    }
    ${styles}
  </style>
</head>
<body>
  ${clone.outerHTML}
  ${scripts ? `<script>${scripts}<\/script>` : ''}
</body>
</html>`;
}

/**
 * Gather all CSS rules from all accessible stylesheets.
 */
function gatherAllStyles(): string {
  let allCSS = '';
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (const rule of rules) {
        allCSS += rule.cssText + '\n';
      }
    } catch {
      // CORS-locked stylesheet — skip
    }
  }
  return allCSS;
}

/**
 * Gather CSS rules that apply to a specific element and its children.
 */
function gatherElementStyles(el: HTMLElement, sourceDoc: Document = document): string {
  let relevantCSS = '';
  const ids = new Set<string>();
  const classes = new Set<string>();
  const tags = new Set<string>();

  // Collect all selectors we need from the element tree
  function collectSelectors(node: Element) {
    if (node.id) ids.add(node.id);
    node.classList.forEach(c => classes.add(c));
    tags.add(node.tagName.toLowerCase());
    for (const child of node.children) {
      collectSelectors(child);
    }
  }
  collectSelectors(el);

  // Also capture computed inline styles for the root element
  const sourceWin = sourceDoc.defaultView || window;
  const computed = sourceWin.getComputedStyle(el);
  const importantProps = [
    'background', 'backgroundColor', 'backgroundImage',
    'color', 'font', 'fontFamily', 'fontSize',
    'width', 'height', 'maxWidth', 'maxHeight',
    'padding', 'margin', 'border', 'borderRadius',
    'display', 'flexDirection', 'justifyContent', 'alignItems',
    'position', 'transform', 'transition', 'animation',
    'boxShadow', 'textShadow', 'overflow', 'opacity',
    'gap', 'gridTemplate', 'gridTemplateColumns',
  ];
  // We capture these as a fallback in case stylesheet rules miss something

  for (const sheet of sourceDoc.styleSheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          const sel = rule.selectorText;
          // Check if this rule is relevant to our element tree
          const isRelevant =
            [...ids].some(id => sel.includes(`#${id}`)) ||
            [...classes].some(c => sel.includes(`.${c}`)) ||
            [...tags].some(t => sel === t || sel.startsWith(`${t} `) || sel.includes(` ${t}`)) ||
            sel === ':root' || sel === '*';
          if (isRelevant) {
            relevantCSS += rule.cssText + '\n';
          }
        } else if (rule instanceof CSSKeyframesRule) {
          // Always include keyframes — they might be needed
          relevantCSS += rule.cssText + '\n';
        } else if (rule instanceof CSSMediaRule) {
          // Include media queries that contain relevant rules
          let mediaContent = '';
          for (const innerRule of rule.cssRules) {
            if (innerRule instanceof CSSStyleRule) {
              const sel = innerRule.selectorText;
              const isRelevant =
                [...ids].some(id => sel.includes(`#${id}`)) ||
                [...classes].some(c => sel.includes(`.${c}`));
              if (isRelevant) mediaContent += innerRule.cssText + '\n';
            }
          }
          if (mediaContent) {
            relevantCSS += `@media ${rule.conditionText} {\n${mediaContent}}\n`;
          }
        }
      }
    } catch {
      // CORS — skip
    }
  }

  return relevantCSS;
}

/**
 * Try to extract script content relevant to an element.
 * Looks for inline scripts that reference the element's ID or classes.
 */
function gatherRelevantScripts(el: HTMLElement, sourceDoc: Document = document): string {
  const scripts: string[] = [];
  const markers = [el.id, ...el.classList].filter(Boolean);

  for (const script of sourceDoc.querySelectorAll('script:not([src])')) {
    const content = script.textContent || '';
    if (markers.some(m => content.includes(m))) {
      scripts.push(content);
    }
  }

  // Also look for a GAME data object (common in BellForge escape rooms)
  for (const script of sourceDoc.querySelectorAll('script:not([src])')) {
    const content = script.textContent || '';
    if (content.includes('const GAME') || content.includes('const gameData')) {
      if (!scripts.includes(content)) {
        scripts.push(content);
      }
    }
  }

  return scripts.join('\n\n');
}

/**
 * Build a CSS-like selector for an element (for metadata/debugging).
 */
function buildSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList).slice(0, 3).join('.');
  const tag = el.tagName.toLowerCase();
  return classes ? `${tag}.${classes}` : tag;
}

/**
 * Send the packaged part to BellParts server.
 */
async function sendToBellParts(payload: {
  name: string;
  type: string;
  source: string;
  html: string;
  thumbnail: string;
  context: Record<string, unknown>;
}): Promise<void> {
  const res = await fetch(BELLPARTS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BellParts server error: ${err}`);
  }
}
