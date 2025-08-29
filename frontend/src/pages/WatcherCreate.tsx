import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

type WatcherConfig = {
  recursive: boolean;
  include_patterns: string[];
  exclude_patterns: string[];
  event_types: string[];
  auto_delete_excluded?: boolean;
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
  reject_handling?: 'delete' | 'move';
  reject_move_to_dir?: string | null;
};

export default function WatcherCreate() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  // Comprehensive field catalogs (superset used for defaults and validation dropdown)
  const videoFieldOptions = [
    'width','height','duration','codec_name','codec_long_name','profile','level','pix_fmt','bit_rate','frame_rate',
    'display_aspect_ratio','pixel_aspect_ratio','color_space','color_primaries','color_transfer','bit_depth','scan_type','language'
  ];
  const audioFieldOptions = [
    'codec_name','codec_long_name','channels','channel_layout','sample_rate','bit_rate','bit_depth','language'
  ];
  const generalFieldOptions = [
    'format_name','format_long_name','file_size','duration','overall_bit_rate','overall_bit_rate_mode',
    'count_of_video_streams','count_of_audio_streams','title','album','track'
  ];
  const [config, setConfig] = useState<WatcherConfig>({
    recursive: true,
    include_patterns: ['*'],
    exclude_patterns: [],
    event_types: ['created', 'modified', 'deleted', 'rejected'],
    auto_delete_excluded: true
  });
  const [videoConfig, setVideoConfig] = useState<VideoMetadataConfig>({
    extract_video_metadata: false,
    // default to comprehensive lists; users can still add custom fields
    video_fields: videoFieldOptions,
    audio_fields: audioFieldOptions,
    general_fields: generalFieldOptions,
    custom_fields: [],
    enable_validation: false,
    validation_rules: [],
    reject_handling: 'delete',
    reject_move_to_dir: ''
  });
  const [error, setError] = useState<string>('');

  // Inline pattern editors state
  const [newIncludePattern, setNewIncludePattern] = useState<string>('');
  const [newExcludePattern, setNewExcludePattern] = useState<string>('');

  const addPattern = (type: 'include' | 'exclude') => {
    const pattern = (type === 'include') ? newIncludePattern.trim() : newExcludePattern.trim();
    if (!pattern) return;
    if (type === 'include') {
      setConfig(prev => ({ ...prev, include_patterns: [...prev.include_patterns, pattern] }));
      setNewIncludePattern('');
    } else {
      setConfig(prev => ({ ...prev, exclude_patterns: [...prev.exclude_patterns, pattern] }));
      setNewExcludePattern('');
    }
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    if (type === 'include') {
      setConfig(prev => ({ ...prev, include_patterns: prev.include_patterns.filter((_, i) => i !== index) }));
    } else {
      setConfig(prev => ({ ...prev, exclude_patterns: prev.exclude_patterns.filter((_, i) => i !== index) }));
    }
  };

  const updatePattern = (type: 'include' | 'exclude', index: number, value: string) => {
    if (type === 'include') {
      setConfig(prev => ({
        ...prev,
        include_patterns: prev.include_patterns.map((p, i) => i === index ? value : p)
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        exclude_patterns: prev.exclude_patterns.map((p, i) => i === index ? value : p)
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
        [category]: (prev as any)[category].includes(field)
          ? (prev as any)[category].filter((f: string) => f !== field)
          : [...(prev as any)[category], field]
      }));
    }
  };

  const addCustomField = () => {
    const field = prompt('Enter custom field name:');
    if (field) setVideoConfig(prev => ({ ...prev, custom_fields: [...prev.custom_fields, field] }));
  };

  const removeCustomField = (index: number) => {
    setVideoConfig(prev => ({ ...prev, custom_fields: prev.custom_fields.filter((_, i) => i !== index) }));
  };

  const [newRule, setNewRule] = useState<Partial<ValidationRule>>({
    field: '', operator: '>', value: '', action: 'reject', description: ''
  });

  const isNumericField = (fieldKey?: string) => {
    if (!fieldKey) return false;
    // fieldKey examples: "general_duration", "video_width", "audio_bit_rate"
    const k = fieldKey.toLowerCase();
    const numericHints = [
      'duration','width','height','bit_rate','overall_bit_rate','sample_rate','frame_rate',
      'count','file_size','level','bit_depth','channels'
    ];
    return numericHints.some(h => k.includes(h));
  };

  // Field catalogs used by the validation dropdown

  const parseRuleValue = (field: string, operator: string, raw: any) => {
    // Arrays not currently in UI, keep support if needed
    if (operator === 'in' || operator === 'not_in') return String(raw).split(',').map(v => v.trim());
    if (isNumericField(field)) {
      const num = String(raw).includes('.') ? parseFloat(String(raw)) : parseInt(String(raw));
      return isNaN(num as number) ? raw : num;
    }
    return raw;
  };

  const addValidationRule = () => {
    if (!newRule.field || !newRule.operator || newRule.value === '') return alert('Fill all fields');
    const parsedValue = parseRuleValue(newRule.field!, newRule.operator!, newRule.value);
    if (isNumericField(newRule.field!) && typeof parsedValue !== 'number') {
      return alert('Please enter a numeric value for the selected field.');
    }
    setVideoConfig(prev => ({
      ...prev,
      validation_rules: [...prev.validation_rules, {
        field: newRule.field!, operator: newRule.operator!, value: parsedValue,
        action: newRule.action || 'reject', description: newRule.description || ''
      }]
    }));
    setNewRule({ field: '', operator: '>', value: '', action: 'reject', description: '' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
              await api.post('/watchers/create', {
        name, path, config,
        video_config: videoConfig.extract_video_metadata ? videoConfig : null
      });
      nav('/watchers');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create watcher');
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h4 className="mb-0">Create Watcher</h4>
        <button className="btn btn-outline-secondary" onClick={() => nav('/watchers')}>Back</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form className="row g-2 mb-3" onSubmit={submit}>
        <div className="col-md-3">
          <input className="form-control" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        </div>
        <div className="col-md-5">
          <input className="form-control" placeholder="Path" value={path} onChange={e=>setPath(e.target.value)} required />
        </div>
        <div className="col-md-2">
          <button className="btn btn-success w-100" type="submit">Create</button>
        </div>
      </form>

      {/* Reuse the detailed config UIs from the previous page */}
      <div className="card mb-3">
        <div className="card-header"><h6 className="mb-0">File Watching Configuration</h6></div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="recursive" checked={config.recursive} onChange={e=>setConfig(prev=>({...prev, recursive: e.target.checked}))} />
                  <label className="form-check-label" htmlFor="recursive">Watch subdirectories recursively</label>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Event Types</label>
                {['created','modified','deleted','rejected'].map(et=> (
                  <div className="form-check" key={et}>
                    <input className="form-check-input" type="checkbox" id={`ev_${et}`} checked={config.event_types.includes(et)} onChange={()=>toggleEventType(et)} />
                    <label className="form-check-label" htmlFor={`ev_${et}`}>{et}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Include Patterns</label>
                <div className="input-group input-group-sm mb-2">
                  <input
                    className="form-control"
                    placeholder="e.g., *.mp4, *.mkv"
                    value={newIncludePattern}
                    onChange={e=>setNewIncludePattern(e.target.value)}
                    onKeyDown={e=>{ if (e.key === 'Enter') { e.preventDefault(); addPattern('include'); } }}
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={()=>addPattern('include')}>Add</button>
                </div>
                <div className="list-group">
                  {config.include_patterns.map((p,i)=> (
                    <div key={i} className="list-group-item d-flex align-items-center gap-2">
                      <input
                        className="form-control form-control-sm"
                        value={p}
                        onChange={e=>updatePattern('include', i, e.target.value)}
                      />
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removePattern('include', i)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Exclude Patterns</label>
                <div className="input-group input-group-sm mb-2">
                  <input
                    className="form-control"
                    placeholder="e.g., *.tmp, *.log"
                    value={newExcludePattern}
                    onChange={e=>setNewExcludePattern(e.target.value)}
                    onKeyDown={e=>{ if (e.key === 'Enter') { e.preventDefault(); addPattern('exclude'); } }}
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={()=>addPattern('exclude')}>Add</button>
                </div>
                <div className="list-group">
                  {config.exclude_patterns.map((p,i)=> (
                    <div key={i} className="list-group-item d-flex align-items-center gap-2">
                      <input
                        className="form-control form-control-sm"
                        value={p}
                        onChange={e=>updatePattern('exclude', i, e.target.value)}
                      />
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removePattern('exclude', i)}>×</button>
                    </div>
                  ))}
                </div>
                <div className="form-check mt-2">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="auto_delete_excluded" 
                    checked={config.auto_delete_excluded !== false} 
                    onChange={e=>setConfig(prev=>({...prev, auto_delete_excluded: e.target.checked}))} 
                  />
                  <label className="form-check-label" htmlFor="auto_delete_excluded">
                    Automatically delete excluded files after placement
                  </label>
                </div>
                <small className="text-muted">
                  <strong>Note:</strong> When enabled, excluded files will be automatically deleted after being placed in the watched directory.
                  This prevents unwanted files from accumulating while maintaining normal file system access.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header"><h6 className="mb-0">Video Metadata Configuration</h6></div>
        <div className="card-body">
          <div className="mb-3">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="extract_video_metadata" checked={videoConfig.extract_video_metadata} onChange={e=>setVideoConfig(prev=>({...prev, extract_video_metadata: e.target.checked}))} />
              <label className="form-check-label" htmlFor="extract_video_metadata">Extract video metadata for video files</label>
            </div>
          </div>
          {videoConfig.extract_video_metadata && (
            <>
              {/* Rejection handling */}
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <label className="form-label">On rejected videos</label>
                  <select
                    className="form-select"
                    value={videoConfig.reject_handling || 'delete'}
                    onChange={(e)=>setVideoConfig(prev=>({...prev, reject_handling: (e.target.value as 'delete'|'move')}))}
                  >
                    <option value="delete">Delete file</option>
                    <option value="move">Move to directory</option>
                  </select>
                </div>
                {videoConfig.reject_handling === 'move' && (
                  <div className="col-md-8">
                    <label className="form-label">Target directory</label>
                    <input
                      className="form-control"
                      placeholder="/path/to/rejected"
                      value={videoConfig.reject_move_to_dir || ''}
                      onChange={(e)=>setVideoConfig(prev=>({...prev, reject_move_to_dir: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="enableValidation" checked={videoConfig.enable_validation} onChange={e=>setVideoConfig(prev=>({...prev, enable_validation: e.target.checked}))} />
                <label className="form-check-label" htmlFor="enableValidation">Enable video validation rules</label>
              </div>
              {videoConfig.enable_validation && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2">Duration fields expect values in seconds.</small>
                  <div className="row g-2 mb-2">
                    <div className="col-md-4">
                      <select
                        className="form-select"
                        value={newRule.field}
                        onChange={e=>{
                          const fieldVal = e.target.value;
                          const numeric = isNumericField(fieldVal);
                          const currentOp = newRule.operator || '=='
                          const validOps = numeric ? ['>','<','>=','<=','==','!='] : ['==','!='];
                          const nextOp = validOps.includes(currentOp) ? currentOp : '=='
                          setNewRule({ ...newRule, field: fieldVal, operator: nextOp });
                        }}
                      >
                        <option value="">Select Field</option>
                        <optgroup label="General">
                          {generalFieldOptions.map(f => (
                            <option key={`general_${f}`} value={`general_${f}`}>{f.split('_').join(' ')}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Video">
                          {videoFieldOptions.map(f => (
                            <option key={`video_${f}`} value={`video_${f}`}>{f.split('_').join(' ')}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Audio">
                          {audioFieldOptions.map(f => (
                            <option key={`audio_${f}`} value={`audio_${f}`}>{f.split('_').join(' ')}</option>
                          ))}
                        </optgroup>
                        {videoConfig.custom_fields.length > 0 && (
                          <optgroup label="Custom">
                            {videoConfig.custom_fields.map(f => (
                              <option key={`custom_${f}`} value={`custom_${f}`}>{f.split('_').join(' ')}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-select"
                        value={newRule.operator}
                        onChange={e=>setNewRule({...newRule, operator: e.target.value})}
                      >
                        {(isNumericField(newRule.field!) ? ['>','<','>=','<=','==','!='] : ['==','!=']).map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <input
                        className="form-control"
                        type={isNumericField(newRule.field!) ? 'number' : 'text'}
                        placeholder={newRule.field?.includes('duration') ? 'Seconds' : (isNumericField(newRule.field!) ? 'Number' : 'Value')}
                        value={newRule.value as any}
                        onChange={e=>setNewRule({...newRule, value: e.target.value})}
                      />
                    </div>
                    <div className="col-md-2">
                      <select className="form-select" value={newRule.action} onChange={e=>setNewRule({...newRule, action: e.target.value})}>
                        <option value="reject">Reject</option>
                        <option value="accept">Accept</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <button type="button" className="btn btn-primary w-100" onClick={addValidationRule} disabled={!newRule.field || !newRule.operator || newRule.value === ''}>Add Rule</button>
                    </div>
                  </div>
                  {/* Existing rules */}
                  <div className="mt-3">
                    {videoConfig.validation_rules.length > 0 ? (
                      <div className="list-group">
                        {videoConfig.validation_rules.map((r, idx) => (
                          <div key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                            <div className="small">
                              <strong>{r.field}</strong> {r.operator} {Array.isArray(r.value) ? r.value.join(', ') : r.value} →
                              <span className={`badge ms-1 bg-${r.action === 'reject' ? 'danger' : 'success'}`}>{r.action}</span>
                              {r.description ? <span className="text-muted ms-2">{r.description}</span> : null}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => setVideoConfig(prev => ({
                                ...prev,
                                validation_rules: prev.validation_rules.filter((_, i) => i !== idx)
                              }))}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted small">No rules yet. Add one above.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Checkboxes removed per request; all standard fields included by default */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


