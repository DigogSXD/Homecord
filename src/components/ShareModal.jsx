import React, { useState } from 'react';
import { X, Copy, Check, Globe, ShieldCheck, Zap } from 'lucide-react';

export default function ShareModal({ onClose }) {
  const [copiedLocal, setCopiedLocal] = useState(false);
  const [copiedCloudflare, setCopiedCloudflare] = useState(false);
  
  const currentHost = window.location.host;
  const localUrl = `http://${currentHost}`;

  const [cloudflareUrl, setCloudflareUrl] = useState(() => {
    if (window.location.hostname.includes('trycloudflare.com') || window.location.hostname.includes('loca.lt')) {
      return window.location.origin;
    }
    try {
      const saved = localStorage.getItem('discord2_cloudflare_url');
      if (saved) return saved;
    } catch (e) {}
    return 'https://cottage-hired-calculator-ferry.trycloudflare.com';
  });

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setCloudflareUrl(val);
    try {
      localStorage.setItem('discord2_cloudflare_url', val);
    } catch (err) {}
  };

  const copyLocal = () => {
    navigator.clipboard.writeText(localUrl);
    setCopiedLocal(true);
    setTimeout(() => setCopiedLocal(false), 2000);
  };

  const copyCloudflare = () => {
    navigator.clipboard.writeText(cloudflareUrl);
    setCopiedCloudflare(true);
    setTimeout(() => setCopiedCloudflare(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ width: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={24} style={{ color: 'var(--neon-cyan)' }} />
            <h3 className="modal-title">Conectar Seus Amigos no Homecord</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Option 1: Active Cloudflare Link (Editable) */}
          <div style={{ background: 'var(--bg-darkest)', padding: '14px', borderRadius: '8px', border: '2px solid var(--accent-green)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent-green)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={18} /> 🌐 Link Ativo da Internet (Cloudflare Tunnel)
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Este é o seu link público seguro. Você pode <strong>editar ou colar um novo link</strong> abaixo sempre que reiniciar o túnel:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="custom-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px', color: '#23a55a', fontWeight: 'bold', borderColor: 'var(--accent-green)' }}
                value={cloudflareUrl}
                onChange={handleUrlChange}
                placeholder="Cole aqui o seu novo link da Cloudflare..."
              />
              <button className="btn-primary" style={{ backgroundColor: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={copyCloudflare}>
                {copiedCloudflare ? <Check size={16} /> : <Copy size={16} />}
                {copiedCloudflare ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </div>

          {/* Option 2: Local Network */}
          <div style={{ background: 'var(--bg-darkest)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-header)', marginBottom: '4px' }}>
              📍 2. Amigos no mesmo Wi-Fi / Casa
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Endereço para quem estiver usando a mesma rede da sua casa:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                className="custom-input"
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px' }}
                value={localUrl}
              />
              <button className="btn-secondary" onClick={copyLocal}>
                {copiedLocal ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Instructions info */}
          <div style={{ background: '#111214', padding: '10px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--accent-green)' }} />
            O link Cloudflare Tunnel (HTTPS) permite que seus amigos usem microfone e compartilhem a tela direto do navegador sem precisar instalar programas!
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button className="btn-primary" onClick={onClose}>
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
}
