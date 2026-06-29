import { COLORS } from '../utils/constants.js';

export class SocketManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.playerColor = null; // Beyaz=Host, Siyah=Guest
    this.roomId = null;
    this.joinCode = null;
    this.manualClose = false;

    // Callbacks
    this.onRoomCreated = null;
    this.onRoomJoined = null;
    this.onMatchStarted = null;
    this.onOpponentMoved = null;
    this.onOpponentDisconnected = null;
    this.onErrorMessage = null;
    this.onConnectionClosed = null;
    
    // Geçici Host ayarları
    this.pendingOptions = null;
  }

  // Geri dönük uyumluluk için, main.js içerisinde server_url işlemleri çağrılınca boş dönsün
  getServerUrl() { return 'WebRTC P2P (Sunucusuz)'; }
  setServerUrl(value) { return 'WebRTC P2P (Sunucusuz)'; }
  resetServerUrl() { return 'WebRTC P2P (Sunucusuz)'; }
  
  _generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createRoom(options = {}) {
    this.disconnect(false);
    this.manualClose = false;
    this.pendingOptions = options;

    const code = this._generateRoomId();
    this.roomId = `TIMUR-${code}`;
    this.joinCode = code;

    return new Promise((resolve, reject) => {
      this.peer = new window.Peer(this.roomId, {
          debug: 2,
          config: {
              'iceServers': [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:global.stun.twilio.com:3478' }
              ]
          }
      });

      this.peer.on('open', (id) => {
          this.playerColor = COLORS.WHITE; // Host her zaman beyaz
          if (this.onRoomCreated) {
              this.onRoomCreated({ joinCode: this.joinCode, color: this.playerColor });
          }
          resolve();
      });

      this.peer.on('connection', (conn) => {
          if (this.conn) {
              console.warn("Zaten birisi bağlı, yeni bağlantı reddediliyor.");
              conn.close();
              return;
          }
          this._setupConnection(conn, true);
      });

      this.peer.on('error', (err) => {
          console.error("PeerJS Host Hatası:", err);
          if (this.onErrorMessage) this.onErrorMessage('Oda açılırken hata oluştu.');
          reject(err);
      });
    });
  }

  async joinRoom(joinCode) {
    this.disconnect(false);
    this.manualClose = false;
    const targetRoomId = `TIMUR-${joinCode.trim().toUpperCase()}`;

    return new Promise((resolve, reject) => {
      this.peer = new window.Peer(null, {
          debug: 2,
          config: {
              'iceServers': [
                  { urls: 'stun:stun.l.google.com:19302' },
                  { urls: 'stun:global.stun.twilio.com:3478' }
              ]
          }
      });

      this.peer.on('open', (id) => {
          const conn = this.peer.connect(targetRoomId, { reliable: true });
          
          conn.on('open', () => {
             this.playerColor = COLORS.BLACK; // Guest her zaman siyah
             this._setupConnection(conn, false);
             if (this.onRoomJoined) {
                this.onRoomJoined({ joinCode: joinCode.toUpperCase(), color: this.playerColor });
             }
             resolve();
          });
          
          conn.on('error', (err) => {
             console.error("PeerJS Katılım Hatası:", err);
             if (this.onErrorMessage) this.onErrorMessage('Ağa bağlanılamadı.');
             reject(err);
          });
      });

      this.peer.on('error', (err) => {
         console.error("PeerJS İstemci Hatası:", err);
         if (err.type === 'peer-unavailable') {
             if (this.onErrorMessage) this.onErrorMessage('Böyle bir oda koduna ulaşılamıyor.');
         } else {
             if (this.onErrorMessage) this.onErrorMessage('Ağa bağlanılamadı. Kod: ' + err.type);
         }
         reject(err);
      });
    });
  }

  // main.js ile geriye dönük uyumluluk
  async findMatch() {
      if (this.onErrorMessage) this.onErrorMessage('Hızlı eşleştirme özelliği P2P mimarisinde devre dışıdır. "Oda Kur / Katıl" özelliğini kullanın.');
  }

  sendMove(fromRow, fromCol, toRow, toCol) {
    return this._send({ type: 'OPPONENT_MOVE', fromRow, fromCol, toRow, toCol });
  }

  disconnect(leaveRoom = true) {
    this.manualClose = true;
    if (this.conn) {
        if (leaveRoom) this._send({ type: 'OPPONENT_DISCONNECTED' });
        this.conn.close();
        this.conn = null;
    }
    if (this.peer) {
        this.peer.destroy();
        this.peer = null;
    }
    
    if (this.onConnectionClosed) {
      this.onConnectionClosed({ manual: true });
    }
  }

  _setupConnection(conn, isHost) {
      this.conn = conn;

      conn.on('data', (data) => {
          this._handleMessage(data);
      });

      conn.on('close', () => {
          console.warn("Bağlantı koptu.");
          this.conn = null;
          if (!this.manualClose && this.onOpponentDisconnected) {
             this.onOpponentDisconnected({ message: 'Rakibin bağlantısı koptu. Oyun sona erdi.' });
          }
      });

      conn.on('error', (err) => {
          console.error("Data Channel Error:", err);
      });

      // PeerJS DataChannel ilk açıldığında Host tarafı maç kurulum verisini gönderir
      conn.on('open', () => {
          if (isHost) {
              // Rakibe oyun ayarlarını gönder
              const initPayload = {
                  type: 'MATCH_STARTED',
                  color: 'black', // Karşı tarafın rengi
                  formation: this.pendingOptions?.formation || 'masculine',
                  difficulty: this.pendingOptions?.difficulty || 'medium'
              };
              this._send(initPayload);
              
              // Kendi ekranında da oyunu başlat
              setTimeout(() => {
                  if (this.onMatchStarted) {
                      this.onMatchStarted({
                          color: this.playerColor,
                          formation: initPayload.formation,
                          difficulty: initPayload.difficulty
                      });
                  }
              }, 500);
          }
      });
  }

  _send(payload) {
    if (!this.conn || !this.conn.open) return false;
    this.conn.send(payload); // PeerJS JS Objelerini serileştirip kendisi yollar
    return true;
  }

  _handleMessage(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'MATCH_STARTED':
        // Host tarafından guest'e giden "oyunu başlat" mesajı
        if (this.onMatchStarted) {
            this.onMatchStarted({
                color: data.color || this.playerColor,
                formation: data.formation,
                difficulty: data.difficulty
            });
        }
        break;
      case 'OPPONENT_MOVE':
        if (this.onOpponentMoved) this.onOpponentMoved(data);
        break;
      case 'OPPONENT_DISCONNECTED':
        if (!this.manualClose && this.onOpponentDisconnected) {
            this.onOpponentDisconnected({ message: 'Rakip oyundan ayrıldı.' });
        }
        break;
    }
  }
}
