import { useState, useEffect, useCallback } from 'react';

interface Stash {
  index: number;
  message: string;
  branch: string;
}

interface StashPanelProps {
  repoPath: string;
  onRefresh: () => void;
}

export function StashPanel({ repoPath, onRefresh }: StashPanelProps) {
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stashMsg, setStashMsg] = useState('');
  const [busy, setBusy] = useState<number | 'save' | null>(null);
  const [error, setError] = useState('');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadStashes = useCallback(async () => {
    const list = await window.gitRose.stashList(repoPath).catch(() => []);
    setStashes(list);
  }, [repoPath]);

  useEffect(() => { loadStashes(); }, [loadStashes]);

  async function togglePreview(index: number) {
    if (previewIndex === index) {
      setPreviewIndex(null);
      setPreviewContent('');
      return;
    }
    setPreviewIndex(index);
    setPreviewLoading(true);
    try {
      const content = await window.gitRose.stashShow(repoPath, index);
      setPreviewContent(content);
    } catch (e: any) {
      setPreviewContent(`Erreur: ${e?.message ?? 'impossible de lire le stash'}`);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave() {
    setBusy('save');
    setError('');
    try {
      await window.gitRose.stashSave(repoPath, stashMsg.trim() || undefined);
      setStashMsg('');
      setSaving(false);
      await loadStashes();
      onRefresh();
    } catch (e: any) {
      setError(e?.message ?? 'Stash failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleApply(index: number) {
    setBusy(index);
    setError('');
    try {
      await window.gitRose.stashApply(repoPath, index);
      await loadStashes();
      onRefresh();
    } catch (e: any) {
      setError(e?.message ?? 'Apply failed');
    } finally {
      setBusy(null);
    }
  }

  async function handlePop(index: number) {
    setBusy(index);
    setError('');
    try {
      await window.gitRose.stashPop(repoPath, index);
      await loadStashes();
      onRefresh();
    } catch (e: any) {
      setError(e?.message ?? 'Pop failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleDrop(index: number) {
    if (!window.confirm(`Supprimer stash@{${index}} ?`)) return;
    setBusy(index);
    setError('');
    try {
      await window.gitRose.stashDrop(repoPath, index);
      await loadStashes();
    } catch (e: any) {
      setError(e?.message ?? 'Drop failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stash-panel">
      <div className="sidebar-label stash-label" onClick={() => setCollapsed((v) => !v)}>
        <span className="stash-collapse-arrow">{collapsed ? '▶' : '▼'}</span>
        STASH
        <span className="stash-count">{stashes.length > 0 ? stashes.length : ''}</span>
        <button
          className="sidebar-new-branch-btn"
          onClick={(e) => { e.stopPropagation(); setSaving((v) => !v); setStashMsg(''); }}
          title="Stasher les changements"
        >+</button>
      </div>

      {!collapsed && (
        <>
          {error && (
            <div className="stash-error">
              <span>{error}</span>
              <button onClick={() => setError('')}>✕</button>
            </div>
          )}

          {saving && (
            <div className="stash-save-row">
              <input
                className="sidebar-new-branch-input"
                placeholder="Message (optionnel)…"
                value={stashMsg}
                autoFocus
                onChange={(e) => setStashMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') { setSaving(false); setStashMsg(''); }
                }}
              />
              <button
                className="stash-save-btn"
                onClick={handleSave}
                disabled={busy === 'save'}
              >
                {busy === 'save' ? <span className="btn-spinner" /> : 'Stash'}
              </button>
            </div>
          )}

          {stashes.length === 0 && !saving && (
            <div className="action-empty">Aucun stash</div>
          )}

          {stashes.map((s) => (
            <div key={s.index} className="stash-item">
              <div className="stash-item-info">
                <span className="stash-item-index">#{s.index}</span>
                <span className="stash-item-msg">{s.message.replace(/^WIP on [^:]+: /, '')}</span>
              </div>
              <div className="stash-item-actions">
                <button
                  className={`stash-action-btn ${previewIndex === s.index ? 'active' : ''}`}
                  onClick={() => togglePreview(s.index)}
                  title="Voir le contenu"
                >
                  {previewLoading && previewIndex === s.index ? <span className="btn-spinner" /> : '👁'}
                </button>
                <button
                  className="stash-action-btn"
                  onClick={() => handleApply(s.index)}
                  disabled={busy !== null}
                  title="Appliquer (garde le stash)"
                >
                  {busy === s.index ? <span className="btn-spinner" /> : '↙ Apply'}
                </button>
                <button
                  className="stash-action-btn pop"
                  onClick={() => handlePop(s.index)}
                  disabled={busy !== null}
                  title="Pop (applique et supprime)"
                >
                  Pop
                </button>
                <button
                  className="stash-action-btn drop"
                  onClick={() => handleDrop(s.index)}
                  disabled={busy !== null}
                  title="Supprimer le stash"
                >
                  ✕
                </button>
              </div>
              {previewIndex === s.index && !previewLoading && (
                <pre className="stash-diff-preview">
                  {previewContent.split('\n').map((line, i) => {
                    const cls = line.startsWith('+') && !line.startsWith('+++')
                      ? 'diff-add'
                      : line.startsWith('-') && !line.startsWith('---')
                      ? 'diff-del'
                      : line.startsWith('@@')
                      ? 'diff-hunk'
                      : '';
                    return <span key={i} className={cls}>{line}{'\n'}</span>;
                  })}
                </pre>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
