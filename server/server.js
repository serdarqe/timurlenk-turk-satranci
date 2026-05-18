import { WebSocketServer } from 'ws';
import crypto from 'crypto';

const wss = new WebSocketServer({ port: 3000 });
console.log("TimurChess Çevrimiçi Sunucu (WebSocket) port 3000'de başlatıldı.");

const rooms = new Map(); // roomId -> { player1, player2, options, snapshot }

function generateRoomCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // E.g., '1A2B3C'
}

wss.on('connection', (ws) => {
    console.log('Yeni oyuncu bağlandı.');
    ws.roomId = null;

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        if (data.type === 'CREATE_ROOM') {
            const joinCode = generateRoomCode();
            const roomId = joinCode;
            
            rooms.set(roomId, {
                player1: ws,
                player2: null,
                options: data.options || {},
                snapshot: null
            });
            ws.roomId = roomId;

            ws.send(JSON.stringify({
                type: 'ROOM_CREATED',
                roomId,
                joinCode,
                color: 'white',
                sessionToken: roomId + '_p1'
            }));
            
            ws.send(JSON.stringify({
                type: 'WAITING',
                message: 'Rakip bekleniyor... Oda Kodu: ' + joinCode
            }));
            console.log('Oda oluşturuldu:', joinCode);

        } else if (data.type === 'JOIN_ROOM') {
            const joinCode = data.joinCode;
            const room = rooms.get(joinCode);

            if (!room) {
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Oda bulunamadı veya süresi dolmuş.' }));
                return;
            }

            if (room.player2) {
                if (room.player1 !== ws && room.player2 !== ws) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Bu oda şu an dolu.' }));
                    return;
                }
            }

            room.player2 = ws;
            ws.roomId = joinCode;
            
            ws.opponent = room.player1;
            if (room.player1) room.player1.opponent = ws;

            ws.send(JSON.stringify({
                type: 'ROOM_JOINED',
                roomId: joinCode,
                joinCode,
                color: 'black',
                sessionToken: joinCode + '_p2'
            }));

            room.player1.send(JSON.stringify({
                type: 'MATCH_STARTED',
                roomId: joinCode,
                joinCode,
                color: 'white',
                formation: room.options.formation,
                difficulty: room.options.difficulty
            }));

            ws.send(JSON.stringify({
                type: 'MATCH_STARTED',
                roomId: joinCode,
                joinCode,
                color: 'black',
                formation: room.options.formation,
                difficulty: room.options.difficulty
            }));
            console.log('Odaya katılındı:', joinCode);

        } else if (data.type === 'MAKE_MOVE') {
            if (ws.opponent && ws.opponent.readyState === 1) {
                ws.opponent.send(JSON.stringify({
                    type: 'OPPONENT_MOVE',
                    fromRow: data.fromRow,
                    fromCol: data.fromCol,
                    toRow: data.toRow,
                    toCol: data.toCol,
                    snapshot: data.snapshot
                }));
            }
        } else if (data.type === 'FIND_MATCH') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Hızlı eşleştirme şuan devre dışı. Oda Kur / Katıl özelliğini kullanın.' }));
        }
    });

    ws.on('close', () => {
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                if (ws.opponent && ws.opponent.readyState === 1) {
                    ws.opponent.send(JSON.stringify({ 
                        type: 'OPPONENT_DISCONNECTED',
                        message: 'Rakibin bağlantısı koptu. Oyun sona erdi.'
                    }));
                }
                rooms.delete(ws.roomId);
            }
        }
    });
});
