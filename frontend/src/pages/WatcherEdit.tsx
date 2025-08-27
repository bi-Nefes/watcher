import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

type Watcher = { id: number; name: string; path: string; config: any; video_config?: any };

export default function WatcherEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [watcher, setWatcher] = useState<Watcher | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const load = async () => {
    try {
      const { data } = await api.get(`/watchers/${id}`);
      setWatcher(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load watcher');
    }
  };

  useEffect(() => { load(); }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watcher) return;
    try {
      setSaving(true);
      await api.put(`/watchers/${watcher.id}`, {
        name: watcher.name,
        path: watcher.path,
        config: watcher.config,
        video_config: watcher.video_config,
      });
      nav('/watchers');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save watcher');
    } finally {
      setSaving(false);
    }
  };

  if (!watcher) {
    return (
      <div className="container py-4">
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Edit Watcher</h4>
        <button className="btn btn-outline-secondary" onClick={()=>nav('/watchers')}>Back</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={save}>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Name</label>
            <input className="form-control" value={watcher.name} onChange={(e)=>setWatcher({...watcher, name: e.target.value})} />
          </div>
          <div className="col-md-8">
            <label className="form-label">Path</label>
            <input className="form-control" value={watcher.path} onChange={(e)=>setWatcher({...watcher, path: e.target.value})} />
          </div>
        </div>

        {/* Simple JSON editors for complex configs (kept minimal for now) */}
        <div className="mb-3">
          <label className="form-label">Config (JSON)</label>
          <textarea
            className="form-control"
            rows={6}
            value={JSON.stringify(watcher.config ?? {}, null, 2)}
            onChange={(e)=>{
              try { setWatcher({...watcher, config: JSON.parse(e.target.value || '{}')}); setError(''); }
              catch { setError('Invalid JSON in Config'); }
            }}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Video Config (JSON)</label>
          <textarea
            className="form-control"
            rows={8}
            value={JSON.stringify(watcher.video_config ?? {}, null, 2)}
            onChange={(e)=>{
              try { setWatcher({...watcher, video_config: JSON.parse(e.target.value || '{}')}); setError(''); }
              catch { setError('Invalid JSON in Video Config'); }
            }}
          />
          <div className="form-text">Tip: you can set reject_handling and reject_move_to_dir here.</div>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={saving}>Save</button>
          <button className="btn btn-secondary" type="button" onClick={()=>nav('/watchers')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}


