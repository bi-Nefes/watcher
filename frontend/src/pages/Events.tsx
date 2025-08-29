import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

type Event = { 
  id: number; 
  watcher_id: number; 
  event_type: string; 
  file_path: string;
  created_at?: string;
  video_metadata?: any;
  validation_result?: any;
};

export default function Events() {
  const [items, setItems] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<{ id: string; watcher: string; type: string; path: string; start: string; end: string }>({ id: '', watcher: '', type: '', path: '', start: '', end: '' });

  const load = async () => {
    try {
      const { data } = await api.get('/events/');
      console.log('Loaded events:', data); // Debug log
      
      // Additional debugging for each event
      if (data && data.length > 0) {
        data.forEach((event: Event, index: number) => {
          console.log(`Event ${index + 1}:`, {
            id: event.id,
            hasVideoMetadata: !!event.video_metadata,
            hasValidationResult: !!event.validation_result,
            videoMetadata: event.video_metadata,
            validationResult: event.validation_result
          });
        });
      }
      
      setItems(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleEventExpansion = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatMetadataValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      // Format large numbers and bitrates
      if (value > 1000000) return `${(value / 1000000).toFixed(2)}M`;
      if (value > 1000) return `${(value / 1000).toFixed(2)}K`;
      return value.toString();
    }
    return value.toString();
  };

  const renderVideoMetadata = (metadata: any) => {
    if (!metadata) return null;

    const categories = {
      'Video': Object.keys(metadata).filter(key => key.startsWith('video_')),
      'Audio': Object.keys(metadata).filter(key => key.startsWith('audio_')),
      'General': Object.keys(metadata).filter(key => key.startsWith('general_')),
      'Custom': Object.keys(metadata).filter(key => key.startsWith('custom_'))
    };

    return (
      <div className="mt-2">
        {Object.entries(categories).map(([category, fields]) => {
          if (fields.length === 0) return null;
          
          return (
            <div key={category} className="mb-2">
              <strong className="text-primary">{category}:</strong>
              <div className="row g-1 mt-1">
                {fields.map(field => {
                  const cleanField = field.replace(`${category.toLowerCase()}_`, '');
                  const value = metadata[field];
                  return (
                    <div key={field} className="col-md-6">
                      <small className="text-muted">
                        {cleanField.replace('_', ' ')}: <span className="text-light">{formatMetadataValue(value)}</span>
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderValidationResult = (validationResult: any) => {
    if (!validationResult) return null;

    const { valid, rules_checked, failed_rules } = validationResult;

    return (
      <div className="mt-3">
        <div className="d-flex align-items-center mb-2">
          <strong className="me-2">Validation Result:</strong>
          <span className={`badge bg-${valid ? 'success' : 'danger'}`}>
            {valid ? 'PASSED' : 'FAILED'}
          </span>
          <small className="text-muted ms-2">({rules_checked} rules checked)</small>
        </div>

        {failed_rules && failed_rules.length > 0 && (
          <div className="alert alert-warning">
            <strong>Failed Rules:</strong>
            {failed_rules.map((rule: any, index: number) => (
              <div key={index} className="mt-2 p-2 border-start border-warning">
                <div><strong>Field:</strong> {rule.field}</div>
                <div><strong>Condition:</strong> {rule.operator} {Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}</div>
                <div><strong>Actual Value:</strong> {formatMetadataValue(rule.actual_value)}</div>
                <div><strong>Action:</strong> 
                  <span className={`badge bg-${rule.action === 'reject' ? 'danger' : 'success'} ms-1`}>
                    {rule.action}
                  </span>
                </div>
                {rule.description && <div><strong>Description:</strong> {rule.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const hasVideoData = (event: Event): boolean => {
    return !!(event.video_metadata || event.validation_result);
  };

  const getVideoInfoDisplay = (event: Event) => {
    if (event.video_metadata) {
      return <span className="badge bg-info">Video Metadata Available</span>;
    }
    return <span className="text-muted">-</span>;
  };

  const getValidationDisplay = (event: Event) => {
    if (event.validation_result) {
      const isValid = event.validation_result.valid;
      return (
        <span className={`badge bg-${isValid ? 'success' : 'danger'}`}>
          {isValid ? 'PASSED' : 'FAILED'}
        </span>
      );
    }
    return <span className="text-muted">-</span>;
  };

  const getActionsDisplay = (event: Event) => {
    if (hasVideoData(event)) {
      return (
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => toggleEventExpansion(event.id)}
        >
          {expandedEvents.has(event.id) ? 'Hide' : 'Show'} Details
        </button>
      );
    }
    return <span className="text-muted">-</span>;
  };

  const filteredItems = useMemo(() => {
    return items.filter((e) => {
      // ID filter
      if (filters.id.trim()) {
        if (!String(e.id).includes(filters.id.trim())) return false;
      }
      // Watcher filter
      if (filters.watcher.trim()) {
        if (!String(e.watcher_id).includes(filters.watcher.trim())) return false;
      }
      // Type filter (exact match from dropdown)
      if (filters.type.trim()) {
        if (e.event_type.toLowerCase() !== filters.type.trim().toLowerCase()) return false;
      }
      // Path filter (case-insensitive substring)
      if (filters.path.trim()) {
        if (!e.file_path.toLowerCase().includes(filters.path.trim().toLowerCase())) return false;
      }
      // Date range filter (inclusive). Uses created_at; if filters provided and no created_at, exclude.
      if (filters.start || filters.end) {
        if (!e.created_at) return false;
        const eventTs = new Date(e.created_at).getTime();
        if (filters.start) {
          const startTs = new Date(filters.start).getTime();
          if (isFinite(startTs) && eventTs < startTs) return false;
        }
        if (filters.end) {
          const endTs = new Date(filters.end).getTime();
          if (isFinite(endTs) && eventTs > endTs) return false;
        }
      }
      return true;
    });
  }, [items, filters]);

  return (
    <div className="container py-4">
      <h4>Recent Events</h4>
      
      {/* Debug info removed per request */}
      
      {/* Date range search */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-auto"><strong>Time range:</strong></div>
            <div className="col-auto">
              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={filters.start}
                onChange={(e) => setFilters({ ...filters, start: e.target.value })}
              />
            </div>
            <div className="col-auto">to</div>
            <div className="col-auto">
              <input
                type="datetime-local"
                className="form-control form-control-sm"
                value={filters.end}
                onChange={(e) => setFilters({ ...filters, end: e.target.value })}
              />
            </div>
            <div className="col-auto">
              {(filters.start || filters.end) && (
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilters({ ...filters, start: '', end: '' })}>Clear</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <table className="table table-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Watcher</th>
            <th>Type</th>
            <th>Time</th>
            <th>Path</th>
            <th>Video Info</th>
            <th>Validation</th>
            <th>Actions</th>
          </tr>
          <tr>
            <th style={{width: 90}}>
              <input
                className="form-control form-control-sm"
                placeholder="Filter"
                value={filters.id}
                onChange={(e) => setFilters({ ...filters, id: e.target.value })}
              />
            </th>
            <th style={{width: 110}}>
              <input
                className="form-control form-control-sm"
                placeholder="Filter"
                value={filters.watcher}
                onChange={(e) => setFilters({ ...filters, watcher: e.target.value })}
              />
            </th>
            <th style={{width: 160}}>
              <select
                className="form-select form-select-sm"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All</option>
                <option value="created">Created</option>
                <option value="modified">Modified</option>
                <option value="deleted">Deleted</option>
                <option value="rejected">Rejected</option>
              </select>
            </th>
            <th></th>
            <th>
              <input
                className="form-control form-control-sm"
                placeholder="Filter"
                value={filters.path}
                onChange={(e) => setFilters({ ...filters, path: e.target.value })}
              />
            </th>
            <th></th>
            <th></th>
            <th>
              {(filters.id || filters.watcher || filters.type || filters.path) && (
                <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => setFilters({ id: '', watcher: '', type: '', path: '', start: filters.start, end: filters.end })}>Clear</button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map(e => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.watcher_id}</td>
              <td>
                <span className={`badge bg-${
                  e.event_type === 'created' ? 'success' : 
                  e.event_type === 'modified' ? 'warning' : 
                  e.event_type === 'deleted' ? 'danger' :
                  e.event_type === 'rejected' ? 'secondary' : 'info'
                }`}>
                  {e.event_type}
                </span>
              </td>
              <td style={{whiteSpace: 'nowrap'}}>{e.created_at ? new Date(e.created_at).toLocaleString() : '-'}</td>
              <td className="text-truncate" style={{maxWidth: 250}}>
                {e.file_path}
              </td>
              <td>
                {getVideoInfoDisplay(e)}
              </td>
              <td>
                {getValidationDisplay(e)}
              </td>
              <td>
                {getActionsDisplay(e)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Expanded event details */}
      {items.map(e => (
        expandedEvents.has(e.id) && hasVideoData(e) && (
          <div key={`expanded-${e.id}`} className="card mb-3">
            <div className="card-header">
              <strong>Event #{e.id} - {e.file_path}</strong>
            </div>
            <div className="card-body">
              {e.video_metadata && renderVideoMetadata(e.video_metadata)}
              {e.validation_result && renderValidationResult(e.validation_result)}
            </div>
          </div>
        )
      ))}
      
      {/* Help text if no video data */}
      {items.length > 0 && items.filter(hasVideoData).length === 0 && (
        <div className="alert alert-warning">
          <strong>No Video Data Found</strong>
          <br />
          To see video metadata and validation results:
          <ol>
            <li>Create a watcher with video metadata extraction enabled</li>
            <li>Enable validation rules if desired</li>
            <li>Add video files (MP4, AVI, MKV, etc.) to the watched directory</li>
            <li>Wait for the watcher to process the files</li>
          </ol>
        </div>
      )}
    </div>
  );
}