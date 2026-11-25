/**
 * Module Giọng đọc AI Tiếng Việt Chuẩn Khoa học (v4.2 - FOX-Lab Edition)
 * Hỗ trợ: Dịch công thức LaTeX -> Tiếng Việt + SSML + Tự động chia nhỏ đoạn dài + GAS Proxy
 */
const KhoaHocTTS = (function () {
  // ================= CẤU HÌNH KẾT NỐI GAS =================
  const CONFIG = {
    // URL Web App Google Apps Script FOX-Lab
    gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbwllsi_eXt98JRwTDyHPtD8qtgx6nnyhnDD8sSk5mIgEeB0EGLHkIwydpATOWohKJLuEg/exec',
    voice: 'vi-VN-Neural2-A', // 'vi-VN-Neural2-A' (Giọng Nữ) hoặc 'vi-VN-Neural2-D' (Giọng Nam)
    speakingRate: 1.0,        // Tốc độ đọc (0.85 - 1.15)
    maxChunkChars: 900        // Độ dài tối đa mỗi đoạn gửi lên TTS
  };
  // ========================================================

  let currentAudio = null;
  let currentBtn = null;
  let activeUtterance = null;
  let fallbackTimerId = null;
  let isStoppedByUser = false;
  const audioCache = new Map();

  // 0. Bộ dịch cú pháp LaTeX sang cách đọc tiếng Việt tự nhiên
  function chuyenDoiLaTeX(text) {
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ');
    text = text.replace(/\$([^$\n]+?)\$/g, ' $1 ');
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ');
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ');

    // Phân số \frac{tử}{mẫu} hoặc \dfrac{tử}{mẫu} (lặp 3 lần hỗ trợ phân số lồng nhau)
    for (let i = 0; i < 3; i++) {
      text = text.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 phần $2');
    }

    // Căn bậc n và căn bậc hai
    text = text.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, 'căn bậc $1 của $2');
    for (let i = 0; i < 2; i++) {
      text = text.replace(/\\sqrt\{([^{}]+)\}/g, 'căn bậc hai của $1');
    }

    // Lũy thừa & chỉ số dưới trong Vật lý/Toán
    text = text.replace(/\^\{2\}/g, ' bình phương');
    text = text.replace(/\^\{3\}/g, ' lập phương');
    text = text.replace(/\^\{([^{}]+)\}/g, ' mũ $1');
    text = text.replace(/\^2\b/g, ' bình phương');
    text = text.replace(/\^3\b/g, ' lập phương');
    text = text.replace(/\^([a-zA-Z0-9])/g, ' mũ $1');
    text = text.replace(/_\{([^{}]+)\}/g, ' $1');
    text = text.replace(/_([a-zA-Z0-9])/g, ' $1');

    const latexDict = [
      { regex: /\\Delta\b/g, replace: ' đen-ta ' },
      { regex: /\\delta\b/g, replace: ' đen-ta ' },
      { regex: /\\omega\b/g, replace: ' ô-mê-ga ' },
      { regex: /\\Omega\b/g, replace: ' ôm ' },
      { regex: /\\pi\b/g, replace: ' pi ' },
      { regex: /\\lambda\b/g, replace: ' lam-đa ' },
      { regex: /\\varphi\b|\\phi\b|\\Phi\b/g, replace: ' phi ' },
      { regex: /\\alpha\b/g, replace: ' an-pha ' },
      { regex: /\\beta\b/g, replace: ' bê-ta ' },
      { regex: /\\gamma\b/g, replace: ' gam-ma ' },
      { regex: /\\theta\b/g, replace: ' thê-ta ' },
      { regex: /\\mu\b/g, replace: ' muy ' },
      { regex: /\\rho\b/g, replace: ' rô ' },
      { regex: /\\sigma\b/g, replace: ' xích-ma ' },
      { regex: /\\varepsilon\b|\\epsilon\b/g, replace: ' ép-xi-lon ' },

      { regex: /\\times\b|\\cdot\b/g, replace: ' nhân ' },
      { regex: /\\div\b/g, replace: ' chia ' },
      { regex: /\\pm\b/g, replace: ' cộng trừ ' },
      { regex: /\\approx\b/g, replace: ' xấp xỉ ' },
      { regex: /\\neq\b/g, replace: ' khác ' },
      { regex: /\\leq\b|\\le\b/g, replace: ' nhỏ hơn hoặc bằng ' },
      { regex: /\\geq\b|\\ge\b/g, replace: ' lớn hơn hoặc bằng ' },
      { regex: /\\Rightarrow\b|\\implies\b|\\rightarrow\b|\\to\b/g, replace: ' suy ra ' },
      { regex: /\\Leftrightarrow\b|\\iff\b/g, replace: ' tương đương ' },
      { regex: /\\infty\b/g, replace: ' vô cùng ' },
      { regex: /\\circ\b/g, replace: ' độ ' },

      { regex: /\\sin\b/g, replace: ' sin ' },
      { regex: /\\cos\b/g, replace: ' cốt ' },
      { regex: /\\tan\b/g, replace: ' tang ' },
      { regex: /\\cot\b/g, replace: ' cô-tang ' },
      { regex: /\\log\b/g, replace: ' lô-ga-rít ' },
      { regex: /\\ln\b/g, replace: ' lô-ga-rít tự nhiên của ' },

      { regex: /\\(?:text|mathrm|mathbf|unit)\{([^{}]+)\}/g, replace: ' $1 ' },
      { regex: /\\left|\\right|\\,|\\;|\\!/g, replace: ' ' },
      { regex: /[{}]/g, replace: '' }
    ];

    latexDict.forEach((item) => {
      text = text.replace(item.regex, item.replace);
    });

    return text;
  }

  // 1. Chuẩn hóa thuật ngữ & đơn vị Vật lý - Khoa học thành chữ thuần
  function chuanHoaVanBanThuan(rawText) {
    let text = chuyenDoiLaTeX(rawText);

    text = text
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/[*#_`~]/g, '');

    const tuDienKhoaHoc = [
      { regex: /(\d+)\s*Hz\b/gi, replace: '$1 Héc' },
      { regex: /(\d+)\s*kHz\b/gi, replace: '$1 ki-lô-héc' },
      { regex: /(\d+)\s*dB\b/gi, replace: '$1 đề-xi-ben' },
      { regex: /(\d+)\s*mA\b/g, replace: '$1 mi-li-am-pe' },
      { regex: /(\d+)\s*A\b/g, replace: '$1 am-pe' },
      { regex: /(\d+)\s*V\b/g, replace: '$1 vôn' },
      { regex: /(\d+)\s*W\b/g, replace: '$1 oát' },
      { regex: /(\d+)\s*Ω\b/g, replace: '$1 ôm' },

      { regex: /m\/s²|m\/s\^2/gi, replace: 'mét trên giây bình phương' },
      { regex: /m\/s/gi, replace: 'mét trên giây' },
      { regex: /km\/h/gi, replace: 'ki-lô-mét trên giờ' },
      { regex: /(\d+)\s*ms\b/g, replace: '$1 mi-li-giây' },
      { regex: /(\d+)\s*°C/g, replace: '$1 độ Xê' },

      { regex: /λ/g, replace: ' lam-đa ' },
      { regex: /ω/g, replace: ' ô-mê-ga ' },
      { regex: /φ/g, replace: ' phi ' },
      { regex: /Δ/g, replace: ' đen-ta ' },
      { regex: /π/g, replace: ' pi ' },
      { regex: /√\(([^)]+)\)/g, replace: 'căn bậc hai của $1' },
      { regex: /√(\w+)/g, replace: 'căn bậc hai của $1' },
      { regex: /≈/g, replace: ' xấp xỉ ' },
      { regex: /≠/g, replace: ' khác ' },
      { regex: /≤/g, replace: ' nhỏ hơn hoặc bằng ' },
      { regex: /≥/g, replace: ' lớn hơn hoặc bằng ' },
      { regex: /⇒|→/g, replace: ' suy ra ' },
      { regex: /⇔/g, replace: ' tương đương ' },
      { regex: /×/g, replace: ' nhân ' },
      { regex: /÷/g, replace: ' chia ' },
      { regex: /²/g, replace: ' bình phương' },
      { regex: /³/g, replace: ' lập phương' },

      { regex: /\bCO2\b|\bCO₂\b/g, replace: 'Cê Ô hai' },
      { regex: /\bH2O\b|\bH₂O\b/g, replace: 'Hát hai Ô' },
      { regex: /\bO2\b|\bO₂\b/g, replace: 'Ô-xi' }
    ];

    tuDienKhoaHoc.forEach((item) => {
      text = text.replace(item.regex, item.replace);
    });

    // Đọc dấu chấm thập phân thành "phẩy" (3.14 -> 3 phẩy 14)
    text = text.replace(/(\d+)\.(\d+)/g, '$1 phẩy $2');
    return text;
  }

  // 2. Chuyển đổi đoạn văn bản sang thẻ SSML
  function taoChuoiSSML(rawText) {
    let text = chuanHoaVanBanThuan(rawText);

    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    text = text.replace(/\n{2,}/g, '<break time="550ms"/>');
    text = text.replace(/\n/g, '<break time="350ms"/>');

    text = text.replace(
      /([A-Za-zÀ-ỹ0-9\(\)\/\+\-\s]{1,30})\s*=\s*([A-Za-zÀ-ỹ0-9\(\)\/\+\-\s\.,]{1,40})/g,
      '<prosody rate="92%">$1 <break time="180ms"/> bằng <break time="180ms"/> $2</prosody><break time="250ms"/>'
    );

    text = text.replace(
      /\b(suy ra|tương đương|ta có|thay số)\b/gi,
      '<break time="250ms"/>$1<break time="150ms"/>'
    );

    text = text.replace(/\s+/g, ' ').trim();
    return `<speak>${text}</speak>`;
  }

  // Chia nhỏ văn bản dài theo câu để không vượt quá giới hạn ký tự Google TTS
  function chiaNhoVanBan(rawText, maxLen) {
    const sentences = rawText.split(/(?<=[.!?;\n])\s+/);
    const chunks = [];
    let current = '';

    for (const s of sentences) {
      if ((current + ' ' + s).length > maxLen && current.trim()) {
        chunks.push(current.trim());
        current = s;
      } else {
        current = current ? (current + ' ' + s) : s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [rawText];
  }

  function chiaCauNganTrinhDuyet(plainText, maxLen = 160) {
    const rawSentences = plainText.split(/(?<=[.!?;:\n])\s+/);
    const out = [];
    let buf = '';
    for (const part of rawSentences) {
      const seg = part.trim();
      if (!seg) continue;
      if (seg.length > maxLen) {
        if (buf) { out.push(buf.trim()); buf = ''; }
        const words = seg.split(/\s+/);
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).length > maxLen && sub) {
            out.push(sub.trim());
            sub = w;
          } else {
            sub = sub ? (sub + ' ' + w) : w;
          }
        }
        if (sub) out.push(sub.trim());
      } else if ((buf + ' ' + seg).length > maxLen && buf) {
        out.push(buf.trim());
        buf = seg;
      } else {
        buf = buf ? (buf + ' ' + seg) : seg;
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out.length ? out : [plainText];
  }

  function unlockBrowserSpeech() {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
    } catch (e) {}
  }

  // 3. Gọi Google Apps Script Proxy
  async function fetchAudioFromGAS(ssmlString, plainChunk) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(CONFIG.gasWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'tts',
          ssml: ssmlString,
          plainText: plainChunk,
          voice: CONFIG.voice,
          rate: CONFIG.speakingRate
        }),
        signal: controller.signal
      });
      clearTimeout(timerId);

      if (!response.ok) throw new Error('Không thể kết nối tới GAS Web App');
      const result = await response.json();

      if (result.status !== 'success' || !result.audioBase64) {
        throw new Error(result.message || 'GAS trả về lỗi SSML hoặc dữ liệu rỗng');
      }

      const mimeType = result.mimeType || 'audio/mp3';
      return `data:${mimeType};base64,${result.audioBase64}`;
    } catch (err) {
      clearTimeout(timerId);
      throw err;
    }
  }

  // Phát 1 file audio base64 và chờ kết thúc
  function playAudioPromise(audioSrc, btn) {
    return new Promise((resolve, reject) => {
      if (isStoppedByUser) return resolve();
      currentAudio = new Audio(audioSrc);
      currentAudio.onplay = () => updateBtnUI(btn, '⏹️ Dừng đọc', true);
      currentAudio.onended = () => {
        currentAudio = null;
        resolve();
      };
      currentAudio.onerror = (e) => {
        currentAudio = null;
        reject(e);
      };
      currentAudio.play().catch(reject);
    });
  }

  // 4. Dự phòng bằng giọng trình duyệt
  function speakFallbackBrowser(rawText, btn) {
    if (!('speechSynthesis' in window)) {
      resetState();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch (e) {}

    const plainText = chuanHoaVanBanThuan(rawText)
      .replace(/\n+/g, '. ')
      .replace(/\s*=\s*/g, ' bằng ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!plainText) {
      resetState();
      return;
    }

    const chunks = chiaCauNganTrinhDuyet(plainText, 160);
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().includes('vi'));
    const preferredVoice = voices.length > 0
      ? (voices.find((v) => /HoaiMy|NamMinh|Google|Microsoft/i.test(v.name)) || voices[0])
      : null;

    let idx = 0;

    function speakNextChunk() {
      if (isStoppedByUser || idx >= chunks.length) {
        activeUtterance = null;
        resetState();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[idx]);
      utterance.lang = 'vi-VN';
      utterance.rate = CONFIG.speakingRate;
      if (preferredVoice) utterance.voice = preferredVoice;
      activeUtterance = utterance;

      utterance.onstart = () => updateBtnUI(btn, '⏹️ Dừng đọc', true);
      utterance.onend = () => {
        if (isStoppedByUser) return;
        idx++;
        speakNextChunk();
      };
      utterance.onerror = (ev) => {
        const errCode = ev && ev.error ? ev.error : '';
        if (isStoppedByUser || errCode === 'canceled' || errCode === 'interrupted') return;
        console.warn('[SpeechSynthesis Error]:', errCode);
        activeUtterance = null;
        if (btn) {
          updateBtnUI(btn, '⚠️ Chưa có giọng đọc', false);
          setTimeout(() => {
            if (!currentBtn && btn.textContent.includes('Chưa có giọng đọc')) {
              updateBtnUI(btn, '🔊 Nghe', false);
            }
          }, 2200);
        }
        currentBtn = null;
      };

      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        activeUtterance = null;
        resetState();
      }
    }

    if (fallbackTimerId) clearTimeout(fallbackTimerId);
    fallbackTimerId = setTimeout(() => {
      fallbackTimerId = null;
      if (!isStoppedByUser) speakNextChunk();
    }, 60);
  }

  // 5. Hàm điều khiển phát / dừng
  async function toggleSpeak(rawText, buttonElement = null) {
    if (currentBtn === buttonElement && (currentAudio || activeUtterance || (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking))) {
      stop();
      return;
    }

    stop();
    if (!rawText || !rawText.trim()) return;

    unlockBrowserSpeech();
    isStoppedByUser = false;
    currentBtn = buttonElement;
    updateBtnUI(buttonElement, '⏳ Đang tạo giọng...', true);

    try {
      const chunks = chiaNhoVanBan(rawText, CONFIG.maxChunkChars);

      for (let i = 0; i < chunks.length; i++) {
        if (isStoppedByUser) break;
        const plainChunk = chuanHoaVanBanThuan(chunks[i])
          .replace(/\n+/g, '. ')
          .replace(/\s*=\s*/g, ' bằng ')
          .replace(/\s+/g, ' ')
          .trim();
        const ssmlString = taoChuoiSSML(chunks[i]);
        const cacheKey = plainChunk || ssmlString;
        let audioSrc = audioCache.get(cacheKey);

        if (!audioSrc) {
          audioSrc = await fetchAudioFromGAS(ssmlString, plainChunk);
          audioCache.set(cacheKey, audioSrc);
        }

        if (isStoppedByUser) break;
        await playAudioPromise(audioSrc, buttonElement);
      }

      if (!isStoppedByUser) resetState();

    } catch (err) {
      console.warn('[KhoaHocTTS Fallback]:', err.message);
      if (!isStoppedByUser) {
        speakFallbackBrowser(rawText, buttonElement);
      }
    }
  }

  function stop() {
    isStoppedByUser = true;
    if (fallbackTimerId) {
      clearTimeout(fallbackTimerId);
      fallbackTimerId = null;
    }
    activeUtterance = null;
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {}
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    resetState();
  }

  function updateBtnUI(btn, label, active) {
    if (!btn) return;
    btn.innerHTML = label;
    active ? btn.classList.add('is-speaking') : btn.classList.remove('is-speaking');
  }

  function resetState() {
    updateBtnUI(currentBtn, '🔊 Nghe', false);
    currentBtn = null;
  }

  // Cho phép đổi cấu hình URL GAS hoặc giọng đọc động từ trang chính
  function configure(options = {}) {
    if (options.gasWebAppUrl) CONFIG.gasWebAppUrl = options.gasWebAppUrl;
    if (options.voice) CONFIG.voice = options.voice;
    if (options.speakingRate) CONFIG.speakingRate = options.speakingRate;
  }

  return {
    speak: toggleSpeak,
    stop: stop,
    configure: configure,
    previewSSML: taoChuoiSSML
  };
})();
