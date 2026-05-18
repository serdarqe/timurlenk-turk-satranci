import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

const DEFAULT_PROJECT_ID = 'timur-satranc';
const DEFAULT_COLLECTION = 'games';
const DEFAULT_OUTPUT = path.resolve(process.cwd(), 'exports', 'games.jsonl');

function parseArgs(argv) {
    const args = {
        serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
        outputPath: process.env.FIREBASE_EXPORT_OUTPUT || DEFAULT_OUTPUT,
        collectionName: process.env.FIREBASE_EXPORT_COLLECTION || DEFAULT_COLLECTION,
        projectId: process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID
    };

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index];
        if (value === '--help' || value === '-h') {
            args.help = true;
        } else if (value === '--service-account' && argv[index + 1]) {
            args.serviceAccountPath = argv[index + 1];
            index += 1;
        } else if (value === '--output' && argv[index + 1]) {
            args.outputPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        } else if (value === '--collection' && argv[index + 1]) {
            args.collectionName = argv[index + 1];
            index += 1;
        } else if (value === '--project-id' && argv[index + 1]) {
            args.projectId = argv[index + 1];
            index += 1;
        } else if (!value.startsWith('--') && !args.serviceAccountPath) {
            args.serviceAccountPath = value;
        }
    }

    return args;
}

function printHelp() {
    console.log(`
Firestore oyun export araci

Kullanim:
  node functions/scripts/export-firestore-games.mjs --service-account "C:\\path\\service-account.json"

Opsiyonlar:
  --service-account <path>   Firebase service account JSON yolu
  --output <path>            Cikti dosyasi (varsayilan: exports/games.jsonl)
  --collection <name>        Firestore ana koleksiyonu (varsayilan: games)
  --project-id <id>          Firebase proje ID (varsayilan: timur-satranc)
  --help                     Bu yardimi goster

Alternatif:
  FIREBASE_SERVICE_ACCOUNT_PATH ortam degiskenini de kullanabilirsin.
`);
}

async function resolveCredential(serviceAccountPath) {
    if (!serviceAccountPath) {
        throw new Error(
            'Service account JSON yolu verilmedi. --service-account kullan veya FIREBASE_SERVICE_ACCOUNT_PATH ayarla.'
        );
    }

    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return {
        absolutePath,
        json: JSON.parse(raw)
    };
}

function initFirebase({ credentialJson, projectId }) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(credentialJson),
            projectId
        });
    }

    return admin.firestore();
}

async function loadMoves(gameRef) {
    const snapshot = await gameRef.collection('moves').orderBy('index', 'asc').get();
    return snapshot.docs.map((doc) => ({
        moveId: doc.id,
        ...doc.data()
    }));
}

async function exportGames({ db, collectionName, outputPath }) {
    const gamesSnapshot = await db.collection(collectionName).orderBy('finishedAt', 'asc').get();
    const lines = [];

    for (const doc of gamesSnapshot.docs) {
        const data = doc.data();
        const moves = await loadMoves(doc.ref);
        lines.push(JSON.stringify({
            ...data,
            gameId: data.gameId || doc.id,
            moves
        }));
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, lines.join('\n'), 'utf8');

    return {
        gameCount: gamesSnapshot.size,
        outputPath
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const { absolutePath, json } = await resolveCredential(args.serviceAccountPath);
    const db = initFirebase({
        credentialJson: json,
        projectId: args.projectId
    });

    const result = await exportGames({
        db,
        collectionName: args.collectionName,
        outputPath: args.outputPath
    });

    console.log(`Service account: ${absolutePath}`);
    console.log(`Toplam oyun: ${result.gameCount}`);
    console.log(`Cikti: ${result.outputPath}`);
}

main().catch((error) => {
    console.error('Firestore export basarisiz oldu.');
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
});
