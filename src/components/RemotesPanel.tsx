import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Remote { name: string; fetchUrl: string; pushUrl: string; }

interface RemotesPanelProps {
  repoPath: string;
  onClose: () => void;
}

export function RemotesPanel({ repoPath, onClose }: RemotesPanelProps) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Add form
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Edit state: remoteName -> { name, url }
  const [editing, setEditing] = useState<Record<string, { name: string; url: string }>>({});

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    setLoading(true);
    const r = await window.gitRose.getRemotes(repoPath).catch(() => []);
    setRemotes(r);
    setLoading(false);
  }

  useEffect(() => { load(); }, [repoPath]);

  async function handleAdd() {
    const name = newName.trim(); const url = newUrl.trim();
    if (!name || !url) return;
    setBusy(true);
    try {
      await window.gitRose.addRemote(repoPath, name, url);
      setAdding(false); setNewName(''); setNewUrl('');
      await load(); showToast(`Remote "${name}" ajouté`);
    } catch (e: any) { showToast(`Erreur : ${e?.message ?? 'échec'}`); }
    finally { setBusy(false); }
  }

  async function handleDelete(name: string) {
    setBusy(true);
    try {
      await window.gitRose.removeRemote(repoPath, name);
      setDeleteConfirm(null); await load(); showToast(`Remote "${name}" supprimé`);
    } catch (e: any) { showToast(`Erreur : ${e?.message ?? 'échec'}`); }
    finally { setBusy(false); }
  }

  async function handleSaveEdit(original: string) {
    const e = editing[original];
    if (!e) return;
    setBusy(true);
    try {
      if (e.url !== remotes.find(r => r.name === original)?.fetchUrl) {
        await window.gitRose.setRemoteUrl(repoPath, original, e.url);
      }
      if (e.name !== original) {
        await window.gitRose.renameRemote(repoPath, original, e.name);
      }
      setEditing(prev => { const n = { ...prev }; delete n[original]; return n; });
      await load(); showToast('Remote mis à jour');
    } catch (ex: any) { showToast(`Erreur : ${ex?.message ?? 'échec'}`); }
    finally { setBusy(false); }
  }

  function startEdit(r: Remote) {
    setEditing(prev => ({ ...prev, [r.name]: { name: r.name, url: r.fetchUrl } }));
  }

  return createPortal(
    <div className="tags-overlay" onClick={onClose}>
      <div className="remotes-panel" onClick={e => e.stopPropagation()}>
        <div className="tags-header">
          <span className="tags-title">⚡ Remotes</span>
          <button className="tags-close" onClick={onClose}>✕</button>
        </div>

        <div className="tags-toolbar">
          <button className="tags-new-btn" onClick={() => setAdding(a => !a)}>+ Nouveau remote</button>
        </div>

        {adding && (
          <div className="tags-create-form">
            <input className="clone-input" placeholder="Nom (ex: origin)" autoFocus
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            />
            <input className="clone-input" placeholder="URL"
              value={newUrl} onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            />
            <div className="tags-create-actions">
              <button className="tags-btn primary" disabled={busy || !newName.trim() || !newUrl.trim()} onClick={handleAdd}>
                {busy ? '…' : 'Ajouter'}
              </button>
              <button className="tags-btn ghost" onClick={() => setAdding(false)}>Annuler</button>
            </div>
          </div>
        )}

        <div className="tags-list">
          {loading ? <div className="tags-hint">Chargement…</div>
            : remotes.length === 0 ? <div className="tags-hint">Aucun remote configuré</div>
            : remotes.map(r => {
              const ed = editing[r.name];
              return (
                <div key={r.name} className="remote-row">
                  {ed ? (
                    <div className="remote-edit-form">
                      <input className="clone-input" value={ed.name}
                        onChange={e => setEditing(p => ({ ...p, [r.name]: { ...p[r.name], name: e.target.value } }))}
                        placeholder="Nom"
                      />
                      <input className="clone-input" value={ed.url}
                        onChange={e => setEditing(p => ({ ...p, [r.name]: { ...p[r.name], url: e.target.value } }))}
                        placeholder="URL"
                      />
                      <div className="tags-create-actions">
                        <button className="tags-btn primary" disabled={busy} onClick={() => handleSaveEdit(r.name)}>
                          {busy ? '…' : 'Enregistrer'}
                        </button>
                        <button className="tags-btn ghost" onClick={() => setEditing(p => { const n = { ...p }; delete n[r.name]; return n; })}>Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="remote-info">
                        <span className="remote-name">{r.name}</span>
                        <span className="remote-url">{r.fetchUrl}</span>
                        {r.pushUrl && r.pushUrl !== r.fetchUrl && (
                          <span className="remote-url push">push: {r.pushUrl}</span>
                        )}
                      </div>
                      <div className="tag-actions">
                        <button className="tag-btn" title="Modifier" disabled={busy} onClick={() => startEdit(r)}>✎</button>
                        <button className="tag-btn delete" title="Supprimer" disabled={busy} onClick={() => setDeleteConfirm(r.name)}>✕</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>

        {deleteConfirm && (
          <div className="tags-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="tags-confirm-box" onClick={e => e.stopPropagation()}>
              <div className="tags-confirm-title">Supprimer le remote</div>
              <div className="tags-confirm-desc">Supprimer <strong>{deleteConfirm}</strong> ?</div>
              <div className="tags-confirm-actions">
                <button className="tags-btn danger" disabled={busy} onClick={() => handleDelete(deleteConfirm)}>
                  {busy ? '…' : 'Supprimer'}
                </button>
                <button className="tags-btn ghost" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="tags-toast">{toast}</div>}
      </div>
    </div>,
    document.body
  );
}
