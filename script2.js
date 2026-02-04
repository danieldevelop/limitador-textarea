// INICIO DG-2
function addLineNumbers(textareaId, startFrom) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;

    // Si ya está envuelto, actualizar inmediatamente
    if (ta.parentNode && ta.parentNode.classList.contains('lined-wrapper')) {
        const existingGutter = ta.parentNode.querySelector('.line-gutter');
        if (existingGutter) {
            const updateExisting = () => {
                const visual = computeVisualLines(ta);
                existingGutter.textContent = buildNumbers(visual, startFrom || 1);
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
        const raw = textareaEl.value || '';
        const html = escapeHtml(raw).replace(/\n/g, '<br/>') + '<br/>';
        mirror.innerHTML = html;
        const scrollH = mirror.scrollHeight;
        const lh = computeLineHeightPx() || 16;
        const lines = Math.max(1, Math.round(scrollH / lh));
        return lines;
    }

    function buildNumbers(n, start) {
        let s = '';
        const startNum = start || parseInt(ta.dataset.lineStart) || 1;
        for (let i = 0; i < n; i++) {
            s += (startNum + i) + '\n';
        }
        return s;
    }

    function updateNumbers() {
        const visual = computeVisualLines(ta);
        const currentStart = parseInt(ta.dataset.lineStart) || startFrom || 1;
        gutter.textContent = buildNumbers(visual, currentStart);
        const cs = window.getComputedStyle(ta);
        gutter.style.lineHeight = cs.lineHeight;
        gutter.style.height = ta.offsetHeight + 'px';
        gutter.scrollTop = ta.scrollTop;

        // ✅ Disparar evento con el conteo de líneas
        ta.dispatchEvent(new CustomEvent('linesUpdated', { 
            detail: { lines: visual, startFrom: currentStart },
            bubbles: true 
        }));    
    }

    ['input','change','keyup','paste','cut','drop'].forEach(evt => {
        ta.addEventListener(evt, updateNumbers, { passive: true });
    });

    ta.addEventListener('scroll', () => {
        gutter.scrollTop = ta.scrollTop;
    });

    window.addEventListener('resize', updateNumbers);

    let lastVal = ta.value;
    const watcher = setInterval(() => {
        if (!document.body.contains(ta)) return;
        if (ta.value !== lastVal) {
            lastVal = ta.value;
            updateNumbers();
        }
    }, 200);

    const mo = new MutationObserver(() => {
        if (!document.body.contains(ta)) {
            clearInterval(watcher);
            mo.disconnect();
            if (mirror && mirror.parentNode) mirror.parentNode.removeChild(mirror);
            window.removeEventListener('resize', updateNumbers);
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    updateNumbers();
}

function updateLineNumbersStart(textareaId, newStart) {
    const ta = document.getElementById(textareaId);
    if (!ta || !ta.parentNode) return;
    
    const wrapper = ta.parentNode;
    if (!wrapper.classList.contains('lined-wrapper')) return;
    
    const gutter = wrapper.querySelector('.line-gutter');
    if (!gutter) return;
    
    // Guardar el nuevo inicio en el textarea como atributo
    ta.dataset.lineStart = newStart;
    
    // Recalcular números con el nuevo inicio
    const lines = gutter.textContent.trim().split('\n').length;
    let newNumbers = '';
    for (let i = 0; i < lines; i++) {
        newNumbers += (newStart + i) + '\n';
    }
    gutter.textContent = newNumbers;
}

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
    // Variables para rastrear líneas acumuladas
    let macroscopiaLines = 0;
    let microscopiaLines = 0;
    
    // Configurar macroscopiaMicro (empieza en 1)
    addLineNumbers('macroscopiaMicro', 1);
    limitLineLength('macroscopiaMicro');
    syncLineHeight('macroscopiaMicro');
    autoAdjustHeight('macroscopiaMicro');
    ensurePrintSizing('macroscopiaMicro');
    
    // Configurar microscopiaMicro (empieza después de macroscopia)
    addLineNumbers('microscopiaMicro', 1);
    limitLineLength('microscopiaMicro');
    syncLineHeight('microscopiaMicro');
    autoAdjustHeight('microscopiaMicro');
    ensurePrintSizing('microscopiaMicro');
    
    // Configurar diagnosticoMicro (empieza después de microscopia)
    addLineNumbers('diagnosticoMicro', 1);
    limitLineLength('diagnosticoMicro');
    syncLineHeight('diagnosticoMicro');
    autoAdjustHeight('diagnosticoMicro');
    ensurePrintSizing('diagnosticoMicro');
    
    // Escuchar cambios en macroscopiaMicro
    const macroTA = document.getElementById('macroscopiaMicro');
    if (macroTA) {
        macroTA.addEventListener('linesUpdated', (e) => {
            macroscopiaLines = e.detail.lines;
            // ✅ Solo actualizar números, NO recrear
            updateLineNumbersStart('microscopiaMicro', macroscopiaLines + 1);
            updateLineNumbersStart('diagnosticoMicro', macroscopiaLines + microscopiaLines + 1);
        });
    }
    
    // Escuchar cambios en microscopiaMicro
    const microTA = document.getElementById('microscopiaMicro');
    if (microTA) {
        microTA.addEventListener('linesUpdated', (e) => {
            microscopiaLines = e.detail.lines;
            // ✅ Solo actualizar números, NO recrear
            updateLineNumbersStart('diagnosticoMicro', macroscopiaLines + microscopiaLines + 1);
        });
    }
    
    // Disparar actualización inicial
    setTimeout(() => {
        if (macroTA) macroTA.dispatchEvent(new Event('input'));
        if (microTA) microTA.dispatchEvent(new Event('input'));
    }, 100);
    // FIN DG-3
});
		