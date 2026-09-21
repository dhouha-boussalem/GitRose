import { useState } from 'react';
import { createPortal } from 'react-dom';

interface CloneDialogProps {
  onClose: () => void;
  onCloned: (path: string) => void;
}

export function CloneDialog({ onClose, onCloned }: CloneDialogProps) {
  const [url, setUrl] = useState('');
  const [dest, setDest] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pickDir() {
    const p = await window.gitRose.pickCloneDir();
    if (p) setDest(p);
  }

  async function handleClone() {
    const trimUrl = url.trim();
    const trimDest = dest.trim();
    if (!trimUrl || !trimDest) return;
    setBusy(true);
    setError('');
    try {
      const repoPath = await window.gitRose.cloneRepo(trimUrl, trimDest);
      onCloned(repoPath);
    } catch (e: any) {
      setError(e?.message ?? 'Clonage échoué');
      setBusy(false);
    }
  }

  return createPortal(
    <div className="tags-overlay" onClick={onClose}>
      <div className="clone-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="tags-header">
          <span className="tags-title">⬇ Cloner un dépôt</span>
          <button className="tags-close" onClick={onClose}>✕</button>
        </div>

        <div className="clone-body">
          <label className="clone-label">URL du dépôt</label>
          <input
            className="clone-input"
            placeholder="https://github.com/user/repo.git"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            disabled={busy}
          />

          <label className="clone-label">Dossier de destination</label>
          <div className="clone-dest-row">
            <input
              className="clone-input"
              placeholder="Choisir un dossier…"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              disabled={busy}
            />
            <button className="clone-browse-btn" onClick={pickDir} disabled={busy}>
              Parcourir…
            </button>
          </div>

          {error && <div className="clone-error">{error}</div>}

          <div className="clone-actions">
            <button
              className="tags-btn primary"
              disabled={busy || !url.trim() || !dest.trim()}
              onClick={handleClone}
            >
              {busy ? <><span className="loading-spinner" style={{ width: 12, height: 12 }} /> Clonage…</> : 'Cloner'}
            </button>
            <button className="tags-btn ghost" onClick={onClose} disabled={busy}>Annuler</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
