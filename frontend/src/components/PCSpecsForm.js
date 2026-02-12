import React, { useState } from 'react';
import axios from 'axios';
import { Cpu, Monitor, HardDrive, Save } from 'lucide-react';

const PCSpecsForm = () => {
    const [specs, setSpecs] = useState({
        label: 'Мій ігровий ПК',
        cpu_model: '',
        gpu_model: '',
        ram_gb: 8
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Відправляємо дані на бекенд (ендпоінт створимо наступним кроком)
            const response = await axios.post('/api/specs/', specs);
            alert('Характеристики збережено успішно!');
        } catch (error) {
            console.error('Помилка при збереженні:', error);
            alert('Сталася помилка. Перевір консоль.');
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