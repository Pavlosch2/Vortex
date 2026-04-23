import React, { useState } from 'react';
import { Zap, Bot, Package, TrendingUp, Server, Check, ArrowLeft, Shield, Star } from 'lucide-react';
import './styles/PricingPage.css';

const CREDIT_PACKS = [
  { amount: 20, price: 2, per: '$0.10/кредит' },
  { amount: 50, price: 4, per: '$0.08/кредит', popular: true },
  { amount: 100, price: 7, per: '$0.07/кредит' },
];

const FREE_FEATURES = [
  { text: '5 AI-аналізів на місяць' },
  { text: 'Стандартна модерація — до 72 год' },
  { text: '1 активна заявка одночасно' },
  { text: 'Доступ до всіх безкоштовних збірок' },
  { text: 'Коментарі та відгуки' },
];

const STANDARD_FEATURES = [
  { text: '50 AI-аналізів на місяць' },
  { text: 'Пріоритетна модерація — 24 год' },
  { text: '3 активні заявки одночасно' },
  { text: '1 безкоштовна антивірусна перевірка/міс' },
  { text: 'Ранній доступ до Premium збірок' },
];

const PRO_FEATURES = [
  { text: '100 AI-аналізів на місяць' },
  { text: 'Пріоритетна модерація — 24 год' },
  { text: '7 активних заявок одночасно' },
  { text: '5 безкоштовних антивірусних перевірок/міс' },
  { text: 'Перегляд результатів сканування збірок' },
  { text: 'Виділений золотий нік ⚡' },
  { text: 'Кастомізація профілю: колір ніку, рамка аватарки, значок' },
  { text: 'Ранній доступ до Premium збірок' },
];

const OTHER_PURCHASES = [
  {
    icon: <TrendingUp size={20} color="#6c9bcf" />,
    title: 'Просування збірки',
    desc: 'Ваша збірка у секції «Рекомендовані» над каталогом протягом тижня.',
    price: '$3',
    per: 'за тиждень',
    color: '#6c9bcf',
  },
  {
    icon: <Bot size={20} color="#1B9c85" />,
    title: 'AI-консультація збірки',
    desc: 'AI перевіряє чи збірка робоча і сумісна. При схваленні — модератор може опублікувати одразу без черги.',
    price: '$2',
    per: 'разово',
    color: '#1B9c85',
  },
  {
    icon: <Shield size={20} color="#e05252" />,
    title: 'Антивірусна перевірка',
    desc: 'Перевірка збірки через 70+ антивірусних движків VirusTotal. Результат доступний одразу.',
    price: '$3',
    per: 'разово',
    color: '#e05252',
  },
  {
    icon: <Server size={20} color="#a3bdcc" />,
    title: 'API доступ',
    desc: 'Для серверів Arizona RP. Прямий доступ до каталогу збірок через API.',
    price: '$100',
    per: 'на місяць',
    color: '#a3bdcc',
  },
];

