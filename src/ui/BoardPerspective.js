export function clearBoardInlineTransformForPerspective(boardEl) {
    if (!boardEl?.style) return;

    if (typeof boardEl.style.removeProperty === 'function') {
        boardEl.style.removeProperty('transform');
        return;
    }

    boardEl.style.transform = '';
}
