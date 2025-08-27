import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

type Watcher = { id: number; name: string; path: string; config: any; video_config?: any };
type EventItem = { id: number; watcher_id: number; event_type: string; file_path: string; created_at?: string };

type WatcherConfig = {
  recursive: boolean;
  include_patterns: string[];
  exclude_patterns: string[];
  event_types: string[];
};

type ValidationRule = {
  field: string;
  operator: string;
  value: any;
  action: string;
  description?: string;
};

type VideoMetadataConfig = {
  extract_video_metadata: boolean;
  video_fields: string[];
  audio_fields: string[];
  general_fields: string[];
  custom_fields: string[];
  enable_validation: boolean;
  validation_rules: ValidationRule[];
};

export default function Watchers() {
  const [items, setItems] = useState<Watcher[]>([]);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  // creation moved to dedicated page
  const [config, setConfig] = useState<WatcherConfig>({
    recursive: true,
    include_patterns: ['*'],
    exclude_patterns: [],
    event_types: ['created', 'modified', 'deleted', 'rejected']
  });
  const [videoConfig, setVideoConfig] = useState<VideoMetadataConfig>({
    extract_video_metadata: false,
    video_fields: ['width', 'height', 'codec_name', 'bit_rate', 'frame_rate', 'duration'],
    audio_fields: ['codec_name', 'channels', 'sample_rate', 'bit_rate'],
    general_fields: ['format_name', 'file_size', 'duration', 'overall_bit_rate'],
    custom_fields: [],
    enable_validation: false,
    validation_rules: []
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editRule, setEditRule] = useState<Partial<ValidationRule> | null>(null);
  const [latestByWatcher, setLatestByWatcher] = useState<Record<number, EventItem | undefined>>({});
  const [editing, setEditing] = useState<Watcher | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; path: string }>({ name: '', path: '' });
  // New state for inline validation rule form
  const [newRule, setNewRule] = useState<Partial<ValidationRule>>({
    field: '',
    operator: '>',
    value: '',
    action: 'reject',
    description: ''
  });

  const load = async () => {
    try {
      const { data } = await api.get('/watchers/');
      setItems(data);
      const r = await api.get('/watchers/running');
      setRunning(r.data);
      // fetch recent events and compute latest per watcher
      const ev = await api.get('/events/');
      const events: EventItem[] = ev.data || [];
      const map: Record<number, EventItem> = {};
      for (const e of events) {
        if (map[e.watcher_id]) continue; // events are returned newest-first
        map[e.watcher_id] = e;
      }
      setLatestByWatcher(map);
    } catch (error) {
      console.error('Failed to load watchers:', error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // creation moved to dedicated page

  const del = async (id: number) => {
    try {
      await api.delete(`/watchers/${id}`);
      load();
    } catch (error) {
      console.error('Failed to delete watcher:', error);
    }
  };

  const start = async (id: number) => {
    try {
      await api.post(`/watchers/${id}/start`);
      load();
    } catch (error) {
      console.error('Failed to start watcher:', error);
    }
  };

  const stop = async (id: number) => {
    try {
      await api.post(`/watchers/${id}/stop`);
      load();
    } catch (error) {
      console.error('Failed to stop watcher:', error);
    }
  };

  const addPattern = (type: 'include' | 'exclude') => {
    const pattern = prompt(`Enter ${type} pattern (e.g., *.txt, *.log):`);
    if (pattern) {
      if (type === 'include') {
        setConfig(prev => ({
          ...prev,
          include_patterns: [...prev.include_patterns, pattern]
        }));
      } else {
        setConfig(prev => ({
          ...prev,
          exclude_patterns: [...prev.exclude_patterns, pattern]
        }));
      }
    }
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    if (type === 'include') {
      setConfig(prev => ({
        ...prev,
        include_patterns: prev.include_patterns.filter((_, i) => i !== index)
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        exclude_patterns: prev.exclude_patterns.filter((_, i) => i !== index)
      }));
    }
  };

  const toggleEventType = (eventType: string) => {
    setConfig(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter(t => t !== eventType)
        : [...prev.event_types, eventType]
    }));
  };

  const toggleVideoField = (category: keyof VideoMetadataConfig, field: string) => {
    if (category === 'video_fields' || category === 'audio_fields' || category === 'general_fields') {
      setVideoConfig(prev => ({
        ...prev,
        [category]: prev[category].includes(field)
          ? prev[category].filter(f => f !== field)
          : [...prev[category], field]
      }));
    }
  };

  const addCustomField = () => {
    const field = prompt('Enter custom field name:');
    if (field) {
      setVideoConfig(prev => ({
        ...prev,
        custom_fields: [...prev.custom_fields, field]
      }));
    }
  };

  const removeCustomField = (index: number) => {
    setVideoConfig(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index)
    }));
  };

  const parseRuleValue = (operator: string, raw: any) => {
    if (operator === 'in' || operator === 'not_in') {
      return String(raw).split(',').map((v: string) => v.trim());
    }
    if (typeof raw === 'string' && raw.includes('.')) return parseFloat(raw);
    if (typeof raw === 'string') return parseInt(raw);
    return raw;
  };

  const addValidationRule = () => {
    if (!newRule.field || !newRule.operator || newRule.value === '') {
      alert('Please fill in all required fields');
      return;
    }

    // Parse value based on operator
    let parsedValue: any = parseRuleValue(newRule.operator, newRule.value);

    if (isNaN(parsedValue) && newRule.operator !== 'in' && newRule.operator !== 'not_in') {
      alert('Invalid value. Please enter a valid number.');
      return;
    }

    const rule: ValidationRule = {
      field: newRule.field,
      operator: newRule.operator,
      value: parsedValue,
      action: newRule.action || 'reject',
      description: newRule.description || ''
    };

    setVideoConfig(prev => ({
      ...prev,
      validation_rules: [...prev.validation_rules, rule]
    }));

    // Reset form
    setNewRule({
      field: '',
      operator: '>',
      value: '',
      action: 'reject',
      description: ''
    });
  };

  const removeValidationRule = (index: number) => {
    setVideoConfig(prev => ({
      ...prev,
      validation_rules: prev.validation_rules.filter((_, i) => i !== index)
    }));
  };

  const startEditRule = (index: number) => {
    const r = videoConfig.validation_rules[index];
    setEditingIndex(index);
    setEditRule({
      field: r.field,
      operator: r.operator,
      value: Array.isArray(r.value) ? r.value.join(', ') : String(r.value),
      action: r.action,
      description: r.description ?? ''
    });
  };

  const cancelEditRule = () => {
    setEditingIndex(null);
    setEditRule(null);
  };

  const saveEditRule = () => {
    if (editingIndex === null || !editRule) return;
    if (!editRule.field || !editRule.operator || editRule.value === undefined) {
      alert('Please fill all required fields');
      return;
    }

    const parsedValue = parseRuleValue(editRule.operator!, editRule.value);
    if (isNaN(parsedValue as any) && editRule.operator !== 'in' && editRule.operator !== 'not_in') {
      alert('Invalid value. Please enter a valid number.');
      return;
    }

    setVideoConfig(prev => {
      const updated = [...prev.validation_rules];
      updated[editingIndex] = {
        field: editRule.field!,
        operator: editRule.operator!,
        value: parsedValue,
        action: editRule.action || 'reject',
        description: editRule.description || ''
      };
      return { ...prev, validation_rules: updated };
    });

    setEditingIndex(null);
    setEditRule(null);
  };

  const getAvailableFields = (): string[] => {
    const fields: string[] = [];
    fields.push(...videoConfig.video_fields.map(f => `video_${f}`));
    fields.push(...videoConfig.audio_fields.map(f => `audio_${f}`));
    fields.push(...videoConfig.general_fields.map(f => `general_${f}`));
    fields.push(...videoConfig.custom_fields.map(f => `custom_${f}`));
    return fields;
  };

  const availableFields = getAvailableFields();

  return (
    <div className="container py-4">
      {/* Create button moved below the table */}

      {false && (
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">File Watching Configuration</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="recursive"
                      checked={config.recursive}
                      onChange={e => setConfig(prev => ({ ...prev, recursive: e.target.checked }))}
                    />
                    <label className="form-check-label" htmlFor="recursive">
                      Watch subdirectories recursively
                    </label>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Event Types</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="created"
                      checked={config.event_types.includes('created')}
                      onChange={() => toggleEventType('created')}
                    />
                    <label className="form-check-label" htmlFor="created">File Created</label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="modified"
                      checked={config.event_types.includes('modified')}
                      onChange={() => toggleEventType('modified')}
                    />
                    <label className="form-check-label" htmlFor="modified">File Modified</label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="deleted"
                      checked={config.event_types.includes('deleted')}
                      onChange={() => toggleEventType('deleted')}
                    />
                    <label className="form-check-label" htmlFor="deleted">File Deleted</label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="rejected"
                      checked={config.event_types.includes('rejected')}
                      onChange={() => toggleEventType('rejected')}
                    />
                    <label className="form-check-label" htmlFor="rejected">File Rejected</label>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Include Patterns</label>
                  <div className="d-flex gap-2 mb-2">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => addPattern('include')}
                    >
                      Add Pattern
                    </button>
                  </div>
                  <div className="list-group">
                    {config.include_patterns.map((pattern, index) => (
                      <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <code>{pattern}</code>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removePattern('include', index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Exclude Patterns</label>
                  <div className="d-flex gap-2 mb-2">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => addPattern('exclude')}
                    >
                      Add Pattern
                    </button>
                  </div>
                  <div className="list-group">
                    {config.exclude_patterns.map((pattern, index) => (
                      <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <code>{pattern}</code>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removePattern('exclude', index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {false && (
        <div className="card mb-3">
          <div className="card-header">
            <h6 className="mb-0">Video Metadata Configuration</h6>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="extract_video_metadata"
                  checked={videoConfig.extract_video_metadata}
                  onChange={e => setVideoConfig(prev => ({ ...prev, extract_video_metadata: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="extract_video_metadata">
                  Extract video metadata for video files
                </label>
              </div>
            </div>

            {videoConfig.extract_video_metadata && (
              <>
                <div className="mb-3">
                  <label className="form-label">Validation Rules</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="enableValidation"
                      checked={videoConfig.enable_validation}
                      onChange={(e) => setVideoConfig({...videoConfig, enable_validation: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="enableValidation">
                      Enable video validation rules
                    </label>
                  </div>
                  
                  {videoConfig.enable_validation && (
                    <div className="mt-3">
                      <small className="text-muted d-block mb-2">
                        💡 <strong>Duration fields</strong> (general_duration, video_duration) expect values in <strong>seconds</strong>.
                        The system automatically converts from milliseconds.
                      </small>
                      
                      {/* Add new rule form */}
                      <div className="row g-2 mb-3">
                        <div className="col-md-3">
                          <select
                            className="form-select"
                            value={newRule.field}
                            onChange={(e) => setNewRule({...newRule, field: e.target.value})}
                          >
                            <option value="">Select Field</option>
                            <optgroup label="General Fields">
                              <option value="general_duration">Duration (seconds)</option>
                              <option value="general_file_size">File Size</option>
                              <option value="general_overall_bit_rate">Overall Bit Rate</option>
                            </optgroup>
                            <optgroup label="Video Fields">
                              <option value="video_duration">Video Duration (seconds)</option>
                              <option value="video_width">Width</option>
                              <option value="video_height">Height</option>
                              <option value="video_bit_rate">Bit Rate</option>
                              <option value="video_frame_rate">Frame Rate</option>
                            </optgroup>
                            <optgroup label="Audio Fields">
                              <option value="audio_bit_rate">Bit Rate</option>
                              <option value="audio_channels">Channels</option>
                              <option value="audio_sample_rate">Sample Rate</option>
                            </optgroup>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <select
                            className="form-select"
                            value={newRule.operator}
                            onChange={(e) => setNewRule({...newRule, operator: e.target.value})}
                          >
                            <option value="">Operator</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                            <option value="==">=</option>
                            <option value="!=">≠</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <input
                            type="text"
                            className="form-control"
                            placeholder={newRule.field?.includes('duration') ? "Value in seconds" : "Value"}
                            value={newRule.value}
                            onChange={(e) => setNewRule({...newRule, value: e.target.value})}
                          />
                        </div>
                        <div className="col-md-2">
                          <select
                            className="form-select"
                            value={newRule.action}
                            onChange={(e) => setNewRule({...newRule, action: e.target.value})}
                          >
                            <option value="reject">Reject</option>
                            <option value="accept">Accept</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={addValidationRule}
                            disabled={!newRule.field || !newRule.operator || newRule.value === ''}
                          >
                            Add Rule
                          </button>
                        </div>
                      </div>
                      
                      {/* Existing Rules List */}
                      <div className="list-group">
                        {videoConfig.validation_rules.map((rule, index) => (
                          <div key={index} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                {editingIndex === index ? (
                                  <div className="row g-2">
                                    <div className="col-md-3">
                                      <label className="form-label">Field</label>
                                      <select
                                        className="form-select"
                                        value={editRule?.field || ''}
                                        onChange={e => setEditRule(prev => ({ ...(prev || {}), field: e.target.value }))}
                                      >
                                        <option value="">Select field...</option>
                                        {availableFields.map(field => (
                                          <option key={field} value={field}>
                                            {field.replace('_', ' ')}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-md-2">
                                      <label className="form-label">Operator</label>
                                      <select
                                        className="form-select"
                                        value={editRule?.operator || '>'}
                                        onChange={e => setEditRule(prev => ({ ...(prev || {}), operator: e.target.value }))}
                                      >
                                        <option value=">">{'>'}</option>
                                        <option value="<">{'<'}</option>
                                        <option value=">=">{'>='}</option>
                                        <option value="<=">{'<='}</option>
                                        <option value="==">{'=='}</option>
                                        <option value="!=">{'!='}</option>
                                        <option value="in">in</option>
                                        <option value="not_in">not in</option>
                                      </select>
                                    </div>
                                    <div className="col-md-2">
                                      <label className="form-label">Value</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder={(editRule?.operator === 'in' || editRule?.operator === 'not_in') ? 'val1,val2,val3' : 'Value'}
                                        value={editRule?.value as any || ''}
                                        onChange={e => setEditRule(prev => ({ ...(prev || {}), value: e.target.value }))}
                                      />
                                    </div>
                                    <div className="col-md-2">
                                      <label className="form-label">Action</label>
                                      <select
                                        className="form-select"
                                        value={editRule?.action || 'reject'}
                                        onChange={e => setEditRule(prev => ({ ...(prev || {}), action: e.target.value }))}
                                      >
                                        <option value="reject">Reject</option>
                                        <option value="accept">Accept</option>
                                      </select>
                                    </div>
                                    <div className="col-md-2">
                                      <label className="form-label">Description</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Optional description"
                                        value={editRule?.description || ''}
                                        onChange={e => setEditRule(prev => ({ ...(prev || {}), description: e.target.value }))}
                                      />
                                    </div>
                                    <div className="col-md-1 d-flex align-items-end">
                                      <div className="btn-group w-100">
                                        <button type="button" className="btn btn-sm btn-success" onClick={saveEditRule}>Save</button>
                                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelEditRule}>Cancel</button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="row">
                                    <div className="col-md-2">
                                      <strong>Field:</strong><br />
                                      <code>{rule.field}</code>
                                    </div>
                                    <div className="col-md-2">
                                      <strong>Operator:</strong><br />
                                      <code>{rule.operator}</code>
                                    </div>
                                    <div className="col-md-2">
                                      <strong>Value:</strong><br />
                                      <code>{Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}</code>
                                    </div>
                                    <div className="col-md-2">
                                      <strong>Action:</strong><br />
                                      <span className={`badge bg-${rule.action === 'reject' ? 'danger' : 'success'}`}>
                                        {rule.action}
                                      </span>
                                    </div>
                                    <div className="col-md-3">
                                      <strong>Description:</strong><br />
                                      <small>{rule.description || 'No description'}</small>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="ms-2 d-flex gap-2">
                                {editingIndex === index ? null : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => startEditRule(index)}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeValidationRule(index)}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {videoConfig.validation_rules.length === 0 && (
                        <div className="text-muted text-center py-3">
                          No validation rules defined. Use the form above to create rules.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="row">
                  <div className="col-md-4">
                    <label className="form-label">Video Fields</label>
                    {['width', 'height', 'codec_name', 'bit_rate', 'frame_rate', 'duration', 'display_aspect_ratio', 'pixel_aspect_ratio'].map(field => (
                      <div key={field} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`video_${field}`}
                          checked={videoConfig.video_fields.includes(field)}
                          onChange={() => toggleVideoField('video_fields', field)}
                        />
                        <label className="form-check-label" htmlFor={`video_${field}`}>
                          {field.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Audio Fields</label>
                    {['codec_name', 'channels', 'sample_rate', 'bit_rate'].map(field => (
                      <div key={field} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`audio_${field}`}
                          checked={videoConfig.audio_fields.includes(field)}
                          onChange={() => toggleVideoField('audio_fields', field)}
                        />
                        <label className="form-check-label" htmlFor={`audio_${field}`}>
                          {field.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">General Fields</label>
                    {['format_name', 'file_size', 'duration', 'overall_bit_rate'].map(field => (
                      <div key={field} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`general_${field}`}
                          checked={videoConfig.general_fields.includes(field)}
                          onChange={() => toggleVideoField('general_fields', field)}
                        />
                        <label className="form-check-label" htmlFor={`general_${field}`}>
                          {field.replace('_', ' ')}
                        </label>
                      </div>
                    ))}

                    <div className="mt-3">
                      <label className="form-label">Custom Fields</label>
                      <div className="d-flex gap-2 mb-2">
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-primary"
                          onClick={addCustomField}
                        >
                          Add Field
                        </button>
                      </div>
                      <div className="list-group">
                        {videoConfig.custom_fields.map((field, index) => (
                          <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                            <code>{field}</code>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeCustomField(index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>


              </>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h5 className="mb-0">Watchers</h5></div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Path</th>
                  <th>Config</th>
                  <th>Last Event</th>
                  <th style={{width: 200}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(w => {
                  const last = latestByWatcher[w.id];
                  const configSummary = (() => {
                    const parts: string[] = [];
                    if (w.config) {
                      parts.push(w.config.recursive ? 'Recursive' : 'Non-recursive');
                      if (w.config.event_types?.length) parts.push(`Events: ${w.config.event_types.join(', ')}`);
                      if (w.config.include_patterns?.length) parts.push(`Patterns: ${w.config.include_patterns.join(', ')}`);
                    }
                    if (w.video_config?.extract_video_metadata) {
                      parts.push(`Video: on${w.video_config.enable_validation ? `, rules: ${w.video_config.validation_rules?.length || 0}` : ''}`);
                    }
                    return parts.join(' | ') || '—';
                  })();
                  return (
                    <tr key={w.id}>
                      <td>
                        {editing?.id === w.id ? (
                          <input className="form-control form-control-sm" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
                        ) : w.name}
                      </td>
                      <td>
                        {editing?.id === w.id ? (
                          <input className="form-control form-control-sm" value={editForm.path} onChange={(e)=>setEditForm({...editForm, path: e.target.value})} />
                        ) : <code>{w.path}</code>}
                      </td>
                      <td className="small text-muted">{configSummary}</td>
                      <td>
                        {last ? (
                          <>
                            <span className={`badge bg-${last.event_type === 'rejected' ? 'danger' : last.event_type === 'deleted' ? 'secondary' : 'primary'}`}>
                              {last.event_type}
                            </span>
                            <span className="ms-2 small text-muted">{last.created_at ? new Date(last.created_at).toLocaleString() : ''}</span>
                          </>
                        ) : (
                          <span className="text-muted small">No events</span>
                        )}
                      </td>
                      <td>
                        {editing?.id === w.id ? (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-success" onClick={async ()=>{
                              try {
                                await api.put(`/watchers/${w.id}`, { name: editForm.name, path: editForm.path });
                                setEditing(null); setEditForm({ name: '', path: '' });
                                load();
                              } catch (e) { console.error('Failed to update watcher', e); }
                            }}>Save</button>
                            <button className="btn btn-secondary" onClick={()=>{ setEditing(null); setEditForm({ name: '', path: '' }); }}>Cancel</button>
                          </div>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            {running[w.id]?.toString() === 'true' || running[w.id] ? (
                              <button className="btn btn-outline-warning" onClick={() => stop(w.id)}>Stop</button>
                            ) : (
                              <button className="btn btn-outline-primary" onClick={() => start(w.id)}>Start</button>
                            )}
                            <Link className="btn btn-outline-secondary" to={`/watchers/${w.id}/edit`}>Edit</Link>
                            <button className="btn btn-outline-danger" onClick={() => del(w.id)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="d-flex justify-content-center mt-3">
              <a className="btn btn-primary" href="/watchers/new">Create</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}