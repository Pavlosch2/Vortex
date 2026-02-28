import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

const Auth = ({ onLoginSuccess }) => {
    const [isActive, setIsActive] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [regData, setRegData] = useState({ username: '', password: '', age: '' });

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/auth/login/', {
                username: loginData.username,
                password: loginData.password
            });

            const token = response.data.access_token || response.data.access;
            localStorage.setItem('vortex_token', token);
            onLoginSuccess(token);
        } catch (error) {
            alert("Невірний логін або пароль");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (parseInt(regData.age) < 16) {
            alert("Доступ дозволено з 16 років!");
            return;
        }

        try {
            const payload = {
                username: regData.username,
                password: regData.password,
                age: parseInt(regData.age)
            };

            await axios.post('http://127.0.0.1:8000/api/auth/register/', payload);
            
            alert("Реєстрація успішна! Тепер увійдіть.");
            setIsActive(false);
        } catch (error) {
            const errData = error.response?.data;
            
            if (errData?.username) {
                alert("Цей логін уже зайнятий. Спробуйте інший!");
            } else if (errData?.password) {
                alert("Проблема з паролем: " + errData.password.join(' '));
            } else {
                alert("Сталася помилка при реєстрації.");
            }
            
            console.log("Деталі помилки:", errData);
        }
    };

    return (
        <div className={`wrapper ${isActive ? 'active' : ''}`}>
            <span className="rotate-bg"></span>
            <span className="rotate-bg2"></span>

            <div className="form-box login">
                <h2 className="animation" style={{'--i':0, '--j':21}}>Вхід</h2>
                <form onSubmit={handleLogin}>
                    <div className="input-box animation" style={{'--i':1, '--j':22}}>
                        <input type="text" required value={loginData.username} 
                            onChange={(e) => setLoginData({...loginData, username: e.target.value})} />
                        <label>Логін</label>
                        <i className='bx bxs-user'></i>
                    </div>
                    <div className="input-box animation" style={{'--i':2, '--j':23}}>
                        <input type="password" required value={loginData.password} 
                            onChange={(e) => setLoginData({...loginData, password: e.target.value})} />
                        <label>Пароль</label>
                        <i className='bx bxs-lock-alt'></i>
                    </div>
                    <button type="submit" className="animation" style={{'--i':3, '--j':24}}>Увійти</button>
                    <div className="linkTxt animation" style={{'--i':5, '--j':26}}>
                        <p>Немає акаунту? <button type="button" className="link-btn" onClick={() => setIsActive(true)}>Зареєструватися</button></p>
                    </div>
                </form>
            </div>

            <div className="form-box register">
                <h2 className="animation" style={{'--i':17, '--j':0}}>Реєстрація</h2>
                <form onSubmit={handleRegister}>
                    <div className="input-box animation" style={{'--i':18, '--j':1}}>
                        <input type="text" required value={regData.username} 
                            onChange={(e) => setRegData({...regData, username: e.target.value})} />
                        <label>Логін</label>
                        <i className='bx bxs-user'></i>
                    </div>
                    <div className="input-box animation" style={{'--i':19, '--j':2}}>
                        <input type="number" required value={regData.age} 
                            onChange={(e) => setRegData({...regData, age: e.target.value})} />
                        <label>Вік (16+)</label>
                        <i className='bx bxs-calendar'></i>
                    </div>
                    <div className="input-box animation" style={{'--i':20, '--j':3}}>
                        <input type="password" required value={regData.password} 
                            onChange={(e) => setRegData({...regData, password: e.target.value})} />
                        <label>Пароль</label>
                        <i className='bx bxs-lock-alt'></i>
                    </div>
                    <button type="submit" className="animation" style={{'--i':21, '--j':4}}>Створити</button>
                    <div className="linkTxt animation" style={{'--i':22, '--j':5}}>
                        <p>Є акаунт? <button type="button" className="link-btn" onClick={() => setIsActive(false)}>Увійти</button></p>
                    </div>
                </form>
            </div>

            <div className="info-text login">
                <h2 className="animation" style={{'--i':0, '--j':20}}>VORTEX</h2>
                <p className="animation" style={{'--i':1, '--j':21}}>Твій ШІ-асистент.</p>
            </div>
            <div className="info-text register">
                <h2 className="animation" style={{'--i':17, '--j':0}}>JOIN US</h2>
                <p className="animation" style={{'--i':18, '--j':1}}>Долучайся до спільноти.</p>
            </div>
        </div>
    );
};

export default Auth;