export default function PricingPage({ dark, onBack }) {
  const [billingNote, setBillingNote] = useState(false);
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)';
  const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(132,139,200,0.15)';

  const handleBuy = () => setBillingNote(true);

  return (
    <div className={`pricing-root ${dark ? 'dark' : 'light'}`}>
      <div className="pricing-inner">

        <button className="pricing-back" style={{ color: subColor }} onClick={onBack}>
          <ArrowLeft size={15} /> Назад
        </button>

        <div className="pricing-hero">
          <h1 className="pricing-h1" style={{ color: textColor }}>
            Тарифи <span style={{ color: '#f7d060' }}>Vortex</span>
          </h1>
          <p className="pricing-sub" style={{ color: subColor }}>
            Обери план який підходить саме тобі
          </p>
        </div>

        {billingNote && (
          <div className="pricing-billing-note">
            ⏳ Платіжна система буде доступна найближчим часом. Дякуємо за інтерес!
          </div>
        )}

        <div className="pricing-plans pricing-plans--three">

          <div className="pricing-card" style={{ background: cardBg, border }}>
            <div className="pricing-card-header">
              <span className="pricing-plan-name" style={{ color: subColor }}>Безкоштовно</span>
              <div className="pricing-plan-price" style={{ color: textColor }}>
                $0 <span style={{ fontSize: '0.8rem', color: subColor }}>/ завжди</span>
              </div>
            </div>
            <ul className="pricing-feature-list">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="pricing-feature-item" style={{ color: subColor }}>
                  <Check size={14} color="#a3bdcc" /> {f.text}
                </li>
              ))}
            </ul>
            <button className="pricing-btn pricing-btn--free" style={{ border, color: subColor }}>
              Поточний план
            </button>
          </div>

          <div className="pricing-card pricing-card--premium"
            style={{ background: dark ? 'rgba(247,208,96,0.06)' : 'rgba(247,208,96,0.05)', border: '1px solid rgba(247,208,96,0.35)' }}>
            <div className="pricing-card-popular">⚡ Найпопулярніше</div>
            <div className="pricing-card-header">
              <span className="pricing-plan-name" style={{ color: '#f7d060', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} /> Стандарт
              </span>
              <div className="pricing-plan-price" style={{ color: textColor }}>
                $6 <span style={{ fontSize: '0.8rem', color: subColor }}>/ місяць</span>
              </div>
            </div>
            <ul className="pricing-feature-list">
              {STANDARD_FEATURES.map((f, i) => (
                <li key={i} className="pricing-feature-item" style={{ color: textColor }}>
                  <Check size={14} color="#f7d060" /> {f.text}
                </li>
              ))}
            </ul>
            <button className="pricing-btn pricing-btn--premium" onClick={handleBuy}>
              Оформити Стандарт
            </button>
          </div>

          <div className="pricing-card pricing-card--pro"
            style={{ background: dark ? 'rgba(108,155,207,0.08)' : 'rgba(108,155,207,0.06)', border: '1px solid rgba(108,155,207,0.4)' }}>
            <div className="pricing-card-popular pricing-card-popular--pro">
              <Star size={11} /> Pro
            </div>
            <div className="pricing-card-header">
              <span className="pricing-plan-name" style={{ color: '#6c9bcf', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={14} /> Pro
              </span>
              <div className="pricing-plan-price" style={{ color: textColor }}>
                $17 <span style={{ fontSize: '0.8rem', color: subColor }}>/ місяць</span>
              </div>
            </div>
            <ul className="pricing-feature-list">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="pricing-feature-item" style={{ color: textColor }}>
                  <Check size={14} color="#6c9bcf" /> {f.text}
                </li>
              ))}
            </ul>
            <button className="pricing-btn pricing-btn--pro" onClick={handleBuy}>
              Оформити Pro
            </button>
          </div>

        </div>

        <div className="pricing-section-title" style={{ color: textColor }}>
          <Bot size={16} color="#6c9bcf" /> Пакети AI-кредитів
        </div>
        <p className="pricing-section-sub" style={{ color: subColor }}>
          Разова покупка — без підписки. Кредити не згорають.
        </p>
        <div className="pricing-credits-grid">
          {CREDIT_PACKS.map((pack, i) => (
            <div key={i}
              className={`pricing-credit-card ${pack.popular ? 'popular' : ''}`}
              style={{
                background: pack.popular ? 'rgba(108,155,207,0.1)' : cardBg,
                border: pack.popular ? '1px solid rgba(108,155,207,0.4)' : border,
              }}
            >
              {pack.popular && <div className="pricing-credit-popular">Вигідно</div>}
              <div className="pricing-credit-amount" style={{ color: '#6c9bcf' }}>
                {pack.amount} <span style={{ fontSize: '0.75rem' }}>кредитів</span>
              </div>
              <div className="pricing-credit-price" style={{ color: textColor }}>${pack.price}</div>
              <div className="pricing-credit-per" style={{ color: subColor }}>{pack.per}</div>
              <button className="pricing-btn pricing-btn--credits" onClick={handleBuy}>
                Придбати
              </button>
            </div>
          ))}
        </div>

        <div className="pricing-section-title" style={{ color: textColor }}>
          <Package size={16} color="#6c9bcf" /> Додаткові послуги
        </div>
        <div className="pricing-other-grid">
          {OTHER_PURCHASES.map((item, i) => (
            <div key={i} className="pricing-other-card" style={{ background: cardBg, border }}>
              <div className="pricing-other-icon" style={{ background: `${item.color}15` }}>
                {item.icon}
              </div>
              <div className="pricing-other-info">
                <span className="pricing-other-title" style={{ color: textColor }}>{item.title}</span>
                <p className="pricing-other-desc" style={{ color: subColor }}>{item.desc}</p>
              </div>
              <div className="pricing-other-price-wrap">
                <span className="pricing-other-price" style={{ color: item.color }}>{item.price}</span>
                <span className="pricing-other-per" style={{ color: subColor }}>{item.per}</span>
                <button className="pricing-btn pricing-btn--other"
                  style={{ borderColor: `${item.color}44`, color: item.color }}
                  onClick={handleBuy}>
                  Обрати
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pricing-author-section" style={{ background: cardBg, border }}>
          <h3 style={{ color: textColor, margin: '0 0 0.5rem', fontSize: '1rem' }}>
            💰 Система для авторів збірок
          </h3>
          <p style={{ color: subColor, fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
            Автори отримують частку з підписок пропорційно до завантажень їхніх преміум збірок.
            Також доступні добровільні донати від юзерів — платформа бере 15% комісії.
            При схваленні заявки — безкоштовне просування на 3 дні.
            Збірки з рейтингом 4.5+ отримують безкоштовну AI-консультацію.
          </p>
        </div>

      </div>
    </div>
  );
}