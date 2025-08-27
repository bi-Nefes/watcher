import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

type Stats = {
  watchers: number;
  total_events: number;
  events_with_video_metadata?: number;
  events_with_validation?: number;
  events_by_watcher?: Record<string, number>;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use public endpoints to compute counts to avoid permission issues
      const [watchersRes, eventsRes] = await Promise.all([
        api.get('/watchers/'),
        api.get('/events/')
      ]);
      const watchers = Array.isArray(watchersRes.data) ? watchersRes.data.length : 0;
      const events = Array.isArray(eventsRes.data) ? eventsRes.data.length : 0;
      setStats({ watchers, total_events: events });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container py-4">
      <h4 className="mb-3">Dashboard</h4>

      {error && (
        <div className="alert alert-danger mb-3">{error}</div>
      )}

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : (
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <div className="text-muted small">Watchers</div>
                <div className="display-6">{stats?.watchers ?? 0}</div>
                <Link to="/watchers" className="btn btn-sm btn-outline-primary mt-2">View Watchers</Link>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card">
              <div className="card-body">
                <div className="text-muted small">Events</div>
                <div className="display-6">{stats?.total_events ?? 0}</div>
                <Link to="/events" className="btn btn-sm btn-outline-primary mt-2">View Events</Link>
              </div>
            </div>
          </div>
          {typeof stats?.events_with_video_metadata === 'number' && (
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Events with Video Metadata</div>
                  <div className="h3 mb-0">{stats?.events_with_video_metadata}</div>
                </div>
              </div>
            </div>
          )}
          {typeof stats?.events_with_validation === 'number' && (
            <div className="col-md-3">
              <div className="card">
                <div className="card-body">
                  <div className="text-muted small">Events with Validation</div>
                  <div className="h3 mb-0">{stats?.events_with_validation}</div>
                </div>
              </div>
            </div>
          )}

          {stats?.events_by_watcher && (
            <div className="col-12">
              <div className="card">
                <div className="card-header"><strong>Events by Watcher</strong></div>
                <div className="card-body">
                  <div className="row">
                    {Object.entries(stats.events_by_watcher).map(([wid, count]) => (
                      <div key={wid} className="col-md-3 mb-2">
                        <div className="d-flex justify-content-between align-items-center border rounded px-2 py-1">
                          <span className="text-muted">Watcher #{wid}</span>
                          <span className="badge bg-secondary">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


