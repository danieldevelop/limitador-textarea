// INICIO DG-2
function addLineNumbers(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;

    // Si ya está envuelto, actualizar inmediatamente
    if (ta.parentNode && ta.parentNode.classList.contains('lined-wrapper')) {
        const existingGutter = ta.parentNode.querySelector('.line-gutter');
        if (existingGutter) {
            const updateExisting = () => {
                const visual = computeVisualLines(ta);
                existingGutter.textContent = buildNumbers(visual);
                existingGutter.style.lineHeight = window.getComputedStyle(ta).lineHeight;
                existingGutter.style.height = ta.offsetHeight + 'px';
            };
            updateExisting();
        }
        return;
    }

    // Crear wrapper y gutter
    const wrapper = document.createElement('div');
    wrapper.className = 'lined-wrapper';
    const gutter = document.createElement('div');
    gutter.className = 'line-gutter';

    ta.parentNode.insertBefore(wrapper, ta);
    wrapper.appendChild(gutter);
    wrapper.appendChild(ta);

    // Crear elemento espejo para medir wraps
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.top = '-99999px';
    mirror.style.left = '-99999px';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = 'break-word';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.boxSizing = 'border-box';
    document.body.appendChild(mirror);

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function copyStylesToMirror() {
        const cs = window.getComputedStyle(ta);
        const props = [
            'font-family','font-size','font-weight','font-style','letter-spacing',
            'text-transform','word-spacing','text-indent','line-height',
            'padding-top','padding-right','padding-bottom','padding-left',
            'border-left-width','border-right-width','box-sizing','width'
        ];
        props.forEach(p => {
            try { mirror.style[p] = cs.getPropertyValue(p); } catch (e) {}
        });
        // Mirror width must equal ta's inner width (clientWidth)
        mirror.style.width = ta.clientWidth + 'px';
    }

    function computeLineHeightPx() {
        const cs = window.getComputedStyle(ta);
        let lh = cs.lineHeight;
        if (lh === 'normal') {
            const fs = parseFloat(cs.fontSize) || 16;
            return fs * 1.2;
        }
        return parseFloat(lh);
    }

    function computeVisualLines(textareaEl) {
        copyStylesToMirror();
        // Usar HTML para preservar saltos de línea y permitir wrap
        const raw = textareaEl.value || '';
        const html = escapeHtml(raw).replace(/\n/g, '<br/>') + '<br/>'; // <br/> final para contar la última línea
        mirror.innerHTML = html;
        const scrollH = mirror.scrollHeight;
        const lh = computeLineHeightPx() || 16;
        const lines = Math.max(1, Math.round(scrollH / lh));
        return lines;
    }

    function buildNumbers(n) {
        let s = '';
        for (let i = 1; i <= n; i++) s += i + '\n';
        return s;
    }

    function updateNumbers() {
        const visual = computeVisualLines(ta);
        gutter.textContent = buildNumbers(visual);
        const cs = window.getComputedStyle(ta);
        gutter.style.lineHeight = cs.lineHeight;
        // sincroniza altura del gutter con la altura visual del textarea
        gutter.style.height = ta.offsetHeight + 'px';
        gutter.scrollTop = ta.scrollTop;
    }

    // Eventos que afectan contenido o tamaño
    ['input','change','keyup','paste','cut','drop'].forEach(evt => {
        ta.addEventListener(evt, updateNumbers, { passive: true });
    });

    // Cuando cambia el scroll, sincroniza gutter
    ta.addEventListener('scroll', () => {
        gutter.scrollTop = ta.scrollTop;
    });

    // Si cambia el tamaño de la ventana recalcular (wrap depende del ancho)
    window.addEventListener('resize', updateNumbers);

    // Watcher para cambios programáticos en value
    let lastVal = ta.value;
    const watcher = setInterval(() => {
        if (!document.body.contains(ta)) return;
        if (ta.value !== lastVal) {
            lastVal = ta.value;
            updateNumbers();
        }
    }, 200);

    // Limpiar watcher y mirror si el textarea se elimina
    const mo = new MutationObserver(() => {
        if (!document.body.contains(ta)) {
            clearInterval(watcher);
            mo.disconnect();
            if (mirror && mirror.parentNode) mirror.parentNode.removeChild(mirror);
            window.removeEventListener('resize', updateNumbers);
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Ajuste inicial
    updateNumbers();
}

// function limitLineLength(textareaId, maxLines) {
//     const ta = document.getElementById(textareaId);
//     if (!ta) return;

//     // Asegurar estilos
//     ta.style.whiteSpace = ta.style.whiteSpace || 'pre-wrap';
//     ta.style.overflowWrap = ta.style.overflowWrap || 'break-word';
//     ta.style.wordBreak = ta.style.wordBreak || 'break-word';

//     function normalizeSpaces(s) {
//         return s.replace(/\u00A0/g, ' ').replace(/ {2,}/g, ' ');
//     }

//     function enforceLineLimit(value) {
//         if (!maxLines) return value;
//         const lines = value.split('\n');
//         if (lines.length > maxLines) {
//             return lines.slice(0, maxLines).join('\n');
//         }
//         return value;
//     }

//     // Evento input
//     ta.addEventListener('input', (ev) => {
//         const raw = ta.value;
//         let processed = normalizeSpaces(raw);
//         processed = enforceLineLimit(processed);
        
//         if (processed !== raw) {
//             const cursorPos = ta.selectionStart;
//             ta.value = processed;
//             ta.setSelectionRange(cursorPos, cursorPos);
//             ta.dispatchEvent(new Event('change', { bubbles: true }));
//         }
//     });

//     // Evento paste
//     ta.addEventListener('paste', (ev) => {
//         ev.preventDefault();
//         ev.stopPropagation();
        
//         const clipboard = (ev.clipboardData || window.clipboardData).getData('text') || '';
        
//         const start = ta.selectionStart;
//         const end = ta.selectionEnd;
//         const before = ta.value.slice(0, start);
//         const after = ta.value.slice(end);
        
//         // Procesar el texto pegado
//         let normalizedPaste = normalizeSpaces(clipboard);
//         let merged = before + normalizedPaste + after;
        
//         // Aplicar normalización y límite de líneas
//         merged = normalizeSpaces(merged);
//         merged = enforceLineLimit(merged);
        
//         // Asignar el valor procesado
//         ta.value = merged;
        
//         // Posicionar el cursor
//         const newCursorPos = Math.min(before.length + normalizedPaste.length, merged.length);
//         try { 
//             ta.setSelectionRange(newCursorPos, newCursorPos); 
//         } catch (e) {}
        
//         // Disparar eventos para actualizar numeración
//         ta.dispatchEvent(new Event('input', { bubbles: true }));
//         ta.dispatchEvent(new Event('change', { bubbles: true }));
//     });

//     // Evento keydown para bloquear Enter
//     if (maxLines) {
//         ta.addEventListener('keydown', (ev) => {
//             if (ev.key === 'Enter') {
//                 const currentLines = (ta.value || '').split('\n').length;
//                 if (currentLines >= maxLines) {
//                     ev.preventDefault();
//                 }
//             }
//         });
//     }

//     // Drop
//     ta.addEventListener('drop', (ev) => {
//         setTimeout(() => {
//             const raw = ta.value;
//             let processed = normalizeSpaces(raw);
//             processed = enforceLineLimit(processed);
            
//             if (processed !== raw) {
//                 ta.value = processed;
//                 ta.dispatchEvent(new Event('change', { bubbles: true }));
//             }
//         }, 10);
//     });

//     // Inicial
//     let initial = normalizeSpaces(ta.value);
//     initial = enforceLineLimit(initial);
//     if (initial !== ta.value) {
//         ta.value = initial;
//     }
// }

// function limitLineLength(textareaId, maxLines) {
//     const ta = document.getElementById(textareaId);
//     if (!ta) return;

//     ta.style.whiteSpace = ta.style.whiteSpace || 'pre-wrap';
//     ta.style.overflowWrap = ta.style.overflowWrap || 'break-word';
//     ta.style.wordBreak = ta.style.wordBreak || 'break-word';

//     function normalizeSpaces(s) {
//         return s.replace(/\u00A0/g, ' ').replace(/ {2,}/g, ' ');
//     }

//     // Límite RÁPIDO por líneas reales (para escritura manual)
//     function enforceLineLimitFast(value) {
//         if (!maxLines) return value;
//         const lines = value.split('\n');
//         if (lines.length > maxLines) {
//             return lines.slice(0, maxLines).join('\n');
//         }
//         return value;
//     }

//     // Límite PRECISO por líneas visuales (para paste)
//     function enforceLineLimitVisual(value) {
//         if (!maxLines) return value;
        
//         const measureDiv = document.createElement('div');
//         measureDiv.style.position = 'absolute';
//         measureDiv.style.visibility = 'hidden';
//         measureDiv.style.whiteSpace = 'pre-wrap';
//         measureDiv.style.wordBreak = 'break-word';
//         measureDiv.style.overflowWrap = 'break-word';
        
//         const cs = window.getComputedStyle(ta);
//         measureDiv.style.fontFamily = cs.fontFamily;
//         measureDiv.style.fontSize = cs.fontSize;
//         measureDiv.style.fontWeight = cs.fontWeight;
//         measureDiv.style.lineHeight = cs.lineHeight;
//         measureDiv.style.padding = cs.padding;
//         measureDiv.style.width = ta.clientWidth + 'px';
//         measureDiv.style.boxSizing = cs.boxSizing;
        
//         document.body.appendChild(measureDiv);
//         measureDiv.textContent = value;
        
//         const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
//         const visualLines = Math.ceil(measureDiv.scrollHeight / lineHeight);
        
//         console.log('Líneas visuales:', visualLines, 'altura:', measureDiv.scrollHeight, 'lineHeight:', lineHeight);
        
//         document.body.removeChild(measureDiv);
        
//         if (visualLines > maxLines) {
//             console.log('Excede límite visual, recortando...');
//             const charsPerLine = Math.floor(value.length / visualLines);
//             const maxChars = charsPerLine * maxLines;
//             return value.substring(0, maxChars);
//         }
        
//         return value;
//     }

//     // Evento input (escritura manual) - usa límite RÁPIDO
//     ta.addEventListener('input', (ev) => {
//         const raw = ta.value;
//         let processed = normalizeSpaces(raw);
//         processed = enforceLineLimitFast(processed);
        
//         if (processed !== raw) {
//             const cursorPos = ta.selectionStart;
//             ta.value = processed;
//             ta.setSelectionRange(cursorPos, cursorPos);
//             ta.dispatchEvent(new Event('change', { bubbles: true }));
//         }
//     });

//     // Evento paste - usa límite VISUAL (preciso)
//     ta.addEventListener('paste', (ev) => {
//         console.log('PASTE EVENTO DETECTADO en', textareaId);
//         ev.preventDefault();
//         ev.stopImmediatePropagation();
        
//         const clipboard = (ev.clipboardData || window.clipboardData).getData('text') || '';
        
//         const start = ta.selectionStart;
//         const end = ta.selectionEnd;
//         const before = ta.value.slice(0, start);
//         const after = ta.value.slice(end);
        
//         let merged = before + clipboard + after;
        
//         merged = normalizeSpaces(merged);
//         merged = enforceLineLimitVisual(merged); // USA LÍMITE VISUAL
//         ta.value = merged;
        
//         const newCursorPos = Math.min(before.length + clipboard.length, merged.length);
//         ta.setSelectionRange(newCursorPos, newCursorPos);
        
//         ta.dispatchEvent(new Event('input', { bubbles: true }));
//         ta.dispatchEvent(new Event('change', { bubbles: true }));
//     }, { capture: true, passive: false });

//     // Bloquear Enter en última línea
//     if (maxLines) {
//         ta.addEventListener('keydown', (ev) => {
//             if (ev.key === 'Enter') {
//                 const currentLines = (ta.value || '').split('\n').length;
//                 if (currentLines >= maxLines) {
//                     ev.preventDefault();
//                 }
//             }
//         });
//     }

//     // Drop
//     ta.addEventListener('drop', (ev) => {
//         setTimeout(() => {
//             const raw = ta.value;
//             let processed = normalizeSpaces(raw);
//             processed = enforceLineLimitVisual(processed); // USA LÍMITE VISUAL
            
//             if (processed !== raw) {
//                 ta.value = processed;
//                 ta.dispatchEvent(new Event('change', { bubbles: true }));
//             }
//         }, 10);
//     });

//     // Inicial
//     let initial = normalizeSpaces(ta.value);
//     initial = enforceLineLimitFast(initial);
//     if (initial !== ta.value) {
//         ta.value = initial;
//     }
// }

function limitLineLength(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;

    ta.style.whiteSpace = ta.style.whiteSpace || 'pre-wrap';
    ta.style.overflowWrap = ta.style.overflowWrap || 'break-word';
    ta.style.wordBreak = ta.style.wordBreak || 'break-word';

    function normalizeSpaces(s) {
        return s.replace(/\u00A0/g, ' ').replace(/ {2,}/g, ' ');
    }

    // Evento input
    ta.addEventListener('input', (ev) => {
        const raw = ta.value;
        const normalized = normalizeSpaces(raw);
        
        if (normalized !== raw) {
            const cursorPos = ta.selectionStart;
            ta.value = normalized;
            ta.setSelectionRange(cursorPos, cursorPos);
        }
    });

    // Evento paste
    ta.addEventListener('paste', (ev) => {
        ev.preventDefault();
        
        const clipboard = (ev.clipboardData || window.clipboardData).getData('text') || '';
        const normalizedPaste = normalizeSpaces(clipboard);

        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = ta.value.slice(0, start);
        const after = ta.value.slice(end);
        let merged = before + normalizedPaste + after;

        merged = normalizeSpaces(merged);

        ta.value = merged;
        const caretPos = Math.min(before.length + normalizedPaste.length, ta.value.length);
        try { ta.setSelectionRange(caretPos, caretPos); } catch (e) {}
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });

    // Drop
    ta.addEventListener('drop', (ev) => {
        setTimeout(() => {
            const raw = ta.value;
            const normalized = normalizeSpaces(raw);
            
            if (normalized !== raw) {
                ta.value = normalized;
            }
        }, 10);
    });

    // Inicial
    const initial = normalizeSpaces(ta.value);
    if (initial !== ta.value) {
        ta.value = initial;
    }
}

function syncLineHeight(textareaId) {
    const ta = document.getElementById(textareaId);
    const gutter = ta.parentNode.querySelector('.line-gutter');
    if (ta && gutter) {
        const computedStyle = window.getComputedStyle(ta);
        gutter.style.lineHeight = computedStyle.lineHeight;
    }
}

function autoAdjustHeight(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;

    const minHeight = 250;
    ta.style.resize = 'none';
    ta.style.overflow = 'hidden'; // Evita barras de desplazamiento
    ta.style.height = `${minHeight}px`; // Altura inicial

    const gutter = ta.parentNode ? ta.parentNode.querySelector('.line-gutter') : null;

    function adjustHeight() {
        ta.style.height = 'auto'; // Resetea la altura
        const newHeight = Math.max(minHeight, ta.scrollHeight);
        ta.style.height = `${newHeight}px`; // Ajusta la altura al contenido, minimo 250px

        // mantenemos la misma altura en el gutter si existe
        if (gutter) {
            gutter.style.height = ta.style.height;
            gutter.scrollTop = ta.scrollTop;
        }
    }

    // eventos de usuario que cambian contenido
    ['input', 'keyup', 'paste', 'cut', 'drop'].forEach(e => {
        ta.addEventListener(e, adjustHeight, { passive: true });
    });

    // sincroniza scroll del guetter
    ta.addEventListener('scroll', () => {
        if (gutter) gutter.scrollTop = ta.scrollTop;
    });

    // watcher para cambios programaticos (p. ej. reconocimiento de voz que asgina .value)
    let lastVal = ta.value;
    const watcher = setInterval(() => {
        if (ta.value !== lastVal) {
            lastVal = ta.value;
            adjustHeight();
        }
    }, 300);

    adjustHeight(); // Ajusta la altura inicial
}


function ensurePrintSizing(textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    const gutter = ta.parentNode ? ta.parentNode.querySelector('.line-gutter') : null;

    // Guardamos estado previo para restaurar luego
    const prev = {
        height: ta.style.height,
        overflow: ta.style.overflow,
        gutterHeight: gutter ? gutter.style.height : null
    };

    function adjustForPrint() {
        // Recalcular altura con las métricas de impresión
        ta.style.height = 'auto';
        ta.style.overflow = 'visible';
        ta.style.height = ta.scrollHeight + 'px';
        if (gutter) {
            gutter.style.height = ta.style.height;
            gutter.scrollTop = ta.scrollTop;
        }
    }

    window.addEventListener('beforeprint', adjustForPrint);
    window.addEventListener('afterprint', () => {
        // Restaurar estado original tras imprimir
        ta.style.height = prev.height || '';
        ta.style.overflow = prev.overflow || 'hidden';
        if (gutter) gutter.style.height = prev.gutterHeight || ta.style.height;
    });
}
// FIN DG-2
	

document.addEventListener('DOMContentLoaded', function () {
    // INICIO DG-3
    addLineNumbers('macroscopiaMicro');
    limitLineLength('macroscopiaMicro');
    syncLineHeight('macroscopiaMicro');
    autoAdjustHeight('macroscopiaMicro');
    ensurePrintSizing('macroscopiaMicro');

    addLineNumbers('microscopiaMicro');
    limitLineLength('microscopiaMicro');
    syncLineHeight('microscopiaMicro');
    autoAdjustHeight('microscopiaMicro');
    ensurePrintSizing('microscopiaMicro');

    addLineNumbers('diagnosticoMicro');
    limitLineLength('diagnosticoMicro');
    syncLineHeight('diagnosticoMicro');
    autoAdjustHeight('diagnosticoMicro');
    ensurePrintSizing('diagnosticoMicro');
    // FIN DG-3
});
		