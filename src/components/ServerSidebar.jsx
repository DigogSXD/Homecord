import React from 'react';
import { Share2, Settings, Home } from 'lucide-react';

export default function ServerSidebar({ onOpenShare, onOpenSettings }) {
  return (
    <div className="server-sidebar">
      {/* Homecord Main Icon */}
      <div className="server-icon active" title="Servidor Principal - Homecord">
        <Home size={24} style={{ color: '#000' }} />
      </div>

      <div className="server-divider" />

      {/* Share / Invite Friends Button */}
      <div
        className="server-icon"
        style={{ color: 'var(--neon-cyan)' }}
        title="Conectar Amigos / Link Cloudflare"
        onClick={onOpenShare}
      >
        <Share2 size={20} />
      </div>

      {/* Settings */}
      <div
        className="server-icon"
        title="Configurações do Perfil"
        onClick={onOpenSettings}
      >
        <Settings size={20} />
      </div>
    </div>
  );
}
