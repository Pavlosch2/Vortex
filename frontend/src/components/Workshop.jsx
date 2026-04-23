import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Folder, FolderOpen, File, Plus, Trash2, Upload,
  ChevronRight, ChevronDown, Package, Loader, X,
  ArrowRight, Search,
} from 'lucide-react';
import './styles/Workshop.css';

const API = "http://${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api";
const auth = () => ({ Authorization: 'Bearer ' + localStorage.getItem('vortex_token') });

const DEFAULT_FOLDERS = ['CLEO', 'models', 'ASI', 'moonloader'];

const CatalogPicker = ({ dark, onPick, onClose }) => {
  const [builds, setBuilds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [buildFiles, setBuildFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [search, setSearch] = useState('');
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';

  React.useEffect(() => {
    axios.get(`${API}/builds/`, { headers: auth() })
      .then(r => setBuilds(r.data))
      .catch(() => {});
  }, []);

  const selectBuild = async (build) => {
    setSelected(build);
    setLoadingFiles(true);
    try {
      const res = await axios.get(`${API}/builds/${build.id}/files/`, { headers: auth() });
      setBuildFiles(res.data.items?.filter(i => i.type === 'file').map(f => ({ ...f, build_id: build.id })) || []);
    } catch {}
    setLoadingFiles(false);
  };

  const filtered = builds.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ws-catalog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`ws-catalog-modal ${dark ? 'dark' : 'light'}`}>
        <div className="ws-catalog-header">
          <span style={{ color: textColor, fontWeight: 700, fontSize: '0.9rem' }}>
            Додати файл з каталогу
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subColor }}>
            <X size={16} />
          </button>
        </div>
        <div className="ws-catalog-body">
          <div className="ws-catalog-left">
            <div className="ws-catalog-search">
              <Search size={13} color={subColor} />
              <input
                placeholder="Пошук збірок..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', color: textColor, fontSize: '0.8rem', flex: 1 }}
              />
            </div>
            <div className="ws-catalog-list">
              {filtered.map(b => (
                <button key={b.id}
                  className={`ws-catalog-build-btn ${selected?.id === b.id ? 'active' : ''}`}
                  style={{ color: selected?.id === b.id ? '#6c9bcf' : textColor }}
                  onClick={() => selectBuild(b)}
                >
                  <Package size={13} /> {b.title}
                </button>
              ))}
            </div>
          </div>
          <div className="ws-catalog-right">
            {!selected && (
              <p style={{ color: subColor, fontSize: '0.78rem', textAlign: 'center', marginTop: '2rem' }}>
                Оберіть збірку зліва
              </p>
            )}
            {loadingFiles && <div style={{ textAlign: 'center', paddingTop: '2rem' }}><Loader size={20} className="spin" color="#6c9bcf" /></div>}
            {selected && !loadingFiles && buildFiles.map(f => (
              <button key={f.path}
                className="ws-catalog-file-btn"
                style={{ color: textColor, borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(132,139,200,0.15)' }}
                onClick={() => onPick(f)}
              >
                <File size={12} color={subColor} />
                <span style={{ flex: 1, textAlign: 'left', fontSize: '0.75rem', wordBreak: 'break-all' }}>{f.name}</span>
                <ArrowRight size={12} color="#6c9bcf" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FinishModal = ({ dark, buildName, setBuildName, onSubmit, onCancel, sending }) => {
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const inputBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(108,155,207,0.07)';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(108,155,207,0.22)';
  const bg = dark ? 'rgba(20,22,28,0.98)' : 'rgba(255,255,255,0.98)';
  const border = dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(132,139,200,0.2)';

  return (
    <div className="ws-finish-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="ws-finish-modal" style={{ background: bg, border }}>
        <h3 style={{ color: textColor, margin: '0 0 0.5rem', fontSize: '1rem' }}>Завершити збірку</h3>
        <p style={{ color: subColor, fontSize: '0.78rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Вкажіть назву збірки. Файли будуть запаковані у ZIP і готові до публікації.
          <br />
          <span style={{ color: '#f7d060', fontWeight: 600 }}>Вартість: $1</span> (заглушка — платіжна система незабаром)
        </p>
        <input
          value={buildName}
          onChange={e => setBuildName(e.target.value)}
          placeholder="Назва збірки..."
          style={{
            width: '100%', padding: '0.6rem 0.85rem', borderRadius: '0.65rem',
            background: inputBg, border: `1px solid ${inputBorder}`,
            color: textColor, fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem',
            outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onSubmit}
            disabled={sending || !buildName.trim()}
            style={{
              flex: 1, padding: '0.65rem', borderRadius: '0.7rem', border: 'none',
              background: 'linear-gradient(135deg, #6c9bcf, #1B9c85)',
              color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem',
              fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            {sending ? <Loader size={14} className="spin" /> : null}
            Завершити і завантажити ZIP
          </button>
          <button onClick={onCancel} style={{
            padding: '0.65rem 1rem', borderRadius: '0.7rem', background: 'none',
            border: `1px solid ${inputBorder}`, color: subColor,
            fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem', cursor: 'pointer',
          }}>
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
};

const WorkshopScanModal = ({ dark, zipBlob, buildName, onDownload, onCancel }) => {
  const [state, setState] = React.useState('scanning');
  const [result, setResult] = React.useState(null);
  const cancelRef = React.useRef(false);

  React.useEffect(() => {
    const run = async () => {
      try {
        const fd = new FormData();
        fd.append('file', zipBlob, `${buildName}.zip`);
        const res = await axios.post(`${API}/workshop/scan/`, fd, {
          headers: { ...auth(), 'Content-Type': 'multipart/form-data' },
        });
        if (!cancelRef.current) {
          setResult(res.data);
          setState('result');
        }
      } catch (err) {
        if (!cancelRef.current) setState('error');
      }
    };
    run();
    return () => { cancelRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const SCAN_LABEL = {
    clean:      { text: 'Загроз не знайдено', color: '#1B9c85', icon: '✅' },
    suspicious: { text: 'Виявлено підозрілі файли', color: '#f7d060', icon: '⚠️' },
    dangerous:  { text: 'Виявлено небезпечні файли', color: '#e05252', icon: '🔴' },
  };

  const bg = dark ? 'rgba(20,22,28,0.98)' : 'rgba(255,255,255,0.98)';
  const border = dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(132,139,200,0.2)';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';

  return (
    <div className="ws-finish-overlay">
      <div className="ws-finish-modal" style={{ background: bg, border, textAlign: 'center' }}>
        {state === 'scanning' && (
          <>
            <Loader size={28} className="spin" color="#6c9bcf" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: textColor, margin: '0 0 0.4rem' }}>Антивірусне сканування...</h3>
            <p style={{ color: subColor, fontSize: '0.78rem', margin: '0 0 1rem' }}>
              Перевіряємо вашу збірку через 70+ антивірусних движків
            </p>
            <button onClick={onCancel} style={{
              background: 'none', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(132,139,200,0.2)'}`,
              color: subColor, padding: '0.5rem 1.2rem', borderRadius: '0.65rem',
              fontFamily: 'Poppins, sans-serif', fontSize: '0.8rem', cursor: 'pointer',
            }}>
              Скасувати
            </button>
          </>
        )}

        {state === 'result' && result && (() => {
          const s = SCAN_LABEL[result.status];
          return (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
              <h3 style={{ color: s.color, margin: '0 0 0.3rem' }}>{s.text}</h3>
              <p style={{ color: subColor, fontSize: '0.78rem', margin: '0 0 1.2rem' }}>
                Виявлено: {result.engines_detected} з {result.engines_total} антивірусів
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={onDownload} style={{
                  flex: 1, padding: '0.65rem', borderRadius: '0.7rem', border: 'none',
                  background: 'linear-gradient(135deg, #6c9bcf, #1B9c85)',
                  color: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem',
                  fontWeight: 600, cursor: 'pointer',
                }}>
                  Завантажити ZIP
                </button>
                <button onClick={onCancel} style={{
                  padding: '0.65rem 1rem', borderRadius: '0.7rem', background: 'none',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(132,139,200,0.2)'}`,
                  color: subColor, fontFamily: 'Poppins, sans-serif', fontSize: '0.83rem', cursor: 'pointer',
                }}>
                  Скасувати
                </button>
              </div>
            </>
          );
        })()}

        {state === 'error' && (
          <>
            <p style={{ color: '#e05252', marginBottom: '1rem' }}>Помилка сканування. Можливо недостатньо перевірок.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onDownload} style={{
                flex: 1, padding: '0.6rem', borderRadius: '0.7rem', border: 'none',
                background: '#6c9bcf', color: '#fff', fontFamily: 'Poppins, sans-serif',
                fontSize: '0.8rem', cursor: 'pointer',
              }}>
                Завантажити без перевірки
              </button>
              <button onClick={onCancel} style={{
                padding: '0.6rem 1rem', borderRadius: '0.7rem', background: 'none',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(132,139,200,0.2)'}`,
                color: subColor, fontFamily: 'Poppins, sans-serif', fontSize: '0.8rem', cursor: 'pointer',
              }}>
                Скасувати
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function Workshop({ dark }) {
  const [folders, setFolders] = useState([...DEFAULT_FOLDERS]);
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(
    Object.fromEntries(DEFAULT_FOLDERS.map(f => [f, true]))
  );
  const [activeFolder, setActiveFolder] = useState('CLEO');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [buildName, setBuildName] = useState('');
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [zipBlob, setZipBlob] = useState(null);
  const [showScan, setShowScan] = useState(false);
  const fileInputRef = useRef(null);
  const idCounter = useRef(0);

  const theme = dark ? 'dark' : 'light';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.15)';
  const activeBg = dark ? 'rgba(108,155,207,0.15)' : 'rgba(108,155,207,0.1)';

  const addFiles = useCallback((newFiles, targetFolder) => {
    const folder = targetFolder || activeFolder;
    const entries = Array.from(newFiles).map(f => ({
      id: ++idCounter.current,
      file: f,
      name: f.name,
      path: folder ? `${folder}/${f.name}` : f.name,
    }));
    setFiles(prev => [...prev, ...entries]);
  }, [activeFolder]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const addFolder = () => {
    const name = newFolderName.trim();
    if (!name || folders.includes(name)) return;
    setFolders(prev => [...prev, name]);
    setExpandedFolders(prev => ({ ...prev, [name]: true }));
    setActiveFolder(name);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const removeFolder = (folder) => {
    setFolders(prev => prev.filter(f => f !== folder));
    setFiles(prev => prev.filter(f => !f.path.startsWith(`${folder}/`)));
    if (activeFolder === folder) setActiveFolder(folders.find(f => f !== folder) || '');
  };

  const handleCatalogPick = (catalogFile) => {
    const entry = {
      id: ++idCounter.current,
      file: null,
      name: catalogFile.name,
      path: activeFolder ? `${activeFolder}/${catalogFile.name}` : catalogFile.name,
      fromCatalog: true,
      catalogPath: catalogFile.path,
      buildId: catalogFile.build_id,
    };
    setFiles(prev => [...prev, entry]);
    setShowCatalog(false);
  };

  const handleFinish = async () => {
    if (!buildName.trim() || files.length === 0) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('build_name', buildName.trim());

      const localFiles = files.filter(f => f.file);
      const catalogFiles = files.filter(f => f.fromCatalog);

      localFiles.forEach(f => {
        fd.append('files[]', f.file);
        fd.append('paths[]', f.path);
      });

      catalogFiles.forEach(f => {
        fd.append('catalog_paths[]', f.catalogPath);
        fd.append('catalog_build_ids[]', f.buildId);
        fd.append('catalog_dest_paths[]', f.path);
      });

      const res = await axios.post(`${API}/workshop/build/`, fd, {
        headers: { ...auth(), 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/zip' });
      setZipBlob(blob);
      setShowFinish(false);
      setShowScan(true);
    } catch {}
    setSending(false);
  };

  const handleDownload = () => {
    if (!zipBlob) return;
    const url = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buildName.trim()}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowScan(false);
    setZipBlob(null);
  };

  const filesInFolder = (folder) => files.filter(f => f.path.startsWith(`${folder}/`));

  return (
    <div className={`ws-root ${theme}`}>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      <div className="ws-toolbar">
        <h2 className="ws-title" style={{ color: textColor }}>🔧 Майстерня</h2>
        <div className="ws-toolbar-actions">
          <button className="ws-btn ws-btn--secondary" style={{ color: subColor, border }}
            onClick={() => setShowCatalog(true)}>
            <Package size={14} /> З каталогу
          </button>
          <button className="ws-btn ws-btn--secondary" style={{ color: subColor, border }}
            onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> З ПК
          </button>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInput} />
          <button
            className="ws-btn ws-btn--primary"
            disabled={files.length === 0}
            onClick={() => setShowFinish(true)}
          >
            Завершити →
          </button>
        </div>
      </div>

      <div className="ws-body">
        <div className="ws-sidebar" style={{ background: cardBg, border }}>
          <div className="ws-sidebar-header" style={{ borderBottom: border }}>
            <span style={{ color: subColor, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Структура
            </span>
            <button
              onClick={() => setShowNewFolder(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c9bcf' }}
              title="Нова папка"
            >
              <Plus size={15} />
            </button>
          </div>

          {showNewFolder && (
            <div className="ws-new-folder">
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                placeholder="Назва папки..."
                className={`ws-new-folder-input ${theme}`}
                style={{ color: textColor }}
              />
              <button onClick={addFolder} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1B9c85' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="ws-tree">
            {folders.map(folder => {
              const isOpen = expandedFolders[folder];
              const isActive = activeFolder === folder;
              const folderFiles = filesInFolder(folder);
              return (
                <div key={folder}>
                  <div
                    className={`ws-folder-row ${isActive ? 'active' : ''}`}
                    style={{ background: isActive ? activeBg : 'none' }}
                    onClick={() => { setActiveFolder(folder); setExpandedFolders(p => ({ ...p, [folder]: !p[folder] })); }}
                  >
                    {isOpen ? <ChevronDown size={12} color={subColor} /> : <ChevronRight size={12} color={subColor} />}
                    {isOpen ? <FolderOpen size={14} color="#f7d060" /> : <Folder size={14} color="#f7d060" />}
                    <span style={{ color: textColor, fontSize: '0.78rem', flex: 1 }}>{folder}</span>
                    <span style={{ color: subColor, fontSize: '0.65rem' }}>{folderFiles.length}</span>
                    {!DEFAULT_FOLDERS.includes(folder) && (
                      <button
                        onClick={e => { e.stopPropagation(); removeFolder(folder); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e05252', padding: '0 2px' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  {isOpen && folderFiles.map(f => (
                    <div key={f.id} className="ws-file-row">
                      <File size={11} color={subColor} />
                      <span style={{ color: subColor, fontSize: '0.72rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e05252', padding: '0 2px', opacity: 0 }} className="ws-file-delete">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className={`ws-dropzone ${dragOver ? 'active' : ''} ${theme}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {files.length === 0 ? (
            <div className="ws-dropzone-empty">
              <Upload size={32} color={subColor} />
              <p style={{ color: subColor, fontSize: '0.82rem', margin: '0.5rem 0 0' }}>
                Перетягніть файли сюди або натисніть щоб обрати
              </p>
              <p style={{ color: subColor, fontSize: '0.72rem', margin: '0.25rem 0 0', opacity: 0.6 }}>
                Файли додадуться до папки: <strong style={{ color: '#6c9bcf' }}>{activeFolder || 'корінь'}</strong>
              </p>
            </div>
          ) : (
            <div className="ws-files-grid" onClick={e => e.stopPropagation()}>
              {files.map(f => (
                <div key={f.id} className={`ws-file-card ${theme}`} style={{ background: cardBg, border }}>
                  <File size={18} color="#6c9bcf" />
                  <span className="ws-file-card-name" style={{ color: textColor }}>{f.name}</span>
                  <span className="ws-file-card-path" style={{ color: subColor }}>{f.path}</span>
                  <button onClick={() => removeFile(f.id)} className="ws-file-card-delete">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div
                className={`ws-file-card ws-file-card--add ${theme}`}
                style={{ border: `1.5px dashed ${dark ? 'rgba(108,155,207,0.3)' : 'rgba(108,155,207,0.25)'}`, cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={20} color="#6c9bcf" />
                <span style={{ color: '#6c9bcf', fontSize: '0.75rem' }}>Додати файли</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCatalog && (
        <CatalogPicker
          dark={dark}
          onPick={handleCatalogPick}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {showFinish && (
        <FinishModal
          dark={dark}
          buildName={buildName}
          setBuildName={setBuildName}
          onSubmit={handleFinish}
          onCancel={() => setShowFinish(false)}
          sending={sending}
        />
      )}

      {showScan && zipBlob && (
        <WorkshopScanModal
          dark={dark}
          zipBlob={zipBlob}
          buildName={buildName}
          onDownload={handleDownload}
          onCancel={() => { setShowScan(false); setZipBlob(null); }}
        />
      )}
    </div>
  );
}