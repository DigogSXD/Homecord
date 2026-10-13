# 🎮 Discord 2 (Homecord)

> **Aplicativo de Comunicação Privado (Texto & Voz WebRTC) Self-Hosted**

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?style=for-the-badge&logo=socket.io)
![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-333333?style=for-the-badge&logo=webrtc)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

O **Discord 2 (Homecord)** é uma aplicação web moderna, rápida e auto-hospedável (self-hosted) inspirada no Discord. Ele permite criar salas de texto e voz com transmissão de tela em tempo real para redes locais (LAN) ou servidores privados na nuvem.

---

## ✨ Recursos Principais

- 💬 **Canais de Texto em Tempo Real**: Mensagens instantâneas alimentadas por **Socket.IO**, suporte a upload de imagens (até 10MB), indicador de digitação ("digitando...") e exclusão de mensagens.
- 🎙️ **Canais de Voz WebRTC**: Áudio em grupo HD com ultral baixa latência via **WebRTC**, indicador de fala (borda verde), isolamento por canal e medição de ping/latência.
- 🖥️ **Transmissão de Tela (Screen Share)**: Compartilhamento de tela HD diretamente pelo navegador com outros usuários do canal de voz.
- 🎛️ **Controles de Áudio Avançados**: Mutar microfone (*Mute*), desativar áudio (*Deafen*), ajuste individual de volume de cada participante da sala.
- 👤 **Perfis & Status**: Personalização de nome, avatar (emoji), cor de perfil, status de presença (Online, Ausente, Ocupado, Invisível) e mensagem de status personalizada.
- 📁 **Gerenciamento de Canais**: Criação e remoção dinâmica de canais de texto e voz com tópicos informativos.
- 💾 **Persistência Leve**: Armazenamento automático e recuperação de histórico de mensagens e canais em arquivo JSON local (`data_store.json`).
- 🎨 **Interface Moderna**: UI escura elegante (*Dark Mode*), inspirada no layout do Discord com efeitos de *glassmorphism*, responsiva e limpa.

---

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- [React 19](https://react.dev/)
- [Vite 6](https://vitejs.dev/)
- [Lucide React](https://lucide.dev/) (Ícones modernos)
- CSS3 Custom Properties & Animations

### **Backend**
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/) (WebSockets & Signaling WebRTC)

### **Mídia & Comunicação**
- [WebRTC API](https://developer.mozilla.org/pt-BR/docs/Web/API/WebRTC_API) (Peer-to-Peer Audio & Video Streaming)

---

## 🚀 Como Executar o Projeto

### **Pré-requisitos**
Certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (necessário para gerar um link público)

---

### **Instalação**

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/DigogSXD/Homecord.git
   cd Homecord
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Inicie o aplicativo com o túnel Cloudflare**:
   ```bash
   npm run dev
   ```

O comando inicia o backend, a interface e o túnel Cloudflare. O `cloudflared` precisa estar instalado e disponível no terminal (comando `cloudflared`). O túnel encaminha o tráfego público para a interface local:

- **Backend (Node/Express/Socket.IO)** em `http://localhost:5000`
- **Frontend (Vite/React)** em `http://localhost:3000`
- **Túnel Cloudflare** encaminhando para `http://localhost:3000`

Quando o túnel conectar, o endereço público `https://....trycloudflare.com` será exibido no terminal e salvo em `LINK_ATUAL.txt`. Abra esse endereço no navegador para testar ou envie-o aos seus amigos. Na mesma máquina, também é possível acessar a interface por `http://localhost:3000`.

**Importante:** esse é um link temporário do Cloudflare Quick Tunnel. Mantenha o terminal aberto enquanto outras pessoas estiverem usando o aplicativo. Ao fechar o terminal com `Ctrl+C`, o servidor e o túnel são encerrados; ao iniciar novamente, o endereço pode mudar. Confira o terminal ou `LINK_ATUAL.txt` e envie o novo endereço. O arquivo `LINK_ATUAL.txt` é local e não é publicado no GitHub.

Para executar apenas na rede local, sem túnel Cloudflare, use `npm run dev:local` e abra `http://localhost:3000`. Para disponibilizar o app com um endereço permanente, configure um túnel nomeado e um domínio na sua conta Cloudflare.

---

## 📜 Scripts Disponíveis

No arquivo `package.json`, você encontrará os seguintes scripts:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Executa o backend, a interface Vite e o túnel Cloudflare (requer `cloudflared`). |
| `npm run dev:local` | Executa o backend e a interface Vite sem túnel Cloudflare. |
| `npm run tunnel` | Inicia o backend, a interface Vite e o túnel Cloudflare. |
| `npm run server` | Executa apenas o servidor Node.js backend. |
| `npm run client` | Executa apenas o servidor de desenvolvimento do Vite. |
| `npm run build` | Compila os arquivos do frontend para produção na pasta `dist/`. |
| `npm start` | Inicia o servidor Node.js servindo o build de produção. |

---

## 🌐 Publicando no GitHub / Git Remote

Para enviar o projeto para o seu repositório no GitHub:

1. **Inicialize o Git no projeto**:
   ```bash
   git init
   ```

2. **Adicione os arquivos e crie o commit inicial**:
   ```bash
   git add .
   git commit -m "feat: commit inicial do Discord 2 (Homecord)"
   ```

3. **Renomeie a branch principal para `main`**:
   ```bash
   git branch -M main
   ```

4. **Conecte ao seu repositório remoto no GitHub**:
   ```bash
   git remote add origin https://github.com/DigogSXD/Homecord.git
   ```

5. **Envie os arquivos para o GitHub**:
   ```bash
   git push -u origin main
   ```

---

## 📄 Licença

Este projeto está sob a licença [MIT](./LICENSE). Sinta-se livre para usar, modificar e distribuir.

---

<p center>Desenvolvido com 💙 para comunicação rápida e privada.</p>
