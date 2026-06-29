import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_INPUT = path.resolve(process.cwd(), 'exports', 'games.jsonl');

export function toLines(raw) {
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

export async function loadGames(inputPath = DEFAULT_INPUT) {
    const raw = await fs.readFile(inputPath, 'utf8');
    return toLines(raw).map((line) => JSON.parse(line));
}

export function getLocalColor(game) {
    return game?.game?.localColor || 'white';
}

export function getAiColor(game) {
    return getLocalColor(game) === 'white' ? 'black' : 'white';
}

export async function writeJson(outputPath, data) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
}
