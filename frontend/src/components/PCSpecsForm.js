import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Monitor, HardDrive, Save } from 'lucide-react';

const PCSpecsForm = () => {
    const [specs, setSpecs] = useState({
        label: 'Мій ігровий ПК',
        cpu_model: '',
        gpu_model: '',
        ram_gb: 8
    });

    useEffect(() => {
        const fetchSpecs = async () => {
            const token = localStorage.getItem('vortex_token');
            if (!token) return;

            try {
                const response = await axios.get('http://127.0.0.1:8000/api/specs/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.data.length > 0) {
                    setSpecs(response.data[0]);
                }
            } catch (error) {
                console.error("Не вдалося завантажити характеристики", error);
            }
        };

        fetchSpecs();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('vortex_token');

        if (!token) {
            alert('Будь ласка, спочатку увійдіть у свій акаунт!');
            return;
        }

        try {
            const payload = {
                ...specs,
                ram_gb: parseInt(specs.ram_gb)
            };

            const response = await axios.post('http://127.0.0.1:8000/api/specs/', payload, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            alert('Характеристики збережено успішно!');
            console.log('Збережено:', response.data);
        } catch (error) {
            console.error('Помилка при збереженні:', error.response?.data || error);
            
            if (error.response?.status === 401) {
                alert('Ваша сесія закінчилася або токен недійсний. Увійдіть знову.');
            } else {
                alert('Сталася помилка. Подробиці в консолі.');
            }
        }
    };

    return (
        <div style={styles.container}>
            <h2><Monitor size={24} /> Налаштування мого заліза</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label><Cpu size={18} /> Процесор:</label>
                    <input 
                        type="text" 
                        placeholder="Напр: Intel Core i5-12400F"
                        value={specs.cpu_model}
                        onChange={(e) => setSpecs({...specs, cpu_model: e.target.value})}
                    />
                </div>
                
                <div style={styles.inputGroup}>
                    <label><Monitor size={18} /> Відеокарта:</label>
                    <input 
                        type="text" 
                        placeholder="Напр: NVIDIA RTX 3060"
                        value={specs.gpu_model}
                        onChange={(e) => setSpecs({...specs, gpu_model: e.target.value})}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label><HardDrive size={18} /> Оперативна пам'ять (ГБ):</label>
                    <input 
                        type="number" 
                        value={specs.ram_gb}
                        onChange={(e) => setSpecs({...specs, ram_gb: e.target.value})}
                    />
                </div>

                <button type="submit" style={styles.button}>
                    <Save size={18} /> Зберегти характеристики
                </button>
            </form>
        </div>
    );
};

const styles = {
    container: { maxWidth: '400px', margin: '20px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    button: { padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
};

export default PCSpecsForm;