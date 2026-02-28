import React, { useState } from 'react';
import axios from 'axios';

const AIAnalyzer = ({ buildId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('vortex_token');
            const response = await axios.post(
                `http://127.0.0.1:8000/api/builds/${buildId}/analyze/`, 
                {}, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setData(response.data);
        } catch (error) {
            console.error("Помилка аналізу:", error);
            alert(`Сталася помилка: ${error.response?.status === 403 ? "Доступ заборонено (403)" : "Сервер не відповідає"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', background: '#1a1a1a', color: 'white', borderRadius: '12px', border: '1px solid #00d1b2', marginTop: '20px' }}>
            <h3 style={{ color: '#00d1b2' }}>Vortex AI Analyzer</h3>
            
            {!data ? (
                <button 
                    onClick={runAnalysis} 
                    disabled={loading}
                    style={{ background: '#00d1b2', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    {loading ? "ШІ думає..." : "Запустити аналіз сумісності"}
                </button>
            ) : (
                <div style={{ textAlign: 'left', marginTop: '15px' }}>
                    <h4 style={{ color: '#ffdd57' }}>Вердикт: {data.verdict}</h4>
                    <p><strong>FPS:</strong> {data.fps_prediction}</p>
                    
                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: '#ff3860', fontWeight: 'bold' }}>⚠️ Ризики:</span>
                        <ul style={{ fontSize: '14px' }}>
                            {data.risks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                        <span style={{ color: '#48c774', fontWeight: 'bold' }}>Рекомендації:</span>
                        <ul style={{ fontSize: '14px' }}>
                            {data.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                    </div>
                    
                    <button onClick={() => setData(null)} style={{ background: 'none', border: '1px solid #444', color: '#888', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>
                        Скинути тест
                    </button>
                </div>
            )}
        </div>
    );
};

export default AIAnalyzer;