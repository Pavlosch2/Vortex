import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Monitor, HardDrive, Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const PCSpecsForm = ({ dark, onSaved }) => {
  const [specs, setSpecs] = useState({ cpu_model: '', gpu_model: '', ram_gb: 8 });
  const [existingId, setExistingId] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const textColor    = dark ? "#edeffd" : "#363949";
  const subTextColor = dark ? "#a3bdcc" : "#677483";
  const cardBg       = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)";
  const inputBg      = dark ? "rgba(255,255,255,0.05)" : "rgba(108,155,207,0.06)";
  const inputBorder  = dark ? "rgba(255,255,255,0.1)"  : "rgba(108,155,207,0.25)";

  useEffect(() => {
    const token = localStorage.getItem('vortex_token');
    if (!token) return;
    axios.get('http://127.0.0.1:8000/api/specs/', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.data.length > 0) {
          const first = res.data[0];
          setSpecs({ cpu_model: first.cpu_model, gpu_model: first.gpu_model, ram_gb: first.ram_gb });
          setExistingId(first.id);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('vortex_token');
    if (!token) { setStatus('error'); setErrorMsg('Сесія закінчилася.'); return; }
    setStatus('saving'); setErrorMsg('');
    const payload = { cpu_model: specs.cpu_model, gpu_model: specs.gpu_model, ram_gb: parseInt(specs.ram_gb) };
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (existingId) {
        await axios.put(`http://127.0.0.1:8000/api/specs/${existingId}/`, payload, { headers });
      } else {
        const res = await axios.post('http://127.0.0.1:8000/api/specs/', payload, { headers });
        setExistingId(res.data.id);
      }
      setStatus('success');
      if (onSaved) onSaved();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.status === 401 ? 'Сесія закінчилася.' : JSON.stringify(err.response?.data || 'Помилка'));
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.7rem 0.9rem", background: inputBg,
    border: `1.5px solid ${inputBorder}`, borderRadius: "0.6rem", outline: "none",
    color: textColor, fontFamily: "Poppins, sans-serif", fontSize: "0.88rem",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    fontSize: "0.8rem", fontWeight: 500, color: subTextColor, marginBottom: "0.4rem",
  };

  return (
    <div style={{
      background: cardBg, backdropFilter: "blur(12px)", borderRadius: "1.5rem", padding: "2rem",
      boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(132,139,200,0.15)",
      border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.7)",
      maxWidth: "520px", fontFamily: "Poppins, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.8rem" }}>
        <div style={{
          width: "2.4rem", height: "2.4rem", borderRadius: "0.6rem",
          background: "linear-gradient(135deg, #6c9bcf22, #1B9c8522)",
          border: "1px solid rgba(108,155,207,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Monitor size={18} color="#6c9bcf" />
        </div>
        <div>
          <h2 style={{ color: textColor, fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Налаштування заліза</h2>
          <p style={{ color: subTextColor, fontSize: "0.75rem", margin: 0 }}>
            {existingId ? "Оновити характеристики ПК" : "Додати характеристики ПК"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        <div>
          <label style={labelStyle}><Cpu size={14} /> Процесор</label>
          <input type="text" style={inputStyle} placeholder="Напр: Intel Core i5-12400F" required
            value={specs.cpu_model} onChange={e => setSpecs({ ...specs, cpu_model: e.target.value })}
            onFocus={e => e.target.style.borderColor = "#6c9bcf"}
            onBlur={e => e.target.style.borderColor = inputBorder} />
        </div>
        <div>
          <label style={labelStyle}><Monitor size={14} /> Відеокарта</label>
          <input type="text" style={inputStyle} placeholder="Напр: NVIDIA RTX 3060" required
            value={specs.gpu_model} onChange={e => setSpecs({ ...specs, gpu_model: e.target.value })}
            onFocus={e => e.target.style.borderColor = "#6c9bcf"}
            onBlur={e => e.target.style.borderColor = inputBorder} />
        </div>
        <div>
          <label style={labelStyle}><HardDrive size={14} /> Оперативна пам'ять (ГБ)</label>
          <input type="number" style={inputStyle} min={1} max={512} required
            value={specs.ram_gb} onChange={e => setSpecs({ ...specs, ram_gb: e.target.value })}
            onFocus={e => e.target.style.borderColor = "#6c9bcf"}
            onBlur={e => e.target.style.borderColor = inputBorder} />
        </div>

        {status === 'success' && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#1B9c85", fontSize: "0.85rem" }}>
            <CheckCircle size={16} /> Характеристики збережено!
          </div>
        )}
        {status === 'error' && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", color: "#ff0060", fontSize: "0.82rem" }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={status === 'saving'} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.85rem",
          background: status === 'saving' ? "rgba(108,155,207,0.5)" : "linear-gradient(135deg, #6c9bcf, #1B9c85)",
          color: "white", border: "none", borderRadius: "0.8rem",
          fontFamily: "Poppins, sans-serif", fontSize: "0.92rem", fontWeight: 600,
          cursor: status === 'saving' ? "not-allowed" : "pointer",
          boxShadow: "0 4px 16px rgba(108,155,207,0.3)",
        }}>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          {status === 'saving'
            ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Збереження...</>
            : <><Save size={16} /> {existingId ? "Оновити" : "Зберегти"} характеристики</>
          }
        </button>
      </form>
    </div>
  );
};

export default PCSpecsForm;