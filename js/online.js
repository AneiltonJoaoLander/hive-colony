'use strict';
/* Multiplayer online via WebRTC (PeerJS).
   - O anfitrião cria uma sala (código de 5 letras); o convidado entra pelo código/link.
   - O servidor público do PeerJS só faz o encontro; as jogadas vão direto entre os dois.
   - O anfitrião é a fonte da verdade: ao (re)conectar o convidado recebe um "sync" completo. */

const Online = {
  peer: null, conn: null, role: null, code: null, token: null, left: false,
  connected: false, retryTimer: null, joined: false, lastError: null,
  handlers: { onMessage() {}, onStatus() {} },

  available() { return typeof Peer !== 'undefined'; },

  makeCode() {
    const al = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 5; i++) c += al[Math.floor(Math.random() * al.length)];
    return c;
  },
  peerId(code) { return 'hivecol-' + code; },

  host() {
    this.leave(true);
    this.left = false; this.role = 'host'; this.joined = false;
    this.token = null;
    const open = () => {
      this.code = this.makeCode();
      const peer = new Peer(this.peerId(this.code), { debug: 0 });
      this.peer = peer;
      peer.on('open', () => this.handlers.onStatus({ kind: 'room', code: this.code }));
      peer.on('connection', conn => this.acceptConn(conn));
      peer.on('disconnected', () => { if (!this.left) { try { peer.reconnect(); } catch (e) { /* ignore */ } } });
      peer.on('error', err => {
        if (err.type === 'unavailable-id') { peer.destroy(); open(); return; }
        this.handlers.onStatus({ kind: 'error', message: 'Erro de conexão: ' + err.type });
      });
    };
    open();
  },

  acceptConn(conn) {
    conn.on('open', () => {
      if (this.conn && this.conn !== conn) { try { this.conn.close(); } catch (e) { /* ignore */ } }
      this.conn = conn;
    });
    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'hello') {
        if (this.token && msg.token !== this.token) { try { conn.send({ t: 'full' }); } catch (e) { /* ignore */ } return; }
        this.token = msg.token;
        if (this.conn && this.conn !== conn) { try { this.conn.close(); } catch (e) { /* ignore */ } }
        this.conn = conn;
        this.joined = true;
        this.setConnected(true);
      }
      if (conn === this.conn) this.handlers.onMessage(msg);
    });
    const gone = () => { if (conn === this.conn) { this.setConnected(false); } };
    conn.on('close', gone);
    conn.on('error', gone);
  },

  join(code) {
    this.leave(true);
    this.left = false; this.role = 'guest'; this.code = code.toUpperCase().trim(); this.joined = false;
    try { this.token = sessionStorage.getItem('hive-token'); } catch (e) { this.token = null; }
    if (!this.token) {
      this.token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { sessionStorage.setItem('hive-token', this.token); } catch (e) { /* ignore */ }
    }
    const peer = new Peer({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => this.dial());
    peer.on('disconnected', () => { if (!this.left) { try { peer.reconnect(); } catch (e) { /* ignore */ } } });
    peer.on('error', err => {
      if (this.left) return;
      if (err.type === 'peer-unavailable') {
        if (!this.joined) this.handlers.onStatus({ kind: 'error', message: 'Sala não encontrada. Confira o código e se o anfitrião está com a página aberta.' });
        else this.scheduleRetry();
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
        this.scheduleRetry();
      } else this.handlers.onStatus({ kind: 'error', message: 'Erro de conexão: ' + err.type });
    });
  },

  dial() {
    if (this.left || !this.peer || this.peer.destroyed) return;
    const conn = this.peer.connect(this.peerId(this.code), { reliable: true });
    conn.on('open', () => {
      this.conn = conn;
      conn.send({ t: 'hello', token: this.token });
      this.setConnected(true);
    });
    conn.on('data', msg => {
      if (msg && msg.t === 'full') { this.left = true; this.handlers.onStatus({ kind: 'error', message: 'Esta sala já tem dois jogadores.' }); return; }
      if (msg && msg.t === 'sync') this.joined = true;
      this.handlers.onMessage(msg);
    });
    const gone = () => {
      if (conn !== this.conn && this.conn) return;
      this.setConnected(false);
      if (!this.left) this.scheduleRetry();
    };
    conn.on('close', gone);
    conn.on('error', gone);
  },

  scheduleRetry() {
    clearTimeout(this.retryTimer);
    if (this.left) return;
    this.retryTimer = setTimeout(() => {
      if (this.left) return;
      if (!this.peer || this.peer.destroyed) { this.join(this.code); return; }
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch (e) { /* ignore */ } }
      this.dial();
    }, 2500);
  },

  setConnected(v) {
    if (this.connected === v) return;
    this.connected = v;
    this.handlers.onStatus({ kind: v ? 'connected' : 'disconnected' });
  },

  send(msg) {
    if (!this.conn || !this.connected) return false;
    try { this.conn.send(msg); return true; } catch (e) { return false; }
  },

  leave(silent) {
    this.left = true;
    clearTimeout(this.retryTimer);
    try { if (this.conn) this.conn.close(); } catch (e) { /* ignore */ }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* ignore */ }
    this.conn = null; this.peer = null; this.connected = false; this.role = null; this.joined = false;
    if (!silent) this.handlers.onStatus({ kind: 'left' });
  },

  link() {
    return location.origin + location.pathname + '?sala=' + this.code;
  }
};
