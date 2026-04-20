import React from 'react';
import { X, Zap, Bot, Package } from 'lucide-react';
import './styles/UpsellModal.css';

const PLANS = {
  credits: {
    icon: <Bot size={22} color="#6c9bcf" />,
    title: 'Пакети AI-кредитів',
    desc: 'Разова покупка — без підписки',
    options: [
      { label: '20 кредитів', price: '$2' },
      { label: '50 кредитів', price: '$4' },
      { label: '100 кредитів', price: '$7' },
    ],
    cta: 'Придбати кредити',
    color: '#6c9bcf',
  },
  premium: {
    icon: <Zap size={22} color="#f7d060" />,
    title: 'Преміум підписка',
    desc: '$6 / місяць',
    options: [
      { label: '100 AI-аналізів на місяць' },
      { label: 'Пріоритетна модерація заявок' },
      { label: 'Виділений нік ⚡ у коментарях' },
      { label: 'Ранній доступ до Premium збірок' },
      { label: 'Необмежена кількість заявок' },
    ],
    cta: 'Оформити преміум',
    color: '#f7d060',
  },
  submission: {
    icon: <Package size={22} color="#1B9c85" />,
    title: 'Преміум підписка',
    desc: '$6 / місяць',
    options: [
      { label: 'Необмежена кількість активних заявок' },
      { label: 'Пріоритетна модерація — 24 год' },
      { label: '100 AI-аналізів на місяць' },
      { label: 'Виділений нік ⚡ у коментарях' },
    ],
    cta: 'Оформити преміум',
    color: '#1B9c85',
  },
};

const REASONS = {
  credits: 'AI-кредити вичерпано. Поповніть баланс або оформіть преміум для 100 аналізів на місяць.',
  premium: 'Ця збірка доступна лише для преміум користувачів.',
  submission: 'Безкоштовний акаунт може мати лише 1 активну заявку одночасно.',
};

export default function UpsellModal({ reason, dark, onClose, onNavigatePricing }) {
  if (!reason) return null;

  const plan = PLANS[reason] || PLANS.premium;
  const reasonText = REASONS[reason] || '';

  const bg = dark ? 'rgba(20,22,28,0.98)' : 'rgba(255,255,255,0.98)';
  const border = dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(132,139,200,0.2)';
  const textColor = dark ? '#edeffd' : '#363949';
  const subColor = dark ? '#a3bdcc' : '#677483';
  const itemBg = dark ? 'rgba(255,255,255,0.04)' : 'rgba(108,155,207,0.05)';

  return (
    <div className="upsell-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="upsell-modal" style={{ background: bg, border }}>

        <button className="upsell-close" onClick={onClose} style={{ color: subColor }}>
          <X size={18} />
        </button>

        <div className="upsell-icon-wrap" style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}33` }}>
          {plan.icon}
        </div>

        <h2 className="upsell-title" style={{ color: textColor }}>{plan.title}</h2>
        <p className="upsell-reason" style={{ color: subColor }}>{reasonText}</p>
        <p className="upsell-price" style={{ color: plan.color }}>{plan.desc}</p>

        <ul className="upsell-list">
          {plan.options.map((o, i) => (
            <li key={i} className="upsell-list-item" style={{ background: itemBg, color: textColor }}>
              {o.price
                ? <><span style={{ color: plan.color, fontWeight: 700 }}>{o.label}</span><span className="upsell-option-price" style={{ color: plan.color }}>{o.price}</span></>
                : <><span style={{ color: plan.color }}>✓</span> {o.label}</>
              }
            </li>
          ))}
        </ul>

        <div className="upsell-actions">
          <button
            className="upsell-btn-main"
            style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}aa)` }}
            onClick={() => { onClose(); onNavigatePricing && onNavigatePricing(); }}
          >
            {plan.cta}
          </button>
          <button className="upsell-btn-secondary" style={{ color: subColor, border }} onClick={onClose}>
            Пізніше
          </button>
        </div>

        <p className="upsell-note" style={{ color: subColor }}>
          Платіжна система буде доступна найближчим часом.
        </p>
      </div>
    </div>
  );
}