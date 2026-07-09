import { useState, useRef, useEffect, useCallback } from 'react';

interface ConsoleLine {
  id: number;
  type: 'input' | 'output' | 'error';
  text: string;
}

interface GitConsoleProps {
  repoPath: string;
  onClose: () => void;
}

function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;
  for (const ch of input) {
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ' ' && current) {
      args.push(current);
      current = '';
    } else if (ch !== ' ') {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

let lineId = 0;

export function GitConsole({ repoPath, onClose }: GitConsoleProps) {
  const [expanded, setExpanded] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>([
    { id: lineId++, type: 'output', text: `git console — ${repoPath}` },
    { id: lineId++, type: 'output', text: 'Tape une commande git (ex: log --oneline -10, status, diff)' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const history = useRef<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const append = useCallback((type: ConsoleLine['type'], text: string) => {
    setLines((prev) => [...prev, { id: lineId++, type, text }]);
  }, []);

  async function handleSubmit() {
    const raw = input.trim();
    if (!raw || busy) return;
    setInput('');
    setHistoryIdx(-1);
    history.current = [raw, ...history.current.slice(0, 49)];
    append('input', `$ git ${raw.startsWith('git ') ? raw.slice(4) : raw}`);
    setBusy(true);
    try {
      const args = parseArgs(raw);
      const out = await window.gitRose.runCommand(repoPath, args);
      if (out.trim()) {
        for (const line of out.split('\n')) {
          append('output', line);
        }
      } else {
        append('output', '(no output)');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      for (const line of msg.split('\n')) {
        append('error', line);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { handleSubmit(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.current.length - 1);
      setHistoryIdx(next);
      setInput(history.current[next] ?? '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) { setHistoryIdx(-1); setInput(''); }
      else { setHistoryIdx(next); setInput(history.current[next] ?? ''); }
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  }

  return (
    <div className={`git-console ${expanded ? 'expanded' : ''}`}>
      <div className="git-console-header">
        <span className="git-console-title">
          <span className="git-console-icon">{'>'}_</span>
          Console git
        </span>
        <div className="git-console-hints">
          <span>↑↓ historique</span>
          <span>Ctrl+L effacer</span>
        </div>
        <button
          className="git-console-close"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? 'Réduire' : 'Agrandir'}
        >
          {expanded ? '⬇' : '⬆'}
        </button>
        <button className="git-console-close" onClick={onClose} title="Fermer">✕</button>
      </div>

      <div className="git-console-output" onClick={() => inputRef.current?.focus()}>
        {lines.map((line) => (
          <div key={line.id} className={`console-line ${line.type}`}>
            {line.text}
          </div>
        ))}
        {busy && <div className="console-line output console-busy">…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="git-console-input-row">
        <span className="console-prompt">$ git</span>
        <input
          ref={inputRef}
          className="git-console-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="status"
          spellCheck={false}
          disabled={busy}
        />
        <button
          className="git-console-run"
          onClick={handleSubmit}
          disabled={busy || !input.trim()}
        >
          {busy ? <span className="btn-spinner" /> : '↵'}
        </button>
      </div>
    </div>
  );
}
