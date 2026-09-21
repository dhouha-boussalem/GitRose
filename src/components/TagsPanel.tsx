import { useState, useEffect } from 'react';

interface Tag {
  name: string;
  hash: string;
  date: string;
  message: string;
}

interface TagsPanelProps {
  repoPath: string;
  onClose: () => void;
}

export function TagsPanel({ repoPath, onClose }: TagsPanelProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHash, setNewHash] = useState('HEAD');
  const [newMsg, setNewMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function load() {
    setLoading(true);
    const t = await window.gitRose.getTags(repoPath).catch(() => []);
    setTags(t);
    setLoading(false);
  }

  useEffect(() => { load(); }, [repoPath]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await window.gitRose.createTag(repoPath, name, newHash.trim() || 'HEAD', newMsg.trim() || undefined);
      setCreating(false);
      setNewName(''); setNewHash('HEAD'); setNewMsg('');
      await load();
      showToast(`Tag ${name} créé`);
    } catch (e: any) {
      showToast(`Erreur : ${e?.message ?? 'échec'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(name: string) {
    setBusy(true);
    try {
      await window.gitRose.deleteTag(repoPath, name);
      setDeleteConfirm(null);
      await load();
      showToast(`Tag ${name} supprimé`);
    } catch (e: any) {
      showToast(`Erreur : ${e?.message ?? 'échec'}`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePush(name: string) {
    setBusy(true);
    try {
      await window.gitRose.pushTag(repoPath, name);
      showToast(`Tag ${name} pushé`);
    } catch (e: any) {
      showToast(`Erreur : ${e?.message ?? 'échec'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tags-overlay" onClick={onClose}>
      <div className="tags-panel" onClick={(e) => e.stopPropagation()}>
        <div className="tags-header">
          <span className="tags-title">🏷 Tags</span>
          <button className="tags-close" onClick={onClose}>✕</button>
        </div>

        <div className="tags-toolbar">
          <button className="tags-new-btn" onClick={() => setCreating(!creating)}>+ Nouveau tag</button>
        </div>

        {creating && (
          <div className="tags-create-form">
            <input className="tags-input" placeholder="Nom du tag (ex: v1.0.0)" autoFocus
              value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <input className="tags-input" placeholder="Commit / HEAD"
              value={newHash} onChange={(e) => setNewHash(e.target.value)}
            />
            <input className="tags-input" placeholder="Message (optionnel — crée un tag annoté)"
              value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
            <div className="tags-create-actions">
              <button className="tags-btn primary" disabled={busy || !newName.trim()} onClick={handleCreate}>
                {busy ? '…' : 'Créer'}
              </button>
              <button className="tags-btn ghost" onClick={() => setCreating(false)}>Annuler</button>
            </div>
          </div>
        )}

        <div className="tags-list">
          {loading ? (
            <div className="tags-hint">Chargement…</div>
          ) : tags.length === 0 ? (
            <div className="tags-hint">Aucun tag dans ce dépôt</div>
          ) : tags.map((tag) => (
            <div key={tag.name} className="tag-row">
              <div className="tag-info">
                <span className="tag-name">{tag.name}</span>
                <code className="tag-hash">{tag.hash}</code>
                {tag.message && <span className="tag-message">{tag.message}</span>}
                <span className="tag-date">{tag.date}</span>
              </div>
              <div className="tag-actions">
                <button className="tag-btn push" title="Pusher vers origin" disabled={busy}
                  onClick={() => handlePush(tag.name)}>↑</button>
                <button className="tag-btn delete" title="Supprimer" disabled={busy}
                  onClick={() => setDeleteConfirm(tag.name)}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {deleteConfirm && (
          <div className="tags-confirm-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="tags-confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="tags-confirm-title">Supprimer le tag</div>
              <div className="tags-confirm-desc">Supprimer <strong>{deleteConfirm}</strong> localement ?</div>
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
    </div>
  );
}
