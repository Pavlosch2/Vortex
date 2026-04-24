import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Cpu, Monitor, Save, CheckCircle, AlertCircle,
  Loader, Plus, Trash2, Pencil, Check, X,
  Download, MemoryStick, RefreshCw,
} from 'lucide-react';

const API = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api`;
const UTILITY_PORT = 27420;
const UTILITY_URL = 'https://github.com/Pavlosch2/Vortex/releases/download/v1.1.0/VortexSpecs.exe';
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

const EMPTY = { label: '', pc_name: '', cpu_model: '', gpu_model: '', ram_gb: 8, ram_mhz: '' };

const SpecCard = ({ icon, label, value, sub, dark }) => {
  const cardBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.15)';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  return (
    <div style={{
      background: cardBg, border, borderRadius: '0.85rem',
      padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: subColor, fontSize: '0.7rem', fontWeight: 500 }}>
        {icon} {label}
      </div>
      <div style={{ color: textColor, fontSize: '1rem', fontWeight: 700, lineHeight: 1.35 }}>{value || '—'}</div>
      {sub && <div style={{ color: subColor, fontSize: '0.68rem' }}>{sub}</div>}
    </div>
  );
};

const SpecsDisplay = ({ spec, dark }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
    <SpecCard dark={dark} icon={<MemoryStick size={12} />} label="ОЗП"
      value={spec.ram_gb ? `${spec.ram_gb} ГБ` : null}
      sub={spec.ram_mhz ? `Швидкість: ${spec.ram_mhz} МГц` : null} />
    <SpecCard dark={dark} icon={<Cpu size={12} />} label="Процесор"
      value={spec.cpu_model} sub={null} />
    <SpecCard dark={dark} icon={<Monitor size={12} />} label="Графічна плата"
      value={spec.gpu_model} sub={null} />
  </div>
);

const SpecForm = ({ dark, initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(108,155,207,0.06)';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.25)';

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.8rem', background: inputBg,
    border: `1.5px solid ${inputBorder}`, borderRadius: '0.6rem', outline: 'none',
    color: textColor, fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.73rem', fontWeight: 500, color: subColor, marginBottom: '0.28rem',
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.75rem' }}>
      <div>
        <label style={labelStyle}>Назва пристрою (вкладка)</label>
        <input style={inputStyle} placeholder="Напр: Домашній ПК"
          value={form.label} onChange={e => set('label', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}><Cpu size={13} /> Процесор</label>
        <input style={inputStyle} placeholder="Напр: Intel Core i7-12700K" required
          value={form.cpu_model} onChange={e => set('cpu_model', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}><Monitor size={13} /> Відеокарта</label>
        <input style={inputStyle} placeholder="Напр: NVIDIA RTX 3070" required
          value={form.gpu_model} onChange={e => set('gpu_model', e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
        <div>
          <label style={labelStyle}><MemoryStick size={13} /> ОЗП (ГБ)</label>
          <input type="number" style={inputStyle} min={1} max={512}
            value={form.ram_gb} onChange={e => set('ram_gb', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Швидкість ОЗП (МГц)</label>
          <input type="number" style={inputStyle} min={800} max={9000} placeholder="Напр: 3200"
            value={form.ram_mhz} onChange={e => set('ram_mhz', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
        <button
          disabled={saving || !form.cpu_model.trim() || !form.gpu_model.trim()}
          onClick={() => onSave(form)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.7rem', borderRadius: '0.7rem', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6c9bcf, #1B9c85)',
            color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '0.85rem', fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          Зберегти
        </button>
        {onCancel && (
          <button onClick={onCancel} style={{
            padding: '0.7rem 1rem', borderRadius: '0.7rem', cursor: 'pointer',
            background: 'none', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(132,139,200,0.25)',
            color: dark ? '#a3bdcc' : '#677483', fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem',
          }}>
            Скасувати
          </button>
        )}
      </div>
    </div>
  );
};

export default function PCSpecsForm({ dark, onSaved }) {
  const [specs, setSpecs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState('view');
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [utilityState, setUtilityState] = useState('idle');
  const pollRef = useRef(null);

  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.7)';
  const tabActiveBg = dark ? 'rgba(108,155,207,0.18)' : 'rgba(108,155,207,0.12)';
  const tabBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  useEffect(() => {
    loadSpecs();
    return () => clearInterval(pollRef.current);
  }, []);

  const loadSpecs = async () => {
    try {
      const res = await axios.get(`${API}/specs/`, { headers: auth() });
      setSpecs(res.data);
      if (res.data.length > 0 && !activeId) setActiveId(res.data[0].id);
    } catch {}
  };

  const activeSpec = specs.find(s => s.id === activeId) || null;

  const saveSpec = async (form) => {
    setSaving(true);
    try {
      const payload = {
        label: form.label || form.pc_name || 'Мій ПК',
        pc_name: form.pc_name || '',
        cpu_model: form.cpu_model,
        gpu_model: form.gpu_model,
        ram_gb: parseInt(form.ram_gb) || 0,
        ram_mhz: form.ram_mhz ? parseInt(form.ram_mhz) : null,
        is_active: true,
      };
      if (mode === 'edit' && activeId) {
        const res = await axios.put(`${API}/specs/${activeId}/`, payload, { headers: auth() });
        setSpecs(prev => prev.map(s => s.id === activeId ? res.data : s));
      } else {
        const res = await axios.post(`${API}/specs/`, payload, { headers: auth() });
        setSpecs(prev => [...prev, res.data]);
        setActiveId(res.data.id);
      }
      setMode('view');
      if (onSaved) onSaved();
    } catch {}
    setSaving(false);
  };

  const deleteSpec = async (id) => {
    if (!window.confirm('Видалити цей пристрій? Цю дію не можна скасувати.')) return;
    try {
      await axios.delete(`${API}/specs/${id}/`, { headers: auth() });
      const remaining = specs.filter(s => s.id !== id);
      setSpecs(remaining);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
      setMode('view');
    } catch {}
  };

  const renameStart = (spec) => {
    setRenamingId(spec.id);
    setRenameVal(spec.label || spec.pc_name || '');
  };

  const renameSave = async (id) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      const res = await axios.patch(`${API}/specs/${id}/`, { label: renameVal.trim() }, { headers: auth() });
      setSpecs(prev => prev.map(s => s.id === id ? { ...s, label: res.data.label } : s));
    } catch {}
    setRenamingId(null);
  };

  const launchUtility = async () => {
    setUtilityState('waiting');
    clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 20) {
        clearInterval(pollRef.current);
        setUtilityState('timeout');
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:${UTILITY_PORT}/specs`);
        if (!res.ok) return;
        const data = await res.json();
        clearInterval(pollRef.current);
        setUtilityState('saving');
        try {
          const token = localStorage.getItem('vortex_token');
          await axios.post(`${API}/specs/auto/`, data, {
            headers: { Authorization: `Bearer ${token}` },
          });
          await loadSpecs();
          setUtilityState('done');
          if (onSaved) onSaved();
          setTimeout(() => setUtilityState('idle'), 4000);
        } catch {
          setUtilityState('error');
        }
      } catch {}
    }, 1500);
  };

  const UTILITY_LABEL = {
    idle: <><Download size={14} /> Автовизначення характеристик</>,
    waiting: <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Очікування утиліти...</>,
    saving: <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Збереження...</>,
    done: <><CheckCircle size={14} /> Характеристики збережено!</>,
    error: <><AlertCircle size={14} /> Помилка збереження</>,
    timeout: <><AlertCircle size={14} /> Утиліта не відповіла</>,
  };

  return (
    <div style={{
      background: cardBg, backdropFilter: 'blur(12px)', borderRadius: '1.5rem', padding: '1.75rem',
      boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(132,139,200,0.15)',
      border, maxWidth: '580px', fontFamily: 'Poppins, sans-serif',
    }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ color: textColor, fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Налаштування заліза</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={UTILITY_URL}
            download
            onClick={launchUtility}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.9rem', borderRadius: '0.65rem', textDecoration: 'none',
              fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Poppins, sans-serif',
              background: utilityState === 'done' ? 'rgba(27,156,133,0.15)' : 'rgba(108,155,207,0.12)',
              color: utilityState === 'done' ? '#1B9c85' : '#6c9bcf',
              border: utilityState === 'done' ? '1px solid rgba(27,156,133,0.25)' : '1px solid rgba(108,155,207,0.25)',
              cursor: utilityState === 'waiting' || utilityState === 'saving' ? 'default' : 'pointer',
              pointerEvents: utilityState === 'waiting' || utilityState === 'saving' ? 'none' : 'auto',
            }}
          >
            {UTILITY_LABEL[utilityState]}
          </a>
        </div>
      </div>

      {utilityState === 'waiting' && (
        <div style={{
          background: dark ? 'rgba(108,155,207,0.08)' : 'rgba(108,155,207,0.06)',
          border: '1px solid rgba(108,155,207,0.2)', borderRadius: '0.75rem',
          padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.76rem', color: subColor, lineHeight: 1.5,
        }}>
          Утиліту завантажено. Запустіть <strong style={{ color: textColor }}>VortexSpecs.exe</strong> — характеристики збережуться автоматично.
        </div>
      )}

      {utilityState === 'timeout' && (
        <div style={{
          background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)',
          borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem',
          fontSize: '0.76rem', color: '#e05252', lineHeight: 1.5,
        }}>
          Утиліта не відповіла протягом 30 секунд. Переконайтесь що файл запущено, або введіть характеристики вручну.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.2rem', alignItems: 'center' }}>
        {specs.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            {renamingId === s.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') renameSave(s.id); if (e.key === 'Escape') setRenamingId(null); }}
                  style={{
                    padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.78rem',
                    background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(108,155,207,0.1)',
                    border: '1px solid rgba(108,155,207,0.35)', color: textColor,
                    fontFamily: 'Poppins, sans-serif', outline: 'none', width: '120px',
                  }}
                />
                <button onClick={() => renameSave(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B9c85', padding: '2px' }}><Check size={14} /></button>
                <button onClick={() => setRenamingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e05252', padding: '2px' }}><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => { setActiveId(s.id); setMode('view'); }}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '0.6rem', fontSize: '0.78rem', fontWeight: 500,
                  fontFamily: 'Poppins, sans-serif', cursor: 'pointer', border: 'none',
                  background: activeId === s.id ? tabActiveBg : tabBg,
                  color: activeId === s.id ? '#6c9bcf' : subColor,
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                {s.label || s.pc_name || 'Пристрій'}
                {activeId === s.id && (
                  <span onClick={e => { e.stopPropagation(); renameStart(s); }} style={{ opacity: 0.6, cursor: 'pointer' }}>
                    <Pencil size={11} />
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => { setMode('add'); setActiveId(null); }}
          style={{
            padding: '0.35rem 0.7rem', borderRadius: '0.6rem', fontSize: '0.78rem',
            fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
            background: 'none', border: dark ? '1px dashed rgba(255,255,255,0.15)' : '1px dashed rgba(108,155,207,0.3)',
            color: subColor, display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}
        >
          <Plus size={13} /> Додати пристрій
        </button>
      </div>

      {mode === 'view' && activeSpec && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div>
              <div style={{ color: textColor, fontSize: '1.15rem', fontWeight: 700 }}>
                {activeSpec.pc_name || activeSpec.label || 'Пристрій'}
              </div>
              {activeSpec.pc_name && activeSpec.label && activeSpec.label !== activeSpec.pc_name && (
                <div style={{ color: subColor, fontSize: '0.7rem' }}>{activeSpec.label}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={() => setMode('edit')} style={{
                padding: '0.35rem 0.8rem', borderRadius: '0.6rem', fontSize: '0.75rem',
                fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
                background: 'none', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(108,155,207,0.25)',
                color: subColor, display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                <Pencil size={12} /> Редагувати
              </button>
              {specs.length > 1 && (
                <button onClick={() => deleteSpec(activeSpec.id)} style={{
                  padding: '0.35rem 0.7rem', borderRadius: '0.6rem', fontSize: '0.75rem',
                  fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
                  background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)',
                  color: '#e05252', display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
          <SpecsDisplay spec={activeSpec} dark={dark} />
        </div>
      )}

      {mode === 'edit' && activeSpec && (
        <SpecForm
          dark={dark}
          initial={activeSpec}
          onSave={saveSpec}
          onCancel={() => setMode('view')}
          saving={saving}
        />
      )}

      {mode === 'add' && (
        <SpecForm
          dark={dark}
          initial={EMPTY}
          onSave={saveSpec}
          onCancel={specs.length > 0 ? () => { setMode('view'); setActiveId(specs[0].id); } : null}
          saving={saving}
        />
      )}

      {specs.length === 0 && mode !== 'add' && (
        <div style={{ textAlign: 'center', color: subColor, fontSize: '0.82rem', padding: '1.5rem 0' }}>
          Характеристики ще не додано. Натисніть «+ Додати пристрій» або скористайтеся утилітою.
        </div>
      )}
    </div>
  );
}