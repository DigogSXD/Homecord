import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Iniciando Discord 2 (Backend + Frontend + Cloudflare Tunnel)...\n');

// 1. Start Node Server
const serverProc = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

// 2. Start Vite Frontend
const viteProc = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

// 3. Start Cloudflare Tunnel
const tunnelProc = spawn('cloudflared', ['tunnel', '--url', 'http://localhost:3000'], { shell: true });

let capturedUrl = null;

function handleLog(data) {
  const text = data.toString();
  // Match Cloudflare tunnel URL
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && match[0] !== capturedUrl) {
    capturedUrl = match[0];
    
    // Save to LINK_ATUAL.txt
    try {
      fs.writeFileSync(path.join(__dirname, 'LINK_ATUAL.txt'), capturedUrl + '\n');
    } catch (e) {
      console.error('Erro ao salvar LINK_ATUAL.txt:', e);
    }

    console.log('\n');
    console.log('==============================================================================');
    console.log('🎉 LINK PÚBLICO DO DISCORD 2 GERADO COM SUCESSO!');
    console.log('');
    console.log(`🌐 SEU LINK DE ACESSO: \x1b[36m\x1b[1m\x1b[4m${capturedUrl}\x1b[0m`);
    console.log('');
    console.log('📄 O link foi salvo automaticamente no arquivo LINK_ATUAL.txt');
    console.log('==============================================================================\n');
  }
}

if (tunnelProc.stdout) tunnelProc.stdout.on('data', handleLog);
if (tunnelProc.stderr) tunnelProc.stderr.on('data', handleLog);

function cleanup() {
  console.log('\n🛑 Encerrando aplicação...');
  try { serverProc.kill(); } catch (e) {}
  try { viteProc.kill(); } catch (e) {}
  try { tunnelProc.kill(); } catch (e) {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
