/**
 * speech.js
 * Module tích hợp tính năng đọc văn bản (Text-to-Speech) bằng tiếng Việt 
 * chuẩn xác, mượt mà cho ứng dụng FOX_LAB.
 */
(function() {
    // Đảm bảo hàm speakText luôn có sẵn trên toàn cục
    window.speakText = function(btnElement) {
        if (!('speechSynthesis' in window)) {
            alert("⚠️ Trình duyệt của thầy không hỗ trợ tính năng đọc giọng nói!");
            return;
        }

        const group = btnElement.closest('.fox-msg-group');
        const bubble = group ? group.querySelector('.fox-msg-bubble') : null;
        if (!bubble) return;

        // Lấy văn bản sạch (loại bỏ các nút, thẻ HTML, ký hiệu rườm rà)
        let textToRead = bubble.innerText || bubble.textContent;
        textToRead = textToRead.replace(/Copy|Nghe|Tải báo cáo|[\$\*\_#]/g, '').trim();

        // Nếu đang đọc dở thì bấm lần nữa để dừng/hủy
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
            if (window._currentSpeakingBtn) {
                window._currentSpeakingBtn.innerHTML = "🔊 Nghe";
                window._currentSpeakingBtn.style.background = "";
            }
            if (window._currentSpeakingBtn === btnElement) {
                window._currentSpeakingBtn = null;
                return;
            }
        }

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'vi-VN'; // Chuẩn tiếng Việt
        utterance.rate = 1.0;   // Tốc độ đọc chuẩn (1.0)
        utterance.pitch = 1.0;  // Âm cao tự nhiên

        // Tự động tìm giọng đọc tiếng Việt chất lượng cao trên thiết bị (Google / Microsoft / Natural)
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang === 'vi-VN' && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural') || v.name.includes('Standard')));
        if (viVoice) {
            utterance.voice = viVoice;
        }

        btnElement.innerHTML = "⏹ Dừng";
        btnElement.style.background = "#dc2626"; // Đổi sang màu đỏ khi đang đọc
        window._currentSpeakingBtn = btnElement;

        utterance.onend = function() {
            btnElement.innerHTML = "🔊 Nghe";
            btnElement.style.background = "";
            window._currentSpeakingBtn = null;
        };

        utterance.onerror = function() {
            btnElement.innerHTML = "🔊 Nghe";
            btnElement.style.background = "";
            window._currentSpeakingBtn = null;
        };

        window.speechSynthesis.speak(utterance);
    };

    // Nạp trước danh sách giọng đọc của hệ thống
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    }
})();
