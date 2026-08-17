(function initMobileReadingEnhancer() {
    'use strict';

    const MOBILE_QUERY = '(max-width: 980px)';
    let selectedPayload = null;
    let selectedNode = null;

    function isMobileLayout() {
        return window.matchMedia(MOBILE_QUERY).matches;
    }

    function cleanTitle(value) {
        return String(value || '')
            .replace(/锛堟棤棰樼洰锛\?/g, '')
            .replace(/[^\x20-\x7E\u4e00-\u9fff]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function setEnglishUi() {
        document.documentElement.lang = 'en';
        document.title = 'IELTS Reading Practice';
        const subtitle = document.getElementById('exam-subtitle');
        if (subtitle && /缁|棰|路|鍔|统一|閱讀/.test(subtitle.textContent || '')) {
            const count = document.querySelectorAll('.q-item').length;
            subtitle.textContent = count ? `Mobile practice · ${count} questions` : 'Mobile practice';
        }
        const settingsTitle = document.querySelector('#settings-panel .settings-title');
        if (settingsTitle) settingsTitle.textContent = 'Text size';
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn && !submitBtn.dataset.mobileLabelPatched) {
            submitBtn.textContent = 'Submit';
            submitBtn.dataset.mobileLabelPatched = '1';
        }
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.textContent = 'Reset';
        const noteBtn = document.getElementById('note-btn');
        if (noteBtn) noteBtn.textContent = 'Note';
    }

    function setView(view) {
        const next = view === 'questions' ? 'questions' : 'passage';
        document.body.classList.toggle('mobile-view-questions', next === 'questions');
        document.body.classList.toggle('mobile-view-passage', next === 'passage');
        document.querySelectorAll('[data-mobile-view]').forEach((button) => {
            button.classList.toggle('active', button.dataset.mobileView === next);
        });
        try {
            localStorage.setItem('ielts_mobile_view', next);
        } catch (_) {
            // ignore storage failures in embedded browsers
        }
    }

    function payloadFromItem(item) {
        if (!item) return null;
        return {
            value: item.dataset.heading || item.dataset.option || item.dataset.word || item.dataset.value || item.dataset.answerValue || item.textContent.trim(),
            label: item.dataset.answerLabel || item.dataset.word || item.dataset.value || item.textContent.trim()
        };
    }

    function clearSelectedOption() {
        if (selectedNode) {
            selectedNode.classList.remove('mobile-selected');
        }
        selectedNode = null;
        selectedPayload = null;
    }

    function selectOption(item) {
        const payload = payloadFromItem(item);
        if (!payload || !payload.value) return;
        clearSelectedOption();
        selectedNode = item;
        selectedPayload = payload;
        item.classList.add('mobile-selected');
    }

    function ensureDropzoneHolder(dropzone) {
        if (dropzone.classList.contains('drop-target-summary')) {
            return dropzone;
        }
        let holder = dropzone.querySelector('.dropped-items');
        if (!holder) {
            holder = document.createElement('div');
            holder.className = 'dropped-items';
            dropzone.appendChild(holder);
        }
        return holder;
    }

    function setDropzoneAnswer(dropzone, payload) {
        if (!dropzone || !payload || !payload.value) return;
        dropzone.dataset.answerValue = String(payload.value || '').trim();
        dropzone.dataset.answerLabel = String(payload.label || payload.value || '').trim();
        const holder = ensureDropzoneHolder(dropzone);
        holder.innerHTML = '';
        const item = document.createElement('div');
        item.className = 'drag-item drag-item--assigned';
        item.textContent = dropzone.dataset.answerLabel;
        item.dataset.answerValue = dropzone.dataset.answerValue;
        item.dataset.answerLabel = dropzone.dataset.answerLabel;
        item.setAttribute('draggable', 'false');
        item.addEventListener('click', (event) => {
            event.stopPropagation();
            clearDropzone(dropzone);
        });
        holder.appendChild(item);
        dropzone.classList.add('dropzone-filled');
        dropzone.classList.remove('dropzone-empty');
        document.dispatchEvent(new Event('drop'));
    }

    function clearDropzone(dropzone) {
        dropzone.dataset.answerValue = '';
        dropzone.dataset.answerLabel = '';
        const holder = ensureDropzoneHolder(dropzone);
        holder.innerHTML = '';
        dropzone.classList.remove('dropzone-filled');
        dropzone.classList.add('dropzone-empty');
        document.dispatchEvent(new Event('drop'));
    }

    function addTouchHint() {
        const groups = document.getElementById('question-groups');
        if (!groups || groups.querySelector('.mobile-touch-hint')) return;
        const hasDrag = groups.querySelector('.drag-item, .paragraph-dropzone, .match-dropzone, .drop-target-summary');
        if (!hasDrag) return;
        const hint = document.createElement('div');
        hint.className = 'mobile-touch-hint';
        hint.textContent = 'For matching questions: tap an option first, then tap the target box. Tap a filled box to clear it.';
        groups.prepend(hint);
    }

    function bindTouchChoiceFallback() {
        document.querySelectorAll('.drag-item, .draggable-word, .card').forEach((item) => {
            if (item.dataset.mobileTapBound === '1') return;
            item.dataset.mobileTapBound = '1';
            item.addEventListener('click', (event) => {
                if (!isMobileLayout()) return;
                const inAssignedDropzone = item.closest('.paragraph-dropzone, .match-dropzone, .drop-target-summary')
                    && item.classList.contains('drag-item--assigned');
                if (inAssignedDropzone) return;
                event.preventDefault();
                event.stopPropagation();
                selectOption(item);
            });
        });

        document.querySelectorAll('.paragraph-dropzone, .match-dropzone, .drop-target-summary').forEach((dropzone) => {
            dropzone.classList.add('mobile-tappable');
            if (dropzone.dataset.mobileDropBound === '1') return;
            dropzone.dataset.mobileDropBound = '1';
            dropzone.addEventListener('click', (event) => {
                if (!isMobileLayout()) return;
                if (!selectedPayload) return;
                event.preventDefault();
                event.stopPropagation();
                setDropzoneAnswer(dropzone, selectedPayload);
                clearSelectedOption();
            });
        });
    }

    function patchExamTitle() {
        const title = document.getElementById('exam-title');
        if (!title) return;
        const cleaned = cleanTitle(title.textContent || '');
        if (cleaned) title.textContent = cleaned;
    }

    function init() {
        document.querySelectorAll('[data-mobile-view]').forEach((button) => {
            button.addEventListener('click', () => setView(button.dataset.mobileView));
        });
        let saved = 'passage';
        try {
            saved = localStorage.getItem('ielts_mobile_view') || 'passage';
        } catch (_) {
            // ignore
        }
        setView(saved);
        setEnglishUi();
        patchExamTitle();
        addTouchHint();
        bindTouchChoiceFallback();
        let runs = 0;
        const timer = window.setInterval(() => {
            runs += 1;
            setEnglishUi();
            patchExamTitle();
            addTouchHint();
            bindTouchChoiceFallback();
            if (runs >= 12) {
                window.clearInterval(timer);
            }
        }, 500);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
