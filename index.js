// Fox-lab - Acoustic Oscilloscope & SPL Meter (Full Build)
async function checkAppVersion() {
        try {
            const res = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            const serverVersion = data.version;
            const localVersion = localStorage.getItem('fox_app_version');

            if (!localVersion) {
                localStorage.setItem('fox_app_version', serverVersion);
            } else if (localVersion !== serverVersion) {
                localStorage.setItem('fox_app_version', serverVersion);
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                }
                window.location.reload();
            }
        } catch (e) { console.log('Chưa thể kiểm tra phiên bản:', e); }
    }
    checkAppVersion();


    let isSelectActive = false;
    let isMicPromptActive = false;

    function restoreAudioAndLoopAfterOverlay() {
        // Khi chụp màn hình trên máy tính hoặc thiết bị thông minh (focus/visibility quay lại),
        // giữ nguyên toàn bộ giao diện, modal, điểm chọn, đồ thị và khôi phục luồng đo nếu đang chạy.
        if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended' && !isPaused) {
            audioCtx.resume().catch(() => {});
        }
        if (!isPaused && typeof animFrameId !== 'undefined' && !animFrameId && typeof draw === 'function') {
            draw();
        }
        if (typeof isTwoSourceModalOpen !== 'undefined' && isTwoSourceModalOpen) {
            if (typeof calculatePhaseAndDrawLive === 'function') {
                requestAnimationFrame(calculatePhaseAndDrawLive);
            }
        } else if (typeof isKinematicsModalOpen !== 'undefined' && isKinematicsModalOpen) {
            if (typeof drawKinematicsGraphs === 'function') drawKinematicsGraphs();
        } else {
            const fftOverlay = document.getElementById('fftModalOverlay');
            if (fftOverlay && fftOverlay.style.display === 'flex' && typeof processAndDrawFFT === 'function') {
                if (!fftSweepActive) processAndDrawFFT();
            } else if (typeof drawFrame === 'function') {
                drawFrame(false);
            }
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            restoreAudioAndLoopAfterOverlay();
        }
    });

    window.addEventListener('focus', () => {
        restoreAudioAndLoopAfterOverlay();
    });

    window.addEventListener('pageshow', () => {
        restoreAudioAndLoopAfterOverlay();
    });

    document.addEventListener('pointerdown', () => {
        if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === 'suspended' && !isPaused) {
            audioCtx.resume().catch(() => {});
        }
    }, { passive: true });
    window.addEventListener('beforeunload', () => { stopAudioChannel('A'); stopAudioChannel('B'); });

    function toggleFullScreen() {
        let elem = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen().catch(err => { console.log(err); });
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    }

    const FOX_AVATAR_SVG = `<svg viewBox="0 0 100 100" fill="none"><polygon points="22,12 10,48 36,40" fill="#ff7a30"/><polygon points="23,19 16,44 32,38" fill="#1e293b"/><path d="M 19 36 Q 23 32 28 34" stroke="#38bdf8" stroke-width="1.3" stroke-linecap="round"/><polygon points="78,12 64,40 90,48" fill="#ff7a30"/><polygon points="77,19 68,38 84,44" fill="#1e293b"/><path d="M 81 36 Q 77 32 72 34" stroke="#38bdf8" stroke-width="1.3" stroke-linecap="round"/><polygon points="50,22 36,40 50,46" fill="#ff8f4a"/><polygon points="50,22 50,46 64,40" fill="#ff7a30"/><polygon points="36,40 10,48 20,68 38,58" fill="#d4380d"/><polygon points="64,40 38,58 50,46" fill="#e04006"/><polygon points="64,40 50,46 62,58" fill="#d4380d"/><polygon points="64,40 90,48 80,68 62,58" fill="#d4380d"/><polygon points="20,68 12,74 26,76 34,68" fill="#e2e8f0"/><polygon points="80,68 88,74 74,76 66,68" fill="#cbd5e1"/><polygon points="38,58 50,46 50,78 36,68" fill="#ff7a30"/><polygon points="62,58 50,46 50,78 64,68" fill="#e04006"/><polygon points="50,78 36,68 44,88 50,88" fill="#f8fafc"/><polygon points="50,78 64,68 56,88 50,88" fill="#e2e8f0"/><polygon points="50,88 45,82 55,82" fill="#0f172a"/><polygon points="25,48 50,54 75,48 71,59 50,65 29,59" fill="#090d16" stroke="rgba(56,189,248,0.5)" stroke-width="0.9"/><circle cx="34.5" cy="48" r="1.5" fill="#ffffff"/><circle cx="44.5" cy="60" r="1.5" fill="#ffffff"/><circle cx="54.5" cy="48" r="1.5" fill="#ffffff"/><circle cx="64.5" cy="60" r="1.5" fill="#ffffff"/></svg>`;
    const LICENSE_GAS_ID = "AKfycbwC9gwiwBdIsfvv2nGZQNrkeR1O43GTW9lhMCu6fEn-LGjjbmMEcy-3153DZRkOaLdx3Q";
    const CHAT_GAS_ID = "AKfycbwllsi_eXt98JRwTDyHPtD8qtgx6nnyhnDD8sSk5mIgEeB0EGLHkIwydpATOWohKJLuEg";

    // Dọn dẹp khóa giới hạn phiên cũ (đã gỡ bỏ giới hạn thời gian 30 phút)
    try {
        ["foxlab_session_start_ts", "foxlab_session_expired", "foxlab_session_mode"].forEach((k) => {
            try { localStorage.removeItem(k); } catch (e) {}
            try { sessionStorage.removeItem(k); } catch (e) {}
        });
    } catch (e) {}


    const btnStartA = document.getElementById('btnStartA'), btnStartB = document.getElementById('btnStartB');
    const pauseButton = document.getElementById('pauseButton'), btnManualAnalysis = document.getElementById('btnManualAnalysis'), resetButton = document.getElementById('resetButton'), btnCalib = document.getElementById('btnCalib');
    const btnAnalysis = document.getElementById('btnAnalysis'), infoMessageText = document.getElementById('infoMessageText');
    const channelModeSelect = document.getElementById('channelModeSelect'), modeSelect = document.getElementById('modeSelect'), speedSelect = document.getElementById('speedSelect');
    const displayModeSelect = document.getElementById('displayModeSelect');
    const micSelectA = document.getElementById('micSelectA'), micSelectB = document.getElementById('micSelectB');
    const canvas = document.getElementById('oscilloscope'), canvasCtx = canvas.getContext('2d', { alpha: false });
    const settingsDropdown = document.getElementById('settingsDropdown'), settingsMenu = document.getElementById('settingsMenu');

    window.resetButton = resetButton;

    if (btnCalib) {
        btnCalib.addEventListener('click', () => {
            if (isDemoMode) {
                alert("⚠️ Chức năng Hiệu chuẩn Micro bị khóa ở bản Dùng thử Demo. Vui lòng kích hoạt bản Full để sử dụng!");
                openLicenseModal();
                return;
            }
            openCalibModal();
        });
    }

    let micCalibOffsetA = parseFloat(localStorage.getItem('fox_mic_calib_offset_a') || '0.0');
    let micCalibOffsetB = parseFloat(localStorage.getItem('fox_mic_calib_offset_b') || '0.0');

    let audioCtx, sampleRate = 48000, isPaused = true, isContinuousMode = (typeof modeSelect !== 'undefined' && modeSelect ? modeSelect.value === 'continuous' : false), stopTimer;
    let isDemoMode = true; let demoChatCount = 0; const MAX_DEMO_CHAT = 5;
    let isManualAnalysisMode = false;
    let manualPoints = []; // [{ absIdx, y }] - Dành riêng cho 1 nguồn tự dừng
    let isTwoSourceGraphAnalysisMode = false;
    let twoSourcePoints = { A: [], B: [] }; // { A: [{ absIdx, y }, ...], B: [{ absIdx, y }, ...] } - 4 điểm (2 điểm/đồ thị) cho 2 nguồn tự dừng
    let draggingTwoSourcePoint = null; // { channel: 'A' | 'B', index: 0 | 1 } | null
    let detectedFrequency = 0, lockedFrequency = 440;
    let isUserZoomed = false, totalTimeOnScreen = 5 * (1.0 / 440), currentZoomY = 2.0;
    let frozenCenterIdxA = null, frozenCenterIdxB = null;

    let isTwoSourceModalOpen = false, isTsPaused = false;
    let snapDataA = [], snapDataB = [], snapIdxA = 0, snapIdxB = 0, tsViewMode = 'overlay';
    let showTsResults = false, showTsEquations = false;
    let currentCalcFreqA = 0, currentCalcFreqB = 0, currentAmpA = 0, currentAmpB = 0;

    let dbHistoryA = [];
    let dbHistoryB = [];
    let selectedBarIndexA = -1;
    let selectedBarIndexB = -1;
    let lastDbSampleTime = 0;
    let dbStartTime = 0;
    const SAFETY_THRESHOLD_DB = 85.0;

    let currentFoxRole = 'student'; // 'student' or 'teacher'
    let uploadedImageBase64 = null;

    function getDisplayMode() {
        return displayModeSelect ? displayModeSelect.value : 'oscilloscope';
    }

    function calculateRMSdB(buffer, channel = 'A', isRaw = false) {
        if (!buffer || buffer.length === 0) return 30.0;
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        let rms = Math.sqrt(sum / buffer.length);
        if (rms < 0.0001) rms = 0.0001;
        let rawDb = 20 * Math.log10(rms / 0.00002);
        rawDb = Math.max(30.0, Math.min(120.0, rawDb));
        if (isRaw) return rawDb;
        let offset = (channel === 'B') ? micCalibOffsetB : micCalibOffsetA;
        let calibDb = rawDb + offset;
        return Math.max(30.0, Math.min(120.0, calibDb));
    }

    function getDeviceId() {
        let deviceId = localStorage.getItem('fox_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem('fox_device_id', deviceId);
        }
        return deviceId;
    }

    function selectMode(mode) {
        if (mode === 'demo') {
            isDemoMode = true; document.getElementById('licenseModalOverlay').style.display = 'none';
            const gearBtn = document.querySelector('.license-gear-btn');
            if (gearBtn) gearBtn.style.display = 'inline-flex';
            // Mặc định khi vào Demo: 1 nguồn âm, đo tự dừng
            if (channelModeSelect) {
                channelModeSelect.value = '1';
                const cardB = document.getElementById('cardChannelB');
                if (cardB) cardB.style.display = 'none';
                stopAudioChannel('B');
                document.querySelectorAll('#groupChannelMode .settings-item').forEach(el => {
                    el.classList.toggle('active', el.dataset.value === '1');
                });
            }
            if (modeSelect) {
                modeSelect.value = 'auto';
                isContinuousMode = false;
                clearTimeout(stopTimer);
                document.querySelectorAll('#groupMode .settings-item').forEach(el => {
                    el.classList.toggle('active', el.dataset.value === 'auto');
                });
                const speedGroup = document.getElementById('groupSpeed');
                if (speedGroup) speedGroup.style.display = 'none';
            }
            updateToolbarButtonsVisibility();
            updateAnalysisButtonState();
        } else {
            document.getElementById('keyInputContainer').style.display = 'block';
        }
    }

    // =========================================================================
    // INTERNAL SECURITY: Khởi tạo Endpoint ngầm từ ID
    // =========================================================================
    const _getGasEndpoint = (id) => (typeof atob === 'function' ? atob("aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy8=") : "https://script.google.com/macros/s/") + id + "/exec";
    const LICENSE_GAS_URL = _getGasEndpoint(LICENSE_GAS_ID);
    const CHAT_GAS_URL = _getGasEndpoint(CHAT_GAS_ID);

    function openLicenseModal() {
        document.getElementById('licenseModalOverlay').style.display = 'flex';
        document.getElementById('keyInputContainer').style.display = 'none';
    }

    window.handleLicenseAction = async function (action) {
        let key = localStorage.getItem('fox_license_key');
        if (!key) { alert("Bạn chưa kích hoạt Key nào hoặc đang ở chế độ Dùng thử!"); return; }

        if (action === 'logout') {
            if (confirm("🚪 Bạn muốn Đăng xuất khỏi thiết bị này?\n(Key vẫn giữ quyền sử dụng trên hệ thống)")) {
                forceLogout(false);
            }
        } else if (action === 'change') {
            if (confirm("🔄 Bạn muốn Đổi thiết bị?\n(Thiết bị này sẽ bị gỡ bỏ khỏi Google Sheet để bạn kích hoạt trên máy mới - Tối đa 3 lần đổi/Key)")) {
                try {
                    infoMessageText.innerHTML = "Đang gửi yêu cầu giải phóng device ID...";
                    await fetch(LICENSE_GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: "releaseDevice", key: key, deviceId: getDeviceId() })
                    });
                    alert("✅ Đã tự động xóa Device ID trên Google Sheet! Bạn có thể nhập Key này trên máy mới.");
                } catch (e) {
                    console.log("Lỗi gửi releaseDevice:", e);
                }
                forceLogout(false);
            }
        } else if (action === 'delete') {
            if (confirm("🗑 XÓA KEY VĨNH VIỄN?\nBạn có chắc chắn muốn xóa Key và xóa Device ID khỏi Google Sheet? (Thao tác không thể hoàn tác)")) {
                try {
                    infoMessageText.innerHTML = "Đang xóa Key & Device ID trên Google Sheet...";
                    await fetch(LICENSE_GAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: "deleteKey", key: key, deviceId: getDeviceId() })
                    });
                    alert("✅ Đã gửi lệnh xóa Key & Device ID vĩnh viễn khỏi hệ thống!");
                } catch (e) {
                    console.log("Lỗi xóa key:", e);
                }
                forceLogout(false);
            }
        }
        document.getElementById('settingsDropdown').classList.remove('open');
    }

    function activateFullMode(key) {
        isDemoMode = false; localStorage.setItem('fox_license_key', key); localStorage.setItem('fox_last_verify_time', Date.now().toString());
        document.getElementById('licenseModalOverlay').style.display = 'none';
        infoMessageText.innerHTML = "✅ Bản Full Chính Thức đã kích hoạt thành công!";
        const gearBtn = document.querySelector('.license-gear-btn');
        if (gearBtn) gearBtn.style.display = 'none';

        // Mặc định khi đăng nhập / kích hoạt Full: 1 nguồn âm, đo tự dừng
        if (channelModeSelect) {
            channelModeSelect.value = '1';
            const cardB = document.getElementById('cardChannelB');
            if (cardB) cardB.style.display = 'none';
            stopAudioChannel('B');
            document.querySelectorAll('#groupChannelMode .settings-item').forEach(el => {
                el.classList.toggle('active', el.dataset.value === '1');
            });
        }
        if (modeSelect) {
            modeSelect.value = 'auto';
            isContinuousMode = false;
            clearTimeout(stopTimer);
            document.querySelectorAll('#groupMode .settings-item').forEach(el => {
                el.classList.toggle('active', el.dataset.value === 'auto');
            });
            const speedGroup = document.getElementById('groupSpeed');
            if (speedGroup) speedGroup.style.display = 'none';
        }
        updateToolbarButtonsVisibility();
        updateAnalysisButtonState(); checkAndShowQR();
    }

    async function verifyKeyWithServer(key, type, isSilent = false) {
        if (!isSilent) infoMessageText.innerHTML = "Đang kiểm tra Key bản Full với Google Sheets...";
        try {
            const response = await fetch(LICENSE_GAS_URL, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "verifyKey", key: key, deviceId: getDeviceId(), type: type })
            });
            const result = await response.json();
            if (result.status === "success") {
                activateFullMode(key);
            } else {
                if (!isSilent) {
                    let confirmChange = confirm(`❌ Lỗi: ${result.message}\n\nMã Key này có thể đang được sử dụng ở thiết bị khác.\nBạn có muốn XÁC NHẬN ĐỔI THIẾT BỊ (tự động đăng xuất máy cũ, lưu vào máy mới - tối đa 3 lần) không?`);
                    if (confirmChange) {
                        forceChangeDevice(key, type);
                    } else {
                        forceLogout();
                    }
                } else { forceLogout(); }
            }
        } catch (e) {
            if (isSilent) { activateFullMode(key); infoMessageText.innerHTML = "✅ Bản Full (Ngoại tuyến)"; }
            else { alert("Lỗi mạng khi kiểm tra Key."); forceLogout(); }
        }
    }

    async function forceChangeDevice(key, type) {
        infoMessageText.innerHTML = "Đang gửi yêu cầu Đổi thiết bị...";
        try {
            const response = await fetch(LICENSE_GAS_URL, {
                method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: "changeDevice", key: key, deviceId: getDeviceId(), type: type })
            });
            const result = await response.json();
            if (result.status === "success") {
                alert("✅ Đổi thiết bị thành công! Key đã được gán cho máy này.");
                activateFullMode(key);
            } else {
                alert(`❌ Không thể đổi thiết bị: ${result.message}\n(Có thể mã Key này đã hết số lần Đổi thiết bị)`);
                forceLogout();
            }
        } catch (e) { alert("Lỗi kết nối khi yêu cầu đổi thiết bị!"); forceLogout(); }
    }

    async function verifyEnteredKey(actionType = 'verify') {
        const keyInput = document.getElementById('licenseKeyInput').value.trim();
        if (!keyInput) { alert("⚠️ Vui lòng nhập mã Key hợp lệ!"); return; }
        if (actionType === 'change') {
            await forceChangeDevice(keyInput, "full");
        } else {
            await verifyKeyWithServer(keyInput, "full");
        }
    }

    function forceLogout(isManual = false) {
        localStorage.removeItem('fox_license_key'); isDemoMode = true;
        document.getElementById('settingsDropdown').classList.remove('open');
        stopAudioChannel('A'); stopAudioChannel('B');
        document.getElementById('keyInputContainer').style.display = 'none';
        document.getElementById('licenseKeyInput').value = '';
        document.getElementById('licenseModalOverlay').style.display = 'flex';
        const gearBtn = document.querySelector('.license-gear-btn');
        if (gearBtn) gearBtn.style.display = 'inline-flex';
        infoMessageText.innerHTML = "Bản Dùng thử Demo (Khóa tính năng nâng cao)."; infoMessageText.style.color = "#dc2626";
        isPaused = true; clearTimeout(stopTimer); pauseButton.textContent = "Đo / Dừng"; pauseButton.className = "btn-green";
        updateUIState(); checkAndShowQR(); drawFrame(true);
    }

    function saveAppState() {
        localStorage.setItem('fox_channel_mode', channelModeSelect.value);
        localStorage.setItem('fox_mode_select', modeSelect.value);
        if (displayModeSelect) localStorage.setItem('fox_display_mode', displayModeSelect.value);
        localStorage.setItem('fox_speed_select', speedSelect.value);
        localStorage.setItem('fox_mic_a', micSelectA.value);
        localStorage.setItem('fox_mic_b', micSelectB.value);
    }

    function restoreAppState() {
        channelModeSelect.value = '1';
        modeSelect.value = 'auto'; // Mặc định khi khởi động / đăng nhập là Đo tự dừng
        if (displayModeSelect) displayModeSelect.value = 'oscilloscope';
        speedSelect.value = 'fast';

        isContinuousMode = false;

        document.querySelectorAll('#groupChannelMode .settings-item').forEach(el => {
            el.classList.toggle('active', el.dataset.value === '1');
        });
        document.querySelectorAll('#groupMode .settings-item').forEach(el => {
            el.classList.toggle('active', el.dataset.value === 'auto');
        });
        document.querySelectorAll('#groupDisplayMode .settings-item').forEach(el => {
            el.classList.toggle('active', el.dataset.value === 'oscilloscope');
        });
        document.querySelectorAll('#groupSpeed .settings-item').forEach(el => {
            el.classList.toggle('active', el.dataset.value === 'fast');
        });

        document.getElementById('groupSpeed').style.display = 'none';
        document.getElementById('cardChannelB').style.display = 'none'; updateToolbarButtonsVisibility();
    }

    window.addEventListener('DOMContentLoaded', async () => {
        document.getElementById('trigger-fox-icon-container').innerHTML = FOX_AVATAR_SVG;
        document.getElementById('header-fox-icon-container').innerHTML = FOX_AVATAR_SVG;
        document.getElementById('msg-fox-icon-container').innerHTML = FOX_AVATAR_SVG;
        document.getElementById('qrPanel').addEventListener('click', function () { this.style.display = 'none'; });
        document.getElementById('fftModalOverlay').addEventListener('click', closeFFTModal);
        document.getElementById('twoSourceModalOverlay').addEventListener('click', closeTwoSourceModal);
        document.getElementById('mcdModalOverlay').addEventListener('click', closeMcdModal);
        const kinOverlay = document.getElementById('kinematicsModalOverlay');
        if (kinOverlay) kinOverlay.addEventListener('click', closeKinematicsModal);

        restoreAppState();
        resizeCanvas();
        updateUIState();
        drawFrame(true);

        const urlParams = new URLSearchParams(window.location.search);
        const keyParam = urlParams.get('key');
        if (keyParam) {
            localStorage.setItem('fox_license_key', keyParam);
            if (window.history && window.history.replaceState) {
                const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
            }
        }

        let savedKey = localStorage.getItem('fox_license_key');
        let lastVerify = parseInt(localStorage.getItem('fox_last_verify_time') || '0', 10);
        let now = Date.now();

        if (savedKey) {
            if (now - lastVerify < 20000) {
                activateFullMode(savedKey);
            } else {
                verifyKeyWithServer(savedKey, "full", true);
            }
        } else if (keyParam) {
            document.getElementById('licenseModalOverlay').style.display = 'none';
            await verifyKeyWithServer(keyParam, "full");
        } else {
            openLicenseModal();
        }
    });

    setInterval(async () => {
        let activeKey = localStorage.getItem('fox_license_key');
        if (activeKey && !isDemoMode) {
            try {
                const response = await fetch(LICENSE_GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "verifyKey", key: activeKey, deviceId: getDeviceId(), type: "full" }) });
                const result = await response.json();
                if (result.status !== "success") {
                    alert("⚠️ Key bản quyền của bạn đã bị đăng xuất hoặc giải phóng khỏi thiết bị. Ứng dụng sẽ quay lại bản dùng thử!");
                    forceLogout();
                } else {
                    localStorage.setItem('fox_last_verify_time', Date.now().toString());
                }
            } catch (e) { }
        }
    }, 300000); // Tối ưu: Kiểm tra bản quyền định kỳ mỗi 5 phút (300.000 ms) thay vì 45s để tiết kiệm băng thông và hạn mức GAS

    function checkAndShowQR() {
        const qrPanel = document.getElementById('qrPanel'), container = document.getElementById('qrCodeContainer');
        if (!container || !qrPanel) return;
        const isSmartDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 900;
        if (isSmartDevice) { qrPanel.style.display = 'none'; return; }
        qrPanel.style.display = 'flex';
        let currentUrl = window.location.href.split('?')[0];
        let qrUrl = currentUrl; // Bảo mật: Không đính kèm License Key vào URL QR code tránh bị lộ bản quyền
        
        container.innerHTML = '';
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(container, {
                    text: qrUrl,
                    width: 44,
                    height: 44,
                    colorDark: "#0f172a",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" style="width:44px;height:44px;">`;
            }
        } catch(e) {
            container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" style="width:44px;height:44px;">`;
        }
    }
    window.addEventListener('resize', checkAndShowQR);

    let workletRegisteredCtx = new WeakSet();
    async function setupAudioWorklet(ctx) {
        if (!ctx.audioWorklet) return false;
        if (workletRegisteredCtx.has(ctx)) return true;
        const workletCode = `class FoxAudioProcessor extends AudioWorkletProcessor { process(inputs, outputs) { const input = inputs[0]; if (input && input.length > 0 && input[0]) { this.port.postMessage(input[0]); } return true; } } registerProcessor('fox-audio-processor', FoxAudioProcessor);`;
        try {
            const dataUrl = 'data:application/javascript;base64,' + btoa(workletCode);
            await ctx.audioWorklet.addModule(dataUrl);
            workletRegisteredCtx.add(ctx);
            return true;
        } catch (e1) {
            let blobUrl = null;
            try {
                blobUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
                await ctx.audioWorklet.addModule(blobUrl);
                workletRegisteredCtx.add(ctx);
                return true;
            } catch (e2) {
                console.warn('AudioWorklet addModule fallback to ScriptProcessor:', e1, e2);
                return false;
            } finally {
                if (blobUrl) URL.revokeObjectURL(blobUrl);
            }
        }
    }



    function updateSettingsPill(groupItems, targetItem, animated = true) {
        if (!groupItems || !groupItems.querySelector('.settings-item')) return;
        let pill = groupItems.querySelector('.settings-slider-pill');
        if (!pill) { pill = document.createElement('div'); pill.className = 'settings-slider-pill'; groupItems.prepend(pill); }
        if (!targetItem) targetItem = groupItems.querySelector('.settings-item.active');
        if (!targetItem) { pill.style.opacity = '0'; return; }
        const gRect = groupItems.getBoundingClientRect(), iRect = targetItem.getBoundingClientRect();
        if (gRect.width === 0 || iRect.width === 0) return;
        const offsetX = (iRect.left - gRect.left) - (groupItems.clientLeft || 0);
        const offsetY = (iRect.top - gRect.top) - (groupItems.clientTop || 0);
        pill.style.transition = animated ? 'transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), width 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.15s ease' : 'none';
        pill.style.opacity = '1'; pill.style.transform = `translateX(${offsetX}px)`; pill.style.width = `${iRect.width}px`; pill.style.top = `${offsetY}px`; pill.style.height = `${iRect.height}px`;
    }

    document.getElementById('settingsToggle').addEventListener('click', (e) => {
        e.stopPropagation(); if (settingsDropdown.classList.toggle('open')) { requestAnimationFrame(() => settingsMenu.querySelectorAll('.settings-group.expanded .settings-group-items').forEach(g => updateSettingsPill(g, null, false))); }
    });
    document.addEventListener('click', (e) => { if (!settingsDropdown.contains(e.target)) settingsDropdown.classList.remove('open'); });

    settingsMenu.querySelectorAll('.settings-group-header').forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const group = header.parentElement;
            settingsMenu.querySelectorAll('.settings-group').forEach(g => { if (g !== group) g.classList.remove('expanded'); });
            if (header.dataset.group === 'license') {
                group.classList.toggle('expanded');
                return;
            }
            if (group.classList.toggle('expanded')) { requestAnimationFrame(() => updateSettingsPill(group.querySelector('.settings-group-items'), null, false)); }
        });
    });

    settingsMenu.querySelectorAll('.settings-group-items').forEach(groupItems => groupItems.addEventListener('mouseleave', () => updateSettingsPill(groupItems, null, true)));

    settingsMenu.querySelectorAll('.settings-item').forEach(item => {
        if (item.classList.contains('settings-action-btn')) return;
        item.addEventListener('mouseenter', () => updateSettingsPill(item.parentElement, item, true));
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isDemoMode && item.dataset.target === 'speedSelect' && item.dataset.value === 'slow') { alert("Tốc độ quét 'Chậm' chỉ hỗ trợ trên bản Full."); return; }
            const targetSelect = document.getElementById(item.dataset.target);
            item.parentElement.querySelectorAll('.settings-item').forEach(s => s.classList.remove('active'));
            item.classList.add('active');
            targetSelect.value = item.dataset.value; targetSelect.dispatchEvent(new Event('change'));
            updateSettingsPill(item.parentElement, item, true); saveAppState();
        });
    });

    // audioCtx, sampleRate, isPaused, isContinuousMode, stopTimer đã được khai báo an toàn ở đầu tệp
    const channelConfig = {
        A: { stream: null, source: null, splitter: null, channelGain: null, workletNode: null, filterHP: null, filterLP: null, dummy: null, data: null, index: 0, color: '#dc2626', active: false },
        B: { stream: null, source: null, splitter: null, channelGain: null, workletNode: null, filterHP: null, filterLP: null, dummy: null, data: null, index: 0, color: '#2563eb', active: false }
    };
    let lastCorrelateTime = 0, targetFPS = 60, lastDrawTime = performance.now();

    function getActiveChannelMode() { return channelModeSelect.value || '1'; }

    function stopAudioChannel(channelId) {
        const cfg = channelConfig[channelId]; if (!cfg) return;
        if (cfg.stream) { cfg.stream.getTracks().forEach(track => track.stop()); cfg.stream = null; }
        if (cfg.workletNode) { if (cfg.workletNode.port) cfg.workletNode.port.onmessage = null; cfg.workletNode.onaudioprocess = null; try { cfg.workletNode.disconnect(); } catch (e) { } cfg.workletNode = null; }
        if (cfg.channelGain) { try { cfg.channelGain.disconnect(); } catch (e) { } cfg.channelGain = null; }
        if (cfg.splitter) { try { cfg.splitter.disconnect(); } catch (e) { } cfg.splitter = null; }
        if (cfg.source) { try { cfg.source.disconnect(); } catch (e) { } cfg.source = null; }
        if (cfg.filterHP) { try { cfg.filterHP.disconnect(); } catch (e) { } cfg.filterHP = null; }
        if (cfg.filterLP) { try { cfg.filterLP.disconnect(); } catch (e) { } cfg.filterLP = null; }
        if (cfg.dummy) { try { cfg.dummy.disconnect(); } catch (e) { } cfg.dummy = null; }
        cfg.active = false; cfg.index = 0; if (cfg.data) cfg.data.fill(0);
    }

    function updateAnalysisButtonState() {
        const mode = getActiveChannelMode();
        const surveyMode = modeSelect.value;
        const displayMode = getDisplayMode();
        const activeChannels = (channelConfig.A.active ? 1 : 0) + (channelConfig.B.active ? 1 : 0);

        // 1. Dao động ký 1 nguồn + Liên tục: BỎ chức năng FFT
        if (displayMode !== 'dbMeter' && mode === '1' && surveyMode === 'continuous') {
            btnAnalysis.style.display = 'none';
            btnAnalysis.disabled = true;
            return;
        }

        // 2. Dao động ký 2 nguồn + Tự dừng: BỎ phần "Xử lý nguồn âm"
        if (displayMode !== 'dbMeter' && mode === '2' && surveyMode === 'auto') {
            btnAnalysis.style.display = 'none';
            btnAnalysis.disabled = true;
            return;
        }

        btnAnalysis.style.display = 'inline-block';
        if (isDemoMode) {
            btnAnalysis.disabled = true;
            btnAnalysis.textContent = (displayMode === 'dbMeter')
                ? "Phân tích MCĐ (Bản Full)"
                : (mode === '1' ? "Phân tích FFT (Bản Full)" : "Xử lý nguồn âm (Bản Full)");
            btnAnalysis.className = 'btn-slate';
            return;
        }

        if (displayMode === 'dbMeter') {
            let hasHistory = (mode === '2') ? (dbHistoryA.length > 0 || dbHistoryB.length > 0) : (dbHistoryA.length > 0);
            if (isPaused && hasHistory) {
                btnAnalysis.disabled = false;
                btnAnalysis.textContent = "Phân tích MCĐ nguồn âm";
                btnAnalysis.className = 'btn-green';
            } else {
                btnAnalysis.disabled = true;
                btnAnalysis.textContent = "Phân tích MCĐ nguồn âm";
                btnAnalysis.className = 'btn-slate';
            }
        } else if (mode === '2') {
            // Dao động ký 2 nguồn + Không dừng (Liên tục): Giữ nguyên "Xử lý nguồn âm"
            if (activeChannels === 2) {
                btnAnalysis.disabled = false;
                btnAnalysis.textContent = "Xử lý nguồn âm";
                btnAnalysis.className = 'btn-pink';
            } else {
                btnAnalysis.disabled = true;
                btnAnalysis.textContent = "Xử lý nguồn âm";
                btnAnalysis.className = 'btn-slate';
            }
        } else {
            // Dao động ký 1 nguồn + Tự dừng: THÊM chức năng "Phân tích FFT"
            if (channelConfig.A.active && isPaused) {
                btnAnalysis.disabled = false;
                btnAnalysis.textContent = "Phân tích FFT";
                btnAnalysis.className = 'btn-purple';
            } else {
                btnAnalysis.disabled = true;
                btnAnalysis.textContent = "Phân tích FFT";
                btnAnalysis.className = 'btn-slate';
            }
        }
    }

    btnAnalysis.addEventListener('click', () => {
        const displayMode = getDisplayMode();
        const mode = getActiveChannelMode();
        const surveyMode = modeSelect.value;

        if (displayMode === 'dbMeter') {
            if (isDemoMode) {
                alert("⚠️ Chức năng Phân tích Mức cường độ âm bị khóa ở chế độ Dùng thử Demo. Vui lòng nhập Key bản Full!");
                openLicenseModal();
                return;
            }
            openMcdModal();
        } else if (mode === '1') {
            if (surveyMode !== 'auto') return;
            if (isDemoMode) {
                alert("⚠️ Chức năng Phân tích Họa âm FFT chỉ dành cho bản Full.");
                openLicenseModal();
                return;
            }
            openFFTModal();
        } else {
            if (surveyMode !== 'continuous') return;
            if (isDemoMode) {
                alert("⚠️ Chức năng Xử lý 2 Nguồn âm chỉ dành cho bản Full.");
                openLicenseModal();
                return;
            }
            openTwoSourceModal();
        }
    });

    speedSelect.addEventListener('change', (e) => {
        if (!isContinuousMode && modeSelect.value !== 'continuous') {
            speedSelect.value = 'fast';
            targetFPS = 60;
            return;
        }
        targetFPS = (e.target.value === 'slow') ? 15 : 60;
        saveAppState();
    });

    modeSelect.addEventListener('change', (e) => {
        isContinuousMode = (e.target.value === 'continuous');
        clearTimeout(stopTimer);
        const speedGroup = document.getElementById('groupSpeed');
        if (isContinuousMode) {
            if (speedGroup) speedGroup.style.display = 'block';
            targetFPS = (speedSelect.value === 'slow') ? 15 : 60;
            resetManualAnalysisState();
            if (typeof closeKinematicsModal === 'function') closeKinematicsModal();
            if (typeof closeFFTModal === 'function') closeFFTModal();
        } else {
            if (speedGroup) {
                speedGroup.style.display = 'none';
                speedGroup.classList.remove('expanded');
            }
            targetFPS = 60;
            speedSelect.value = 'fast';
            document.querySelectorAll('#groupSpeed .settings-item').forEach(el => {
                el.classList.toggle('active', el.dataset.value === 'fast');
            });
            if (typeof closeTwoSourceModal === 'function' && isTwoSourceModalOpen) {
                closeTwoSourceModal();
            }
            if (!isPaused) triggerAutoStop();
        }
        updateAnalysisButtonState();
        updateManualAnalysisButtonState();
        saveAppState();
    });

    const analysisPointDropdown = document.getElementById('analysisPointDropdown');
    const optPickTwoPoints = document.getElementById('optPickTwoPoints');
    const optKinematicsGraphs = document.getElementById('optKinematicsGraphs');
    let isKinematicsModalOpen = false;
    let showKinematicsResult = false;
    let kinSnapshotData = null;
    let kinDisplayMode = 'uv'; // 'uv': u-t & v-t | 'ua': u-t & a-t | 'all': u-t, v-t & a-t

    function setKinematicsDisplayMode(mode) {
        kinDisplayMode = mode;
        document.querySelectorAll('#kinModeGroup .kin-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.kinMode === mode);
        });
        const showV = (mode === 'uv' || mode === 'all');
        const showA = (mode === 'ua' || mode === 'all');
        const legV = document.getElementById('kinLegV');
        const legA = document.getElementById('kinLegA');
        const cardV = document.getElementById('kinCardV');
        const cardA = document.getElementById('kinCardA');
        if (legV) legV.style.display = showV ? 'inline-flex' : 'none';
        if (legA) legA.style.display = showA ? 'inline-flex' : 'none';
        if (cardV) cardV.style.display = showV ? 'block' : 'none';
        if (cardA) cardA.style.display = showA ? 'block' : 'none';
        drawKinematicsGraphs();
    }

    function updateManualAnalysisButtonState() {
        if (!btnManualAnalysis) return;
        const mode = getActiveChannelMode();
        const isOsc = (getDisplayMode() === 'oscilloscope');
        const isContinuous = isContinuousMode || (modeSelect && modeSelect.value === 'continuous');

        if (!isOsc || isContinuous) {
            btnManualAnalysis.style.display = 'none';
            if (analysisPointDropdown) {
                analysisPointDropdown.style.display = 'none';
                analysisPointDropdown.classList.remove('open');
            }
            if (isManualAnalysisMode || isTwoSourceGraphAnalysisMode) resetManualAnalysisState();
            if (typeof closeKinematicsModal === 'function' && isKinematicsModalOpen) closeKinematicsModal();
            return;
        }

        if (analysisPointDropdown) analysisPointDropdown.style.display = 'inline-flex';
        btnManualAnalysis.style.display = 'inline-block';

        if (isDemoMode) {
            btnManualAnalysis.disabled = true;
            btnManualAnalysis.textContent = "Phân tích đồ thị (Bản Full)";
            btnManualAnalysis.className = "btn-slate";
            if (analysisPointDropdown) analysisPointDropdown.classList.remove('open');
            if (isManualAnalysisMode || isTwoSourceGraphAnalysisMode) resetManualAnalysisState();
            return;
        }

        const samplesNeeded = Math.floor(sampleRate * totalTimeOnScreen);
        const minSamples = Math.max(64, Math.min(samplesNeeded, 512));

        if (mode === '1') {
            if (isTwoSourceGraphAnalysisMode) resetManualAnalysisState();
            if (!isManualAnalysisMode) {
                btnManualAnalysis.textContent = "Phân tích đồ thị ▼";
                btnManualAnalysis.className = "btn-purple";
            }
            const hasEnoughDataA = channelConfig.A.active && channelConfig.A.data && channelConfig.A.index > minSamples;
            if (isPaused && hasEnoughDataA) {
                btnManualAnalysis.disabled = false;
            } else {
                btnManualAnalysis.disabled = true;
                if (analysisPointDropdown) analysisPointDropdown.classList.remove('open');
                if (isManualAnalysisMode) resetManualAnalysisState();
            }
        } else {
            // Dao động ký 2 nguồn + Tự dừng: Phân tích đồ thị tính chu kỳ, tần số và độ lệch pha
            if (isManualAnalysisMode) resetManualAnalysisState();
            if (analysisPointDropdown) analysisPointDropdown.classList.remove('open');
            if (!isTwoSourceGraphAnalysisMode) {
                btnManualAnalysis.textContent = "Phân tích đồ thị";
                btnManualAnalysis.className = "btn-purple";
            }
            const hasEnoughDataA = channelConfig.A.active && channelConfig.A.data && channelConfig.A.index > minSamples;
            const hasEnoughDataB = channelConfig.B.active && channelConfig.B.data && channelConfig.B.index > minSamples;
            if (isPaused && hasEnoughDataA && hasEnoughDataB) {
                btnManualAnalysis.disabled = false;
            } else {
                btnManualAnalysis.disabled = true;
                if (isTwoSourceGraphAnalysisMode) resetManualAnalysisState();
            }
        }
    }

    function resetManualAnalysisState() {
        isManualAnalysisMode = false;
        manualPoints = [];
        isTwoSourceGraphAnalysisMode = false;
        twoSourcePoints = { A: [], B: [] };
        draggingTwoSourcePoint = null;
        if (analysisPointDropdown) analysisPointDropdown.classList.remove('open');
        if (btnManualAnalysis) {
            btnManualAnalysis.textContent = (getActiveChannelMode() === '2') ? "Phân tích đồ thị" : "Phân tích đồ thị ▼";
            btnManualAnalysis.className = "btn-purple";
        }
        closeManualHud();
    }

    function closeManualHud() {
        const hud = document.getElementById('manualAnalysisHud');
        if (hud) hud.style.display = 'none';
    }

    if (btnManualAnalysis && analysisPointDropdown) {
        btnManualAnalysis.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isContinuousMode || (modeSelect && modeSelect.value === 'continuous')) {
                return;
            }
            if (isDemoMode) {
                alert("⚠️ Chức năng Phân tích đồ thị bị khóa ở chế độ Dùng thử Demo. Vui lòng nhập Key bản Full!");
                openLicenseModal();
                return;
            }
            const mode = getActiveChannelMode();
            if (!isPaused || getDisplayMode() !== 'oscilloscope') {
                alert("⚠️ Chức năng Phân tích đồ thị chỉ khả dụng ở chế độ đo Tự dừng, hiển thị Dao động ký và đã bấm Dừng đo!");
                return;
            }

            if (mode === '2') {
                if (!channelConfig.A.active || !channelConfig.B.active) {
                    alert("⚠️ Vui lòng bật cả Kênh A và Kênh B và bấm Đo / Dừng trước khi phân tích!");
                    return;
                }
                if (isTwoSourceGraphAnalysisMode) {
                    resetManualAnalysisState();
                    infoMessageText.innerHTML = "Đã thoát chế độ phân tích đồ thị 2 nguồn.";
                    infoMessageText.style.color = "#0284c7";
                    drawFrame();
                    return;
                }
                startTwoSourceGraphAnalysis();
                return;
            }

            if (!channelConfig.A.active) {
                alert("⚠️ Vui lòng bật Kênh A và bấm Đo / Dừng trước khi phân tích!");
                return;
            }
            if (isManualAnalysisMode) {
                resetManualAnalysisState();
                infoMessageText.innerHTML = "Đã thoát chế độ chọn 2 điểm.";
                infoMessageText.style.color = "#0284c7";
                drawFrame();
                return;
            }
            analysisPointDropdown.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!analysisPointDropdown.contains(e.target)) {
                analysisPointDropdown.classList.remove('open');
            }
        });
    }

    if (optPickTwoPoints) {
        optPickTwoPoints.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isDemoMode) {
                alert("⚠️ Chức năng Chọn 2 điểm đo chỉ dành cho bản Full.");
                openLicenseModal();
                return;
            }
            analysisPointDropdown.classList.remove('open');
            isManualAnalysisMode = true;
            manualPoints = [];
            closeManualHud();
            btnManualAnalysis.textContent = "🎯 Đang chọn điểm (Thoát)";
            btnManualAnalysis.className = "btn-orange";
            infoMessageText.innerHTML = "Chức năng 1 (Chọn 2 điểm): Click/chạm chọn <span class='info-badge'>Điểm 1 (P₁)</span> trên đồ thị sóng Kênh A.";
            infoMessageText.style.color = "#7c3aed";
            drawFrame();
        });
    }

    if (optKinematicsGraphs) {
        optKinematicsGraphs.addEventListener('click', (e) => {
            e.stopPropagation();
            analysisPointDropdown.classList.remove('open');
            openKinematicsModal();
        });
    }

    function formatPhiRadians(phiRad) {
        let p = phiRad;
        while (p > Math.PI) p -= 2 * Math.PI;
        while (p <= -Math.PI) p += 2 * Math.PI;
        if (Math.abs(p) < 0.02) return "";
        const sign = p >= 0 ? " + " : " - ";
        return sign + Math.abs(p).toFixed(2);
    }

    // Định dạng số vật lý chuẩn (chuyển 1.68e+5 -> 1.68×10<sup>5</sup> thay vì ký hiệu lập trình e+)
    function formatPhysicsNumber(val, decimals = 2) {
        const absV = Math.abs(val);
        if (absV === 0) return (0).toFixed(decimals);
        if (absV >= 10000 || absV < 0.01) {
            const exp = Math.floor(Math.log10(absV));
            const mantissa = (val / Math.pow(10, exp)).toFixed(decimals);
            return `${mantissa}×10<sup>${exp}</sup>`;
        }
        if (absV >= 100) return val.toFixed(1);
        return val.toFixed(decimals);
    }

    // Bộ lọc thông thấp pha không (Zero-Phase Multi-Pass Low-Pass Filter)
    // Triệt tiêu nhiễu cao tần & họa âm bậc cao (3f0, 5f0...) trước khi lấy đạo hàm bậc 1, bậc 2 mà không gây lệch pha
    function zeroPhaseSmoothSignal(rawArr, fHz, fs) {
        const N = rawArr.length;
        const clean = new Float32Array(N);
        if (N === 0) return clean;

        // 1. Khử thành phần một chiều (DC offset)
        let mean = 0;
        for (let i = 0; i < N; i++) mean += rawArr[i];
        mean /= N;
        for (let i = 0; i < N; i++) clean[i] = rawArr[i] - mean;

        if (N < 12) return clean;

        // 2. Chọn bán kính cửa sổ thích nghi theo tần số cơ bản f0 (~ T0 / 5.2)
        const periodSamples = fs / Math.max(40, fHz);
        const radius = Math.max(2, Math.min(Math.floor(N / 8), Math.round(periodSamples / 5.2)));
        const winLen = 2 * radius + 1;

        // Lọc trung bình trượt đối xứng 3 lượt (tương đương bộ lọc Gaussian pha không)
        let bufA = new Float32Array(clean);
        let bufB = new Float32Array(N);
        for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < N; i++) {
                let sum = 0;
                let cnt = 0;
                const jStart = i - radius;
                const jEnd = i + radius;
                for (let j = jStart; j <= jEnd; j++) {
                    // Phản xạ đối xứng tại biên để tránh méo/xung biên
                    let idx = j;
                    if (idx < 0) idx = -idx;
                    if (idx >= N) idx = 2 * N - 2 - idx;
                    idx = Math.max(0, Math.min(N - 1, idx));
                    sum += bufA[idx];
                    cnt++;
                }
                bufB[i] = sum / cnt;
            }
            const tmp = bufA;
            bufA = bufB;
            bufB = tmp;
        }

        // 3. Bù suy giảm biên độ đã biết của bộ lọc tại tần số cơ bản f0 để giữ nguyên biên độ thực A
        const theta = Math.PI * winLen * (fHz / fs);
        const sincGain = Math.abs(theta) < 1e-6 ? 1.0 : Math.abs(Math.sin(theta) / theta);
        const passGain = Math.max(0.25, Math.pow(sincGain, 3));
        const invGain = 1.0 / passGain;
        for (let i = 0; i < N; i++) {
            clean[i] = bufA[i] * invGain;
        }
        return clean;
    }

    // Tính đạo hàm bậc 1 bằng sai phân trung tâm bậc 4, triệt tiêu xung nhọn tại 2 biên
    function computeCentralDerivative4th(arr, dt) {
        const N = arr.length;
        const deriv = new Float32Array(N);
        if (N < 5 || dt <= 0) {
            for (let i = 0; i < N; i++) {
                const p = Math.max(0, i - 1);
                const n = Math.min(N - 1, i + 1);
                const h = (n - p) * dt;
                deriv[i] = h > 0 ? (arr[n] - arr[p]) / h : 0;
            }
            return deriv;
        }

        const inv12Dt = 1.0 / (12.0 * dt);
        for (let i = 2; i < N - 2; i++) {
            deriv[i] = (-arr[i + 2] + 8.0 * arr[i + 1] - 8.0 * arr[i - 1] + arr[i - 2]) * inv12Dt;
        }
        // Ngoại suy bậc 2 mượt tại 2 mẫu biên đầu/cuối để không sinh xung nhọn
        deriv[1] = 2.0 * deriv[2] - deriv[3];
        deriv[0] = 2.0 * deriv[1] - deriv[2];
        deriv[N - 2] = 2.0 * deriv[N - 3] - deriv[N - 4];
        deriv[N - 1] = 2.0 * deriv[N - 2] - deriv[N - 3];
        return deriv;
    }

    // Trích xuất pha ban đầu φ0 tại t = 0 bằng phép chiếu cầu phương Fourier (bất biến với suy giảm biên độ)
    function estimateInitialPhaseAtCenter(uArr, omega, dt) {
        const N = uArr.length;
        const midIdx = Math.floor(N / 2);
        const periodSamples = (2 * Math.PI) / Math.max(1e-6, omega * dt);
        const numCycles = Math.max(1, Math.min(4, Math.floor((N * 0.7) / periodSamples)));
        const halfWin = Math.min(midIdx, N - 1 - midIdx, Math.max(4, Math.round(0.5 * numCycles * periodSamples)));

        let re = 0, im = 0;
        for (let i = midIdx - halfWin; i <= midIdx + halfWin; i++) {
            const t = (i - midIdx) * dt;
            const phase = omega * t;
            re += uArr[i] * Math.cos(phase);
            im -= uArr[i] * Math.sin(phase);
        }
        if (Math.hypot(re, im) < 1e-9) return 0;
        return Math.atan2(im, re);
    }

    function openKinematicsModal() {
        if (isContinuousMode || (modeSelect && modeSelect.value === 'continuous')) {
            return;
        }
        if (isDemoMode) {
            alert("⚠️ Chức năng Vẽ các đồ thị liên quan (u-t, v-t, a-t) chỉ dành cho bản Full.");
            openLicenseModal();
            return;
        }
        const winInfo = getVisibleChannelAWindow();
        if (!winInfo || !winInfo.slice || winInfo.slice.length < 8) {
            alert("⚠️ Chưa có đủ dữ liệu sóng Kênh A để vẽ các đồ thị liên quan!");
            return;
        }
        const rawSlice = winInfo.slice;
        const N = rawSlice.length;

        // Xác định tần số f, ω trước để thiết lập tần số cắt bộ lọc thông thấp pha không
        let fHz = computeFrozenAutoFrequency();
        if (!fHz || fHz <= 0) fHz = 440;
        const omega = 2 * Math.PI * fHz;

        // Lọc thông thấp pha không để loại bỏ nhiễu cao tần & họa âm bậc cao trước khi lấy đạo hàm
        const uArr = zeroPhaseSmoothSignal(rawSlice, fHz, sampleRate);

        // Tính đạo hàm bậc 1: v(t) = du/dt và đạo hàm bậc 2: a(t) = d²u/dt² bằng sai phân bậc 4
        const dt = 1.0 / sampleRate;
        const vArr = computeCentralDerivative4th(uArr, dt);
        const aArr = computeCentralDerivative4th(vArr, dt);

        // Tính biên độ cực đại trong vùng lõi (bỏ 3% mép biên để tránh bất kỳ sai số biên nào)
        const margin = Math.min(Math.floor(N * 0.03), Math.max(2, Math.floor(sampleRate / (4 * fHz))));
        const iStart = Math.min(margin, Math.floor(N / 4));
        const iEnd = Math.max(N - margin, Math.ceil((3 * N) / 4));

        let maxU = 0, maxV = 0, maxA = 0;
        for (let i = iStart; i < iEnd; i++) {
            if (Math.abs(uArr[i]) > maxU) maxU = Math.abs(uArr[i]);
            if (Math.abs(vArr[i]) > maxV) maxV = Math.abs(vArr[i]);
            if (Math.abs(aArr[i]) > maxA) maxA = Math.abs(aArr[i]);
        }
        if (maxU < 1e-5) maxU = 0.01;
        if (maxV < 1e-5) maxV = maxU * omega;
        if (maxA < 1e-5) maxA = maxU * omega * omega;

        // Xác định pha ban đầu φ0 của u(t) = A·cos(ωt + φ0) tại mốc t = 0 (tâm khung hình)
        const phi0 = estimateInitialPhaseAtCenter(uArr, omega, dt);

        const vMaxTheo = maxU * omega;
        const aMaxTheo = maxU * omega * omega;

        kinSnapshotData = {
            uArr, vArr, aArr,
            maxU, maxV, maxA,
            fHz, omega, phi0,
            vMaxTheo, aMaxTheo,
            totalTime: totalTimeOnScreen
        };

        // Cập nhật nội dung phương trình cho nút Kết quả (định dạng lũy thừa 10 chuẩn vật lý)
        const phiU = formatPhiRadians(phi0);
        const phiV = formatPhiRadians(phi0 + Math.PI / 2);
        const phiA = formatPhiRadians(phi0 + Math.PI);
        const omegaStr = omega.toFixed(1);

        document.getElementById('kinMetaInfo').innerHTML =
            `Tần số góc <b>ω = 2πf = ${omegaStr} rad/s</b> (f = ${fHz.toFixed(1)} Hz) &nbsp;|&nbsp; Biên độ chuẩn hóa: <b>A = ${maxU.toFixed(2)}</b>`;
        document.getElementById('kinEqU').innerHTML =
            `u(t) = ${formatPhysicsNumber(maxU, 2)}·cos(${omegaStr}·t${phiU})`;
        document.getElementById('kinEqV').innerHTML =
            `v(t) = u'(t) = ${formatPhysicsNumber(vMaxTheo, 2)}·cos(${omegaStr}·t${phiV})`;
        document.getElementById('kinEqA').innerHTML =
            `a(t) = v'(t) = ${formatPhysicsNumber(aMaxTheo, 2)}·cos(${omegaStr}·t${phiA})`;

        isKinematicsModalOpen = true;
        showKinematicsResult = false;
        const hudEl = document.getElementById('kinResultHud');
        if (hudEl) {
            hudEl.style.display = 'none';
            hudEl.style.top = '14px';
            hudEl.style.left = '14px';
        }
        const resBtn = document.getElementById('kinResultBtn');
        if (resBtn) { resBtn.textContent = "📊 Kết quả"; resBtn.className = "btn-blue"; }

        const overlay = document.getElementById('kinematicsModalOverlay');
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.classList.add('animUI-visible');
            setKinematicsDisplayMode('uv');
        }, 20);
    }

    function closeKinematicsModal() {
        isKinematicsModalOpen = false;
        const overlay = document.getElementById('kinematicsModalOverlay');
        if (overlay) {
            overlay.classList.remove('animUI-visible');
            overlay.style.display = 'none';
        }
    }

    function toggleKinematicsResultHud() {
        showKinematicsResult = !showKinematicsResult;
        const hud = document.getElementById('kinResultHud');
        const btn = document.getElementById('kinResultBtn');
        if (hud) hud.style.display = showKinematicsResult ? 'block' : 'none';
        if (btn) {
            btn.textContent = showKinematicsResult ? "📊 Ẩn kết quả" : "📊 Kết quả";
            btn.className = showKinematicsResult ? "btn-orange" : "btn-blue";
        }
    }

    // Cho phép kéo thả bảng Kết quả (kinResultHud) để không che khuất đỉnh sóng khi quan sát
    (function enableKinHudDragging() {
        const hud = document.getElementById('kinResultHud');
        const container = document.getElementById('kinContainer');
        if (!hud || !container) return;
        let isDragging = false, startX = 0, startY = 0, origLeft = 14, origTop = 14;
        hud.style.cursor = 'move';
        hud.addEventListener('pointerdown', (e) => {
            if (e.target && e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            origLeft = hud.offsetLeft;
            origTop = hud.offsetTop;
            if (hud.setPointerCapture) {
                try { hud.setPointerCapture(e.pointerId); } catch (err) {}
            }
        });
        hud.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const maxLeft = Math.max(8, container.clientWidth - hud.offsetWidth - 8);
            const maxTop = Math.max(8, container.clientHeight - hud.offsetHeight - 8);
            const nextLeft = Math.max(8, Math.min(maxLeft, origLeft + (e.clientX - startX)));
            const nextTop = Math.max(8, Math.min(maxTop, origTop + (e.clientY - startY)));
            hud.style.left = nextLeft + 'px';
            hud.style.top = nextTop + 'px';
        });
        const stopDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            if (hud.releasePointerCapture) {
                try { hud.releasePointerCapture(e.pointerId); } catch (err) {}
            }
        };
        hud.addEventListener('pointerup', stopDrag);
        hud.addEventListener('pointercancel', stopDrag);
    })();

    function drawKinematicsGraphs() {
        if (!isKinematicsModalOpen || !kinSnapshotData) return;
        const canv = document.getElementById('kinematicsCanvas');
        const container = document.getElementById('kinContainer');
        if (!canv || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const cw = Math.max(300, container.clientWidth - 12);
        const ch = Math.max(240, container.clientHeight - 12);
        canv.width = Math.round(cw * dpr);
        canv.height = Math.round(ch * dpr);

        const ctx = canv.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, cw, ch);

        // Vẽ hệ lưới tọa độ chuẩn đồng bộ với Dao động ký
        drawMainGrid(ctx, 0, 0, cw, ch, null, null, true);

        const { uArr, vArr, aArr, maxU, maxV, maxA } = kinSnapshotData;
        const N = uArr.length;
        const step = Math.max(1, Math.floor(N / (cw * 2)));
        const scaleFactor = 0.36 * ch; // Tỷ lệ chuẩn hóa biên độ 3 đồ thị nằm gọn trong lưới tọa độ

        function plotNormalizedCurve(arr, maxVal, color, lineWidth, dashPattern = []) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = 'round';
            ctx.setLineDash(dashPattern);
            for (let i = 0; i < N; i += step) {
                const x = (i / (N - 1)) * cw;
                // Giới hạn biên độ hiển thị an toàn trong [-1.08, 1.08] để không tràn vượt khung canvas
                const normVal = Math.max(-1.08, Math.min(1.08, arr[i] / maxVal));
                const y = ch / 2 - normVal * scaleFactor;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        const showV = (kinDisplayMode === 'uv' || kinDisplayMode === 'all');
        const showA = (kinDisplayMode === 'ua' || kinDisplayMode === 'all');

        // 1. Đồ thị u-t (Màu Xanh dương)
        plotNormalizedCurve(uArr, maxU, '#2563eb', 2.8);
        // 2. Đồ thị v-t (Màu Xanh lá)
        if (showV) plotNormalizedCurve(vArr, maxV, '#16a34a', 2.6);
        // 3. Đồ thị a-t (Màu Đỏ)
        if (showA) plotNormalizedCurve(aArr, maxA, '#dc2626', 2.5);

        // Chú thích trực tiếp trên góc phải đồ thị
        let labelY = 12;
        drawLabelWithPill(ctx, 'u(t) — Xanh dương (Li độ)', cw - 12, labelY, 'right', 'top', '#1d4ed8');
        labelY += 22;
        if (showV) {
            drawLabelWithPill(ctx, 'v(t) — Xanh lá (Vận tốc, sớm pha π/2)', cw - 12, labelY, 'right', 'top', '#15803d');
            labelY += 22;
        }
        if (showA) {
            drawLabelWithPill(ctx, 'a(t) — Đỏ (Gia tốc, ngược pha u)', cw - 12, labelY, 'right', 'top', '#dc2626');
        }
    }

    function updateToolbarButtonsVisibility() {
        if (getDisplayMode() === 'dbMeter') {
            if (btnCalib) btnCalib.style.display = 'inline-block';
        } else {
            if (btnCalib) btnCalib.style.display = 'none';
        }
        updateManualAnalysisButtonState();
        if (typeof updateAnalysisButtonState === 'function') updateAnalysisButtonState();
    }

    displayModeSelect.addEventListener('change', () => {
        if (getDisplayMode() !== 'oscilloscope') resetManualAnalysisState();
        updateToolbarButtonsVisibility();
        updateAnalysisButtonState();
        drawFrame();
        saveAppState();
    });

    channelModeSelect.addEventListener('change', () => {
        resetManualAnalysisState();
        if (getActiveChannelMode() === '1') {
            document.getElementById('cardChannelB').style.display = 'none';
            stopAudioChannel('B');
            if (typeof closeTwoSourceModal === 'function' && isTwoSourceModalOpen) {
                closeTwoSourceModal();
            }
        } else {
            document.getElementById('cardChannelB').style.display = 'flex';
            dbHistoryB = [];
            selectedBarIndexB = -1;
            if (typeof closeFFTModal === 'function') closeFFTModal();
            if (typeof closeKinematicsModal === 'function' && isKinematicsModalOpen) closeKinematicsModal();
        }
        updateToolbarButtonsVisibility();
        updateUIState(); drawFrame(); saveAppState();
        if (typeof window.syncChannelModeToReport === 'function') {
            window.syncChannelModeToReport(getActiveChannelMode() === '2');
        }
    });

    btnStartA.addEventListener('click', async () => {
        if (channelConfig.A.active) {
            resetManualAnalysisState();
            stopAudioChannel('A');
            updateUIState();
            drawFrame();
        } else {
            await initAudioChannel('A', micSelectA.value);
        }
    });
    btnStartB.addEventListener('click', async () => { if (channelConfig.B.active) { stopAudioChannel('B'); updateUIState(); drawFrame(); } else { await initAudioChannel('B', micSelectB.value); } });
    micSelectA.addEventListener('change', (e) => { if (channelConfig.A.active) initAudioChannel('A', e.target.value); saveAppState(); });
    micSelectB.addEventListener('change', (e) => { if (channelConfig.B.active) initAudioChannel('B', e.target.value); saveAppState(); });
    micSelectA.addEventListener('focus', () => { isSelectActive = true; });
    micSelectA.addEventListener('blur', () => { setTimeout(() => { isSelectActive = false; }, 300); });
    micSelectB.addEventListener('focus', () => { isSelectActive = true; });
    micSelectB.addEventListener('blur', () => { setTimeout(() => { isSelectActive = false; }, 300); });

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1, cssWidth = canvas.clientWidth, cssHeight = canvas.clientHeight;
        canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr);
        canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (isTwoSourceModalOpen) { const container = document.getElementById('tsContainer'), canv = document.getElementById('twoSourceCanvas'); if (container && canv) { canv.width = container.clientWidth - 12; canv.height = container.clientHeight - 12; if (isTsPaused && typeof calculatePhaseAndDrawLive === 'function') calculatePhaseAndDrawLive(); } }
        if (typeof isKinematicsModalOpen !== 'undefined' && isKinematicsModalOpen) { drawKinematicsGraphs(); }
        const fftOverlayEl = document.getElementById('fftModalOverlay');
        if (fftOverlayEl && fftOverlayEl.style.display === 'flex' && !fftSweepActive) {
            processAndDrawFFT();
        }
        drawFrame();
    }
    window.addEventListener('resize', resizeCanvas);

    function resolveChannelCenterIdx(cfg, channelKey, samplesNeeded) {
        if (!cfg || !cfg.active || !cfg.data || cfg.index <= 2) return 0;
        const computeOffsetForChannel = () => {
            if (isContinuousMode) return Math.floor(samplesNeeded / 2);
            // Ở chế độ 2 nguồn tự dừng: đồng bộ gốc thời gian t = 0 của Kênh B theo Kênh A để bảo toàn độ lệch pha Δφ
            if (channelKey === 'B' && getActiveChannelMode() === '2' && channelConfig.A.active && channelConfig.A.index > samplesNeeded) {
                const centerA = resolveChannelCenterIdx(channelConfig.A, 'A', samplesNeeded);
                return channelConfig.A.index - centerA;
            }
            return findZeroCrossingOffset(cfg, cfg.index, samplesNeeded);
        };

        if (isPaused) {
            const cached = (channelKey === 'A') ? frozenCenterIdxA : frozenCenterIdxB;
            if (cached !== null) return cached;
            const offset = computeOffsetForChannel();
            const centerIdx = cfg.index - offset;
            if (channelKey === 'A') frozenCenterIdxA = centerIdx;
            else if (channelKey === 'B') frozenCenterIdxB = centerIdx;
            return centerIdx;
        } else {
            if (channelKey === 'A') frozenCenterIdxA = null;
            else if (channelKey === 'B') frozenCenterIdxB = null;
            return cfg.index - computeOffsetForChannel();
        }
    }

    function getVisibleChannelWindow(channelKey = 'A') {
        const cfg = channelConfig[channelKey];
        const samplesNeeded = Math.max(2, Math.floor(sampleRate * totalTimeOnScreen));
        if (!cfg || !cfg.active || !cfg.data || cfg.index <= 2) return null;
        const halfSamples = Math.floor(samplesNeeded / 2);
        const centerIdx = resolveChannelCenterIdx(cfg, channelKey, samplesNeeded);
        const offset = cfg.index - centerIdx;
        const startIdx = centerIdx - halfSamples;
        const len = cfg.data.length;
        const slice = new Float32Array(samplesNeeded);
        for (let i = 0; i < samplesNeeded; i++) {
            slice[i] = cfg.data[((startIdx + i) % len + len) % len];
        }
        return { slice, startIdx, centerIdx, halfSamples, offset, samplesNeeded };
    }

    function getVisibleChannelAWindow() {
        return getVisibleChannelWindow('A');
    }

    function computeFrozenChannelFrequency(channelKey = 'A') {
        const cfg = channelConfig[channelKey];
        if (!cfg || !cfg.active || !cfg.data) {
            return (channelKey === 'A') ? (lockedFrequency || detectedFrequency || 0) : 0;
        }
        const len = cfg.data.length;
        const cIdx = cfg.index;
        const winSize = Math.min(4096, cIdx);
        if (winSize >= 1024) {
            const buf = new Float32Array(winSize);
            for (let i = 0; i < winSize; i++) {
                buf[i] = cfg.data[((cIdx - winSize + i) % len + len) % len];
            }
            const f = autoCorrelate(buf, sampleRate);
            if (f > 0) return f;
        }
        if (channelKey === 'A') {
            return (detectedFrequency > 0) ? detectedFrequency : (lockedFrequency > 0 ? lockedFrequency : 0);
        }
        return 0;
    }

    function computeFrozenAutoFrequency() {
        if (channelConfig.A && channelConfig.A.active) {
            return computeFrozenChannelFrequency('A');
        }
        if (channelConfig.B && channelConfig.B.active) {
            return computeFrozenChannelFrequency('B');
        }
        return 0;
    }

    function snapToWaveFeature(winInfo, clickX, clickY, width, height) {
        const data = winInfo.slice;
        const N = winInfo.samplesNeeded;
        const rawExactIdx = Math.max(0, Math.min(N - 1, (clickX / width) * N));

        // Bán kính bắt dính thông minh khoảng 14px trên màn hình để dễ chọn chuẩn đỉnh/đáy/nút sóng
        const snapRadiusSamples = Math.max(2, Math.round((14 / Math.max(1, width)) * N));
        const searchStart = Math.max(1, Math.floor(rawExactIdx) - snapRadiusSamples);
        const searchEnd = Math.min(N - 2, Math.ceil(rawExactIdx) + snapRadiusSamples);

        let bestIdx = rawExactIdx;
        let bestScore = Infinity;

        for (let i = searchStart; i <= searchEnd; i++) {
            const prev = data[i - 1];
            const curr = data[i];
            const next = data[i + 1];

            // 1. Kiểm tra cực đại / cực tiểu cục bộ (đỉnh sóng / đáy sóng)
            const isPeak = (curr >= prev && curr >= next && (curr > prev || curr > next));
            const isTrough = (curr <= prev && curr <= next && (curr < prev || curr < next));
            if (isPeak || isTrough) {
                let exactExtIdx = i;
                const denom = (prev - 2 * curr + next);
                if (Math.abs(denom) > 1e-9) {
                    const delta = 0.5 * (prev - next) / denom;
                    if (Math.abs(delta) <= 1.0) exactExtIdx = i + delta;
                }
                const pxDist = Math.abs((exactExtIdx - rawExactIdx) / N) * width;
                if (pxDist <= 14 && pxDist * 0.65 < bestScore) {
                    bestScore = pxDist * 0.65;
                    bestIdx = exactExtIdx;
                }
            }

            // 2. Kiểm tra điểm qua vị trí cân bằng u = 0 (nút sóng)
            if ((curr <= 0 && next > 0) || (curr >= 0 && next < 0)) {
                const fracZero = Math.abs(curr) / (Math.abs(curr) + Math.abs(next));
                const exactZeroIdx = i + fracZero;
                const pxDist = Math.abs((exactZeroIdx - rawExactIdx) / N) * width;
                if (pxDist <= 12 && pxDist * 0.75 < bestScore) {
                    bestScore = pxDist * 0.75;
                    bestIdx = exactZeroIdx;
                }
            }
        }

        const clampedIdx = Math.max(0, Math.min(N - 1, bestIdx));
        const i0 = Math.max(0, Math.min(N - 2, Math.floor(clampedIdx)));
        const frac = Math.max(0, Math.min(1, clampedIdx - i0));
        const exactY = data[i0] + frac * (data[i0 + 1] - data[i0]);

        return {
            absIdx: winInfo.startIdx + clampedIdx,
            y: exactY
        };
    }

    function calculateFromGraphClicks(p1, p2, winInfo, channelKey = 'A') {
        const dataArray = winInfo.slice;
        const N = dataArray.length;
        if (N < 4) return null;

        let idx1 = Math.max(0, Math.min(N - 1, p1.absIdx - winInfo.startIdx));
        let idx2 = Math.max(0, Math.min(N - 1, p2.absIdx - winInfo.startIdx));
        if (idx1 > idx2) {
            const tmp = idx1; idx1 = idx2; idx2 = tmp;
        }
        const dtSeconds = (idx2 - idx1) / sampleRate;
        if (dtSeconds <= 1e-6) return null;

        // 1. Xác định chu kỳ chuẩn T_ref của sóng tại vùng [idx1, idx2] theo đúng kênh (A hoặc B)
        // Giúp loại bỏ hoàn toàn lỗi nhảy ±1 chu kỳ do sóng tắt dần hoặc biến dạng nhẹ
        let T_ref = 0;
        const autoFreq = computeFrozenChannelFrequency(channelKey);
        if (autoFreq > 0) T_ref = 1.0 / autoFreq;

        const padSamples = Math.max(128, Math.floor(sampleRate * 0.015));
        const subStart = Math.max(0, Math.floor(idx1) - padSamples);
        const subEnd = Math.min(N, Math.ceil(idx2) + padSamples);
        if (subEnd - subStart >= 256) {
            const localF = autoCorrelate(dataArray.subarray(subStart, subEnd), sampleRate);
            if (localF > 0) T_ref = 1.0 / localF;
        }

        // 2. Tính pha liên tục (Phase Unwrapping) dọc theo từng mẫu từ idx1 đến idx2
        // Giúp Δφ tăng/giảm trơn tru liên tục khi di chuyển P2, không bao giờ nhảy bước 2π!
        const halfWin = T_ref > 0 ? Math.max(4, Math.min(Math.floor(N / 4), Math.round(0.65 * T_ref * sampleRate))) : Math.max(8, Math.floor(sampleRate / 200));

        function getLocalEnvelope(centerIdx) {
            const c = Math.round(centerIdx);
            const s = Math.max(0, c - halfWin);
            const e = Math.min(N - 1, c + halfWin);
            let maxV = 0;
            for (let k = s; k <= e; k++) {
                const av = Math.abs(dataArray[k]);
                if (av > maxV) maxV = av;
            }
            return Math.max(maxV, 1e-4);
        }

        // Đạo hàm chuẩn hóa theo tần số góc ω để biên độ của u(t) và -u'(t)/ω bằng nhau
        const omegaRef = T_ref > 0 ? (2 * Math.PI / T_ref) : (2 * Math.PI * 440);
        const dtSample = 1.0 / sampleRate;

        function getWrappedPhaseAt(sampleFloatIdx) {
            const clamped = Math.max(0, Math.min(N - 1, sampleFloatIdx));
            const i0 = Math.max(0, Math.min(N - 2, Math.floor(clamped)));
            const frac = clamped - i0;

            const env = getLocalEnvelope(clamped);
            const u = (dataArray[i0] + frac * (dataArray[i0 + 1] - dataArray[i0])) / env;

            // Đạo hàm trung tâm mượt tại i0 và i0+1
            const p0 = Math.max(0, i0 - 1), n0 = Math.min(N - 1, i0 + 1);
            const d0 = (dataArray[n0] - dataArray[p0]) / ((n0 - p0) * dtSample);
            const p1i = Math.max(0, i0), n1i = Math.min(N - 1, i0 + 2);
            const d1 = (dataArray[n1i] - dataArray[p1i]) / ((n1i - p1i) * dtSample);

            const dudt = d0 + frac * (d1 - d0);
            const vNorm = -dudt / (omegaRef * env);

            // Pha tức thời φ ∈ (-π, π] với u = cos(φ), vNorm = -u'/ω = sin(φ)
            return Math.atan2(vNorm, u);
        }

        const iStart = Math.ceil(idx1);
        const iEnd = Math.floor(idx2);
        let unwrappedPhi = 0;

        if (iStart <= iEnd) {
            let prevPhi = getWrappedPhaseAt(idx1);
            const firstPhi = getWrappedPhaseAt(iStart);
            let dFirst = firstPhi - prevPhi;
            while (dFirst <= -Math.PI) dFirst += 2 * Math.PI;
            while (dFirst > Math.PI) dFirst -= 2 * Math.PI;
            unwrappedPhi += dFirst;
            prevPhi = firstPhi;

            for (let i = iStart + 1; i <= iEnd; i++) {
                const curPhi = getWrappedPhaseAt(i);
                let dPhi = curPhi - prevPhi;
                while (dPhi <= -Math.PI) dPhi += 2 * Math.PI;
                while (dPhi > Math.PI) dPhi -= 2 * Math.PI;
                unwrappedPhi += dPhi;
                prevPhi = curPhi;
            }

            const endPhi = getWrappedPhaseAt(idx2);
            let dLast = endPhi - prevPhi;
            while (dLast <= -Math.PI) dLast += 2 * Math.PI;
            while (dLast > Math.PI) dLast -= 2 * Math.PI;
            unwrappedPhi += dLast;
        } else {
            const pStart = getWrappedPhaseAt(idx1);
            const pEnd = getWrappedPhaseAt(idx2);
            let dSingle = pEnd - pStart;
            while (dSingle <= -Math.PI) dSingle += 2 * Math.PI;
            while (dSingle > Math.PI) dSingle -= 2 * Math.PI;
            unwrappedPhi = dSingle;
        }

        // Hiệu chỉnh chống lệch pha khi T_ref ước lượng lệch nhẹ so với tần số thực
        let totalDeltaPhi = Math.abs(unwrappedPhi);
        if (T_ref > 0) {
            const expectedCycles = dtSeconds / T_ref;
            const measuredCycles = totalDeltaPhi / (2 * Math.PI);
            const cycleDiff = Math.round(expectedCycles - measuredCycles);
            if (Math.abs(cycleDiff) >= 1) {
                totalDeltaPhi += cycleDiff * 2 * Math.PI;
            }
        }

        if (totalDeltaPhi <= 1e-4) return null;

        const T_seconds = (2 * Math.PI * dtSeconds) / totalDeltaPhi;
        const f_Hz = 1.0 / T_seconds;
        const T_ms = T_seconds * 1000.0;
        const dt_ms = dtSeconds * 1000.0;
        const k = Math.floor(totalDeltaPhi / (2 * Math.PI));

        return {
            T_ms,
            f_Hz,
            dt_ms,
            deltaPhiRad: totalDeltaPhi,
            deltaPhiDeg: (totalDeltaPhi * 180.0) / Math.PI,
            kCycles: k
        };
    }

    function drawManualAnalysisOverlay(ctx, width, height) {
        if (!isManualAnalysisMode || getDisplayMode() !== 'oscilloscope' || getActiveChannelMode() !== '1') return;
        const winInfo = getVisibleChannelAWindow();
        if (!winInfo || manualPoints.length === 0) return;

        // Sử dụng đúng N = winInfo.samplesNeeded khớp 100% với drawWaveform
        const N = winInfo.samplesNeeded;
        const halfN = (typeof winInfo.halfSamples === 'number') ? winInfo.halfSamples : Math.floor(N / 2);
        const coords = manualPoints.map((pt, index) => {
            const localIdx = pt.absIdx - winInfo.startIdx;
            const x = (width / 2) + ((localIdx - halfN) / N) * width;
            const y = Math.max(0, Math.min(height, height / 2 - (pt.y * currentZoomY * height / 2)));
            return { x, y, label: index === 0 ? 'P₁' : 'P₂', color: index === 0 ? '#f59e0b' : '#10b981' };
        });

        ctx.save();
        // Nếu có đủ 2 điểm, tô vùng chênh lệch thời gian Δt giữa P1 và P2
        if (coords.length === 2) {
            const xLeft = Math.min(coords[0].x, coords[1].x);
            const xRight = Math.max(coords[0].x, coords[1].x);
            ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
            ctx.fillRect(xLeft, 0, xRight - xLeft, height);

            // Mũi tên Δt ngang
            const arrowY = Math.max(36, Math.min(height - 36, Math.min(coords[0].y, coords[1].y) - 24));
            ctx.strokeStyle = '#7c3aed';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(xLeft, arrowY);
            ctx.lineTo(xRight, arrowY);
            ctx.stroke();
            drawLabelWithPill(ctx, 'Δt', (xLeft + xRight) / 2, arrowY - 16, 'center', 'top', '#6d28d9');
        }

        coords.forEach(c => {
            // Đường gióng dọc đứt nét
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(c.x, 0);
            ctx.lineTo(c.x, height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Điểm tròn đánh dấu nằm chính xác trên đường sóng
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Nhãn P1 / P2
            drawLabelWithPill(ctx, c.label, c.x, Math.max(8, c.y - 22), 'center', 'top', c.color === '#f59e0b' ? '#b45309' : '#047857');
        });
        ctx.restore();
    }

    function updateTwoPointResultDisplay(winInfo) {
        if (manualPoints.length < 2) return;
        const res = calculateFromGraphClicks(manualPoints[0], manualPoints[1], winInfo);
        drawFrame();

        if (!res) {
            infoMessageText.innerHTML = "⚠️ Hai điểm quá gần nhau hoặc biên độ sóng quá nhỏ. Hãy chọn 2 điểm cách xa nhau hơn!";
            infoMessageText.style.color = "#dc2626";
            return;
        }

        const autoFreq = computeFrozenAutoFrequency();
        const autoT_ms = autoFreq > 0 ? (1000.0 / autoFreq) : 0;
        const relErrorPct = (autoFreq > 0) ? (Math.abs(res.f_Hz - autoFreq) / autoFreq) * 100.0 : null;

        let summaryHtml = `Đo 2 điểm: <span class="info-badge">Δt = ${res.dt_ms.toFixed(2)} ms</span> | ` +
            `<span class="info-badge">T = ${res.T_ms.toFixed(2)} ms</span> | ` +
            `<span class="info-badge">f = ${res.f_Hz.toFixed(1)} Hz</span> | ` +
            `<span class="info-badge">Δφ = ${res.deltaPhiDeg.toFixed(1)}°</span>`;
        if (autoFreq > 0) {
            summaryHtml += ` &nbsp;⇔&nbsp; Tự động: <span class="channel-tag-a">f<sub>auto</sub> = ${autoFreq.toFixed(1)} Hz</span> (Sai lệch: <b>${relErrorPct.toFixed(2)}%</b>)`;
        }
        infoMessageText.innerHTML = summaryHtml;
        infoMessageText.style.color = "#0f172a";

        const hud = document.getElementById('manualAnalysisHud');
        const hudBody = document.getElementById('manualAnalysisHudBody');
        if (hud && hudBody) {
            const hudTitle = hud.querySelector('.ma-header span');
            if (hudTitle) hudTitle.textContent = "📐 KẾT QUẢ PHÂN TÍCH 2 ĐIỂM & ĐỐI CHIẾU TỰ ĐỘNG";
            hudBody.innerHTML = `
                <div class="ma-grid">
                    <div>• Khoảng thời gian Δt: <span class="ma-val-manual">${res.dt_ms.toFixed(2)} ms</span></div>
                    <div>• Độ lệch pha Δφ: <span class="ma-val-manual">${res.deltaPhiRad.toFixed(2)} rad (${res.deltaPhiDeg.toFixed(1)}°)</span></div>
                    <div>• Chu kỳ đo 2 điểm (T): <span class="ma-val-manual">${res.T_ms.toFixed(2)} ms</span></div>
                    <div>• Tần số đo 2 điểm (f): <span class="ma-val-manual">${res.f_Hz.toFixed(2)} Hz</span></div>
                    <div>• Chu kỳ tự động (T<sub>auto</sub>): <span class="ma-val-auto">${autoFreq > 0 ? autoT_ms.toFixed(2) + ' ms' : '--'}</span></div>
                    <div>• Tần số tự động (f<sub>auto</sub>): <span class="ma-val-auto">${autoFreq > 0 ? autoFreq.toFixed(2) + ' Hz' : '--'}</span></div>
                </div>
                <div style="margin-top:6px; padding-top:5px; border-top:1px dashed rgba(255,255,255,0.18); font-size:11.5px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <span>Công thức: <i>T = 2π·Δt / Δφ</i> &nbsp;|&nbsp; <i>f = 1 / T</i></span>
                    <span>Sai số tương đối δ: <span class="ma-val-err">${relErrorPct !== null ? relErrorPct.toFixed(2) + '%' : 'Chưa xác định'}</span></span>
                    <button type="button" onclick="syncFeatureToReport('osc')" style="background:#059669; color:#ffffff; border:none; border-radius:4px; padding:3px 9px; font-size:11px; font-weight:700; cursor:pointer;" title="Đồng bộ kết quả phân tích đồ thị này sang Phần I báo cáo">🔄 Đồng bộ báo cáo</button>
                </div>
            `;
            hud.style.display = 'block';
        }
    }

    function findDefaultTwoPointsForChannel(winInfo, channelKey = 'A') {
        if (!winInfo || !winInfo.slice || winInfo.slice.length < 8) return [];
        const data = winInfo.slice;
        const N = winInfo.samplesNeeded;
        const mid = Math.floor(N / 2);

        let maxAbs = 0;
        for (let i = 0; i < N; i++) {
            const av = Math.abs(data[i]);
            if (av > maxAbs) maxAbs = av;
        }
        const minPeakVal = Math.max(1e-5, maxAbs * 0.2);

        const peaks = [];
        for (let i = 1; i < N - 1; i++) {
            if (data[i] >= data[i - 1] && data[i] >= data[i + 1] && data[i] >= minPeakVal) {
                const denom = data[i - 1] - 2 * data[i] + data[i + 1];
                let exactIdx = i;
                if (Math.abs(denom) > 1e-9) {
                    const delta = 0.5 * (data[i - 1] - data[i + 1]) / denom;
                    if (Math.abs(delta) <= 1.0) exactIdx = i + delta;
                }
                const i0 = Math.max(0, Math.min(N - 2, Math.floor(exactIdx)));
                const frac = Math.max(0, Math.min(1, exactIdx - i0));
                peaks.push({
                    localIdx: exactIdx,
                    absIdx: winInfo.startIdx + exactIdx,
                    y: data[i0] + frac * (data[i0 + 1] - data[i0])
                });
            }
        }

        let estFreq = computeFrozenChannelFrequency(channelKey);
        if (!(estFreq > 0)) {
            estFreq = autoCorrelate(data, sampleRate);
        }
        const expectedPeriodSamples = (estFreq > 0) ? (sampleRate / estFreq) : Math.max(8, N / 5);

        if (peaks.length >= 2) {
            let bestPair = null;
            let bestScore = Infinity;
            for (let i = 0; i < peaks.length - 1; i++) {
                for (let j = i + 1; j < peaks.length; j++) {
                    const span = peaks[j].localIdx - peaks[i].localIdx;
                    if (span < Math.max(4, expectedPeriodSamples * 0.45)) continue;
                    const pairMid = 0.5 * (peaks[i].localIdx + peaks[j].localIdx);
                    const periodErr = Math.abs(span - expectedPeriodSamples);
                    const centerDist = Math.abs(pairMid - mid);
                    const score = periodErr * 2.5 + centerDist;
                    if (score < bestScore) {
                        bestScore = score;
                        bestPair = [
                            { absIdx: peaks[i].absIdx, y: peaks[i].y },
                            { absIdx: peaks[j].absIdx, y: peaks[j].y }
                        ];
                    }
                }
            }
            if (bestPair) return bestPair;
            return [
                { absIdx: peaks[0].absIdx, y: peaks[0].y },
                { absIdx: peaks[peaks.length - 1].absIdx, y: peaks[peaks.length - 1].y }
            ];
        }

        const idx1 = Math.max(1, Math.min(N - 2, Math.round(mid - expectedPeriodSamples / 2)));
        const idx2 = Math.max(idx1 + 2, Math.min(N - 1, Math.round(mid + expectedPeriodSamples / 2)));
        return [
            { absIdx: winInfo.startIdx + idx1, y: data[idx1] },
            { absIdx: winInfo.startIdx + idx2, y: data[idx2] }
        ];
    }

    function startTwoSourceGraphAnalysis(resetPoints = true) {
        const winA = getVisibleChannelWindow('A');
        const winB = getVisibleChannelWindow('B');
        if (!winA || !winB) {
            alert("⚠️ Chưa đủ dữ liệu sóng ở Kênh A và Kênh B để phân tích!");
            return;
        }
        isTwoSourceGraphAnalysisMode = true;
        isManualAnalysisMode = false;
        manualPoints = [];
        draggingTwoSourcePoint = null;
        btnManualAnalysis.textContent = "📐 Đang phân tích 4 điểm (Thoát)";
        btnManualAnalysis.className = "btn-orange";

        if (resetPoints || !Array.isArray(twoSourcePoints.A) || twoSourcePoints.A.length < 2) {
            twoSourcePoints.A = findDefaultTwoPointsForChannel(winA, 'A');
        }
        if (resetPoints || !Array.isArray(twoSourcePoints.B) || twoSourcePoints.B.length < 2) {
            twoSourcePoints.B = findDefaultTwoPointsForChannel(winB, 'B');
        }
        updateTwoSourceGraphAnalysisDisplay(winA, winB);
    }

    function updateTwoSourceGraphAnalysisDisplay(winA, winB, statusPrompt = null) {
        const autoFA = computeFrozenChannelFrequency('A');
        const autoFB = computeFrozenChannelFrequency('B');
        const autoTA_ms = autoFA > 0 ? (1000.0 / autoFA) : 0;
        const autoTB_ms = autoFB > 0 ? (1000.0 / autoFB) : 0;

        const resA = (Array.isArray(twoSourcePoints.A) && twoSourcePoints.A.length === 2)
            ? calculateFromGraphClicks(twoSourcePoints.A[0], twoSourcePoints.A[1], winA, 'A')
            : null;
        const resB = (Array.isArray(twoSourcePoints.B) && twoSourcePoints.B.length === 2)
            ? calculateFromGraphClicks(twoSourcePoints.B[0], twoSourcePoints.B[1], winB, 'B')
            : null;

        const dispFA = resA ? resA.f_Hz : autoFA;
        const dispFB = resB ? resB.f_Hz : autoFB;
        const dispTA_ms = resA ? resA.T_ms : autoTA_ms;
        const dispTB_ms = resB ? resB.T_ms : autoTB_ms;

        const avgFreq = (autoFA > 0 && autoFB > 0)
            ? ((autoFA + autoFB) / 2)
            : (autoFA > 0 ? autoFA : (autoFB > 0 ? autoFB : ((dispFA > 0 && dispFB > 0) ? (dispFA + dispFB) / 2 : (dispFA || dispFB))));

        const autoPhaseRad = (avgFreq > 0 && channelConfig.A.data && channelConfig.B.data)
            ? calculatePhaseDifference(channelConfig.A.data, channelConfig.B.data, avgFreq, sampleRate, channelConfig.A.index, channelConfig.B.index)
            : 0;
        const autoPhaseDeg = (autoPhaseRad * 180.0) / Math.PI;

        let phaseStateText = "Chưa xác định";
        if (dispFA > 10 && dispFB > 10 && Math.abs(dispFA - dispFB) > 3.0) {
            phaseStateText = `Khác tần số (Sóng phách f_phách = ${Math.abs(dispFA - dispFB).toFixed(1)} Hz)`;
        } else if (avgFreq > 0) {
            const absPhi = Math.abs(autoPhaseRad);
            if (absPhi <= 0.15) phaseStateText = "Hai nguồn cùng pha (Δφ ≈ 0)";
            else if (Math.abs(absPhi - Math.PI) <= 0.15) phaseStateText = "Hai nguồn ngược pha (Δφ ≈ ±π)";
            else if (Math.abs(absPhi - Math.PI / 2) <= 0.15) phaseStateText = "Hai nguồn vuông pha (Δφ ≈ ±π/2)";
            else phaseStateText = autoPhaseRad > 0 ? "Nguồn B sớm pha hơn nguồn A" : "Nguồn B trễ pha hơn nguồn A";
        }

        drawFrame();

        if (statusPrompt) {
            infoMessageText.innerHTML = statusPrompt;
            infoMessageText.style.color = "#7c3aed";
        } else {
            infoMessageText.innerHTML =
                `4 điểm (2 điểm/đồ thị): ` +
                `<span class="channel-tag-a">Kênh A: T<sub>A</sub>=${dispTA_ms > 0 ? dispTA_ms.toFixed(2) + ' ms' : '--'} (${dispFA > 0 ? dispFA.toFixed(1) + ' Hz' : '--'})</span> | ` +
                `<span class="channel-tag-b">Kênh B: T<sub>B</sub>=${dispTB_ms > 0 ? dispTB_ms.toFixed(2) + ' ms' : '--'} (${dispFB > 0 ? dispFB.toFixed(1) + ' Hz' : '--'})</span> | ` +
                `<span class="info-badge">Δφ = ${autoPhaseRad.toFixed(2)} rad (${autoPhaseDeg.toFixed(1)}°)</span>`;
            infoMessageText.style.color = "#0f172a";
        }

        const hud = document.getElementById('manualAnalysisHud');
        const hudBody = document.getElementById('manualAnalysisHudBody');
        if (hud && hudBody) {
            const hudTitle = hud.querySelector('.ma-header span');
            if (hudTitle) hudTitle.textContent = "📐 KẾT QUẢ PHÂN TÍCH 4 ĐIỂM (2 ĐIỂM / ĐỒ THỊ)";
            hudBody.innerHTML = `
                <div class="ma-grid">
                    <div>• Đồ thị 1 (P<sub>A1</sub>, P<sub>A2</sub>): Δt<sub>A</sub> = <span class="ma-val-manual">${resA ? resA.dt_ms.toFixed(2) + ' ms' : '--'}</span></div>
                    <div>• Chu kỳ Đồ thị 1 (T<sub>A</sub>): <span class="ma-val-manual">${dispTA_ms > 0 ? dispTA_ms.toFixed(2) + ' ms' : '--'}</span> <span style="color:#94a3b8;">(f<sub>A</sub> = ${dispFA > 0 ? dispFA.toFixed(1) + ' Hz' : '--'})</span></div>
                    <div>• Đồ thị 2 (P<sub>B1</sub>, P<sub>B2</sub>): Δt<sub>B</sub> = <span class="ma-val-auto">${resB ? resB.dt_ms.toFixed(2) + ' ms' : '--'}</span></div>
                    <div>• Chu kỳ Đồ thị 2 (T<sub>B</sub>): <span class="ma-val-auto">${dispTB_ms > 0 ? dispTB_ms.toFixed(2) + ' ms' : '--'}</span> <span style="color:#94a3b8;">(f<sub>B</sub> = ${dispFB > 0 ? dispFB.toFixed(1) + ' Hz' : '--'})</span></div>
                    <div>• Độ lệch pha 2 nguồn (Δφ): <span class="ma-val-manual">${autoPhaseRad.toFixed(2)} rad (${autoPhaseDeg.toFixed(1)}°)</span></div>
                    <div>• Chu kỳ tự động (T<sub>A0</sub> / T<sub>B0</sub>): <span style="color:#cbd5e1; font-weight:600;">${autoTA_ms > 0 ? autoTA_ms.toFixed(2) : '--'} / ${autoTB_ms > 0 ? autoTB_ms.toFixed(2) : '--'} ms</span></div>
                </div>
                <div style="margin-top:6px; padding-top:5px; border-top:1px dashed rgba(255,255,255,0.18); font-size:11.5px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <span>Trạng thái: <b style="color:#38bdf8;">${phaseStateText}</b></span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button type="button" onclick="startTwoSourceGraphAnalysis(true)" style="background:#334155; color:#f8fafc; border:1px solid #475569; border-radius:4px; padding:2px 8px; font-size:11px; cursor:pointer;">🔄 Đặt lại 4 mốc</button>
                        <button type="button" onclick="syncFeatureToReport('twoSource')" style="background:#059669; color:#ffffff; border:none; border-radius:4px; padding:3px 9px; font-size:11px; font-weight:700; cursor:pointer;" title="Đồng bộ kết quả 2 nguồn sang báo cáo">🔄 Đồng bộ báo cáo</button>
                    </div>
                </div>
            `;
            hud.style.display = 'block';
        }
    }

    function drawTwoSourceAnalysisOverlay(ctx, width, height) {
        if (!isTwoSourceGraphAnalysisMode || getDisplayMode() !== 'oscilloscope' || getActiveChannelMode() !== '2') return;
        const winA = getVisibleChannelWindow('A');
        const winB = getVisibleChannelWindow('B');
        if (!winA || !winB) return;

        const subH = height / 2;
        const halfA = (typeof winA.halfSamples === 'number') ? winA.halfSamples : Math.floor(winA.samplesNeeded / 2);
        const halfB = (typeof winB.halfSamples === 'number') ? winB.halfSamples : Math.floor(winB.samplesNeeded / 2);

        const ptsA = Array.isArray(twoSourcePoints.A) ? twoSourcePoints.A : [];
        const ptsB = Array.isArray(twoSourcePoints.B) ? twoSourcePoints.B : [];

        const coordsA = ptsA.map((pt, idx) => ({
            x: (width / 2) + (((pt.absIdx - winA.startIdx) - halfA) / winA.samplesNeeded) * width,
            y: Math.max(4, Math.min(subH - 4, subH / 2 - (pt.y * currentZoomY * subH / 2))),
            label: idx === 0 ? 'P_A1' : 'P_A2',
            color: idx === 0 ? '#f59e0b' : '#ea580c',
            textCol: idx === 0 ? '#b45309' : '#9a3412'
        }));

        const coordsB = ptsB.map((pt, idx) => ({
            x: (width / 2) + (((pt.absIdx - winB.startIdx) - halfB) / winB.samplesNeeded) * width,
            y: Math.max(subH + 4, Math.min(height - 4, subH + subH / 2 - (pt.y * currentZoomY * subH / 2))),
            label: idx === 0 ? 'P_B1' : 'P_B2',
            color: idx === 0 ? '#10b981' : '#0284c7',
            textCol: idx === 0 ? '#047857' : '#0369a1'
        }));

        ctx.save();

        // Tô vùng Δt_A ngay trong khung Đồ thị 1 (Kênh A)
        if (coordsA.length === 2) {
            const xLeftA = Math.min(coordsA[0].x, coordsA[1].x);
            const xRightA = Math.max(coordsA[0].x, coordsA[1].x);
            if (xRightA - xLeftA > 2) {
                ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
                ctx.fillRect(xLeftA, 0, xRightA - xLeftA, subH);
                const arrowYA = Math.max(24, Math.min(subH - 22, Math.min(coordsA[0].y, coordsA[1].y) - 22));
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(xLeftA, arrowYA);
                ctx.lineTo(xRightA, arrowYA);
                ctx.stroke();
                drawLabelWithPill(ctx, 'Δt_A', (xLeftA + xRightA) / 2, arrowYA - 16, 'center', 'top', '#b45309');
            }
        }

        // Tô vùng Δt_B ngay trong khung Đồ thị 2 (Kênh B)
        if (coordsB.length === 2) {
            const xLeftB = Math.min(coordsB[0].x, coordsB[1].x);
            const xRightB = Math.max(coordsB[0].x, coordsB[1].x);
            if (xRightB - xLeftB > 2) {
                ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
                ctx.fillRect(xLeftB, subH, xRightB - xLeftB, subH);
                const arrowYB = Math.max(subH + 24, Math.min(height - 22, Math.min(coordsB[0].y, coordsB[1].y) - 22));
                ctx.strokeStyle = '#059669';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(xLeftB, arrowYB);
                ctx.lineTo(xRightB, arrowYB);
                ctx.stroke();
                drawLabelWithPill(ctx, 'Δt_B', (xLeftB + xRightB) / 2, arrowYB - 16, 'center', 'top', '#047857');
            }
        }

        // Vẽ 2 mốc trên Đồ thị 1 (Kênh A: 0 -> subH)
        coordsA.forEach(pt => {
            ctx.strokeStyle = pt.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(pt.x, 0);
            ctx.lineTo(pt.x, subH);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            drawLabelWithPill(ctx, pt.label, pt.x, Math.max(6, pt.y - 22), 'center', 'top', pt.textCol);
        });

        // Vẽ 2 mốc trên Đồ thị 2 (Kênh B: subH -> height)
        coordsB.forEach(pt => {
            ctx.strokeStyle = pt.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(pt.x, subH);
            ctx.lineTo(pt.x, height);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            drawLabelWithPill(ctx, pt.label, pt.x, Math.max(subH + 6, pt.y - 22), 'center', 'top', pt.textCol);
        });

        ctx.restore();
    }

    let draggingPointIndex = -1;
    let wasDraggingPoint = false;

    canvas.addEventListener('pointerdown', (e) => {
        wasDraggingPoint = false;
        if (getDisplayMode() !== 'oscilloscope' || !isPaused) return;

        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const mode = getActiveChannelMode();

        if (mode === '2' && isTwoSourceGraphAnalysisMode) {
            const winA = getVisibleChannelWindow('A');
            const winB = getVisibleChannelWindow('B');
            if (!winA || !winB) return;
            const targetCh = (py < height / 2) ? 'A' : 'B';
            const winTarget = (targetCh === 'A') ? winA : winB;
            const pts = Array.isArray(twoSourcePoints[targetCh]) ? twoSourcePoints[targetCh] : [];
            const halfT = (typeof winTarget.halfSamples === 'number') ? winTarget.halfSamples : Math.floor(winTarget.samplesNeeded / 2);

            let bestIdx = -1;
            let bestDist = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 32 : 22;
            for (let i = 0; i < pts.length; i++) {
                const ptX = (width / 2) + (((pts[i].absIdx - winTarget.startIdx) - halfT) / winTarget.samplesNeeded) * width;
                const d = Math.abs(px - ptX);
                if (d <= bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
            if (bestIdx >= 0) {
                draggingTwoSourcePoint = { channel: targetCh, index: bestIdx };
                if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
            }
            return;
        }

        if (!isManualAnalysisMode || mode !== '1') return;
        const winInfo = getVisibleChannelAWindow();
        if (!winInfo || manualPoints.length === 0) return;

        const N = winInfo.samplesNeeded;
        const halfN = (typeof winInfo.halfSamples === 'number') ? winInfo.halfSamples : Math.floor(N / 2);

        // Cho phép kéo thả tinh chỉnh trực tiếp P1 hoặc P2 nếu chạm gần (tự mở rộng vùng chạm trên màn hình cảm ứng)
        const hitRadius = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 28 : 18;
        let bestManualIdx = -1;
        let bestManualDist = hitRadius;
        for (let i = 0; i < manualPoints.length; i++) {
            const ptX = (width / 2) + (((manualPoints[i].absIdx - winInfo.startIdx) - halfN) / N) * width;
            const d = Math.abs(px - ptX);
            if (d <= bestManualDist) {
                bestManualDist = d;
                bestManualIdx = i;
            }
        }
        if (bestManualIdx >= 0) {
            draggingPointIndex = bestManualIdx;
            if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
            return;
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        if (draggingTwoSourcePoint && isTwoSourceGraphAnalysisMode && isPaused && getActiveChannelMode() === '2') {
            wasDraggingPoint = true;
            const winA = getVisibleChannelWindow('A');
            const winB = getVisibleChannelWindow('B');
            if (!winA || !winB) return;
            const rect = canvas.getBoundingClientRect();
            const width = canvas.clientWidth;
            const subH = canvas.clientHeight / 2;
            const moveX = Math.max(0, Math.min(width, e.clientX - rect.left));
            const ch = draggingTwoSourcePoint.channel;
            const idx = draggingTwoSourcePoint.index;

            if (ch === 'A' && Array.isArray(twoSourcePoints.A) && twoSourcePoints.A[idx]) {
                const moveYA = Math.max(0, Math.min(subH, e.clientY - rect.top));
                twoSourcePoints.A[idx] = snapToWaveFeature(winA, moveX, moveYA, width, subH);
                if (twoSourcePoints.A.length === 2 && twoSourcePoints.A[0].absIdx > twoSourcePoints.A[1].absIdx) {
                    const tmp = twoSourcePoints.A[0];
                    twoSourcePoints.A[0] = twoSourcePoints.A[1];
                    twoSourcePoints.A[1] = tmp;
                    draggingTwoSourcePoint.index = 1 - idx;
                }
            } else if (ch === 'B' && Array.isArray(twoSourcePoints.B) && twoSourcePoints.B[idx]) {
                const moveYB = Math.max(0, Math.min(subH, (e.clientY - rect.top) - subH));
                twoSourcePoints.B[idx] = snapToWaveFeature(winB, moveX, moveYB, width, subH);
                if (twoSourcePoints.B.length === 2 && twoSourcePoints.B[0].absIdx > twoSourcePoints.B[1].absIdx) {
                    const tmp = twoSourcePoints.B[0];
                    twoSourcePoints.B[0] = twoSourcePoints.B[1];
                    twoSourcePoints.B[1] = tmp;
                    draggingTwoSourcePoint.index = 1 - idx;
                }
            }
            updateTwoSourceGraphAnalysisDisplay(winA, winB);
            return;
        }

        if (draggingPointIndex < 0 || !isManualAnalysisMode || !isPaused) return;
        wasDraggingPoint = true;
        const winInfo = getVisibleChannelAWindow();
        if (!winInfo) return;

        const rect = canvas.getBoundingClientRect();
        const moveX = Math.max(0, Math.min(canvas.clientWidth, e.clientX - rect.left));
        const moveY = Math.max(0, Math.min(canvas.clientHeight, e.clientY - rect.top));
        manualPoints[draggingPointIndex] = snapToWaveFeature(winInfo, moveX, moveY, canvas.clientWidth, canvas.clientHeight);

        if (manualPoints.length === 2) {
            if (manualPoints[0].absIdx > manualPoints[1].absIdx) {
                const tmp = manualPoints[0];
                manualPoints[0] = manualPoints[1];
                manualPoints[1] = tmp;
                draggingPointIndex = 1 - draggingPointIndex;
            }
            updateTwoPointResultDisplay(winInfo);
        } else {
            drawFrame();
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        if (draggingTwoSourcePoint) {
            draggingTwoSourcePoint = null;
            if (canvas.releasePointerCapture) {
                try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
            }
        }
        if (draggingPointIndex >= 0) {
            draggingPointIndex = -1;
            if (canvas.releasePointerCapture) {
                try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
            }
        }
    });

    canvas.addEventListener('pointercancel', () => {
        draggingTwoSourcePoint = null;
        draggingPointIndex = -1;
        wasDraggingPoint = false;
    });

    canvas.addEventListener('click', (e) => {
        if (wasDraggingPoint) {
            wasDraggingPoint = false;
            return;
        }
        if (getDisplayMode() === 'oscilloscope') {
            const mode = getActiveChannelMode();
            if (mode === '2' && isTwoSourceGraphAnalysisMode && isPaused) {
                const winA = getVisibleChannelWindow('A');
                const winB = getVisibleChannelWindow('B');
                if (!winA || !winB) return;
                const rect = canvas.getBoundingClientRect();
                const clickX = Math.max(0, Math.min(canvas.clientWidth, e.clientX - rect.left));
                const clickY = Math.max(0, Math.min(canvas.clientHeight, e.clientY - rect.top));
                const width = canvas.clientWidth;
                const subH = canvas.clientHeight / 2;

                const targetCh = (clickY < subH) ? 'A' : 'B';
                const winTarget = (targetCh === 'A') ? winA : winB;
                const localY = (targetCh === 'A') ? clickY : (clickY - subH);
                const halfT = (typeof winTarget.halfSamples === 'number') ? winTarget.halfSamples : Math.floor(winTarget.samplesNeeded / 2);

                if (!Array.isArray(twoSourcePoints[targetCh])) twoSourcePoints[targetCh] = [];
                for (let i = 0; i < twoSourcePoints[targetCh].length; i++) {
                    const ptX = (width / 2) + (((twoSourcePoints[targetCh][i].absIdx - winTarget.startIdx) - halfT) / winTarget.samplesNeeded) * width;
                    if (Math.abs(clickX - ptX) < 3) return;
                }

                const pickedPoint = snapToWaveFeature(winTarget, clickX, localY, width, subH);
                const chLabel = (targetCh === 'A') ? 'Kênh A' : 'Kênh B';
                const p1Name = (targetCh === 'A') ? 'P<sub>A1</sub>' : 'P<sub>B1</sub>';
                const p2Name = (targetCh === 'A') ? 'P<sub>A2</sub>' : 'P<sub>B2</sub>';

                if (twoSourcePoints[targetCh].length >= 2) {
                    twoSourcePoints[targetCh] = [pickedPoint];
                    updateTwoSourceGraphAnalysisDisplay(
                        winA,
                        winB,
                        `Đã chọn lại <span class='info-badge'>${p1Name}</span> trên ${chLabel}. Hãy chọn tiếp <span class='info-badge'>${p2Name}</span> trên ${chLabel} (hoặc kéo thả điểm).`
                    );
                    return;
                }

                twoSourcePoints[targetCh].push(pickedPoint);
                if (twoSourcePoints[targetCh].length === 1) {
                    updateTwoSourceGraphAnalysisDisplay(
                        winA,
                        winB,
                        `Đã chọn <span class='info-badge'>${p1Name}</span> trên ${chLabel}. Hãy chọn tiếp <span class='info-badge'>${p2Name}</span> trên ${chLabel}.`
                    );
                } else {
                    if (twoSourcePoints[targetCh][0].absIdx > twoSourcePoints[targetCh][1].absIdx) {
                        const tmp = twoSourcePoints[targetCh][0];
                        twoSourcePoints[targetCh][0] = twoSourcePoints[targetCh][1];
                        twoSourcePoints[targetCh][1] = tmp;
                    }
                    updateTwoSourceGraphAnalysisDisplay(winA, winB);
                }
                return;
            }

            if (!isManualAnalysisMode || !isPaused || mode !== '1') return;
            const winInfo = getVisibleChannelAWindow();
            if (!winInfo) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = Math.max(0, Math.min(canvas.clientWidth, e.clientX - rect.left));
            const clickY = Math.max(0, Math.min(canvas.clientHeight, e.clientY - rect.top));
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            // Bỏ qua sự kiện click ngay sau khi kéo thả xong điểm
            const halfN = (typeof winInfo.halfSamples === 'number') ? winInfo.halfSamples : Math.floor(winInfo.samplesNeeded / 2);
            for (let i = 0; i < manualPoints.length; i++) {
                const ptX = (width / 2) + (((manualPoints[i].absIdx - winInfo.startIdx) - halfN) / winInfo.samplesNeeded) * width;
                if (Math.abs(clickX - ptX) < 3) return;
            }

            const pickedPoint = snapToWaveFeature(winInfo, clickX, clickY, width, height);

            if (manualPoints.length >= 2) {
                manualPoints = [pickedPoint];
                closeManualHud();
                infoMessageText.innerHTML = "Đã chọn lại <span class='info-badge'>Điểm 1 (P₁)</span>. Hãy chọn <span class='info-badge'>Điểm 2 (P₂)</span> trên đồ thị (hoặc kéo thả điểm để tinh chỉnh).";
                infoMessageText.style.color = "#7c3aed";
                drawFrame();
                return;
            }

            manualPoints.push(pickedPoint);
            if (manualPoints.length === 1) {
                infoMessageText.innerHTML = "Đã chọn <span class='info-badge'>Điểm 1 (P₁)</span>. Hãy chọn tiếp <span class='info-badge'>Điểm 2 (P₂)</span> trên đồ thị.";
                infoMessageText.style.color = "#7c3aed";
                drawFrame();
            } else if (manualPoints.length === 2) {
                // Đảm bảo P1 luôn đứng trước P2 theo thời gian
                if (manualPoints[0].absIdx > manualPoints[1].absIdx) {
                    const tmp = manualPoints[0];
                    manualPoints[0] = manualPoints[1];
                    manualPoints[1] = tmp;
                }
                updateTwoPointResultDisplay(winInfo);
            }
            return;
        }

        if (getDisplayMode() !== 'dbMeter') return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        const leftMargin = 55;
        const rightMargin = 20;
        const chartW = width - leftMargin - rightMargin;
        const mode = getActiveChannelMode();

        if (mode === '2') {
            const subH = height / 2;
            if (clickX >= leftMargin && clickX <= width - rightMargin) {
                let barWidth = chartW / 120;
                let index = Math.floor((clickX - leftMargin) / barWidth);
                if (clickY < subH) {
                    if (index >= 0 && index < dbHistoryA.length) { selectedBarIndexA = index; if (isPaused) drawFrame(); }
                } else {
                    if (index >= 0 && index < dbHistoryB.length) { selectedBarIndexB = index; if (isPaused) drawFrame(); }
                }
            }
        } else {
            if (clickX >= leftMargin && clickX <= width - rightMargin && dbHistoryA.length > 0) {
                let barWidth = chartW / 120;
                let index = Math.floor((clickX - leftMargin) / barWidth);
                if (index >= 0 && index < dbHistoryA.length) {
                    selectedBarIndexA = index;
                    if (isPaused) drawFrame();
                }
            }
        }
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); isUserZoomed = true;
        if (e.deltaY < 0) { totalTimeOnScreen *= 0.88; currentZoomY *= 1.12; } else { totalTimeOnScreen *= 1.12; currentZoomY /= 1.12; }
        totalTimeOnScreen = Math.max(0.0005, Math.min(totalTimeOnScreen, 5.0));
        currentZoomY = Math.max(0.1, Math.min(currentZoomY, 50.0));
        if (isPaused) drawFrame();
    }, { passive: false });

    let initialTouchDist = 0;
    let touchBaseTimeOnScreen = totalTimeOnScreen;
    let touchBaseZoomY = currentZoomY;
    let lastTapTimestamp = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialTouchDist = Math.hypot(dx, dy);
            touchBaseTimeOnScreen = totalTimeOnScreen;
            touchBaseZoomY = currentZoomY;
        } else if (e.touches.length === 1) {
            const now = performance.now();
            if (now - lastTapTimestamp < 300) {
                isUserZoomed = false;
                currentZoomY = 2.0;
                detectedFrequency = 0;
                lockedFrequency = 440;
                totalTimeOnScreen = 5 * (1.0 / 440);
                if (isPaused) drawFrame();
            }
            lastTapTimestamp = now;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialTouchDist > 0) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDist = Math.hypot(dx, dy);
            if (currentDist > 0) {
                const scale = currentDist / initialTouchDist;
                isUserZoomed = true;
                totalTimeOnScreen = Math.max(0.0005, Math.min(touchBaseTimeOnScreen / scale, 5.0));
                currentZoomY = Math.max(0.1, Math.min(touchBaseZoomY * scale, 50.0));
                if (isPaused) drawFrame();
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialTouchDist = 0;
        }
    });
    canvas.addEventListener('touchcancel', () => { initialTouchDist = 0; });

    const twoSourceCanvasElem = document.getElementById('twoSourceCanvas');
    if (twoSourceCanvasElem) {
        twoSourceCanvasElem.addEventListener('wheel', (e) => {
            e.preventDefault(); isUserZoomed = true;
            if (e.deltaY < 0) { totalTimeOnScreen *= 0.88; currentZoomY *= 1.12; } else { totalTimeOnScreen *= 1.12; currentZoomY /= 1.12; }
            totalTimeOnScreen = Math.max(0.0005, Math.min(totalTimeOnScreen, 5.0));
            currentZoomY = Math.max(0.1, Math.min(currentZoomY, 50.0));
            if (isTsPaused) calculatePhaseAndDrawLive();
        }, { passive: false });

        let tsTouchDist = 0, tsBaseTime = totalTimeOnScreen, tsBaseZoomY = currentZoomY;
        twoSourceCanvasElem.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                tsTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                tsBaseTime = totalTimeOnScreen;
                tsBaseZoomY = currentZoomY;
            }
        }, { passive: false });

        twoSourceCanvasElem.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && tsTouchDist > 0) {
                e.preventDefault();
                const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                if (currentDist > 0) {
                    const scale = currentDist / tsTouchDist;
                    isUserZoomed = true;
                    totalTimeOnScreen = Math.max(0.0005, Math.min(tsBaseTime / scale, 5.0));
                    currentZoomY = Math.max(0.1, Math.min(tsBaseZoomY * scale, 50.0));
                    if (isTsPaused) calculatePhaseAndDrawLive();
                }
            }
        }, { passive: false });

        twoSourceCanvasElem.addEventListener('touchend', (e) => { if (e.touches.length < 2) tsTouchDist = 0; });
    }

    function autoCorrelate(buffer, sampleRate) {
        let SIZE = buffer.length, sumSq = 0; for (let i = 0; i < SIZE; i++) sumSq += buffer[i] * buffer[i];
        let rootMeanSq = Math.sqrt(sumSq / SIZE); if (rootMeanSq < 0.02) return -1;
        let c = new Float32Array(SIZE), halfSize = Math.floor(SIZE / 2);
        for (let i = 0; i < halfSize; i++) { let sum = 0; for (let j = 0; j < SIZE - i; j++) { sum += buffer[j] * buffer[j + i]; } c[i] = sum; }
        let d = 0; while (d < halfSize - 1 && c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1; for (let i = d; i < halfSize; i++) { if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
        if (maxpos <= 0 || maxval < c[0] * 0.3) return -1;
        let truePos = maxpos;
        if (maxpos > 0 && maxpos < halfSize - 1) { let x1 = c[maxpos - 1], x2 = c[maxpos], x3 = c[maxpos + 1], a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2; if (a < 0) truePos = maxpos - b / (2 * a); }
        let freq = sampleRate / truePos; if (freq < 45 || freq > 2800) return -1; return freq;
    }

    function calculatePhaseDifference(dataA, dataB, freq, sampleRate, idxA = null, idxB = null) {
        if (!dataA || !dataB || freq <= 0) return 0;
        const lenA = dataA.length, lenB = dataB.length;
        if (lenA === 0 || lenB === 0) return 0;

        const curIdxA = (idxA !== null) ? idxA : ((channelConfig && channelConfig.A) ? channelConfig.A.index : lenA);
        const curIdxB = (idxB !== null) ? idxB : ((channelConfig && channelConfig.B) ? channelConfig.B.index : lenB);

        const samplesPerCycle = sampleRate / freq;
        const winLen = 2048;
        const searchLimit = Math.min(Math.ceil(samplesPerCycle / 2), 1024);
        if (curIdxA < winLen + searchLimit || curIdxB < winLen + searchLimit) return 0;

        const totalNeeded = winLen + 2 * searchLimit;
        const bufA = new Float32Array(totalNeeded);
        const bufB = new Float32Array(totalNeeded);
        const startA = curIdxA - winLen - searchLimit;
        const startB = curIdxB - winLen - searchLimit;

        for (let i = 0; i < totalNeeded; i++) {
            bufA[i] = dataA[((startA + i) % lenA + lenA) % lenA];
            bufB[i] = dataB[((startB + i) % lenB + lenB) % lenB];
        }

        const numShifts = 2 * searchLimit + 1;
        const corrs = new Float64Array(numShifts);
        let maxCorr = -Infinity, bestIdx = searchLimit;

        for (let s = -searchLimit; s <= searchLimit; s++) {
            let corr = 0;
            const offsetB = searchLimit + s;
            for (let k = 0; k < winLen; k++) {
                corr += bufA[searchLimit + k] * bufB[offsetB + k];
            }
            corr /= winLen;
            const arrIdx = s + searchLimit;
            corrs[arrIdx] = corr;
            if (corr > maxCorr) {
                maxCorr = corr;
                bestIdx = arrIdx;
            }
        }

        let trueShift = bestIdx - searchLimit;
        if (bestIdx > 0 && bestIdx < numShifts - 1) {
            const y1 = corrs[bestIdx - 1], y2 = corrs[bestIdx], y3 = corrs[bestIdx + 1];
            const denom = 2 * (y1 + y3 - 2 * y2);
            if (denom < 0) {
                trueShift += (y1 - y3) / denom;
            }
        }

        let phaseRad = (trueShift / samplesPerCycle) * 2 * Math.PI;
        while (phaseRad > Math.PI) phaseRad -= 2 * Math.PI;
        while (phaseRad < -Math.PI) phaseRad += 2 * Math.PI;
        return phaseRad;
    }

    function computeFFT(realArray) {
        let n = realArray.length, p = 1; while (p < n) p *= 2;
        let x = new Float32Array(p); x.set(realArray); let y = new Float32Array(p); let j = 0;
        for (let i = 0; i < p - 1; i++) { if (i < j) { let tx = x[i]; x[i] = x[j]; x[j] = tx; } let m = p >> 1; while (m >= 1 && j >= m) { j -= m; m >>= 1; } j += m; }
        for (let l = 1; l < p; l <<= 1) { let wk1r = Math.cos(Math.PI / l), wk1i = -Math.sin(Math.PI / l); for (let i = 0; i < p; i += l << 1) { let wr = 1, wi = 0; for (let k = 0; k < l; k++) { let tr = wr * x[i + k + l] - wi * y[i + k + l], ti = wr * y[i + k + l] + wi * x[i + k + l]; x[i + k + l] = x[i + k] - tr; y[i + k + l] = y[i + k] - ti; x[i + k] += tr; y[i + k] += ti; let wtemp = wr; wr = wr * wk1r - wi * wk1i; wi = wtemp * wk1i + wi * wk1r; } } }
        let magnitudes = new Float32Array(p / 2); for (let i = 0; i < p / 2; i++) { magnitudes[i] = Math.hypot(x[i], y[i]) / (p / 2); } return magnitudes;
    }

    function findZeroCrossingOffset(cfg, currentIndex, samplesNeeded) {
        if (!cfg || !cfg.active || !cfg.data || currentIndex <= 0) return 0;
        const len = cfg.data.length;
        const halfSamples = Math.floor(samplesNeeded / 2);
        const maxAvailable = Math.min(currentIndex, len - 4096);
        if (maxAvailable <= samplesNeeded + 4) return halfSamples;

        const maxSearchWindow = Math.min(maxAvailable - samplesNeeded - 2, Math.max(512, Math.floor(sampleRate / 60)));
        if (maxSearchWindow <= 4) return halfSamples;

        const baseCenter = currentIndex - halfSamples;
        let peak = 0;
        for (let k = 0; k < maxSearchWindow; k += 2) {
            let idx = ((baseCenter - k) % len + len) % len;
            let absVal = Math.abs(cfg.data[idx]);
            if (absVal > peak) peak = absVal;
        }
        if (peak < 0.008) return halfSamples;

        const hysteresis = peak * 0.1;
        for (let k = 1; k < maxSearchWindow - 4; k++) {
            let iCurr = ((baseCenter - k) % len + len) % len;
            let iPrev = ((baseCenter - k - 1) % len + len) % len;
            let vPrev = cfg.data[iPrev], vCurr = cfg.data[iCurr];
            if (vPrev <= 0 && vCurr > 0) {
                let iBack = ((baseCenter - k - 4) % len + len) % len;
                if (cfg.data[iBack] < -hysteresis || (vCurr - vPrev) > peak * 0.02) {
                    return halfSamples + k;
                }
            }
        }
        return halfSamples;
    }

    function drawLabelWithPill(ctx, text, x, y, align = 'center', baseline = 'top', textColor = '#1e293b') {
        ctx.save(); ctx.font = '600 11px "Inter", sans-serif'; ctx.textAlign = align; ctx.textBaseline = baseline;
        const metrics = ctx.measureText(text), padX = 4, padY = 2, textW = metrics.width, textH = 12;
        let boxX = x - padX; if (align === 'center') boxX = x - textW / 2 - padX; else if (align === 'right') boxX = x - textW - padX;
        let boxY = y - padY; if (baseline === 'middle') boxY = y - textH / 2 - padY; else if (baseline === 'bottom') boxY = y - textH - padY;
        ctx.fillStyle = 'rgba(241, 245, 249, 0.85)'; ctx.fillRect(boxX, boxY, textW + padX * 2, textH + padY * 2);
        ctx.fillStyle = textColor; ctx.fillText(text, x, y); ctx.restore();
    }

    function drawMainGrid(ctx, boxX, boxY, boxW, boxH, titleColor, titleText, showTime) {
        ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 1; const stepGridX = boxW / 10, stepGridY = boxH / 8;
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) { ctx.moveTo(boxX + i * stepGridX, boxY); ctx.lineTo(boxX + i * stepGridX, boxY + boxH); }
        for (let i = 0; i <= 8; i++) { ctx.moveTo(boxX, boxY + i * stepGridY); ctx.lineTo(boxX + boxW, boxY + i * stepGridY); }
        ctx.stroke();

        ctx.lineWidth = 2; ctx.strokeStyle = '#334155'; ctx.beginPath();
        let centerY = boxY + boxH / 2, centerX = boxX + boxW / 2;
        ctx.moveTo(boxX, centerY); ctx.lineTo(boxX + boxW, centerY);
        ctx.moveTo(centerX, boxY); ctx.lineTo(centerX, boxY + boxH);

        const tickSize = 4;
        for (let i = 0; i <= 10; i++) { ctx.moveTo(boxX + i * stepGridX, centerY - tickSize); ctx.lineTo(boxX + i * stepGridX, centerY + tickSize); }
        for (let i = 0; i <= 8; i++) { ctx.moveTo(centerX - tickSize, boxY + i * stepGridY); ctx.lineTo(centerX + tickSize, boxY + i * stepGridY); }
        ctx.stroke();

        if (showTime) {
            let rawStepMs = (totalTimeOnScreen / 10) * 1000;
            // Xác định số chữ số thập phân phù hợp theo độ thu phóng (zoom) để không mất độ chính xác
            let decimals = 2;
            if (rawStepMs < 1 && rawStepMs > 0) {
                decimals = Math.min(4, Math.max(2, Math.ceil(-Math.log10(rawStepMs)) + 1));
            }
            // Định lượng giá trị 1 ô chuẩn
            let stepMs = parseFloat(rawStepMs.toFixed(decimals));
            if (stepMs === 0) stepMs = rawStepMs;
            
            // Lấy đúng số chữ số thập phân thực tế của stepMs để đồng bộ hiển thị cho mọi ô
            const sStep = stepMs.toString();
            const dotIdx = sStep.indexOf('.');
            const prec = dotIdx === -1 ? 0 : sStep.length - dotIdx - 1;

            // Hiển thị nhãn cho các ô đối xứng qua tâm: Giá trị = k * stepMs
            // Đảm bảo khoảng cách giữa 2 ô liền kề LUÔN LUÔN bằng đúng stepMs (không sai lệch dù chỉ 0.01)
            for (let i = 1; i < 10; i++) {
                if (i !== 5) {
                    let k = i - 5;
                    let val = (k * stepMs).toFixed(prec).replace('.', ',');
                    drawLabelWithPill(ctx, val, boxX + i * stepGridX, centerY + 8, 'center', 'top');
                }
            }
            drawLabelWithPill(ctx, "t (ms)", boxX + boxW - 8, centerY - 24, 'right', 'top');
        }

        const maxY = 1.0 / currentZoomY, valPerStep = (maxY * 2) / 8; let drawYLabels = (boxH > 120);
        let decY = 2;
        if (valPerStep < 1 && valPerStep > 0) {
            decY = Math.min(4, Math.max(2, Math.ceil(-Math.log10(valPerStep)) + 1));
        }
        let stepY = parseFloat(valPerStep.toFixed(decY));
        if (stepY === 0) stepY = valPerStep;
        const sStepY = stepY.toString();
        const dotIdxY = sStepY.indexOf('.');
        const precY = dotIdxY === -1 ? 0 : sStepY.length - dotIdxY - 1;

        for (let i = 1; i < 8; i++) {
            if (i !== 4) {
                if (!drawYLabels && i % 2 !== 0) continue;
                let kY = 4 - i;
                let valY = (kY * stepY).toFixed(precY).replace('.', ',');
                drawLabelWithPill(ctx, valY, centerX + 8, boxY + i * stepGridY, 'left', 'middle');
            }
        }
        drawLabelWithPill(ctx, "0", centerX + 8, centerY + 8, 'left', 'top');

        if (titleText) { let textPosX = (titleText === 'Biên độ') ? (centerX + 6) : (boxX + 8); drawLabelWithPill(ctx, titleText, textPosX, boxY + 8, 'left', 'top', titleColor); }
    }

    async function populateMics() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices(), audioInputs = devices.filter(device => device.kind === 'audioinput');
            let valA = micSelectA.value, valB = micSelectB.value;
            micSelectA.innerHTML = '<option value="">-- Kênh A: Mặc định hệ thống --</option>';
            micSelectB.innerHTML = '<option value="">-- Kênh B: Mặc định hệ thống --</option>';
            audioInputs.forEach((device, index) => {
                let optA = document.createElement('option'); optA.value = device.deviceId; optA.text = `Mic ${index + 1}: ${device.label || 'Tự chọn'}`;
                let optB = document.createElement('option'); optB.value = device.deviceId; optB.text = `Mic ${index + 1}: ${device.label || 'Tự chọn'}`;
                micSelectA.appendChild(optA); micSelectB.appendChild(optB);
            });
            if (localStorage.getItem('fox_mic_a')) micSelectA.value = localStorage.getItem('fox_mic_a');
            if (localStorage.getItem('fox_mic_b')) micSelectB.value = localStorage.getItem('fox_mic_b');
            if (valA) micSelectA.value = valA; if (valB) micSelectB.value = valB;
        } catch (e) { }
    }

    function updateUIState() {
        if (channelConfig.A.active) { btnStartA.textContent = "Kênh A (Hoạt động)"; btnStartA.className = "btn-red"; } else { btnStartA.textContent = "Kênh A (Khóa)"; btnStartA.className = "btn-slate"; } btnStartA.disabled = false;
        if (channelConfig.B.active) { btnStartB.textContent = "Kênh B (Hoạt động)"; btnStartB.className = "btn-blue"; } else { btnStartB.textContent = "Kênh B (Khóa)"; btnStartB.className = "btn-slate"; } btnStartB.disabled = false;
        resetButton.disabled = false;
        if (channelConfig.A.active || channelConfig.B.active) { pauseButton.disabled = false; if (isPaused) { infoMessageText.innerHTML = "Đã kết nối. Bấm <span class='info-badge'>Đo / Dừng</span> để khảo sát."; infoMessageText.style.color = "#0284c7"; } }
        else { pauseButton.disabled = true; infoMessageText.innerHTML = "Nhấn vào <span class='info-badge'>Kênh A</span> hoặc <span class='info-badge'>Kênh B</span> để bật mic."; infoMessageText.style.color = "#0284c7"; }
        updateAnalysisButtonState();
        updateManualAnalysisButtonState();
        const gearBtn = document.querySelector('.license-gear-btn'); if (gearBtn) { gearBtn.style.display = isDemoMode ? 'inline-flex' : 'none'; }
    }

    async function initAudioChannel(channelId, deviceId = null) {
        const mode = getActiveChannelMode();
        if (mode === '1') stopAudioChannel((channelId === 'A') ? 'B' : 'A');
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)(); sampleRate = audioCtx.sampleRate;
            channelConfig.A.data = new Float32Array(sampleRate * 10); channelConfig.B.data = new Float32Array(sampleRate * 10);
        }
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        const isWorkletReady = await setupAudioWorklet(audioCtx); stopAudioChannel(channelId);
        const cfg = channelConfig[channelId];
        if (!cfg.data || cfg.data.length !== sampleRate * 10) { cfg.data = new Float32Array(sampleRate * 10); } cfg.index = 0;
        if (channelId === 'A') frozenCenterIdxA = null;
        else if (channelId === 'B') frozenCenterIdxB = null;

        try {
            const idA = micSelectA ? micSelectA.value : '', idB = micSelectB ? micSelectB.value : '', isSharedDevice = (idA === idB);
            const baseConstraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
            let audioConstraints = { audio: (mode === '2' && isSharedDevice) ? { deviceId: deviceId ? { exact: deviceId } : undefined, channelCount: 2, ...baseConstraints } : { deviceId: deviceId ? { exact: deviceId } : undefined, ...baseConstraints } };
            isMicPromptActive = true;
            try {
                cfg.stream = await navigator.mediaDevices.getUserMedia(audioConstraints).catch(e => { return navigator.mediaDevices.getUserMedia({ audio: true, ...baseConstraints }); });
            } finally {
                setTimeout(() => { isMicPromptActive = false; }, 400);
            }
            cfg.source = audioCtx.createMediaStreamSource(cfg.stream);
            let finalSourceNode = cfg.source;
            if (mode === '2' && isSharedDevice) {
                cfg.splitter = audioCtx.createChannelSplitter(2);
                cfg.source.connect(cfg.splitter);
                cfg.channelGain = audioCtx.createGain();
                cfg.splitter.connect(cfg.channelGain, (channelId === 'A') ? 0 : 1);
                finalSourceNode = cfg.channelGain;
            }
            cfg.filterHP = audioCtx.createBiquadFilter(); cfg.filterHP.frequency.value = 45; cfg.filterHP.type = 'highpass';
            cfg.filterLP = audioCtx.createBiquadFilter(); cfg.filterLP.frequency.value = 3000; cfg.filterLP.type = 'lowpass';
            const handleAudioSamples = (inputChunk) => {
                if (!isPaused && cfg.active && (!isTwoSourceModalOpen || !isTsPaused)) {
                    let len = cfg.data.length, currentIdx = cfg.index;
                    for (let i = 0; i < inputChunk.length; i++) { cfg.data[(currentIdx + i) % len] = inputChunk[i]; }
                    cfg.index += inputChunk.length;
                }
            };
            if (isWorkletReady) {
                cfg.workletNode = new AudioWorkletNode(audioCtx, 'fox-audio-processor');
                cfg.workletNode.port.onmessage = (event) => handleAudioSamples(event.data);
            } else {
                cfg.workletNode = audioCtx.createScriptProcessor(1024, 1, 1);
                cfg.workletNode.onaudioprocess = (event) => handleAudioSamples(event.inputBuffer.getChannelData(0));
            }
            cfg.dummy = audioCtx.createGain(); cfg.dummy.gain.value = 0;
            finalSourceNode.connect(cfg.filterHP); cfg.filterHP.connect(cfg.filterLP); cfg.filterLP.connect(cfg.workletNode); cfg.workletNode.connect(cfg.dummy); cfg.dummy.connect(audioCtx.destination);
            cfg.active = true;
            if (micSelectA.options.length <= 1) await populateMics();
            updateUIState();
            if (isPaused) { resizeCanvas(); drawFrame(true); } else { let text = "Đang thu liên tục: "; if (channelConfig.A.active) text += "<span class='channel-tag-a'>Kênh A</span>"; if (channelConfig.A.active && channelConfig.B.active) text += " &amp; "; if (channelConfig.B.active) text += "<span class='channel-tag-b'>Kênh B</span>"; infoMessageText.innerHTML = text; }
        } catch (err) { alert(`Lỗi Micro Kênh ${channelId}. Vui lòng kiểm tra quyền truy cập: ` + err.message); }
    }

    function triggerAutoStop() {
        clearTimeout(stopTimer);
        isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
        if (isContinuousMode) return;
        if (!isPaused) {
            stopTimer = setTimeout(() => {
                isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
                if (!isPaused && !isContinuousMode) {
                    isPaused = true;
                    pauseButton.textContent = "Đo / Dừng";
                    pauseButton.className = "btn-green";
                    infoMessageText.innerHTML = "Đã khóa sóng &mdash; Sẵn sàng khảo sát";
                    infoMessageText.style.color = "#dc2626";
                    updateAnalysisButtonState();
                    updateManualAnalysisButtonState();
                    if (isTwoSourceModalOpen && typeof freezeTwoSourceModal === 'function') {
                        freezeTwoSourceModal();
                    }
                    drawFrame();
                }
            }, 2000);
        }
    }

    pauseButton.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
        if (isPaused) {
            resetManualAnalysisState();
            isPaused = false;
            pauseButton.disabled = false;
            dbHistoryA = [];
            dbHistoryB = [];
            selectedBarIndexA = -1;
            selectedBarIndexB = -1;
            dbStartTime = 0;
            lastDbSampleTime = 0;
            if (channelConfig.A.data) { channelConfig.A.data.fill(0); channelConfig.A.index = 0; }
            if (channelConfig.B.data) { channelConfig.B.data.fill(0); channelConfig.B.index = 0; }
            frozenCenterIdxA = null; frozenCenterIdxB = null;
            isUserZoomed = false; detectedFrequency = 0; lockedFrequency = 440; totalTimeOnScreen = 5 * (1.0 / lockedFrequency);
            pauseButton.textContent = "Đang đo..."; pauseButton.className = "btn-red";
            let text = "Đang quét tín hiệu: ";
            if (channelConfig.A.active) text += "<span class='channel-tag-a'>Kênh A</span>";
            if (channelConfig.A.active && channelConfig.B.active) text += " &amp; ";
            if (channelConfig.B.active) text += "<span class='channel-tag-b'>Kênh B</span>";
            infoMessageText.innerHTML = text; infoMessageText.style.color = "#0284c7";
            lastDrawTime = performance.now(); updateAnalysisButtonState(); updateManualAnalysisButtonState();
            if (!animFrameId) draw();
            if (!isContinuousMode) triggerAutoStop();
            else clearTimeout(stopTimer);
        } else {
            isPaused = true;
            clearTimeout(stopTimer);
            pauseButton.textContent = "Đo / Dừng";
            pauseButton.className = "btn-green";
            if (getDisplayMode() === "oscilloscope" && getActiveChannelMode() === "1" && !isContinuousMode) {
                infoMessageText.innerHTML = "Đã khóa sóng. Bấm <span class='info-badge'>Phân tích đồ thị</span> để chọn chức năng phân tích.";
            } else {
                infoMessageText.innerHTML = isContinuousMode ? "Đã tạm dừng vẽ." : "Đã khóa sóng an toàn.";
            }
            infoMessageText.style.color = "#dc2626";
            updateAnalysisButtonState();
            updateManualAnalysisButtonState();
            drawFrame();
        }
    });

    resetButton.addEventListener('click', async () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            try { await audioCtx.resume(); } catch (e) {}
        }
        resetFeaturesAndAdjustments(true); // Giữ lại chế độ đo hiện tại (1 nguồn/2 nguồn, tự dừng/liên tục, oscilloscope/dbMeter,...)
        isPaused = true;
        clearTimeout(stopTimer);
        pauseButton.textContent = "Đo / Dừng";
        pauseButton.className = "btn-green";
        if (channelConfig.A.data) { channelConfig.A.data.fill(0); channelConfig.A.index = 0; }
        if (channelConfig.B.data) { channelConfig.B.data.fill(0); channelConfig.B.index = 0; }
        dbHistoryA = [];
        dbHistoryB = [];
        selectedBarIndexA = -1;
        selectedBarIndexB = -1;
        dbStartTime = 0;
        lastDbSampleTime = 0;

        updateUIState();
        // Cập nhật thông báo sẵn sàng đo theo đúng kênh đang bật
        if (channelConfig.A.active || channelConfig.B.active) {
            infoMessageText.innerHTML = "Đã làm mới. Bấm <span class='info-badge'>Đo / Dừng</span> để khảo sát.";
            infoMessageText.style.color = "#0284c7";
        } else {
            infoMessageText.innerHTML = "Nhấn vào <span class='info-badge'>Kênh A</span> hoặc <span class='info-badge'>Kênh B</span> để bật mic.";
            infoMessageText.style.color = "#0284c7";
        }

        if (typeof checkAndShowQR === 'function') checkAndShowQR();
        drawFrame(true);
    });

    function renderSingleDbChart(ctx, dbHistory, selectedIndex, titleText, titleColor, boxX, boxY, boxW, boxH) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        const bottomPadding = 42;
        const topPadding = 25;
        const leftPadding = 55;
        const rightPadding = 20;
        const chartH = boxH - topPadding - bottomPadding;
        const chartW = boxW - leftPadding - rightPadding;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const dbTicks = [30, 52.5, 75, 97.5, 120];
        for (let i = 0; i < dbTicks.length; i++) {
            let dbStep = dbTicks[i];
            let y = (boxY + boxH - bottomPadding) - ((dbStep - 30) / 90) * chartH;
            ctx.moveTo(boxX + leftPadding, y); ctx.lineTo(boxX + boxW - rightPadding, y);
            ctx.fillStyle = '#64748b';
            ctx.font = '600 10px "Inter", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${dbStep} dB`, boxX + leftPadding - 6, y + 3);
        }
        ctx.stroke();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(boxX + leftPadding, boxY + boxH - bottomPadding); ctx.lineTo(boxX + boxW - rightPadding, boxY + boxH - bottomPadding);
        ctx.moveTo(boxX + leftPadding, boxY + topPadding); ctx.lineTo(boxX + leftPadding, boxY + boxH - bottomPadding);
        ctx.stroke();

        ctx.fillStyle = titleColor;
        ctx.font = 'bold 11px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(titleText, boxX + leftPadding + 6, boxY + topPadding - 10);

        if (dbHistory.length > 0) {
            let barWidth = chartW / 120;

            ctx.fillStyle = '#475569';
            ctx.font = '500 9.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';

            for (let i = 0; i < dbHistory.length; i += 30) {
                let x = boxX + leftPadding + i * barWidth + barWidth / 2;
                ctx.beginPath();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1;
                ctx.moveTo(x, boxY + boxH - bottomPadding);
                ctx.lineTo(x, boxY + boxH - bottomPadding + 4);
                ctx.stroke();

                let curElapsed = dbHistory[i].elapsedMs !== undefined ? dbHistory[i].elapsedMs : (i * 50);
                let timeStr = curElapsed >= 1000 ? `${(curElapsed / 1000).toFixed(1)} s` : `${curElapsed} ms`;
                ctx.fillText(timeStr, x, boxY + boxH - bottomPadding + 16);
            }

            for (let i = 0; i < dbHistory.length; i++) {
                let item = dbHistory[i];
                let barHeight = ((item.db - 30) / 90) * chartH;
                let x = boxX + leftPadding + i * barWidth;
                let y = (boxY + boxH - bottomPadding) - barHeight;

                let isSelected = (i === selectedIndex);
                if (isSelected) {
                    ctx.fillStyle = '#f59e0b';
                } else {
                    ctx.fillStyle = (item.db > SAFETY_THRESHOLD_DB) ? '#ea580c' : titleColor;
                }
                
                ctx.fillRect(x, y, Math.max(2, barWidth - 1), barHeight);

                if (isSelected) {
                    ctx.strokeStyle = '#d97706';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, Math.max(2, barWidth - 1), barHeight);
                }
            }

            if (selectedIndex >= 0 && selectedIndex < dbHistory.length) {
                let selItem = dbHistory[selectedIndex];
                let selX = boxX + leftPadding + selectedIndex * barWidth + barWidth / 2;
                let selY = (boxY + boxH - bottomPadding) - ((selItem.db - 30) / 90) * chartH;

                let curElapsed = selItem.elapsedMs !== undefined ? selItem.elapsedMs : (selectedIndex * 50);
                let timeStr = curElapsed >= 1000 ? `${(curElapsed / 1000).toFixed(2)} s` : `${curElapsed} ms`;
                let tooltipText = `📍 ${selItem.db.toFixed(1)} dB | t = ${timeStr}`;

                ctx.save();
                ctx.font = 'bold 11px "Be Vietnam Pro", sans-serif';
                let tWidth = ctx.measureText(tooltipText).width + 12;
                let ttX = Math.min(boxW - tWidth - 10, Math.max(10, selX - tWidth / 2));
                let ttY = Math.max(boxY + 5, selY - 28);

                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fillRect(ttX, ttY, tWidth, 22);

                ctx.fillStyle = (selItem.db > SAFETY_THRESHOLD_DB) ? '#fca5a5' : '#38bdf8';
                ctx.textAlign = 'left';
                ctx.fillText(tooltipText, ttX + 6, ttY + 15);
                ctx.restore();
            }
        }
    }

    function drawDbBarChart(ctx, width, height) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        let chunkSize = 1024;
        let mode = getActiveChannelMode();
        let now = performance.now();

        if (!isPaused) {
            if (dbStartTime === 0) dbStartTime = now;
            if (now - lastDbSampleTime >= 50) {
                lastDbSampleTime = now;
                let elapsedMs = Math.round(now - dbStartTime);

                if (channelConfig.A.active && channelConfig.A.data) {
                    let recentA = new Float32Array(chunkSize);
                    let lenA = channelConfig.A.data.length, idxA = channelConfig.A.index;
                    for (let i = 0; i < chunkSize; i++) recentA[i] = channelConfig.A.data[((idxA - chunkSize + i) % lenA + lenA) % lenA];
                    let currentDbA = calculateRMSdB(recentA);
                    let rawDbA = calculateRMSdB(recentA, 'A', true); dbHistoryA.push({ time: now, elapsedMs: elapsedMs, db: currentDbA, rawDb: rawDbA });
                    if (dbHistoryA.length > 120) dbHistoryA.shift();
                }

                if (mode === '2' && channelConfig.B.active && channelConfig.B.data) {
                    let recentB = new Float32Array(chunkSize);
                    let lenB = channelConfig.B.data.length, idxB = channelConfig.B.index;
                    for (let i = 0; i < chunkSize; i++) recentB[i] = channelConfig.B.data[((idxB - chunkSize + i) % lenB + lenB) % lenB];
                    let currentDbB = calculateRMSdB(recentB, 'B', false);
                    let rawDbB = calculateRMSdB(recentB, 'B', true); dbHistoryB.push({ time: now, elapsedMs: elapsedMs, db: currentDbB, rawDb: rawDbB });
                    if (dbHistoryB.length > 120) dbHistoryB.shift();
                }
            }
        }

        if (mode === '2') {
            let subH = height / 2;
            renderSingleDbChart(ctx, dbHistoryA, selectedBarIndexA, '🔴 KÊNH A - MỨC CƯỜNG ĐỘ ÂM (dB)', '#dc2626', 0, 0, width, subH);
            renderSingleDbChart(ctx, dbHistoryB, selectedBarIndexB, '🔵 KÊNH B - MỨC CƯỜNG ĐỘ ÂM (dB)', '#2563eb', 0, subH, width, subH);
        } else {
            renderSingleDbChart(ctx, dbHistoryA, selectedBarIndexA, '🔴 KÊNH A - MỨC CƯỜNG ĐỘ ÂM (dB)', '#10b981', 0, 0, width, height);
        }
    }

    function drawFrame(isReset = false) {
        let now = performance.now();
        if (audioCtx && !isPaused && (channelConfig.A.index > 2048 || channelConfig.B.index > 2048)) {
            if (now - lastCorrelateTime > 300) {
                let mainCfg = channelConfig.A.active ? channelConfig.A : channelConfig.B;
                if (mainCfg.active && mainCfg.index > 2048) {
                    let recentData = new Float32Array(2048), len = mainCfg.data.length, currentIdx = mainCfg.index;
                    for (let i = 0; i < 2048; i++) recentData[i] = mainCfg.data[((currentIdx - 2048 + i) % len + len) % len];
                    let freq = autoCorrelate(recentData, sampleRate);
                    if (freq > 0) { detectedFrequency = (detectedFrequency === 0) ? freq : (detectedFrequency * 0.7 + freq * 0.3); if (Math.abs(detectedFrequency - lockedFrequency) / lockedFrequency > 0.08) lockedFrequency = detectedFrequency; if (typeof updateFoxLiveFrequency === 'function') updateFoxLiveFrequency(lockedFrequency || detectedFrequency); }
                }
                lastCorrelateTime = now;
            }
        }

        if (isTwoSourceModalOpen) return;

        const width = canvas.clientWidth, height = canvas.clientHeight;

        if (getDisplayMode() === 'dbMeter') {
            drawDbBarChart(canvasCtx, width, height);
            return;
        }

        canvasCtx.fillStyle = '#f8fafc'; canvasCtx.fillRect(0, 0, width, height);
        if (!isUserZoomed) totalTimeOnScreen = Math.max(0.002, Math.min(5 * (1.0 / ((lockedFrequency > 0) ? lockedFrequency : 440)), 2.4));

        const mode = getActiveChannelMode();
        let boxA_Y = 0, boxA_H = height, boxB_Y = 0, boxB_H = 0;
        if (mode === '2') { boxA_H = height / 2; boxB_Y = height / 2; boxB_H = height / 2; }
        if (isReset) { drawMainGrid(canvasCtx, 0, boxA_Y, width, boxA_H, '#dc2626', 'Kênh A (Chưa bật)', true); if (mode === '2') drawMainGrid(canvasCtx, 0, boxB_Y, width, boxB_H, '#3b82f6', 'Kênh B (Chưa bật)', true); return; }

        const samplesNeeded = Math.floor(sampleRate * totalTimeOnScreen);

        drawMainGrid(canvasCtx, 0, boxA_Y, width, boxA_H, '#dc2626', channelConfig.A.active ? 'Biên độ' : 'Kênh A (Khóa)', true);
        if (channelConfig.A.active && channelConfig.A.data && channelConfig.A.index > samplesNeeded) {
            let centerIdxA = resolveChannelCenterIdx(channelConfig.A, 'A', samplesNeeded);
            let offsetA = channelConfig.A.index - centerIdxA;
            drawWaveform(canvasCtx, channelConfig.A.data, channelConfig.A.index, offsetA, samplesNeeded, 0, boxA_Y, width, boxA_H, '#ef4444');
            if (mode === '1') {
                drawManualAnalysisOverlay(canvasCtx, width, height);
            }
        }

        if (mode === '2') {
            drawMainGrid(canvasCtx, 0, boxB_Y, width, boxB_H, '#3b82f6', channelConfig.B.active ? 'Biên độ' : 'Kênh B (Khóa)', true);
            if (channelConfig.B.active && channelConfig.B.data && channelConfig.B.index > samplesNeeded) {
                let centerIdxB = resolveChannelCenterIdx(channelConfig.B, 'B', samplesNeeded);
                let offsetB = channelConfig.B.index - centerIdxB;
                drawWaveform(canvasCtx, channelConfig.B.data, channelConfig.B.index, offsetB, samplesNeeded, 0, boxB_Y, width, boxB_H, '#3b82f6');
            }
            drawTwoSourceAnalysisOverlay(canvasCtx, width, height);
        }
    }

    function drawWaveform(ctx, dataArray, currentIndex, offset, samplesNeeded, boxX, boxY, boxW, boxH, color) {
        ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.lineJoin = 'round';
        const len = dataArray.length;
        const halfSamples = Math.floor(samplesNeeded / 2);
        const centerIdx = currentIndex - offset;
        const startIdx = centerIdx - halfSamples;
        const step = Math.max(1, Math.floor(samplesNeeded / (boxW * 2)));
        for (let i = 0; i < samplesNeeded; i += step) {
            let idx = ((startIdx + i) % len + len) % len;
            let val = dataArray[idx];
            let x = boxX + boxW / 2 + ((i - halfSamples) / samplesNeeded) * boxW;
            let y = boxY + boxH / 2 - (val * currentZoomY * boxH / 2);
            y = Math.max(boxY, Math.min(boxY + boxH, y));
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    let animFrameId = null;
    function draw() {
        if (isPaused) {
            animFrameId = null;
            return;
        }
        if (targetFPS > 0) {
            let now = performance.now();
            if (now - lastDrawTime > (1000 / targetFPS)) {
                drawFrame();
                lastDrawTime = now;
            }
        }
        animFrameId = requestAnimationFrame(draw);
    }

    function resetFeaturesAndAdjustments(keepModes = true) {
        resetManualAnalysisState();
        if (typeof closeKinematicsModal === 'function') closeKinematicsModal();
        if (typeof stopFftSweepAnimation === 'function') stopFftSweepAnimation();
        if (typeof closeFftHarmonicTable === 'function') closeFftHarmonicTable(true);
        fftSelectedPeakFreq = null;
        fftLastAnalysis = null;
        const fftOverlay = document.getElementById('fftModalOverlay');
        if (fftOverlay) { fftOverlay.classList.remove('animUI-visible'); fftOverlay.style.display = 'none'; }
        const fftInputEl = document.getElementById('fftTargetFreq');
        if (fftInputEl) fftInputEl.value = '';
        currentCalcFreqA = 0; currentCalcFreqB = 0; currentAmpA = 0; currentAmpB = 0;
        snapDataA = []; snapDataB = []; snapIdxA = 0; snapIdxB = 0;

        closeMcdModal();
        if (typeof closeCalibModal === 'function') closeCalibModal();

        isTwoSourceModalOpen = false; isTsPaused = true; showTsResults = false; showTsEquations = false;
        const twoSourceOverlay = document.getElementById('twoSourceModalOverlay');
        if (twoSourceOverlay) { twoSourceOverlay.classList.remove('animUI-visible'); twoSourceOverlay.style.display = 'none'; }
        const hudResults = document.getElementById('hudResults'); if (hudResults) hudResults.style.display = 'none';
        const hudEquations = document.getElementById('hudEquations'); if (hudEquations) hudEquations.style.display = 'none';

        const chatWidget = document.getElementById('fox-chat-widget');
        if (chatWidget && chatWidget.classList.contains('open')) { chatWidget.classList.remove('open'); }

        if (settingsDropdown && settingsDropdown.classList.contains('open')) { settingsDropdown.classList.remove('open'); }

        if (typeof checkAndShowQR === 'function') checkAndShowQR();

        isUserZoomed = false; frozenCenterIdxA = null; frozenCenterIdxB = null; currentZoomY = 2.0; detectedFrequency = 0; lockedFrequency = 440; totalTimeOnScreen = 5 * (1.0 / 440);

        if (!keepModes) {
            if (channelModeSelect) channelModeSelect.value = '1';
            if (modeSelect) modeSelect.value = 'auto';
            if (displayModeSelect) displayModeSelect.value = 'oscilloscope';
            if (speedSelect) speedSelect.value = 'fast';
            isContinuousMode = false;
            clearTimeout(stopTimer);
            targetFPS = 60;

            document.querySelectorAll('#groupChannelMode .settings-item').forEach(el => { el.classList.toggle('active', el.dataset.value === '1'); });
            document.querySelectorAll('#groupMode .settings-item').forEach(el => { el.classList.toggle('active', el.dataset.value === 'auto'); });
            document.querySelectorAll('#groupDisplayMode .settings-item').forEach(el => { el.classList.toggle('active', el.dataset.value === 'oscilloscope'); });
            document.querySelectorAll('#groupSpeed .settings-item').forEach(el => { el.classList.toggle('active', el.dataset.value === 'fast'); });
            const groupSpeed = document.getElementById('groupSpeed');
            if (groupSpeed) groupSpeed.style.display = 'none';
            const cardB = document.getElementById('cardChannelB');
            if (cardB) cardB.style.display = 'none';
        } else {
            // Giữ lại chế độ đang đo, đồng bộ cờ isContinuousMode và tốc độ quét
            isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
            clearTimeout(stopTimer);
            targetFPS = (speedSelect && speedSelect.value === 'slow') ? 15 : 60;
            const groupSpeed = document.getElementById('groupSpeed');
            if (groupSpeed) groupSpeed.style.display = isContinuousMode ? 'block' : 'none';
        }

        if (typeof updateToolbarButtonsVisibility === 'function') updateToolbarButtonsVisibility();
        if (typeof saveAppState === 'function') saveAppState();
    }



    // Trạng thái mốc chuẩn nguồn âm (r0, L0) xác định tại chỗ
    const sourceRefState = {
        r0: (function() {
            const v = parseFloat(localStorage.getItem('fox_source_ref_r0') || '');
            return (Number.isFinite(v) && v > 0) ? v : null;
        })(),
        L0: (function() {
            const v = parseFloat(localStorage.getItem('fox_source_ref_L0') || '');
            return (Number.isFinite(v) && v > 0) ? v : null;
        })(),
        isSampling: false,
        sampleInterval: null,
        sampleTimeout: null
    };

    function isSourceRefReady() {
        return Number.isFinite(sourceRefState.r0) && sourceRefState.r0 > 0 &&
               Number.isFinite(sourceRefState.L0) && sourceRefState.L0 > 0;
    }

    function stopSourceRefSampling() {
        if (sourceRefState.sampleInterval) {
            clearInterval(sourceRefState.sampleInterval);
            sourceRefState.sampleInterval = null;
        }
        if (sourceRefState.sampleTimeout) {
            clearTimeout(sourceRefState.sampleTimeout);
            sourceRefState.sampleTimeout = null;
        }
        sourceRefState.isSampling = false;
        const btn = document.getElementById('btnMeasureSourceL0');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🎙️ Đo lấy mốc L₀ (1.5s)';
        }
    }

    function updateSourceRefUI() {
        const r0El = document.getElementById('sourceRefR0Input');
        const l0El = document.getElementById('sourceRefL0Input');
        const badge = document.getElementById('sourceRefBadge');
        const msgEl = document.getElementById('sourceRefStatusMsg');

        if (r0El && document.activeElement !== r0El) {
            r0El.value = (sourceRefState.r0 !== null) ? sourceRefState.r0 : '';
        }
        if (l0El && document.activeElement !== l0El) {
            l0El.value = (sourceRefState.L0 !== null) ? sourceRefState.L0.toFixed(1) : '';
        }

        if (badge) {
            if (isSourceRefReady()) {
                badge.textContent = `✅ Đã chốt: r₀ = ${sourceRefState.r0} m | L₀ = ${sourceRefState.L0.toFixed(1)} dB`;
                badge.style.background = '#dcfce7';
                badge.style.color = '#15803d';
                badge.style.borderColor = '#86efac';
            } else {
                badge.textContent = 'Chưa xác định mốc';
                badge.style.background = '#fef3c7';
                badge.style.color = '#b45309';
                badge.style.borderColor = '#fcd34d';
            }
        }

        if (msgEl && !sourceRefState.isSampling) {
            if (isSourceRefReady()) {
                msgEl.innerHTML = `✅ Sẵn sàng tính khoảng cách nguồn âm theo mốc chuẩn <b>r₀ = ${sourceRefState.r0} m</b>, <b>L₀ = ${sourceRefState.L0.toFixed(1)} dB</b>.`;
                msgEl.style.color = '#15803d';
            } else {
                msgEl.innerHTML = '💡 Bắt buộc xác định <b>r₀, L₀</b> trước khi tính khoảng cách nguồn âm (<i>r = r₀ · 10<sup>(L₀ − L)/20</sup></i>).';
                msgEl.style.color = '#475569';
            }
        }
    }

    function syncSourceRefFromInputs() {
        const r0El = document.getElementById('sourceRefR0Input');
        const l0El = document.getElementById('sourceRefL0Input');
        if (!r0El || !l0El) return;

        const r0Val = parseFloat(r0El.value);
        const l0Val = parseFloat(l0El.value);

        if (Number.isFinite(r0Val) && r0Val > 0) {
            sourceRefState.r0 = r0Val;
            localStorage.setItem('fox_source_ref_r0', r0Val.toString());
        } else {
            sourceRefState.r0 = null;
            localStorage.removeItem('fox_source_ref_r0');
        }

        if (Number.isFinite(l0Val) && l0Val > 0) {
            sourceRefState.L0 = l0Val;
            localStorage.setItem('fox_source_ref_L0', l0Val.toString());
        } else {
            sourceRefState.L0 = null;
            localStorage.removeItem('fox_source_ref_L0');
        }

        updateSourceRefUI();
    }

    function getCurrentCalibratedDbForRef(channel = 'A') {
        const cfg = channelConfig[channel];
        if (cfg && cfg.active && cfg.data && cfg.index > 1024) {
            const chunkSize = 1024;
            const recent = new Float32Array(chunkSize);
            const len = cfg.data.length, idx = cfg.index;
            for (let i = 0; i < chunkSize; i++) {
                recent[i] = cfg.data[((idx - chunkSize + i) % len + len) % len];
            }
            return calculateRMSdB(recent, channel, false);
        }
        const history = (channel === 'B') ? dbHistoryB : dbHistoryA;
        if (history && history.length > 0) {
            return history[history.length - 1].db;
        }
        return null;
    }

    async function measureSourceRefL0() {
        const r0El = document.getElementById('sourceRefR0Input');
        const l0El = document.getElementById('sourceRefL0Input');
        const btn = document.getElementById('btnMeasureSourceL0');
        const msgEl = document.getElementById('sourceRefStatusMsg');

        const r0Val = parseFloat(r0El ? r0El.value : '');
        if (!Number.isFinite(r0Val) || r0Val <= 0) {
            alert('⚠️ Vui lòng nhập khoảng cách mốc r₀ > 0 (mét) trước khi đo lấy mốc L₀!');
            if (r0El) r0El.focus();
            return;
        }

        if (!channelConfig.A.active) {
            alert('⚠️ Kênh A đang khóa! Vui lòng bật Micro Kênh A trên thanh công cụ trước khi đo lấy mốc L₀.');
            return;
        }

        if (sourceRefState.isSampling) return;

        // Đảm bảo AudioContext đang chạy để thu mẫu trực tiếp ngay trong modal hiệu chuẩn
        if (audioCtx && audioCtx.state === 'suspended') {
            try { await audioCtx.resume(); } catch (e) {}
        }
        const wasPausedBeforeSample = isPaused;
        if (wasPausedBeforeSample) {
            isPaused = false;
        }

        sourceRefState.isSampling = true;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Đang lấy mẫu 1.5s...';
        }
        if (msgEl) {
            msgEl.innerHTML = `🎙️ Đang thu mẫu âm thanh tại vị trí mốc <b>r₀ = ${r0Val} m</b> trong 1,5 giây...`;
            msgEl.style.color = '#0284c7';
        }

        const samples = [];
        sourceRefState.sampleInterval = setInterval(() => {
            const dbVal = getCurrentCalibratedDbForRef('A');
            if (typeof dbVal === 'number' && Number.isFinite(dbVal) && dbVal > 0) {
                samples.push(dbVal);
            }
        }, 100);

        sourceRefState.sampleTimeout = setTimeout(() => {
            stopSourceRefSampling();
            if (wasPausedBeforeSample) {
                isPaused = true;
            }

            if (samples.length > 0) {
                const avgL0 = samples.reduce((sum, v) => sum + v, 0) / samples.length;
                sourceRefState.r0 = r0Val;
                sourceRefState.L0 = parseFloat(avgL0.toFixed(1));
                localStorage.setItem('fox_source_ref_r0', sourceRefState.r0.toString());
                localStorage.setItem('fox_source_ref_L0', sourceRefState.L0.toString());
                if (l0El) l0El.value = sourceRefState.L0.toFixed(1);
                updateSourceRefUI();
            } else {
                if (msgEl) {
                    msgEl.innerHTML = '❌ Không thu được tín hiệu âm thanh hợp lệ! Hãy kiểm tra Micro Kênh A và thử lại.';
                    msgEl.style.color = '#dc2626';
                }
            }
        }, 1500);
    }

    function clearSourceRefCalibration(silent = false) {
        stopSourceRefSampling();
        sourceRefState.r0 = null;
        sourceRefState.L0 = null;
        localStorage.removeItem('fox_source_ref_r0');
        localStorage.removeItem('fox_source_ref_L0');
        const r0El = document.getElementById('sourceRefR0Input');
        const l0El = document.getElementById('sourceRefL0Input');
        if (r0El) r0El.value = '';
        if (l0El) l0El.value = '';
        updateSourceRefUI();
        if (!silent && document.getElementById('mcdModalOverlay').style.display === 'flex' &&
            document.getElementById('distanceResultBox').style.display === 'block') {
            calculateAvgDistance();
        }
    }

    function openCalibModal(focusSourceRef = false) {
        const overlay = document.getElementById('calibModalOverlay');
        if (overlay) overlay.style.display = 'flex';
        const chBBox = document.getElementById('calibChannelBBox');
        if (chBBox) {
            chBBox.style.display = (getActiveChannelMode() === '2') ? 'block' : 'none';
        }
        updateCalibDisplay();
        updateSourceRefUI();
        if (focusSourceRef) {
            setTimeout(() => {
                const r0El = document.getElementById('sourceRefR0Input');
                if (r0El) r0El.focus();
            }, 60);
        }
    }

    function closeCalibModal() {
        stopSourceRefSampling();
        const overlay = document.getElementById('calibModalOverlay');
        if (overlay) overlay.style.display = 'none';
        if (typeof openMcdModal === 'function' && document.getElementById('mcdModalOverlay').style.display === 'flex') {
            const wasDistOpen = (document.getElementById('distanceResultBox').style.display === 'block');
            openMcdModal();
            if (wasDistOpen && isSourceRefReady()) {
                calculateAvgDistance();
            }
        }
    }

    function getLatestRawDb(channel) {
        const history = (channel === 'B') ? dbHistoryB : dbHistoryA;
        if (history.length > 0) {
            return history[history.length - 1].rawDb;
        }
        const cfg = channelConfig[channel];
        if (cfg && cfg.active && cfg.data && cfg.index > 1024) {
            const chunkSize = 1024;
            const recent = new Float32Array(chunkSize);
            const len = cfg.data.length, idx = cfg.index;
            for (let i = 0; i < chunkSize; i++) {
                recent[i] = cfg.data[((idx - chunkSize + i) % len + len) % len];
            }
            return calculateRMSdB(recent, channel, true);
        }
        return null;
    }

    function syncDbHistoryWithOffsets() {
        dbHistoryA.forEach(item => {
            if (typeof item.rawDb === 'number') {
                item.db = Math.max(30.0, Math.min(120.0, item.rawDb + micCalibOffsetA));
            }
        });
        dbHistoryB.forEach(item => {
            if (typeof item.rawDb === 'number') {
                item.db = Math.max(30.0, Math.min(120.0, item.rawDb + micCalibOffsetB));
            }
        });
    }

    function updateCalibDisplay() {
        const rawAEl = document.getElementById('calibRawValueA');
        const rawBEl = document.getElementById('calibRawValueB');
        const offAEl = document.getElementById('calibOffsetDisplayA');
        const offBEl = document.getElementById('calibOffsetDisplayB');

        const lastA = getLatestRawDb('A');
        const lastB = getLatestRawDb('B');

        if (rawAEl) rawAEl.innerText = (lastA !== null) ? (lastA.toFixed(1) + " dB") : "-- dB (Chưa có mẫu)";
        if (rawBEl) rawBEl.innerText = (lastB !== null) ? (lastB.toFixed(1) + " dB") : "-- dB (Chưa có mẫu)";

        if (offAEl) offAEl.innerText = (micCalibOffsetA >= 0 ? "+" : "") + micCalibOffsetA.toFixed(1) + " dB";
        if (offBEl) offBEl.innerText = (micCalibOffsetB >= 0 ? "+" : "") + micCalibOffsetB.toFixed(1) + " dB";
    }

    function applyCalibFromRef(channel) {
        let inputId = (channel === 'B') ? 'calibRefInputB' : 'calibRefInputA';
        let refVal = parseFloat(document.getElementById(inputId).value);
        if (isNaN(refVal) || refVal <= 0) {
            alert("⚠️ Vui lòng nhập Mức cường độ âm chuẩn hợp lệ (dB)!");
            return;
        }

        let rawVal = getLatestRawDb(channel);
        if (rawVal === null) {
            alert(`⚠️ Chưa có dữ liệu âm thanh đo được trên Kênh ${channel}! Vui lòng bật Micro và bấm "Đo / Dừng" lấy mẫu trước khi hiệu chuẩn.`);
            return;
        }

        let offset = refVal - rawVal;
        if (channel === 'B') {
            micCalibOffsetB = offset;
            localStorage.setItem('fox_mic_calib_offset_b', offset.toString());
        } else {
            micCalibOffsetA = offset;
            localStorage.setItem('fox_mic_calib_offset_a', offset.toString());
        }

        syncDbHistoryWithOffsets();
        updateCalibDisplay();
        if (getDisplayMode() === 'dbMeter' && typeof drawFrame === 'function') drawFrame();
        alert(`✅ Đã hiệu chuẩn Kênh ${channel}! Offset mới ΔL = ${offset >= 0 ? '+' : ''}${offset.toFixed(1)} dB`);
    }

    function resetCalibOffsets() {
        micCalibOffsetA = 0.0;
        micCalibOffsetB = 0.0;
        localStorage.removeItem('fox_mic_calib_offset_a');
        localStorage.removeItem('fox_mic_calib_offset_b');
        document.getElementById('calibRefInputA').value = '';
        document.getElementById('calibRefInputB').value = '';
        clearSourceRefCalibration(true);
        syncDbHistoryWithOffsets();
        updateCalibDisplay();
        if (getDisplayMode() === 'dbMeter' && typeof drawFrame === 'function') drawFrame();
        alert("🔄 Đã đặt lại Offset Micro về 0 dB và xóa mốc chuẩn (r₀, L₀)!");
    }

    function openMcdModal() {
        const overlay = document.getElementById('mcdModalOverlay');
        overlay.style.display = 'flex';
        document.getElementById('distanceResultBox').style.display = 'none';

        function buildDbHistory(historyArr, channelCfg, channelName) {
            if (historyArr.length === 0 && channelCfg && channelCfg.data && channelCfg.active && channelCfg.index > 1024) {
                let chunkSize = 1024;
                let maxSamples = Math.min(channelCfg.index, sampleRate * 1);
                let chunks = Math.floor(maxSamples / chunkSize);
                if (chunks > 120) chunks = 120;
                
                let len = channelCfg.data.length;
                let cIdx = channelCfg.index;
                let now = performance.now();
                
                for (let c = chunks - 1; c >= 0; c--) {
                    let chunkStart = cIdx - (c + 1) * chunkSize;
                    let chunk = new Float32Array(chunkSize);
                    for (let i = 0; i < chunkSize; i++) {
                        chunk[i] = channelCfg.data[((chunkStart + i) % len + len) % len];
                    }
                    let calDb = calculateRMSdB(chunk, channelName, false);
                    let rDb = calculateRMSdB(chunk, channelName, true);
                    historyArr.push({ time: now - c * 50, elapsedMs: (chunks - 1 - c) * 50, db: calDb, rawDb: rDb });
                }
            }
        }

        buildDbHistory(dbHistoryA, channelConfig.A, 'A');
        buildDbHistory(dbHistoryB, channelConfig.B, 'B');
        syncDbHistoryWithOffsets();

        const mode = getActiveChannelMode();
        const tableContainer = document.getElementById('mcdReportTableContainer');

        if (mode === '2') {
            let calDbA = dbHistoryA.map(h => h.db);
            let calDbB = dbHistoryB.map(h => h.db);

            let calAvgA = calDbA.length > 0 ? (calDbA.reduce((a, b) => a + b, 0) / calDbA.length) : 0;
            let calAvgB = calDbB.length > 0 ? (calDbB.reduce((a, b) => a + b, 0) / calDbB.length) : 0;
            let calMaxA = calDbA.length > 0 ? Math.max(...calDbA) : 0;
            let calMaxB = calDbB.length > 0 ? Math.max(...calDbB) : 0;

            let htmlContent = `
                <div style="padding: 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 15px; text-transform: uppercase;">
                        📊 BẢNG THỐNG KÊ MỨC CƯỜNG ĐỘ ÂM (MCĐ)
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13.5px;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left; color: #475569;">
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Vị trí đo</th>
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Mức cường độ âm L<sub>tb</sub> (dB)</th>
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Mức cực đại L<sub>max</sub> (dB)</th>
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Đánh giá ngưỡng an toàn</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #dc2626;">Kênh A (Vị trí 1)</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 14px;">${calAvgA.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #64748b;">${calMaxA.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: ${calAvgA > SAFETY_THRESHOLD_DB ? '#dc2626' : '#059669'}; font-weight: bold;">
                                    ${calAvgA > SAFETY_THRESHOLD_DB ? '⚠️ CẢNH BÁO Ô NHIỄM TIẾNG ỒN' : '✅ Đạt chuẩn môi trường'}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #2563eb;">Kênh B (Vị trí 2)</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 14px;">${calAvgB.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #64748b;">${calMaxB.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: ${calAvgB > SAFETY_THRESHOLD_DB ? '#dc2626' : '#059669'}; font-weight: bold;">
                                    ${calAvgB > SAFETY_THRESHOLD_DB ? '⚠️ CẢNH BÁO Ô NHIỄM TIẾNG ỒN' : '✅ Đạt chuẩn môi trường'}
                                </td>
                            </tr>
                            <tr style="background: #faf5ff;">
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold;">Chênh lệch (ΔL = L<sub>A</sub> - L<sub>B</sub>)</td>
                                <td colspan="2" style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #8b5cf6; font-size: 14px;">${(calAvgA - calAvgB).toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #6b21a8; font-weight: 600;">Dùng tính tỷ số khoảng cách r<sub>B</sub>/r<sub>A</sub></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            tableContainer.innerHTML = htmlContent;
        } else {
            let calDbValues = dbHistoryA.map(h => h.db);
            let calMaxDb = calDbValues.length > 0 ? Math.max(...calDbValues) : 0;
            let calMinDb = calDbValues.length > 0 ? Math.min(...calDbValues) : 0;
            let calAvgDb = calDbValues.length > 0 ? (calDbValues.reduce((a, b) => a + b, 0) / calDbValues.length) : 0;

            let htmlContent = `
                <div style="padding: 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px;">
                    <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-size: 15px; text-transform: uppercase;">
                        📊 BẢNG THỐNG KÊ MỨC CƯỜNG ĐỘ ÂM (MCĐ)
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13.5px;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left; color: #475569;">
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Thông số đo</th>
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Giá trị đo (dB)</th>
                                <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Đánh giá ngưỡng an toàn</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Mức cường độ âm Lớn nhất (L<sub>max</sub>)</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${calMaxDb > SAFETY_THRESHOLD_DB ? '#dc2626' : '#0f172a'}; font-size: 14px;">${calMaxDb.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: ${calMaxDb > SAFETY_THRESHOLD_DB ? '#dc2626' : '#059669'}; font-weight: bold;">
                                    ${calMaxDb > SAFETY_THRESHOLD_DB ? `⚠️ VƯỢT NGƯỠNG AN TOÀN (>${SAFETY_THRESHOLD_DB} dB)` : '✅ An toàn thính giác'}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Mức cường độ âm Nhỏ nhất (L<sub>min</sub>)</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 14px;">${calMinDb.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #059669; font-weight: bold;">✅ Bình thường</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">Mức cường độ âm Trung bình (L<sub>tb</sub>)</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: ${calAvgDb > SAFETY_THRESHOLD_DB ? '#dc2626' : '#0f172a'}; font-size: 14px;">${calAvgDb.toFixed(1)} dB</td>
                                <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: ${calAvgDb > SAFETY_THRESHOLD_DB ? '#dc2626' : '#059669'}; font-weight: bold;">
                                    ${calAvgDb > SAFETY_THRESHOLD_DB ? '⚠️ CẢNH BÁO Ô NHIỄM TIẾNG ỒN' : '✅ Đạt chuẩn môi trường'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            tableContainer.innerHTML = htmlContent;
        }

        const mcdModalEl = document.getElementById('mcdModal');
        if (mcdModalEl && window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([mcdModalEl]).catch(err => console.log('MathJax error:', err));
        }
    }

    function closeMcdModal() {
        const overlay = document.getElementById('mcdModalOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    // TÍNH KHOẢNG CÁCH NGUỒN ÂM DỰA TRÊN MỐC CHUẨN (r0, L0) ĐÃ XÁC ĐỊNH TẠI CHỖ
    function calculateAvgDistance() {
        const mode = getActiveChannelMode();
        const box = document.getElementById('distanceResultBox');
        box.style.display = 'block';

        if (!isSourceRefReady()) {
            box.innerHTML = `
                <div style="background:#fffbeb; border:1.5px solid #f59e0b; border-radius:8px; padding:12px 14px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px;">
                    <div style="color:#92400e; font-size:13px; line-height:1.5;">
                        <b>⚠️ Chưa xác định mốc chuẩn nguồn âm (r₀, L₀)!</b><br>
                        Vui lòng mở mục <b>🎯 Hiệu chuẩn</b> để đo hoặc nhập cặp thông số tham chiếu <b>(r₀, L₀)</b> tại chỗ trước khi tính khoảng cách.
                    </div>
                    <button type="button" class="btn-orange" onclick="openCalibModal(true)" style="padding:7px 12px; font-size:12.5px;">
                        🎯 Mở Hiệu chuẩn &amp; Xác định r₀, L₀
                    </button>
                </div>
            `;
            return;
        }

        const r0 = sourceRefState.r0;
        const L0 = sourceRefState.L0;

        if (mode === '2') {
            if (dbHistoryA.length === 0 || dbHistoryB.length === 0) {
                box.innerHTML = `<div style="color:#dc2626; font-weight:bold; padding:8px;">⚠️ Chưa đủ dữ liệu đo ở cả 2 kênh A và B! Vui lòng bấm "Đo / Dừng" để lấy mẫu trước.</div>`;
                return;
            }

            let avgDbA = dbHistoryA.reduce((sum, item) => sum + item.db, 0) / dbHistoryA.length;
            let avgDbB = dbHistoryB.reduce((sum, item) => sum + item.db, 0) / dbHistoryB.length;
            
            let rA = r0 * Math.pow(10, (L0 - avgDbA) / 20);
            let rB = r0 * Math.pow(10, (L0 - avgDbB) / 20);
            let deltaR = Math.abs(rA - rB);
            let ratio = Math.pow(10, (avgDbA - avgDbB) / 20);

            box.innerHTML = `
                <div class="dist-header-bar">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="font-size:16px;">📐</span>
                        <span style="font-weight:700; color:#0f172a; font-size:14px; text-transform:uppercase;">KẾT QUẢ TÍNH KHOẢNG CÁCH NGUỒN ÂM ($r_A, r_B$)</span>
                        <button type="button" class="btn-slate" onclick="openCalibModal(true)" style="padding:2px 8px; font-size:11px;">✏️ Đổi mốc (r₀=${r0}m; L₀=${L0.toFixed(1)}dB)</button>
                    </div>
                    <div class="dist-formula-badge">
                        <span>Công thức:</span>
                        <span>$r = r_0 \\cdot 10^{\\frac{L_0 - L}{20}}$</span>
                    </div>
                </div>

                <div class="dist-card-container">
                    <div class="dist-card dist-card-border-a">
                        <div class="dist-card-title">KHOẢNG CÁCH KÊNH A:</div>
                        <div class="dist-card-value" style="color:#ef4444;">${rA.toFixed(2)} <span style="font-size:14px; font-weight:bold;">m</span></div>
                        <div class="dist-card-sub">$L_{A,tb} = ${avgDbA.toFixed(1)}\\text{ dB}$ (Mốc $r_0=${r0}\\text{ m}, L_0=${L0.toFixed(1)}\\text{ dB}$)</div>
                    </div>

                    <div class="dist-card dist-card-border-b">
                        <div class="dist-card-title">KHOẢNG CÁCH KÊNH B:</div>
                        <div class="dist-card-value" style="color:#3b82f6;">${rB.toFixed(2)} <span style="font-size:14px; font-weight:bold;">m</span></div>
                        <div class="dist-card-sub">$L_{B,tb} = ${avgDbB.toFixed(1)}\\text{ dB}$ (Mốc $r_0=${r0}\\text{ m}, L_0=${L0.toFixed(1)}\\text{ dB}$)</div>
                    </div>

                    <div class="dist-card dist-card-border-diff">
                        <div class="dist-card-title">KHOẢNG CÁCH GIỮA HAI KÊNH</div>
                        <div class="dist-card-value" style="color:#10b981;">${deltaR.toFixed(2)} <span style="font-size:14px; font-weight:bold;">m</span></div>
                        <div class="dist-card-sub">$\\Delta r = |r_A - r_B|$</div>
                    </div>

                    <div class="dist-card dist-card-border-ratio">
                        <div class="dist-card-title">TỶ SỐ KHOẢNG CÁCH HAI KÊNH</div>
                        <div class="dist-card-value" style="color:#8b5cf6;">${ratio.toFixed(3)} <span style="font-size:14px; font-weight:bold;">lần</span></div>
                        <div class="dist-card-sub">$10^{\\frac{L_A - L_B}{20}}$</div>
                    </div>
                </div>
            `;
        } else {
            if (dbHistoryA.length === 0) {
                box.innerHTML = `<div style="color:#dc2626; font-weight:bold; padding:8px;">⚠️ Chưa có dữ liệu đo cường độ âm! Vui lòng thực hiện đo trước.</div>`;
                return;
            }
            let avgDb = dbHistoryA.reduce((sum, item) => sum + item.db, 0) / dbHistoryA.length;
            let dist = r0 * Math.pow(10, (L0 - avgDb) / 20);

            box.innerHTML = `
                <div class="dist-header-bar">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span style="font-size:16px;">📐</span>
                        <span style="font-weight:700; color:#0f172a; font-size:14px; text-transform:uppercase;">KẾT QUẢ TÍNH KHOẢNG CÁCH NGUỒN ÂM TỚI MICRO</span>
                        <button type="button" class="btn-slate" onclick="openCalibModal(true)" style="padding:2px 8px; font-size:11px;">✏️ Đổi mốc (r₀=${r0}m; L₀=${L0.toFixed(1)}dB)</button>
                    </div>
                    <div class="dist-formula-badge">
                        <span>Công thức:</span>
                        <span>$r = r_0 \\cdot 10^{\\frac{L_0 - L}{20}}$</span>
                    </div>
                </div>

                <div class="dist-card-container">
                    <div class="dist-card dist-card-border-a">
                        <div class="dist-card-title">KHOẢNG CÁCH ĐO ĐƯỢC</div>
                        <div class="dist-card-value" style="color:#ef4444;">${dist.toFixed(2)} <span style="font-size:14px; font-weight:bold;">m</span></div>
                        <div class="dist-card-sub">Theo mốc chuẩn tại chỗ: $L_0 = ${L0.toFixed(1)}\\text{ dB}$ tại $r_0 = ${r0}\\text{ m}$ ($L_{tb} = ${avgDb.toFixed(1)}\\text{ dB}$)</div>
                    </div>
                </div>
            `;
        }

        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([box]).catch(err => console.log('MathJax error:', err));
        }
    }

    let fftSweepAnimId = null;
    let fftSweepActive = false;
    let fftSweepProgress = 1;
    let fftSweepStartTime = 0;
    let fftSelectedPeakFreq = null;
    let fftLastAnalysis = null;
    const FFT_SWEEP_DURATION_MS = 1800;

    function stopFftSweepAnimation() {
        if (fftSweepAnimId) {
            cancelAnimationFrame(fftSweepAnimId);
            fftSweepAnimId = null;
        }
        fftSweepActive = false;
        const scanBtn = document.getElementById('btnScanHarmonics');
        if (scanBtn) {
            scanBtn.disabled = false;
            scanBtn.textContent = 'Quét Họa âm';
        }
    }

    function openFftHarmonicTable(analysis) {
        const panel = document.getElementById('fftHarmonicTablePanel');
        const toggleBtn = document.getElementById('btnToggleFftTable');
        if (analysis) fftLastAnalysis = analysis;
        renderFftHarmonicTable(fftLastAnalysis);
        if (panel) panel.style.display = 'flex';
        if (toggleBtn) {
            toggleBtn.style.display = 'inline-block';
            toggleBtn.textContent = '📊 Ẩn bảng tần số';
            toggleBtn.className = 'btn-orange';
        }
        requestAnimationFrame(() => processAndDrawFFT(1));
    }

    function closeFftHarmonicTable(hideToggleBtn = false) {
        const panel = document.getElementById('fftHarmonicTablePanel');
        const toggleBtn = document.getElementById('btnToggleFftTable');
        if (panel) panel.style.display = 'none';
        if (toggleBtn) {
            if (hideToggleBtn) {
                toggleBtn.style.display = 'none';
            } else {
                toggleBtn.style.display = 'inline-block';
                toggleBtn.textContent = '📊 Bảng tần số & họa âm';
                toggleBtn.className = 'btn-blue';
            }
        }
        const fftOverlay = document.getElementById('fftModalOverlay');
        if (fftOverlay && fftOverlay.style.display === 'flex' && !fftSweepActive) {
            requestAnimationFrame(() => processAndDrawFFT(1));
        }
    }

    function toggleFftHarmonicTable() {
        const panel = document.getElementById('fftHarmonicTablePanel');
        if (!panel) return;
        if (panel.style.display === 'flex') {
            closeFftHarmonicTable(false);
        } else {
            openFftHarmonicTable(fftLastAnalysis);
        }
    }

    function selectFftTableRow(freqHz) {
        fftSelectedPeakFreq = (fftSelectedPeakFreq !== null && Math.abs(fftSelectedPeakFreq - freqHz) < 0.2) ? null : freqHz;
        renderFftHarmonicTable(fftLastAnalysis);
        processAndDrawFFT(1);
    }

    function renderFftHarmonicTable(analysis) {
        const tbody = document.getElementById('fftHarmonicTableBody');
        if (!tbody) return;

        if (!analysis || analysis.isEmptySignal || !analysis.presentPeaks || analysis.presentPeaks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:18px 10px; color:#64748b; font-style:italic;">Chưa ghi nhận đỉnh tần số nổi bật nào trên phổ Kênh A.</td></tr>`;
            return;
        }

        const f0 = analysis.hasValidF0 ? analysis.f0 : null;
        const tolHz = Math.max(analysis.binFreq * 1.4, f0 ? f0 * 0.025 : 15);

        // Gom tất cả các đỉnh tần số nổi bật (>= 5%) và đối chiếu với các họa âm 1f0..5f0
        const mergedItems = analysis.presentPeaks.map(p => ({
            freq: p.freq,
            ampNorm: p.ampNorm,
            harmonicOrder: null
        }));

        if (f0 && analysis.harmonicsList && analysis.harmonicsList.length > 0) {
            for (const h of analysis.harmonicsList) {
                let bestMatchIdx = -1;
                let bestDiff = Infinity;
                for (let i = 0; i < mergedItems.length; i++) {
                    const diff = Math.abs(mergedItems[i].freq - h.targetFreq);
                    if (diff <= tolHz && diff < bestDiff && mergedItems[i].harmonicOrder === null) {
                        bestDiff = diff;
                        bestMatchIdx = i;
                    }
                }
                if (bestMatchIdx !== -1) {
                    mergedItems[bestMatchIdx].harmonicOrder = h.order;
                } else if (h.isPresent) {
                    mergedItems.push({
                        freq: h.targetFreq,
                        ampNorm: h.ampNorm,
                        harmonicOrder: h.order
                    });
                }
            }
        }

        // Xác định đỉnh trội nhất (biên độ lớn nhất = 1.00 / 100.0%)
        let maxAmpItem = mergedItems[0];
        for (const item of mergedItems) {
            if (item.ampNorm > maxAmpItem.ampNorm) maxAmpItem = item;
        }

        // Sắp xếp theo tần số tăng dần (Hz)
        mergedItems.sort((a, b) => a.freq - b.freq);

        let rowsHtml = '';
        mergedItems.forEach((item, idx) => {
            const isDominant = (item === maxAmpItem);
            const ampVal = Math.min(1.0, Math.max(0, item.ampNorm));
            const pctVal = (ampVal * 100).toFixed(1);
            const barWidth = Math.max(3, Math.min(100, ampVal * 100)).toFixed(1);

            let barColor = '#3b82f6';
            let badgeClass = 'fft-ht-badge';
            let badgeText = 'Tần số thành phần';

            if (isDominant && item.harmonicOrder) {
                barColor = '#ef4444';
                badgeClass = 'fft-ht-badge dominant';
                badgeText = `Đỉnh trội nhất • ${item.harmonicOrder}f₀`;
            } else if (isDominant) {
                barColor = '#ef4444';
                badgeClass = 'fft-ht-badge dominant';
                badgeText = 'Đỉnh trội nhất';
            } else if (item.harmonicOrder === 1) {
                barColor = '#f59e0b';
                badgeClass = 'fft-ht-badge fundamental';
                badgeText = 'Họa âm cơ bản (1f₀)';
            } else if (item.harmonicOrder && item.harmonicOrder > 1) {
                barColor = '#8b5cf6';
                badgeClass = 'fft-ht-badge harmonic';
                badgeText = `Họa âm bậc ${item.harmonicOrder} (${item.harmonicOrder}f₀)`;
            }

            const isSelected = (fftSelectedPeakFreq !== null && Math.abs(fftSelectedPeakFreq - item.freq) < 0.2);

            rowsHtml += `
                <tr class="${isSelected ? 'fft-ht-row-active' : ''}" onclick="selectFftTableRow(${item.freq.toFixed(1)})" title="Nhấn để đánh dấu tần số ${item.freq.toFixed(1)} Hz trên đồ thị">
                    <td class="fft-ht-stt">${idx + 1}</td>
                    <td class="fft-ht-freq">${item.freq.toFixed(1)} Hz</td>
                    <td>
                        <div class="fft-ht-amp-wrap">
                            <div class="fft-ht-amp-text">
                                <span class="fft-ht-amp-val">${ampVal.toFixed(2)}</span>
                                <span class="fft-ht-amp-pct">(${pctVal}%)</span>
                            </div>
                            <div class="fft-ht-bar-track">
                                <div class="fft-ht-bar-fill" style="width:${barWidth}%; background:${barColor};"></div>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <span class="${badgeClass}">${badgeText}</span>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = rowsHtml;
    }

    function openFFTModal() {
        if (getDisplayMode() !== 'oscilloscope' || getActiveChannelMode() !== '1' || isContinuousMode || (modeSelect && modeSelect.value === 'continuous')) {
            return;
        }
        if (isDemoMode) { alert("Chức năng Phân tích Họa âm FFT chỉ có trên bản Full."); return; }
        if (typeof resetManualAnalysisState === 'function') resetManualAnalysisState();
        if (typeof closeKinematicsModal === 'function' && isKinematicsModalOpen) closeKinematicsModal();
        stopFftSweepAnimation();
        closeFftHarmonicTable(true);
        fftSelectedPeakFreq = null;
        fftLastAnalysis = null;
        fftSweepProgress = 1;

        const overlay = document.getElementById('fftModalOverlay');
        overlay.classList.add('animUI-visible');
        overlay.style.display = 'flex';

        // Luôn để trống ô tần số f0 để người dùng tự nhập hoặc bấm Quét Họa âm
        const inputFreq = document.getElementById('fftTargetFreq');
        if (inputFreq) inputFreq.value = '';

        setTimeout(() => {
            processAndDrawFFT(1);
            if (inputFreq) inputFreq.focus();
        }, 120);
    }

    function closeFFTModal() {
        if (typeof cacheFftSnapshotForReport === 'function') cacheFftSnapshotForReport();
        stopFftSweepAnimation();
        closeFftHarmonicTable(true);
        fftSelectedPeakFreq = null;
        fftLastAnalysis = null;
        fftSweepProgress = 1;
        const overlay = document.getElementById('fftModalOverlay');
        const inputFreq = document.getElementById('fftTargetFreq');
        if (inputFreq) inputFreq.value = '';
        overlay.classList.remove('animUI-visible');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }

    function onFftFreqInput() {
        stopFftSweepAnimation();
        fftSweepProgress = 1;
        const analysis = processAndDrawFFT(1);
        const panel = document.getElementById('fftHarmonicTablePanel');
        if (panel && panel.style.display === 'flex' && analysis) {
            fftLastAnalysis = analysis;
            renderFftHarmonicTable(analysis);
        }
    }

    function analyzeFFTSpectrum(f0) {
        if (!channelConfig.A.data || channelConfig.A.index <= 0) return null;
        const fftSize = 4096;
        const recentData = new Float32Array(fftSize);
        const len = channelConfig.A.data.length;
        const cIdx = channelConfig.A.index;

        for (let i = 0; i < fftSize; i++) {
            const multiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
            recentData[i] = channelConfig.A.data[((cIdx - fftSize + i) % len + len) % len] * multiplier;
        }

        const magnitudes = computeFFT(recentData);
        const binFreq = sampleRate / fftSize;
        const maxFreqShow = 5000;
        const limitBins = Math.min(magnitudes.length, Math.floor(maxFreqShow / binFreq));

        let maxMag = 0;
        const minBin = Math.max(2, Math.ceil(45 / binFreq));
        for (let i = minBin; i < limitBins; i++) {
            if (magnitudes[i] > maxMag) maxMag = magnitudes[i];
        }

        const hasValidF0 = (typeof f0 === 'number' && !isNaN(f0) && f0 > 0);
        if (maxMag <= 1e-9) {
            return {
                magnitudes, binFreq, maxFreqShow, limitBins, maxMag: 1,
                hasValidF0,
                f0: hasValidF0 ? f0 : null,
                presentPeaks: [],
                harmonicsList: [],
                isEmptySignal: true
            };
        }

        // Quét tất cả đỉnh phổ tần số nổi bật (>= 5% đỉnh lớn nhất)
        const presentPeaks = [];
        for (let i = minBin + 1; i < limitBins - 1; i++) {
            const mPrev = magnitudes[i - 1];
            const mCurr = magnitudes[i];
            const mNext = magnitudes[i + 1];
            if (mCurr >= mPrev && mCurr > mNext) {
                const denom = (mPrev - 2 * mCurr + mNext);
                let delta = 0;
                if (Math.abs(denom) > 1e-12) {
                    delta = 0.5 * (mPrev - mNext) / denom;
                    if (Math.abs(delta) > 1) delta = 0;
                }
                const exactFreq = (i + delta) * binFreq;
                const peakMag = mCurr - 0.25 * (mPrev - mNext) * delta;
                const ampNorm = Math.min(1.0, Math.max(0, peakMag / maxMag));
                if (ampNorm >= 0.05) {
                    presentPeaks.push({ freq: exactFreq, ampNorm, peakMag });
                }
            }
        }
        presentPeaks.sort((a, b) => b.ampNorm - a.ampNorm);

        // Tính các họa âm 1f0, 2f0, 3f0, 4f0, 5f0 (tối đa tới 5000 Hz)
        const harmonicsList = [];
        if (hasValidF0) {
            for (let n = 1; n <= 5; n++) {
                const targetFreq = f0 * n;
                if (targetFreq > maxFreqShow) break;
                const centerBin = Math.round(targetFreq / binFreq);
                if (centerBin >= limitBins) break;

                let bestBin = centerBin;
                let bestMag = magnitudes[centerBin];
                for (let b = Math.max(minBin, centerBin - 1); b <= Math.min(limitBins - 1, centerBin + 1); b++) {
                    if (magnitudes[b] > bestMag) {
                        bestMag = magnitudes[b];
                        bestBin = b;
                    }
                }
                const ampNorm = Math.min(1.0, bestMag / maxMag);
                harmonicsList.push({
                    order: n,
                    targetFreq,
                    detectedFreq: bestBin * binFreq,
                    ampNorm,
                    isPresent: ampNorm >= 0.05
                });
            }
        }

        return {
            magnitudes,
            binFreq,
            maxFreqShow,
            limitBins,
            maxMag,
            hasValidF0,
            f0: hasValidF0 ? f0 : null,
            presentPeaks,
            harmonicsList,
            isEmptySignal: false
        };
    }

    function startHarmonicSweep() {
        stopFftSweepAnimation();
        closeFftHarmonicTable(true);
        fftSelectedPeakFreq = null;
        const inputEl = document.getElementById('fftTargetFreq');
        const scanBtn = document.getElementById('btnScanHarmonics');
        let f0 = inputEl ? parseFloat(inputEl.value.trim()) : NaN;

        // Nếu người dùng chưa tự nhập f0 mà bấm Quét Họa âm, tự động dò tần số cơ bản từ đỉnh phổ trội nhất
        if (isNaN(f0) || f0 <= 0) {
            const probe = analyzeFFTSpectrum(NaN);
            if (probe && !probe.isEmptySignal && probe.presentPeaks.length > 0) {
                const candidate = probe.presentPeaks.find(p => p.freq >= 45 && p.freq <= 2500) || probe.presentPeaks[0];
                if (candidate && candidate.freq > 0) {
                    f0 = Math.round(candidate.freq * 10) / 10;
                    if (inputEl) inputEl.value = Number.isInteger(f0) ? String(f0) : f0.toFixed(1);
                }
            }
        }

        fftSweepActive = true;
        fftSweepProgress = 0;
        fftSweepStartTime = performance.now();
        if (scanBtn) {
            scanBtn.disabled = true;
            scanBtn.textContent = '⏳ Đang quét...';
        }

        function stepSweep(now) {
            if (!fftSweepActive) return;
            const elapsed = now - fftSweepStartTime;
            const rawT = Math.min(1, elapsed / FFT_SWEEP_DURATION_MS);
            // Ease-out mượt mà khi tia quét lướt qua phổ tần số
            fftSweepProgress = 1 - Math.pow(1 - rawT, 1.45);
            processAndDrawFFT(fftSweepProgress);

            if (rawT < 1) {
                fftSweepAnimId = requestAnimationFrame(stepSweep);
            } else {
                fftSweepActive = false;
                fftSweepAnimId = null;
                fftSweepProgress = 1;
                if (scanBtn) {
                    scanBtn.disabled = false;
                    scanBtn.textContent = 'Quét Họa âm';
                }
                const finalAnalysis = processAndDrawFFT(1);
                openFftHarmonicTable(finalAnalysis);
            }
        }

        fftSweepAnimId = requestAnimationFrame(stepSweep);
    }

    function processAndDrawFFT(sweepRatio = 1) {
        if (!channelConfig.A.data) return null;
        const inputEl = document.getElementById('fftTargetFreq');
        const rawVal = inputEl ? inputEl.value.trim() : '';
        const f0 = rawVal === '' ? NaN : parseFloat(rawVal);

        const analysis = analyzeFFTSpectrum(f0);

        const fftCanvas = document.getElementById('fftDisplayCanvas');
        const fCtx = fftCanvas.getContext('2d');
        const cw = Math.max(260, fftCanvas.clientWidth || (fftCanvas.parentElement.clientWidth - 12));
        const ch = Math.max(200, fftCanvas.clientHeight || (fftCanvas.parentElement.clientHeight - 12));
        fftCanvas.width = cw;
        fftCanvas.height = ch;

        fCtx.fillStyle = '#f8fafc';
        fCtx.fillRect(0, 0, cw, ch);

        const maxFreqShow = analysis ? analysis.maxFreqShow : 5000;
        const plotLeft = 40;
        const plotRight = cw - 10;
        const plotTop = 14;
        const plotBottom = ch - 25;
        const plotW = Math.max(10, plotRight - plotLeft);
        const chartH = Math.max(10, plotBottom - plotTop);

        // Lưới tọa độ
        fCtx.strokeStyle = '#e2e8f0';
        fCtx.lineWidth = 1;
        fCtx.beginPath();
        const gridCols = 10, gridRows = 8;
        for (let i = 1; i < gridCols; i++) {
            const x = plotLeft + (i / gridCols) * plotW;
            fCtx.moveTo(x, plotTop);
            fCtx.lineTo(x, plotBottom);
        }
        for (let i = 1; i < gridRows; i++) {
            const y = plotTop + (i / gridRows) * chartH;
            fCtx.moveTo(plotLeft, y);
            fCtx.lineTo(plotRight, y);
        }
        fCtx.stroke();

        // Trục tọa độ
        fCtx.strokeStyle = '#64748b';
        fCtx.lineWidth = 1.5;
        fCtx.beginPath();
        fCtx.moveTo(plotLeft, plotBottom);
        fCtx.lineTo(plotRight, plotBottom);
        fCtx.moveTo(plotLeft, plotTop);
        fCtx.lineTo(plotLeft, plotBottom);
        fCtx.stroke();

        // Nhãn trục tần số (Hz)
        fCtx.fillStyle = '#475569';
        fCtx.font = '10px "Inter", sans-serif';
        fCtx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
            const freqVal = (maxFreqShow / 5) * i;
            const x = plotLeft + (freqVal / maxFreqShow) * plotW;
            fCtx.beginPath();
            fCtx.moveTo(x, plotBottom);
            fCtx.lineTo(x, plotBottom + 5);
            fCtx.stroke();
            fCtx.fillText(`${freqVal}Hz`, x, ch - 10);
        }
        fCtx.font = 'bold 11px "Inter", sans-serif';
        fCtx.textAlign = 'right';
        fCtx.fillText("Tần số (Hz) ➔", plotRight, ch - 10);

        // Nhãn trục biên độ (A)
        fCtx.textAlign = 'right';
        fCtx.font = '10px "Inter", sans-serif';
        for (let i = 0; i <= 4; i++) {
            const y = plotTop + (chartH / 4) * i;
            const valLabel = (1.0 - i * 0.25).toFixed(2);
            fCtx.fillText(valLabel, 35, y + 3);
        }
        fCtx.save();
        fCtx.translate(15, ch / 2);
        fCtx.rotate(-Math.PI / 2);
        fCtx.font = 'bold 11px "Inter", sans-serif';
        fCtx.textAlign = 'center';
        fCtx.fillText("Biên độ (A)", 0, 0);
        fCtx.restore();

        const currentScanFreq = Math.max(0, Math.min(maxFreqShow, sweepRatio * maxFreqShow));
        const xScan = plotLeft + (currentScanFreq / maxFreqShow) * plotW;

        if (!analysis || analysis.isEmptySignal) {
            if (fftSweepActive && sweepRatio < 1) {
                const trailW = Math.min(90, xScan - plotLeft);
                if (trailW > 2) {
                    const grad = fCtx.createLinearGradient(xScan - trailW, 0, xScan, 0);
                    grad.addColorStop(0, 'rgba(16, 185, 129, 0)');
                    grad.addColorStop(1, 'rgba(16, 185, 129, 0.18)');
                    fCtx.fillStyle = grad;
                    fCtx.fillRect(xScan - trailW, plotTop, trailW, chartH);
                }
                fCtx.strokeStyle = '#10b981';
                fCtx.lineWidth = 2;
                fCtx.beginPath();
                fCtx.moveTo(xScan, plotTop);
                fCtx.lineTo(xScan, plotBottom);
                fCtx.stroke();
            }
            fCtx.fillStyle = '#64748b';
            fCtx.font = '600 12px "Inter", sans-serif';
            fCtx.textAlign = 'center';
            fCtx.fillText("Chưa có dữ liệu âm thanh Kênh A để phân tích phổ.", cw / 2, ch / 2);
            return analysis;
        }

        const { magnitudes, binFreq, limitBins, maxMag, harmonicsList } = analysis;

        // Vẽ đường phổ FFT toàn dải (màu xanh dương)
        fCtx.strokeStyle = '#3b82f6';
        fCtx.lineWidth = 1.6;
        fCtx.beginPath();
        for (let i = 2; i < limitBins; i++) {
            const freq = i * binFreq;
            const x = plotLeft + (freq / maxFreqShow) * plotW;
            const magNorm = magnitudes[i] / maxMag;
            const y = plotBottom - (magNorm * chartH);
            if (i === 2) fCtx.moveTo(x, y); else fCtx.lineTo(x, y);
        }
        fCtx.stroke();

        // Hiệu ứng tia quét họa âm lướt qua phổ tần số
        if (fftSweepActive && sweepRatio < 1) {
            const trailW = Math.min(110, xScan - plotLeft);
            if (trailW > 2) {
                const grad = fCtx.createLinearGradient(xScan - trailW, 0, xScan, 0);
                grad.addColorStop(0, 'rgba(16, 185, 129, 0.0)');
                grad.addColorStop(1, 'rgba(16, 185, 129, 0.22)');
                fCtx.fillStyle = grad;
                fCtx.fillRect(xScan - trailW, plotTop, trailW, chartH);
            }

            fCtx.save();
            fCtx.strokeStyle = '#059669';
            fCtx.lineWidth = 2.2;
            fCtx.beginPath();
            fCtx.moveTo(xScan, plotTop);
            fCtx.lineTo(xScan, plotBottom);
            fCtx.stroke();

            const badgeText = `🔍 Quét: ${Math.round(currentScanFreq)} Hz`;
            fCtx.font = 'bold 11px "JetBrains Mono", monospace';
            const bw = fCtx.measureText(badgeText).width + 12;
            const bx = Math.min(plotRight - bw - 4, Math.max(plotLeft + 4, xScan - bw / 2));
            fCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            fCtx.fillRect(bx, plotTop + 4, bw, 20);
            fCtx.fillStyle = '#34d399';
            fCtx.textAlign = 'left';
            fCtx.fillText(badgeText, bx + 6, plotTop + 18);
            fCtx.restore();
        }

        // Hiển thị các họa âm 1f0, 2f0, 3f0, 4f0, 5f0 đã được tia quét đi qua
        if (analysis.hasValidF0 && harmonicsList.length > 0) {
            const revealedHarmonics = harmonicsList.filter(h => !fftSweepActive || currentScanFreq >= h.targetFreq);
            const occupiedLabelBoxes = [];

            for (const h of revealedHarmonics) {
                const x = plotLeft + (h.targetFreq / maxFreqShow) * plotW;
                const yPeak = plotBottom - (h.ampNorm * chartH);
                const justHit = fftSweepActive && (currentScanFreq - h.targetFreq) >= 0 && (currentScanFreq - h.targetFreq) <= 240;

                // Vạch họa âm thẳng đứng
                fCtx.strokeStyle = h.order === 1 ? '#dc2626' : '#ef4444';
                fCtx.lineWidth = justHit ? 3.5 : 2.5;
                fCtx.beginPath();
                fCtx.moveTo(x, plotBottom);
                fCtx.lineTo(x, yPeak);
                fCtx.stroke();

                // Vòng sáng lan tỏa khi tia quét vừa lướt qua họa âm
                if (justHit) {
                    const pulseRatio = 1 - (currentScanFreq - h.targetFreq) / 240;
                    fCtx.save();
                    fCtx.strokeStyle = `rgba(239, 68, 68, ${(0.75 * pulseRatio).toFixed(2)})`;
                    fCtx.lineWidth = 2;
                    fCtx.beginPath();
                    fCtx.arc(x, yPeak, 6 + (1 - pulseRatio) * 14, 0, 2 * Math.PI);
                    fCtx.stroke();
                    fCtx.restore();
                }

                // Điểm đỉnh họa âm
                fCtx.fillStyle = '#ef4444';
                fCtx.beginPath();
                fCtx.arc(x, yPeak, justHit ? 5 : 3.8, 0, 2 * Math.PI);
                fCtx.fill();
                fCtx.strokeStyle = '#ffffff';
                fCtx.lineWidth = 1.3;
                fCtx.stroke();

                // Nhãn thông tin trực tiếp trên đồ thị (không bị đè lên nhau)
                const labelText = `${h.order}f₀ (${Math.round(h.targetFreq)}Hz) • A=${h.ampNorm.toFixed(2)}`;
                fCtx.font = 'bold 10.5px "Inter", sans-serif';
                const textW = fCtx.measureText(labelText).width;
                const pillW = textW + 8;
                const pillH = 16;
                let pillX = Math.max(plotLeft + 2, Math.min(plotRight - pillW - 2, x - pillW / 2));
                let pillY = Math.max(plotTop + 26, yPeak - 22);

                // Tránh chồng chéo nhãn nếu các họa âm ở gần nhau
                for (let tries = 0; tries < 5; tries++) {
                    const overlap = occupiedLabelBoxes.some(b =>
                        !(pillX + pillW + 4 < b.x || pillX > b.x + b.w + 4 || pillY + pillH + 2 < b.y || pillY > b.y + b.h + 2)
                    );
                    if (!overlap) break;
                    pillY = Math.max(plotTop + 26, pillY - (pillH + 4));
                }
                occupiedLabelBoxes.push({ x: pillX, y: pillY, w: pillW, h: pillH });

                fCtx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                fCtx.fillRect(pillX, pillY, pillW, pillH);
                fCtx.strokeStyle = h.order === 1 ? '#ef4444' : '#cbd5e1';
                fCtx.lineWidth = 1;
                fCtx.strokeRect(pillX, pillY, pillW, pillH);

                fCtx.fillStyle = '#0f172a';
                fCtx.textAlign = 'left';
                fCtx.fillText(labelText, pillX + 4, pillY + 11.5);
            }

            // Huy hiệu trạng thái quét góc trên bên phải
            if (!fftSweepActive) {
                const maxOrder = revealedHarmonics[revealedHarmonics.length - 1].order;
                const statusBadge = `✅ Họa âm f₀ = ${analysis.f0} Hz (1f₀ → ${maxOrder}f₀)`;
                fCtx.font = 'bold 11px "Inter", sans-serif';
                const sw = fCtx.measureText(statusBadge).width + 14;
                const sx = plotRight - sw - 6;
                const sy = plotTop + 4;
                fCtx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                fCtx.fillRect(sx, sy, sw, 20);
                fCtx.fillStyle = '#38bdf8';
                fCtx.textAlign = 'left';
                fCtx.fillText(statusBadge, sx + 7, sy + 14);
            }
        }

        // Đánh dấu tần số đang được chọn từ bảng
        if (!fftSweepActive && fftSelectedPeakFreq !== null && fftSelectedPeakFreq >= 0 && fftSelectedPeakFreq <= maxFreqShow) {
            const sx = plotLeft + (fftSelectedPeakFreq / maxFreqShow) * plotW;
            fCtx.save();
            fCtx.strokeStyle = '#f59e0b';
            fCtx.lineWidth = 2;
            fCtx.setLineDash([4, 3]);
            fCtx.beginPath();
            fCtx.moveTo(sx, plotTop);
            fCtx.lineTo(sx, plotBottom);
            fCtx.stroke();
            fCtx.setLineDash([]);

            const selText = `📍 ${fftSelectedPeakFreq.toFixed(1)} Hz`;
            fCtx.font = 'bold 11px "JetBrains Mono", monospace';
            const bw = fCtx.measureText(selText).width + 12;
            const bx = Math.min(plotRight - bw - 4, Math.max(plotLeft + 4, sx - bw / 2));
            const by = plotTop + 28;
            fCtx.fillStyle = '#0f172a';
            fCtx.fillRect(bx, by, bw, 20);
            fCtx.fillStyle = '#facc15';
            fCtx.textAlign = 'left';
            fCtx.fillText(selText, bx + 6, by + 14);
            fCtx.restore();
        }

        return analysis;
    }

    function setTsMode(mode) {
        tsViewMode = mode;
        document.getElementById('btnModeOverlay').classList.toggle('active-mode', mode === 'overlay');
        document.getElementById('btnModeSum').classList.toggle('active-mode', mode === 'sum');
        if (isTsPaused) calculatePhaseAndDrawLive();
    }

    function showTsResultModal() {
        const el = document.getElementById('hudResults');
        showTsResults = !showTsResults;
        el.style.display = showTsResults ? 'block' : 'none';
    }

    function showTsEquationModal() {
        const el = document.getElementById('hudEquations');
        if (el) {
            showTsEquations = !showTsEquations;
            el.style.display = showTsEquations ? 'block' : 'none';
        }
    }

    function updateEquationsHUD(freqA, freqB, phaseRad, ampA, ampB) {
        document.getElementById('hudAmpA').innerText = ampA;
        document.getElementById('hudAmpB').innerText = ampB;

        document.getElementById('eqFreqA').innerText = freqA > 0 ? freqA.toFixed(1) : "0.0";
        document.getElementById('eqFreqB').innerText = freqB > 0 ? freqB.toFixed(1) : "0.0";
        document.getElementById('eqAmpA').innerText = ampA;
        document.getElementById('eqAmpB').innerText = ampB;

        let phaseStr = phaseRad >= 0 ? ` + ${phaseRad.toFixed(2)}` : ` - ${Math.abs(phaseRad).toFixed(2)}`;
        document.getElementById('eqPhase').innerText = phaseStr;

        document.getElementById('hudPhaseRad').innerText = phaseRad.toFixed(2);
        document.getElementById('hudPhaseDeg').innerText = Math.round(phaseRad * 180 / Math.PI);

        const sumLine = document.getElementById('eqSumLine');
        if (sumLine) {
            let diff = Math.abs(freqA - freqB);
            if (freqA > 10 && freqB > 10 && diff > 3.0) {
                let f_beat = diff.toFixed(1);
                let f_carrier = ((freqA + freqB) / 2).toFixed(1);
                sumLine.innerHTML = `Tổng hợp (Sóng Phách): <span class="math-symbol" style="color:#a78bfa;">u = 2A·cos(2π·${(diff/2).toFixed(1)}·t)·cos(2π·${f_carrier}·t) &rarr; f<sub>phách</sub> = ${f_beat} Hz</span>`;
            } else {
                let a1 = parseFloat(ampA) || 0;
                let a2 = parseFloat(ampB) || 0;
                let sum_amp_sq = a1 * a1 + a2 * a2 + 2 * a1 * a2 * Math.cos(phaseRad);
                let sum_amp = Math.sqrt(Math.max(0, sum_amp_sq)).toFixed(2);
                let phi_sum = Math.atan2(a2 * Math.sin(phaseRad), a1 + a2 * Math.cos(phaseRad));
                let phi_sum_str = phi_sum >= 0 ? `+ ${phi_sum.toFixed(2)}` : `- ${Math.abs(phi_sum).toFixed(2)}`;
                let f_val = freqA > 0 ? freqA.toFixed(1) : (freqB > 0 ? freqB.toFixed(1) : "0.0");
                sumLine.innerHTML = `Tổng hợp: <span class="math-symbol">u = ${sum_amp}·cos(2π·${f_val}·t ${phi_sum_str})</span>`;
            }
        }
    }

    function computeAndUpdateTwoSourceMetrics(dataA, idxA, dataB, idxB, smooth = true) {
        if (!dataA || !dataB) return;
        const len = dataA.length;
        let sqA = 0, sqB = 0;
        if (idxA > 2048) {
            let recA = new Float32Array(2048);
            for (let i = 0; i < 2048; i++) {
                let v = dataA[((idxA - 2048 + i) % len + len) % len];
                recA[i] = v; sqA += v * v;
            }
            let fA = autoCorrelate(recA, sampleRate);
            if (fA > 0) {
                currentCalcFreqA = (!smooth || currentCalcFreqA === 0) ? fA : (currentCalcFreqA * 0.7 + fA * 0.3);
            }
            currentAmpA = (Math.sqrt(sqA / 2048) * 1.414).toFixed(2);
        }
        if (idxB > 2048) {
            let recB = new Float32Array(2048);
            for (let i = 0; i < 2048; i++) {
                let v = dataB[((idxB - 2048 + i) % len + len) % len];
                recB[i] = v; sqB += v * v;
            }
            let fB = autoCorrelate(recB, sampleRate);
            if (fB > 0) {
                currentCalcFreqB = (!smooth || currentCalcFreqB === 0) ? fB : (currentCalcFreqB * 0.7 + fB * 0.3);
            }
            currentAmpB = (Math.sqrt(sqB / 2048) * 1.414).toFixed(2);
        }

        document.getElementById('hudFreqA').innerText = currentCalcFreqA > 0 ? currentCalcFreqA.toFixed(1) : "0.0";
        document.getElementById('hudFreqB').innerText = currentCalcFreqB > 0 ? currentCalcFreqB.toFixed(1) : "0.0";
        document.getElementById('hudPerA').innerText = currentCalcFreqA > 0 ? (1000 / currentCalcFreqA).toFixed(2) : "0.00";
        document.getElementById('hudPerB').innerText = currentCalcFreqB > 0 ? (1000 / currentCalcFreqB).toFixed(2) : "0.00";

        let avgFreq = (currentCalcFreqA > 0 && currentCalcFreqB > 0)
            ? ((currentCalcFreqA + currentCalcFreqB) / 2)
            : (currentCalcFreqA || currentCalcFreqB || 0);
        let calculatedPhase = calculatePhaseDifference(dataA, dataB, avgFreq > 0 ? avgFreq : 440, sampleRate, idxA, idxB);

        updateEquationsHUD(currentCalcFreqA, currentCalcFreqB, calculatedPhase, currentAmpA, currentAmpB);
    }

    function freezeTwoSourceModal() {
        isPaused = true;
        isTsPaused = true;
        clearTimeout(stopTimer);
        isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
        if (pauseButton) {
            pauseButton.textContent = "Đo / Dừng";
            pauseButton.className = "btn-green";
        }
        const btn = document.getElementById('tsPlayBtn');
        const resBtn = document.getElementById('tsResultBtn');
        const eqBtn = document.getElementById('tsEquationBtn');
        if (btn) {
            if (!isContinuousMode) {
                btn.style.setProperty('display', 'none', 'important');
            } else {
                btn.style.setProperty('display', 'inline-flex', 'important');
                btn.innerHTML = '▶ Tiếp tục';
                btn.className = "btn-green";
            }
        }
        if (resBtn) resBtn.style.setProperty('display', 'inline-flex', 'important');
        if (eqBtn) eqBtn.style.setProperty('display', 'inline-flex', 'important');
        if (channelConfig && channelConfig.A && channelConfig.A.data) {
            snapDataA = new Float32Array(channelConfig.A.data);
            snapIdxA = channelConfig.A.index;
        }
        if (channelConfig && channelConfig.B && channelConfig.B.data) {
            snapDataB = new Float32Array(channelConfig.B.data);
            snapIdxB = channelConfig.B.index;
        }
        computeAndUpdateTwoSourceMetrics(snapDataA, snapIdxA, snapDataB, snapIdxB, false);
        calculatePhaseAndDrawLive();
    }

    function openTwoSourceModal() {
        isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
        if (getDisplayMode() !== 'oscilloscope' || getActiveChannelMode() !== '2' || !isContinuousMode) {
            return;
        }
        const hasCapturedData = (channelConfig.A.index > 0 || channelConfig.B.index > 0);
        const shouldOpenFrozen = isPaused && hasCapturedData;

        isTwoSourceModalOpen = true;
        showTsResults = false; showTsEquations = false;

        const overlay = document.getElementById('twoSourceModalOverlay');
        if (overlay) { overlay.style.display = 'flex'; setTimeout(() => overlay.classList.add('animUI-visible'), 10); }

        document.getElementById('hudResults').style.display = 'none';
        document.getElementById('hudEquations').style.display = 'none';

        if (shouldOpenFrozen) {
            freezeTwoSourceModal();
            return;
        }

        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        isTsPaused = false;

        if (channelConfig.A.active || channelConfig.B.active) {
            isPaused = false;
            if (pauseButton) {
                pauseButton.textContent = "Đang đo...";
                pauseButton.className = "btn-red";
            }
            if (!isContinuousMode) triggerAutoStop();
            else clearTimeout(stopTimer);
        }

        const resBtn = document.getElementById('tsResultBtn'), eqBtn = document.getElementById('tsEquationBtn');
        if (resBtn) resBtn.style.setProperty('display', 'none', 'important');
        if (eqBtn) eqBtn.style.setProperty('display', 'none', 'important');

        const btn = document.getElementById('tsPlayBtn');
        if (btn) {
            if (!isContinuousMode) {
                btn.style.setProperty('display', 'none', 'important');
            } else {
                btn.style.setProperty('display', 'inline-flex', 'important');
                btn.innerHTML = '⏸ Dừng';
                btn.className = "btn-orange";
            }
        }

        requestAnimationFrame(calculatePhaseAndDrawLive);
    }

    function closeTwoSourceModal() {
        isTwoSourceModalOpen = false; isTsPaused = true;
        const overlay = document.getElementById('twoSourceModalOverlay');
        if (overlay) {
            overlay.classList.remove('animUI-visible');
            setTimeout(() => {
                overlay.style.display = 'none';
                if (typeof drawFrame === 'function') drawFrame();
                if (!animFrameId && typeof draw === 'function') draw();
            }, 300);
        }
        if (!isPaused) {
            isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
            if (!isContinuousMode) triggerAutoStop();
        } else if (pauseButton) {
            pauseButton.textContent = "Đo / Dừng";
            pauseButton.className = "btn-green";
            updateAnalysisButtonState();
            updateManualAnalysisButtonState();
            if (typeof drawFrame === 'function') drawFrame();
        }
    }

    function toggleTsPlay() {
        isContinuousMode = (modeSelect && modeSelect.value === 'continuous');
        isTsPaused = !isTsPaused;
        const btn = document.getElementById('tsPlayBtn'), resBtn = document.getElementById('tsResultBtn'), eqBtn = document.getElementById('tsEquationBtn');
        if (!isTsPaused) {
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
            if (channelConfig.A.active || channelConfig.B.active) {
                isPaused = false;
                if (pauseButton) {
                    pauseButton.textContent = "Đang đo...";
                    pauseButton.className = "btn-red";
                }
                if (!isContinuousMode) triggerAutoStop();
                else clearTimeout(stopTimer);
            }
            if (btn) {
                if (!isContinuousMode) btn.style.setProperty('display', 'none', 'important');
                else { btn.innerHTML = '⏸ Dừng'; btn.className = "btn-orange"; }
            }
            if (resBtn) resBtn.style.setProperty('display', 'none', 'important');
            if (eqBtn) eqBtn.style.setProperty('display', 'none', 'important');
            showTsResults = false; showTsEquations = false;
            document.getElementById('hudResults').style.display = 'none';
            document.getElementById('hudEquations').style.display = 'none';
            requestAnimationFrame(calculatePhaseAndDrawLive);
        } else {
            freezeTwoSourceModal();
        }
    }

    function calculatePhaseAndDrawLive() {
        if (!isTwoSourceModalOpen) return;

        const canv = document.getElementById('twoSourceCanvas');
        if (canv) {
            const targetW = Math.max(260, canv.parentElement.clientWidth - 12);
            const targetH = Math.max(200, canv.parentElement.clientHeight - 12);
            if (canv.width !== targetW || canv.height !== targetH) {
                canv.width = targetW;
                canv.height = targetH;
            }

            const ctx = canv.getContext('2d'), cw = canv.width, ch = canv.height;
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, cw, ch);
            drawMainGrid(ctx, 0, 0, cw, ch, null, null, true);

            let samplesDraw = Math.floor(sampleRate * totalTimeOnScreen);
            let activeDataA = channelConfig.A ? channelConfig.A.data : null;
            let activeDataB = channelConfig.B ? channelConfig.B.data : null;
            if (!activeDataA || !activeDataB) return;

            let len = activeDataA.length, cIdxA = channelConfig.A.index, cIdxB = channelConfig.B.index;

            if (!isTsPaused) {
                let now = performance.now();
                if (now - lastCorrelateTime > 300) {
                    computeAndUpdateTwoSourceMetrics(activeDataA, cIdxA, activeDataB, cIdxB, true);
                    lastCorrelateTime = now;
                }
            }

            let refDataA = isTsPaused ? snapDataA : activeDataA;
            let refDataB = isTsPaused ? snapDataB : activeDataB;
            let refIdxA = isTsPaused ? snapIdxA : cIdxA;
            let refIdxB = isTsPaused ? snapIdxB : cIdxB;

            let offsetA = findZeroCrossingOffset({ active: true, data: refDataA }, refIdxA, samplesDraw);
            let halfDraw = Math.floor(samplesDraw / 2);
            let startIdxA = refIdxA - offsetA - halfDraw;
            let startIdxB = refIdxB - offsetA - halfDraw;

            ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
            let step = Math.max(1, Math.floor(samplesDraw / (cw * 2.0)));

            if (tsViewMode === 'overlay') {
                document.getElementById('tsWarningText').style.display = 'none';

                ctx.strokeStyle = '#ef4444'; ctx.beginPath();
                for (let i = 0; i < samplesDraw; i += step) {
                    let idxA = ((startIdxA + i) % len + len) % len;
                    let val = refDataA[idxA];
                    let x = cw / 2 + ((i - halfDraw) / samplesDraw) * cw, y = ch / 2 - (val * currentZoomY * ch / 2);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();

                ctx.strokeStyle = '#3b82f6'; ctx.beginPath();
                for (let i = 0; i < samplesDraw; i += step) {
                    let idxB = ((startIdxB + i) % len + len) % len;
                    let val = refDataB[idxB];
                    let x = cw / 2 + ((i - halfDraw) / samplesDraw) * cw, y = ch / 2 - (val * currentZoomY * ch / 2);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            else if (tsViewMode === 'sum') {
                let diff = Math.abs(currentCalcFreqA - currentCalcFreqB);
                let isSameFreq = (diff <= 3.0);
                const warnEl = document.getElementById('tsWarningText');

                if (currentCalcFreqA > 10 && currentCalcFreqB > 10 && !isSameFreq) {
                    if (warnEl) {
                        warnEl.style.display = 'block';
                        warnEl.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
                        warnEl.innerText = `🌊 Hiện tượng Sóng Phách: f_phách = ${diff.toFixed(1)} Hz (f₁ = ${currentCalcFreqA.toFixed(1)} Hz, f₂ = ${currentCalcFreqB.toFixed(1)} Hz)`;
                    }
                } else {
                    if (warnEl) warnEl.style.display = 'none';
                }

                ctx.strokeStyle = '#8b5cf6'; ctx.beginPath();
                for (let i = 0; i < samplesDraw; i += step) {
                    let idxA = ((startIdxA + i) % len + len) % len;
                    let idxB = ((startIdxB + i) % len + len) % len;
                    let val = refDataA[idxA] + refDataB[idxB];

                    let x = cw / 2 + ((i - halfDraw) / samplesDraw) * cw, y = ch / 2 - (val * currentZoomY * ch / 2);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
        if (isTwoSourceModalOpen && !isTsPaused) requestAnimationFrame(calculatePhaseAndDrawLive);
    }

    function normalizeMarkdownForChat(rawText) {
        if (!rawText) return '';
        let s = String(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

        // Chuẩn hóa công thức \[...\] và \(...\) sang $$...$$ và $...$
        s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => '$$' + expr.trim() + '$$');
        s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => '$' + expr.trim() + '$');

        // Chuẩn hóa tiêu đề Markdown (#, ##, ###)
        s = s.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => '**' + title.trim() + '**');

        // Chuẩn hóa gạch đầu dòng
        s = s.replace(/^([ \t]*)[-*][ \t]+/gm, '$1• ');

        // Chuyển **bold** và *italic* bên ngoài khối công thức Toán/Vật lý
        const parts = s.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
        s = parts.map((seg, idx) => {
            if (idx % 2 === 1) return seg;
            return seg
                .replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>')
                .replace(/(^|[^\w*])\*([^\s*][^*\n]*?[^\s*])\*(?![\w*])/g, '$1<i>$2</i>');
        }).join('');

        s = s.replace(/\n{3,}/g, '\n\n');
        return s.trim();
    }

    function formatCompleteSentences(text) {
        if (!text) return '';
        let trimmed = normalizeMarkdownForChat(text);
        if (!trimmed) return '';

        trimmed = trimmed.replace(/Fox_lab/gi, 'Fox-lab')
                         .replace(/Fox-lab/gi, 'Fox-lab')
                         .replace(/Foxlab/gi, 'Fox-lab');

        // Giữ nguyên nếu kết thúc bằng khối công thức $$...$$ hoặc $...$
        if (/(\$\$|\$)[ \t]*$/.test(trimmed)) {
            return trimmed;
        }

        // Loại bỏ dòng bullet cuối dở dang chỉ có 1 ký hiệu/biến lẻ
        trimmed = trimmed.replace(/(?:^|\n)[ \t]*•[ \t]*(?:[A-Za-zÀ-ỹ0-9_]{1,2}|\$[^$\n]{1,3}\$)?[ \t]*$/g, '').trim();
        if (!trimmed) return '';

        let cleanText = trimmed
            .replace(/\$\$[\s\S]*?\$\$/g, ' MATH ')
            .replace(/\$[^$\n]+?\$/g, ' MATH ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleanText) return trimmed;

        const lastChar = cleanText.slice(-1);
        if (['.', '!', '?', ':', ';', ')'].includes(lastChar)) {
            if ([':', ';'].includes(lastChar) && !trimmed.endsWith('>')) {
                trimmed = trimmed.replace(/[:;]\s*$/, '.');
            }
            return trimmed;
        }

        const lastWord = cleanText.split(/\s+/).pop().toLowerCase();
        const trailingParticles = ['là', 'và', 'của', 'với', 'bằng', 'tại', 'trong', 'được', 'có', 'cho', 'các', 'như', 'khi', 'thì', 'để', 'gồm', 'sau'];
        if (trailingParticles.includes(lastWord) || trimmed.endsWith(',')) {
            return trimmed + '… <span style="font-size:11px; color:#94a3b8; font-style:italic;">(Đã tự động nối hoàn chỉnh nội dung)</span>';
        }

        if (trimmed.endsWith('>')) {
            return trimmed;
        }

        return trimmed + '.';
    }

    function formatMathText(text) {
        if (!text) return '';
        let str = text;

        let mathBlocks = [];
        let protectedStr = str.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g, function(match) {
            let idx = mathBlocks.length;
            mathBlocks.push(match);
            return `___MATH_BLOCK_${idx}___`;
        });

        let texFormulaRegex = /(?:\b[a-zA-Z0-9_]{1,3}\s*=\s*)?(?:\\(?:[a-zA-Z]+|[^a-zA-Z])|\{[^{}]*\}|\[[^\]]*\]|\([^\)]*\)|\b[a-zA-Z0-9_]{1,3}\b|[\+\-\*/\=\^\_\<\>°\.,]|\s)*?\\(?:cos|sin|tan|cot|omega|varphi|pi|lambda|Delta|frac|sqrt|mathbb|text|cdot|approx|ge|le|in|times)\b(?:\\(?:[a-zA-Z]+|[^a-zA-Z])|\{[^{}]*\}|\[[^\]]*\]|\([^\)]*\)|\b[a-zA-Z0-9_]{1,3}\b|[\+\-\*/\=\^\_\<\>°\.,]|\s)*/g;

        protectedStr = protectedStr.replace(texFormulaRegex, function(match) {
            let raw = match.trim();
            if (!raw || raw.indexOf('\\') === -1) return match;
            let punct = "";
            while (raw && '.,;:!?'.indexOf(raw.charAt(raw.length - 1)) !== -1) {
                punct = raw.charAt(raw.length - 1) + punct;
                raw = raw.substring(0, raw.length - 1).trim();
            }
            if (!raw) return match;
            return ' $' + raw + '$ ' + punct;
        });

        for (let i = 0; i < mathBlocks.length; i++) {
            protectedStr = protectedStr.replace(`___MATH_BLOCK_${i}___`, mathBlocks[i]);
        }

        return protectedStr.replace(/\n/g, '<br>');
    }

    function toggleChat() { const widget = document.getElementById('fox-chat-widget'); widget.classList.toggle('open'); if (widget.classList.contains('open')) { setTimeout(() => document.getElementById('fox-chat-input').focus(), 300); } else if (typeof KhoaHocTTS !== 'undefined') { KhoaHocTTS.stop(); } }
    function toggleChatTheme() { const chatBox = document.getElementById('fox-chat-box'); chatBox.classList.toggle('light-theme'); }
    function updateFoxLiveFrequency(freq) { const freqTag = document.getElementById('foxLiveFreqTag'); if (freqTag) freqTag.innerText = freq.toFixed(1) + ' Hz'; }

    function toggleFoxRole() {
        const btn = document.getElementById('foxRoleToggleBtn');
        if (currentFoxRole === 'student') {
            currentFoxRole = 'teacher';
            btn.innerHTML = "👨‍🏫 GV";
            btn.style.borderColor = "#f97316";
            btn.style.color = "#ff7849";
            addChatMessage('bot', "Đã chuyển sang <b>Chế độ Giáo viên</b>: AI sẽ cung cấp gợi ý sư phạm chuyên sâu, chuẩn kiến thức SGK vật lý và lưu ý an toàn phòng thí nghiệm.");
        } else {
            currentFoxRole = 'student';
            btn.innerHTML = "👨‍🎓 HS";
            btn.style.borderColor = "#475569";
            btn.style.color = "#38bdf8";
            addChatMessage('bot', "Đã chuyển sang <b>Chế độ Học sinh</b>: AI sẽ đóng vai trò gia sư gợi ý, hướng dẫn tư duy từng bước.");
        }
    }

    let pendingQuickPrompt = false;
    function sendQuickPrompt(promptText) {
        pendingQuickPrompt = true;
        document.getElementById('fox-chat-input').value = promptText;
        sendFoxMessage();
    }

    let uploadedImageScanReport = "";
    let activeConversationImageScanReport = "";

    function prepareDetailedImageBase64(dataUrl, maxDim = 1280, quality = 0.85) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth || img.width;
                let h = img.naturalHeight || img.height;
                if (!w || !h) { resolve(dataUrl); return; }
                if (w > maxDim || h > maxDim) {
                    const ratio = Math.min(maxDim / w, maxDim / h);
                    w = Math.max(1, Math.round(w * ratio));
                    h = Math.max(1, Math.round(h * ratio));
                }
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                const ctx = c.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);

                // Tăng nhẹ độ tương phản lưới ô xanh nhạt (#bae6fd) để AI nhìn rõ vạch chia
                try {
                    const imgData = ctx.getImageData(0, 0, w, h);
                    const d = imgData.data;
                    for (let i = 0; i < d.length; i += 4) {
                        const r = d[i], g = d[i + 1], b = d[i + 2];
                        if ((b - r) > 18 && g > 195 && b > 215 && r < 225) {
                            d[i] = Math.max(0, r - 40);
                            d[i + 1] = Math.max(0, g - 30);
                            d[i + 2] = Math.max(0, b - 12);
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                } catch (e) { }

                let out = c.toDataURL('image/jpeg', quality);
                const maxDataUrlLen = 650000;
                if (out.length > maxDataUrlLen) {
                    out = c.toDataURL('image/jpeg', 0.72);
                }
                if (out.length > maxDataUrlLen) {
                    out = c.toDataURL('image/jpeg', 0.58);
                }
                resolve(out);
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }

    function analyzeOscilloscopeImagePixels(dataUrl) {
        return new Promise((resolve) => {
            if (!dataUrl || typeof dataUrl !== 'string') { resolve(""); return; }
            const img = new Image();
            img.onload = () => {
                try {
                    const rawW = img.naturalWidth || img.width;
                    const rawH = img.naturalHeight || img.height;
                    if (!rawW || !rawH || rawW < 120 || rawH < 120) { resolve(""); return; }

                    const scale = rawW > 800 ? (800 / rawW) : 1;
                    const W = Math.round(rawW * scale);
                    const H = Math.round(rawH * scale);

                    const c = document.createElement('canvas');
                    c.width = W;
                    c.height = H;
                    const ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, W, H);
                    const d = ctx.getImageData(0, 0, W, H).data;

                    const isRed = (i) => d[i] > 175 && d[i + 1] < 85 && d[i + 2] < 85 && (d[i] - d[i + 1]) > 105;
                    const isBlue = (i) => d[i + 2] > 175 && d[i] < 85 && (d[i + 2] - d[i]) > 100;
                    const isDark = (i) => {
                        const r = d[i], g = d[i + 1], b = d[i + 2];
                        return r < 95 && g < 100 && b < 115 && (Math.max(r, g, b) - Math.min(r, g, b)) < 35;
                    };

                    function findMainWaveBand(checkFn) {
                        const ys = [];
                        for (let y = 0; y < H; y++) {
                            let rowCnt = 0;
                            for (let x = 0; x < W; x++) {
                                if (checkFn((y * W + x) * 4)) rowCnt++;
                            }
                            if (rowCnt > 0) ys.push(y);
                        }
                        if (ys.length < 30) return null;

                        const bands = [];
                        let s = ys[0], p = ys[0];
                        for (let k = 1; k < ys.length; k++) {
                            if (ys[k] - p <= 6) p = ys[k];
                            else { bands.push([s, p]); s = p = ys[k]; }
                        }
                        bands.push([s, p]);

                        let best = null, bestSpan = 0;
                        for (const [y0, y1] of bands) {
                            if ((y1 - y0) < 36) continue;
                            let minX = W, maxX = -1;
                            for (let y = y0; y <= y1; y++) {
                                for (let x = 0; x < W; x++) {
                                    if (checkFn((y * W + x) * 4)) {
                                        if (x < minX) minX = x;
                                        if (x > maxX) maxX = x;
                                    }
                                }
                            }
                            const span = maxX - minX;
                            if (span > bestSpan) { bestSpan = span; best = [y0, y1]; }
                        }
                        return (best && bestSpan >= 0.35 * W) ? best : null;
                    }

                    function scanChannel(checkFn, chLabel) {
                        const band = findMainWaveBand(checkFn);
                        if (!band) return null;

                        const [y0, y1] = band;
                        const bandH = y1 - y0;
                        const midTop = Math.max(0, Math.floor(y0 + 0.12 * bandH));
                        const midBot = Math.min(H - 1, Math.floor(y1 - 0.12 * bandH));
                        if (midBot <= midTop + 8) return null;

                        // Tìm trục hoành t (#334155) & biên trái/phải thực tế của khung đồ thị
                        let bestAxisY = -1, bestSpanLen = 0, boxLeft = 0, boxRight = W - 1;
                        for (let y = midTop; y <= midBot; y++) {
                            let runStart = -1, lastDark = -1;
                            for (let x = 0; x < W; x++) {
                                if (isDark((y * W + x) * 4)) {
                                    if (runStart < 0) runStart = x;
                                    lastDark = x;
                                } else if (runStart >= 0 && (x - lastDark) > 22) {
                                    const spanLen = lastDark - runStart + 1;
                                    if (spanLen > bestSpanLen) {
                                        bestSpanLen = spanLen;
                                        bestAxisY = y;
                                        boxLeft = runStart;
                                        boxRight = lastDark;
                                    }
                                    runStart = -1;
                                }
                            }
                            if (runStart >= 0) {
                                const spanLen = lastDark - runStart + 1;
                                if (spanLen > bestSpanLen) {
                                    bestSpanLen = spanLen;
                                    bestAxisY = y;
                                    boxLeft = runStart;
                                    boxRight = lastDark;
                                }
                            }
                        }
                        if (bestAxisY < 0 || bestSpanLen < 0.35 * W) return null;

                        // Tâm trục hoành sub-pixel
                        let sumAxisY = 0, wAxisY = 0;
                        for (let dy = -2; dy <= 2; dy++) {
                            const yy = bestAxisY + dy;
                            if (yy < 0 || yy >= H) continue;
                            let cnt = 0;
                            for (let x = boxLeft; x <= boxRight; x++) {
                                if (isDark((yy * W + x) * 4)) cnt++;
                            }
                            if (cnt > bestSpanLen * 0.5) { sumAxisY += yy * cnt; wAxisY += cnt; }
                        }
                        const axisY = wAxisY > 0 ? (sumAxisY / wAxisY) : bestAxisY;

                        const boxW = boxRight - boxLeft + 1;
                        const gridStepX = boxW / 10.0;

                        // Tìm trục tung ở vùng giữa khung đồ thị
                        const sTop = Math.max(0, Math.floor(y0 - 0.2 * bandH));
                        const sBot = Math.min(H - 1, Math.floor(y1 + 0.2 * bandH));
                        const xSearchMin = Math.max(boxLeft, Math.floor(boxLeft + 0.35 * boxW));
                        const xSearchMax = Math.min(boxRight, Math.ceil(boxRight - 0.35 * boxW));
                        let bestAxisX = Math.round(boxLeft + boxW / 2), maxColDark = 0;
                        for (let x = xSearchMin; x <= xSearchMax; x++) {
                            let cnt = 0;
                            for (let y = sTop; y <= sBot; y++) {
                                if (isDark((y * W + x) * 4)) cnt++;
                            }
                            if (cnt > maxColDark) { maxColDark = cnt; bestAxisX = x; }
                        }
                        if (maxColDark < Math.max(25, bandH * 0.45)) return null;

                        let sumAxisX = 0, wAxisX = 0;
                        for (let dx = -2; dx <= 2; dx++) {
                            const xx = bestAxisX + dx;
                            if (xx < boxLeft || xx > boxRight) continue;
                            let cnt = 0;
                            for (let y = sTop; y <= sBot; y++) {
                                if (isDark((y * W + xx) * 4)) cnt++;
                            }
                            if (cnt > maxColDark * 0.5) { sumAxisX += xx * cnt; wAxisX += cnt; }
                        }
                        const axisX = wAxisX > 0 ? (sumAxisX / wAxisX) : bestAxisX;

                        // Trích xuất quỹ đạo sóng y(x)
                        const cTop = Math.max(0, y0 - 8);
                        const cBot = Math.min(H - 1, y1 + 8);
                        const xs = [], ys = [];
                        for (let x = boxLeft; x <= boxRight; x++) {
                            let sumY = 0, cnt = 0;
                            for (let y = cTop; y <= cBot; y++) {
                                if (checkFn((y * W + x) * 4)) { sumY += y; cnt++; }
                            }
                            if (cnt > 0) {
                                xs.push(x);
                                ys.push(axisY - (sumY / cnt));
                            }
                        }
                        if (xs.length < 60) return null;

                        const ysSmooth = ys.map((_, idx) => {
                            let sum = 0, n = 0;
                            for (let k = Math.max(0, idx - 2); k <= Math.min(ys.length - 1, idx + 2); k++) {
                                sum += ys[k]; n++;
                            }
                            return sum / n;
                        });
                        const gxs = xs.map(x => (x - axisX) / gridStepX);

                        // Tìm các điểm cắt trục hoành t (u = 0)
                        const zeros = [];
                        let lastZ = -999;
                        for (let i = 0; i < gxs.length - 1; i++) {
                            if (ysSmooth[i] * ysSmooth[i + 1] <= 0 && ysSmooth[i] !== ysSmooth[i + 1]) {
                                const gx0 = gxs[i] - ysSmooth[i] * (gxs[i + 1] - gxs[i]) / (ysSmooth[i + 1] - ysSmooth[i]);
                                if (gx0 - lastZ >= 0.45) {
                                    const dir = ysSmooth[i + 1] > ysSmooth[i] ? "đi lên (+)" : "đi xuống (-)";
                                    zeros.push({ gx: Number(gx0.toFixed(2)), dir });
                                    lastZ = gx0;
                                }
                            }
                        }
                        if (zeros.length < 2) return null;

                        // Tìm đỉnh dương & đỉnh âm
                        const win = Math.max(5, Math.floor(0.65 * gridStepX));
                        let maxAbsY = 0;
                        for (let i = 0; i < ysSmooth.length; i++) {
                            if (Math.abs(ysSmooth[i]) > maxAbsY) maxAbsY = Math.abs(ysSmooth[i]);
                        }
                        const ampThr = 0.3 * maxAbsY;
                        const posPeaks = [], negPeaks = [];
                        for (let i = win; i < ysSmooth.length - win; i++) {
                            let segMax = -Infinity, segMin = Infinity;
                            for (let k = i - win; k <= i + win; k++) {
                                if (ysSmooth[k] > segMax) segMax = ysSmooth[k];
                                if (ysSmooth[k] < segMin) segMin = ysSmooth[k];
                            }
                            if (ysSmooth[i] === segMax && ysSmooth[i] > ampThr) {
                                if (posPeaks.length === 0 || gxs[i] - posPeaks[posPeaks.length - 1] >= 0.8) {
                                    posPeaks.push(Number(gxs[i].toFixed(2)));
                                }
                            }
                            if (ysSmooth[i] === segMin && ysSmooth[i] < -ampThr) {
                                if (negPeaks.length === 0 || gxs[i] - negPeaks[negPeaks.length - 1] >= 0.8) {
                                    negPeaks.push(Number(gxs[i].toFixed(2)));
                                }
                            }
                        }

                        const halfDivs = [];
                        for (let i = 0; i < zeros.length - 1; i++) {
                            halfDivs.push(zeros[i + 1].gx - zeros[i].gx);
                        }
                        const avgHalf = halfDivs.reduce((a, b) => a + b, 0) / halfDivs.length;

                        let fullDivs = avgHalf * 2;
                        if (zeros.length >= 3) {
                            const sameDirSpans = [];
                            for (let i = 0; i < zeros.length - 2; i++) {
                                sameDirSpans.push(zeros[i + 2].gx - zeros[i].gx);
                            }
                            fullDivs = sameDirSpans.reduce((a, b) => a + b, 0) / sameDirSpans.length;
                        }
                        fullDivs = Number(fullDivs.toFixed(2));

                        const zDesc = zeros.map(z => `${z.gx >= 0 ? '+' : ''}${z.gx} ô (${z.dir})`).join(", ");
                        const pPosDesc = posPeaks.length ? posPeaks.map(v => `${v >= 0 ? '+' : ''}${v} ô`).join(", ") : "không rõ";
                        const pNegDesc = negPeaks.length ? negPeaks.map(v => `${v >= 0 ? '+' : ''}${v} ô`).join(", ") : "không rõ";

                        return (
                            `• ${chLabel}:\n` +
                            `  - Các điểm sóng cắt trục hoành t (u = 0) đo theo số ô lưới: ${zDesc}.\n` +
                            `  - Vị trí đỉnh dương: ${pPosDesc}; đỉnh âm: ${pNegDesc}.\n` +
                            `  - Nửa chu kỳ (T/2): ${avgHalf.toFixed(2)} ô | Chu kỳ trọn vẹn (T): ${fullDivs} ô.`
                        );
                    }

                    const chAReport = scanChannel(isRed, "Kênh A (đường đỏ)");
                    const chBReport = scanChannel(isBlue, "Kênh B (đường xanh)");
                    const reports = [chAReport, chBReport].filter(Boolean);
                    if (reports.length === 0) { resolve(""); return; }

                    resolve(
                        `[DỮ LIỆU ĐO PIXEL CHÍNH XÁC TỪ ẢNH ĐỒ THỊ DAO ĐỘNG KÝ (10 Ô NGANG, GỐC t = 0 Ở TRỤC DỌC GIỮA)]\n` +
                        reports.join("\n") + "\n" +
                        `[QUY TẮC TÍNH TOÁN BẮT BUỘC TỪ SỐ LIỆU TRÊN]\n` +
                        `- Bước 1: Đọc nhãn vạch chia trên trục hoành t trong ảnh để lấy giá trị của 1 ô ngang Δt (đơn vị ms/ô).\n` +
                        `- Bước 2: Dùng đúng số ô chu kỳ T đo ở trên (tuyệt đối KHÔNG tự làm tròn về số nguyên nếu là số thập phân) để tính: T = (số ô chu kỳ) × Δt (ms).\n` +
                        `- Bước 3: Tính tần số dao động f = 1 / T (đổi T sang giây: 1 ms = 10^-3 s), đối chiếu kiểm chéo với các điểm cắt trục và đỉnh sóng.`
                    );
                } catch (err) {
                    resolve("");
                }
            };
            img.onerror = () => resolve("");
            img.src = dataUrl;
        });
    }

    async function processSelectedImageFile(file, inputElToReset = null) {
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) {
            alert("⚠️ Dung lượng ảnh quá lớn (> 15MB). Vui lòng chọn ảnh nhẹ hơn!");
            if (inputElToReset) inputElToReset.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(e) {
            const rawDataUrl = e.target.result;
            const [optimizedDataUrl, scanReport] = await Promise.all([
                prepareDetailedImageBase64(rawDataUrl, 1280, 0.85),
                analyzeOscilloscopeImagePixels(rawDataUrl)
            ]);
            uploadedImageBase64 = optimizedDataUrl;
            uploadedImageScanReport = scanReport;
            const thumb = document.getElementById('imagePreviewThumb');
            const nameEl = document.getElementById('imagePreviewName');
            const prevBox = document.getElementById('imagePreviewContainer');
            if (thumb) thumb.src = uploadedImageBase64;
            if (nameEl) nameEl.innerText = file.name || 'Anh_de_bai.jpg';
            if (prevBox) prevBox.style.display = 'flex';
            if (sendBtn) sendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    function handleImageSelected(event) {
        const file = event.target.files[0];
        processSelectedImageFile(file, event.target);
    }

    function clearImageUpload() {
        uploadedImageBase64 = null;
        uploadedImageScanReport = "";
        const upInput = document.getElementById('foxImageUpload');
        if (upInput) upInput.value = '';
        const prevContainer = document.getElementById('imagePreviewContainer');
        if (prevContainer) prevContainer.style.display = 'none';
        if (sendBtn && chatInput) {
            sendBtn.disabled = (chatInput.value.trim() === '');
        }
    }

    function exportChatReport(btn) {
        const chatRows = document.querySelectorAll('.fox-msg-row');
        let reportText = "=== BÁO CÁO LỊCH SỬ CHAT - Fox-lab ===\n";
        reportText += "Thời gian xuất: " + new Date().toLocaleString() + "\n";
        if (detectedFrequency > 0) {
            reportText += "Tần số khảo sát hiện tại: " + detectedFrequency.toFixed(1) + " Hz\n";
        }
        reportText += "\n";

        chatRows.forEach(row => {
            const isUser = row.classList.contains('fox-msg-user');
            const bubble = row.querySelector('.fox-msg-bubble');
            if (bubble) {
                let clone = bubble.cloneNode(true);
                clone.querySelectorAll('button, img, mjx-assistive-mml').forEach(el => el.remove());
                let text = clone.innerText.replace(/\s+\n/g, '\n').trim();
                reportText += (isUser ? "[Học sinh/Thầy giáo]: " : "[Fox-lab AI]: ") + text + "\n\n";
            }
        });

        let blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = "Bao_Cao_lich_Su_Chat_FoxLab.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const chatInput = document.getElementById('fox-chat-input'), sendBtn = document.getElementById('foxSendBtn'), chatContent = document.getElementById('fox-chat-content');
    chatInput.addEventListener('input', () => { sendBtn.disabled = chatInput.value.trim() === '' && !uploadedImageBase64; });
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !sendBtn.disabled) sendFoxMessage(); });
    chatInput.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.indexOf('image/') === 0) {
                const imgFile = items[i].getAsFile();
                if (imgFile) {
                    e.preventDefault();
                    processSelectedImageFile(imgFile, null);
                    break;
                }
            }
        }
    });
    sendBtn.addEventListener('click', sendFoxMessage);

    const foxMicBtn = document.getElementById('foxMicBtn');
    let recognition = null;
    let isListening = false;
    let isVoiceSession = false;

    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            try { window.speechSynthesis.getVoices(); } catch (e) { }
        };
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';

        recognition.onstart = () => {
            isListening = true;
            isVoiceSession = true;
            
            foxMicBtn.classList.add('listening');
            foxMicBtn.title = "Đang lắng nghe... (Dừng để gửi luôn)";
            chatInput.placeholder = "Đang lắng nghe... Nói xong AI sẽ tự trả lời";
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            chatInput.value = transcript;
            sendBtn.disabled = chatInput.value.trim() === '' && !uploadedImageBase64;
        };

        recognition.onerror = (event) => {
            console.warn("Lỗi nhận diện giọng nói:", event.error);
            isVoiceSession = false;
            stopSpeechRecognition();
            if (event.error === 'not-allowed') {
                alert("⚠️ Vui lòng cấp quyền truy cập Microphone trên trình duyệt để sử dụng tính năng này!");
            }
        };

        recognition.onend = () => {
            const hasVoiceText = chatInput.value.trim() !== '';
            stopSpeechRecognition();
            if (isVoiceSession && hasVoiceText) {
                isVoiceSession = false;
                sendFoxMessage();
            } else {
                isVoiceSession = false;
            }
        };

        foxMicBtn.addEventListener('click', () => {
            
            if (isListening) {
                recognition.stop();
            } else {
                chatInput.value = '';
                isVoiceSession = true;
                isMicPromptActive = true;
                try {
                    recognition.start();
                } catch (err) {
                    console.log(err);
                    isVoiceSession = false;
                } finally {
                    setTimeout(() => { isMicPromptActive = false; }, 600);
                }
            }
        });
    } else {
        foxMicBtn.style.opacity = '0.4';
        foxMicBtn.title = "Trình duyệt không hỗ trợ nhận diện giọng nói";
        foxMicBtn.addEventListener('click', () => {
            alert("⚠️ Trình duyệt hiện tại chưa hỗ trợ Nhận diện giọng nói. Vui lòng thử trên Google Chrome hoặc Cốc Cốc!");
        });
    }

    function stopSpeechRecognition() {
        isListening = false;
        if (foxMicBtn) {
            foxMicBtn.classList.remove('listening');
            foxMicBtn.title = "Nói để nhập tin nhắn";
        }
        if (chatInput) {
            chatInput.placeholder = "Hỏi AI, nói hoặc tải ảnh đề bài...";
        }
    }

    
    // ========================================================
    // HỆ THỐNG ĐỌC PHẢN HỒI AI TIẾNG VIỆT CHUẨN KHOA HỌC (TTS)
    // Tích hợp dịch công thức LaTeX -> Tiếng Việt + SSML + GAS Proxy + Fallback trình duyệt
    // ========================================================
    const KhoaHocTTS = (function () {
        const CONFIG = {
            voice: 'vi-VN-Neural2-A', // Giọng nữ tự nhiên
            speakingRate: 1.15,
            maxChunkChars: 900
        };

        let currentAudio = null;
        let currentBtn = null;
        let activeUtterance = null;
        let fallbackTimerId = null;
        let isStoppedByUser = false;
        const audioCache = new Map();

        function chuyenDoiLaTeX(text) {
            if (!text) return '';
            let t = String(text);
            t = t.replace(/\$\$([\s\S]*?)\$\$/g, ' $1 ');
            t = t.replace(/\$([^$\n]+?)\$/g, ' $1 ');
            t = t.replace(/\\\[([\s\S]*?)\\\]/g, ' $1 ');
            t = t.replace(/\\\(([\s\S]*?)\\\)/g, ' $1 ');

            // Phân số (lặp 3 lần hỗ trợ phân số lồng nhau)
            for (let i = 0; i < 3; i++) {
                t = t.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1 phần $2');
            }

            // Căn bậc n và căn bậc hai
            t = t.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, 'căn bậc $1 của $2');
            for (let i = 0; i < 2; i++) {
                t = t.replace(/\\sqrt\{([^{}]+)\}/g, 'căn bậc hai của $1');
            }

            // Lũy thừa & chỉ số dưới Vật lý / Toán
            t = t.replace(/\^\{2\}/g, ' bình phương');
            t = t.replace(/\^\{3\}/g, ' lập phương');
            t = t.replace(/\^\{([^{}]+)\}/g, ' mũ $1');
            t = t.replace(/\^2\b/g, ' bình phương');
            t = t.replace(/\^3\b/g, ' lập phương');
            t = t.replace(/\^([a-zA-Z0-9])/g, ' mũ $1');
            t = t.replace(/_\{([^{}]+)\}/g, ' $1');
            t = t.replace(/_([a-zA-Z0-9])/g, ' $1');

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
                t = t.replace(item.regex, item.replace);
            });
            return t;
        }

        function chuanHoaVanBanThuan(rawText) {
            let text = chuyenDoiLaTeX(rawText);
            text = text
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]*>?/gm, ' ')
                .replace(/[*#_`~•]/g, ' ')
                .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');

            const tuDienKhoaHoc = [
                { regex: /(\d+(?:[.,]\d+)?)\s*Hz\b/gi, replace: '$1 Héc' },
                { regex: /(\d+(?:[.,]\d+)?)\s*kHz\b/gi, replace: '$1 ki-lô-héc' },
                { regex: /(\d+(?:[.,]\d+)?)\s*dB\b/gi, replace: '$1 đề-xi-ben' },
                { regex: /(\d+(?:[.,]\d+)?)\s*mA\b/g, replace: '$1 mi-li-am-pe' },
                { regex: /(\d+(?:[.,]\d+)?)\s*A\b/g, replace: '$1 am-pe' },
                { regex: /(\d+(?:[.,]\d+)?)\s*V\b/g, replace: '$1 vôn' },
                { regex: /(\d+(?:[.,]\d+)?)\s*W\b/g, replace: '$1 oát' },
                { regex: /(\d+(?:[.,]\d+)?)\s*Ω\b/g, replace: '$1 ôm' },
                { regex: /m\/s²|m\/s\^2/gi, replace: 'mét trên giây bình phương' },
                { regex: /m\/s/gi, replace: 'mét trên giây' },
                { regex: /km\/h/gi, replace: 'ki-lô-mét trên giờ' },
                { regex: /(\d+(?:[.,]\d+)?)\s*ms\b/g, replace: '$1 mi-li-giây' },
                { regex: /(\d+(?:[.,]\d+)?)\s*°C/g, replace: '$1 độ Xê' },
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
                { regex: /Fox-lab/gi, replace: 'Phốc Láp' }
            ];

            tuDienKhoaHoc.forEach((item) => {
                text = text.replace(item.regex, item.replace);
            });

            text = text.replace(/(\d+)\.(\d+)/g, '$1 phẩy $2');
            return text;
        }

        function taoChuoiSSML(rawText) {
            let text = chuanHoaVanBanThuan(rawText);
            text = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            text = text.replace(/\n{2,}/g, '<break time="500ms"/>');
            text = text.replace(/\n/g, '<break time="320ms"/>');
            text = text.replace(
                /([A-Za-zÀ-ỹ0-9\(\)\/\+\-\s]{1,30})\s*=\s*([A-Za-zÀ-ỹ0-9\(\)\/\+\-\s\.,]{1,40})/g,
                '<prosody rate="92%">$1 <break time="160ms"/> bằng <break time="160ms"/> $2</prosody><break time="220ms"/>'
            );
            text = text.replace(
                /\b(suy ra|tương đương|ta có|thay số)\b/gi,
                '<break time="220ms"/>$1<break time="140ms"/>'
            );
            text = text.replace(/\s+/g, ' ').trim();
            return `<speak>${text}</speak>`;
        }

        function chiaNhoVanBan(rawText, maxLen) {
            const sentences = rawText.split(/(?<=[.!?\n])\s+/);
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

        async function fetchAudioFromGAS(ssmlString, plainChunk) {
            if (typeof CHAT_GAS_URL === 'undefined' || !CHAT_GAS_URL) {
                throw new Error('Chưa cấu hình CHAT_GAS_URL');
            }
            const controller = new AbortController();
            const timerId = setTimeout(() => controller.abort(), 25000);
            try {
                const response = await fetch(CHAT_GAS_URL, {
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
                    throw new Error(result.message || 'GAS trả về lỗi TTS');
                }
                const mimeType = result.mimeType || 'audio/mp3';
                const playbackRate = result.rateApplied ? 1.0 : CONFIG.speakingRate;
                return {
                    src: `data:${mimeType};base64,${result.audioBase64}`,
                    playbackRate: playbackRate
                };
            } catch (err) {
                clearTimeout(timerId);
                throw err;
            }
        }

        function playAudioPromise(audioItem, btn) {
            return new Promise((resolve, reject) => {
                if (isStoppedByUser) return resolve();
                const audioSrc = typeof audioItem === 'string' ? audioItem : audioItem.src;
                const targetRate = (audioItem && typeof audioItem === 'object' && audioItem.playbackRate)
                    ? audioItem.playbackRate
                    : CONFIG.speakingRate;
                currentAudio = new Audio(audioSrc);
                currentAudio.preservesPitch = true;
                currentAudio.mozPreservesPitch = true;
                currentAudio.webkitPreservesPitch = true;
                currentAudio.defaultPlaybackRate = targetRate;
                currentAudio.playbackRate = targetRate;
                currentAudio.onplay = () => {
                    if (currentAudio) currentAudio.playbackRate = targetRate;
                    updateBtnUI(btn, '⏹️ Dừng đọc', true);
                };
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

        function speakFallbackBrowser(rawText, btn) {
            if (!('speechSynthesis' in window)) {
                alert('⚠️ Trình duyệt hiện tại chưa hỗ trợ đọc văn bản thành tiếng.');
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
                    if (isStoppedByUser || errCode === 'canceled' || errCode === 'interrupted') {
                        return;
                    }
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
                    console.warn('[SpeechSynthesis Exception]:', err);
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

        async function toggleSpeak(rawText, buttonElement = null) {
            const isSameBtnSpeaking =
                currentBtn === buttonElement &&
                (currentAudio || activeUtterance || (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking));

            if (isSameBtnSpeaking) {
                stop();
                return;
            }

            stop();
            if (!rawText || !rawText.trim()) return;

            unlockBrowserSpeech();
            isStoppedByUser = false;
            currentBtn = buttonElement;
            updateBtnUI(buttonElement, '⏳ Đang tải giọng...', true);

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
                console.warn('[KhoaHocTTS Fallback sang giọng trình duyệt]:', err.message);
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
            if (active) btn.classList.add('is-speaking');
            else btn.classList.remove('is-speaking');
        }

        function resetState() {
            updateBtnUI(currentBtn, '🔊 Nghe', false);
            currentBtn = null;
        }

        return {
            speak: toggleSpeak,
            stop: stop
        };
    })();

    window.speakFoxText = function (btn) {
        const group = btn.closest('.fox-msg-group');
        const bubble = group ? group.querySelector('.fox-msg-bubble') : null;
        let textToSpeak = btn.dataset.speakText || '';
        if (!textToSpeak && bubble) {
            const clone = bubble.cloneNode(true);
            clone.querySelectorAll('mjx-container, mjx-assistive-mml, script, style').forEach(el => el.remove());
            textToSpeak = clone.innerText || clone.textContent || '';
        }
        KhoaHocTTS.speak(textToSpeak, btn);
    };

    let foxChatHistory = [];
    let activeConversationImageBase64 = null;
    let activeConversationImageSummary = "";

    function getLabTelemetry() {
        let fA = (detectedFrequency > 0 ? detectedFrequency : 0);
        let fB = (typeof currentCalcFreqB !== 'undefined' && currentCalcFreqB > 0 ? currentCalcFreqB : 0);
        let mode = (typeof getActiveChannelMode === 'function') ? getActiveChannelMode() : '1';

        let ampA = (typeof currentAmpA !== 'undefined' && parseFloat(currentAmpA) > 0) ? currentAmpA : '0.00';
        let ampB = (typeof currentAmpB !== 'undefined' && parseFloat(currentAmpB) > 0) ? currentAmpB : '0.00';

        if (ampA === '0.00' && channelConfig && channelConfig.A && channelConfig.A.data && channelConfig.A.index > 512) {
            let d = channelConfig.A.data, idx = channelConfig.A.index, l = d.length, maxV = 0;
            for (let i = 0; i < 512; i++) {
                let v = Math.abs(d[((idx - 512 + i) % l + l) % l]);
                if (v > maxV) maxV = v;
            }
            if (maxV > 0) ampA = maxV.toFixed(2);
        }

        let phaseDeg = '0', phaseRad = '0.00';
        const pDegEl = document.getElementById('hudPhaseDeg');
        const pRadEl = document.getElementById('hudPhaseRad');
        if (pDegEl && pDegEl.innerText) phaseDeg = pDegEl.innerText;
        if (pRadEl && pRadEl.innerText) phaseRad = pRadEl.innerText;

        let timeBase = (typeof totalTimeOnScreen !== 'undefined') ? (totalTimeOnScreen / 10 * 1000).toFixed(2) + ' ms/ô' : '1.42 ms/ô';

        let fftPeak = null;
        const fftTargetEl = document.getElementById('fftTargetFreq');
        if (fftTargetEl && fftTargetEl.value) {
            fftPeak = fftTargetEl.value + ' Hz';
        }

        return {
            mode: mode === '2' ? '2 Kênh (Dual-channel)' : '1 Kênh (Single-channel)',
            isPaused: isPaused ? 'Đang Dừng (Freeze/Hold)' : 'Đang Đo thời gian thực (Live)',
            timeBaseMs: timeBase,
            channelA: {
                active: !!(channelConfig && channelConfig.A && channelConfig.A.active),
                frequency: fA > 0 ? fA.toFixed(1) + ' Hz' : '0.0 Hz',
                period: fA > 0 ? (1000 / fA).toFixed(2) + ' ms' : '0.00 ms',
                amplitudePeak: ampA
            },
            channelB: {
                active: !!(channelConfig && channelConfig.B && channelConfig.B.active),
                frequency: fB > 0 ? fB.toFixed(1) + ' Hz' : '0.0 Hz',
                period: fB > 0 ? (1000 / fB).toFixed(2) + ' ms' : '0.00 ms',
                amplitudePeak: ampB
            },
            phaseDifference: {
                degrees: phaseDeg + '°',
                radians: phaseRad + ' rad'
            },
            fftPeak: fftPeak
        };
    }

    function captureOscilloscopeSnapshot() {
        try {
            const activeCanvas = (typeof isTwoSourceModalOpen !== 'undefined' && isTwoSourceModalOpen)
                ? document.getElementById('twoSourceCanvas') 
                : canvas;
            if (!activeCanvas || activeCanvas.width <= 0) return null;
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 600;
            thumbCanvas.height = Math.round(600 * (activeCanvas.height / activeCanvas.width));
            const tCtx = thumbCanvas.getContext('2d');
            tCtx.drawImage(activeCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            return thumbCanvas.toDataURL('image/jpeg', 0.65);
        } catch (e) {
            return null;
        }
    }

    async function fetchGasChatWithRetry(payload, maxRetries = 2, timeoutMs = 45000) {
        const excludedKeys = Array.isArray(payload.excludeKeyIndices) ? payload.excludeKeyIndices.slice() : [];
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timerId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const reqBody = Object.assign({}, payload, {
                    retryAttempt: attempt,
                    excludeKeyIndices: excludedKeys
                });
                const response = await fetch(CHAT_GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(reqBody),
                    signal: controller.signal
                });
                clearTimeout(timerId);
                if (!response.ok) {
                    const errSnippet = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status}${errSnippet ? ': ' + errSnippet.slice(0, 120) : ''}`);
                }
                const data = await response.json();
                if (!data || typeof data !== 'object') {
                    throw new Error('Phản hồi máy chủ AI không hợp lệ');
                }
                const replyStr = data.reply ? String(data.reply) : '';
                const isQuotaOrOverload =
                    (data.status === 'quota_exhausted' || data.retryWithNextKey === true) ||
                    /quá tải|quota|429|RESOURCE_EXHAUSTED/i.test(replyStr);
                if (isQuotaOrOverload && attempt < maxRetries) {
                    if (typeof data.usedKeyIndex === 'number' && !excludedKeys.includes(data.usedKeyIndex)) {
                        excludedKeys.push(data.usedKeyIndex);
                    }
                    const statusText = document.getElementById('foxStatusText');
                    if (statusText) statusText.innerText = "Đang kết nối token mới...";
                    await new Promise(r => setTimeout(r, 400));
                    continue;
                }
                return data;
            } catch (err) {
                clearTimeout(timerId);
                const isTimeoutAbort = err && err.name === 'AbortError' && timeoutMs >= 80000;
                if (!isTimeoutAbort && attempt < maxRetries) {
                    const statusText = document.getElementById('foxStatusText');
                    if (statusText) statusText.innerText = "Đang kết nối token mới...";
                    await new Promise(r => setTimeout(r, 500));
                    continue;
                }
                throw err;
            }
        }
    }

    function sanitizeChatHtml(htmlStr) {
        if (!htmlStr) return '';
        let sanitized = htmlStr
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*>/gi, '')
            .replace(/<link\b[^<]*>/gi, '')
            .replace(/<meta\b[^<]*>/gi, '');
        sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
        sanitized = sanitized.replace(/(href|src)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, '');
        return sanitized;
    }

    function stripHtmlToPlainText(htmlStr) {
        if (!htmlStr) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = String(htmlStr).replace(/<br\s*\/?>/gi, '\n');
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    function isLabMeasurementQuery(userText, hasUploadedImage) {
        if (hasUploadedImage) return true;
        if (!userText) return true;
        const lower = userText.toLowerCase().trim();
        const labKeywords = [
            "đang đo", "đo được", "thiết bị đo", "máy đo", "kết quả đo", 
            "đồ thị này", "đồ thị hiện tại", "kênh a", "kênh b", 
            "tín hiệu", "tần số đo", "chu kỳ đo", "dao động ký này",
            "số liệu này", "kết quả hiện tại", "sóng đang đo", "hình chụp",
            "phân tích đồ thị", "phân tích tín hiệu", "thực nghiệm này"
        ];
        return labKeywords.some(kw => lower.includes(kw));
    }

    function isFollowUpOnActiveImage(userText) {
        if (!activeConversationImageBase64 || !userText) return false;
        const lower = userText.toLowerCase().trim();
        const followUpMarkers = [
            "ảnh", "hình", "trên", "này", "đó", "tiếp", "câu", "ý", "phần",
            "tại sao", "vì sao", "giải thích", "chi tiết", "cụ thể", "rõ hơn",
            "tính lại", "bước", "công thức", "đồ thị", "trục", "đỉnh", "biên độ",
            "chu kỳ", "tần số", "pha", "số liệu", "giá trị", "kết quả", "đáp án",
            "còn", "thế thì", "vậy", "như vậy", "tương tự", "mở rộng", "khác gì"
        ];
        if (followUpMarkers.some(kw => lower.includes(kw))) return true;
        return foxChatHistory.length > 0 && lower.split(/\s+/).length <= 18;
    }

    function isReplyIncompleteByTokens(resultObj, currentText) {
        if (!currentText) return false;
        const rawFinish = String(
            (resultObj && (resultObj.finishReason || resultObj.finish_reason || resultObj.stopReason || '')) || ''
        ).toUpperCase();
        if (rawFinish.includes('MAX_TOKENS') || rawFinish.includes('LENGTH') || (resultObj && resultObj.isTruncated === true)) {
            return true;
        }
        const clean = String(currentText)
            .replace(/\$\$[\s\S]*?\$\$/g, ' MATH ')
            .replace(/\$[^$\n]+?\$/g, ' MATH ')
            .replace(/<[^>]+>/g, ' ')
            .trim();
        if (!clean) return false;
        const lastChar = clean.slice(-1);
        const lastWord = (clean.split(/\s+/).pop() || '').toLowerCase();
        const danglingWords = ['là', 'và', 'của', 'với', 'bằng', 'tại', 'trong', 'được', 'có', 'cho', 'các', 'như', 'khi', 'thì', 'để', 'gồm', 'sau', 'trên', 'dưới', 'theo', 'từ'];
        if (clean.length > 260 && !['.', '!', '?', ')', ']', '"', '”'].includes(lastChar)) {
            return true;
        }
        if (clean.length > 180 && (danglingWords.includes(lastWord) || clean.endsWith(',') || clean.endsWith(':'))) {
            return true;
        }
        return false;
    }

    function mergeContinuationText(baseText, nextPart) {
        const a = String(baseText || '').trim();
        const b = String(nextPart || '').trim();
        if (!b) return a;
        if (!a) return b;
        const plainA = stripHtmlToPlainText(a).slice(-120).toLowerCase();
        const plainBStart = stripHtmlToPlainText(b).slice(0, 60).toLowerCase();
        if (plainA && plainBStart && plainA.includes(plainBStart.slice(0, 28))) {
            return a;
        }
        const needsSpace = !/[\n>]$/.test(a) && !/^[\n<•*-]/.test(b);
        return a + (needsSpace ? ' ' : '\n') + b;
    }

    async function sendFoxMessage() {
        const text = chatInput.value.trim();
        if (!text && !uploadedImageBase64) return;
        if (isDemoMode) {
            if (demoChatCount >= MAX_DEMO_CHAT) {
                alert(`⚠️ Bản Demo chỉ cho phép hỏi AI tối đa ${MAX_DEMO_CHAT} lần. Vui lòng nhập Key Bản Full để sử dụng tiếp!`);
                openLicenseModal();
                return;
            }
            demoChatCount++;
        }
        
        const isQuickPreset = pendingQuickPrompt;
        pendingQuickPrompt = false;

        const hasNewUpload = !!uploadedImageBase64;
        const explicitLiveLabMarkers = [
            "đang đo", "đo được", "thiết bị đo", "máy đo", "kết quả đo",
            "đồ thị hiện tại", "sóng đang đo", "kết quả hiện tại", "thực nghiệm này"
        ];
        const lowerInputText = text.toLowerCase().trim();
        const isExplicitLiveLab = !hasNewUpload && !isQuickPreset && explicitLiveLabMarkers.some(kw => lowerInputText.includes(kw));
        if (isExplicitLiveLab) {
            activeConversationImageBase64 = null;
            activeConversationImageScanReport = "";
            activeConversationImageSummary = "";
        }

        const isContinuingImageThread = !hasNewUpload && !isQuickPreset && !isExplicitLiveLab && isFollowUpOnActiveImage(text);
        const isLabQuery = !isQuickPreset && !hasNewUpload && !isContinuingImageThread && isLabMeasurementQuery(text, false);

        let safeUserText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        let userDisplayHtml = safeUserText;
        let imgBase64ToSend = null;
        let scanReportToSend = "";

        if (hasNewUpload) {
            userDisplayHtml = `<img src="${uploadedImageBase64}" class="fox-preview-img"><br>` + safeUserText;
            imgBase64ToSend = uploadedImageBase64;
            activeConversationImageBase64 = uploadedImageBase64;
            activeConversationImageScanReport = uploadedImageScanReport;
            scanReportToSend = uploadedImageScanReport;
            activeConversationImageSummary = "";
        } else if (isContinuingImageThread) {
            imgBase64ToSend = activeConversationImageBase64;
            scanReportToSend = activeConversationImageScanReport;
        } else if (isLabQuery && (channelConfig.A.active || channelConfig.B.active)) {
            // Chỉ chụp snapshot dao động ký khi người dùng hỏi đích danh về đồ thị/kết quả đang đo
            imgBase64ToSend = captureOscilloscopeSnapshot();
            if (imgBase64ToSend) {
                scanReportToSend = await analyzeOscilloscopeImagePixels(imgBase64ToSend);
            }
        }

        addChatMessage('user', userDisplayHtml); 
        chatInput.value = ''; 
        clearImageUpload();
        sendBtn.disabled = true; 
        document.getElementById('foxStatusText').innerText = "Đang phân tích...";

        let thinkingId = addTypingIndicator(); 
        let measuredFreq = (isLabQuery && detectedFrequency > 0) ? detectedFrequency : null;
        let labTelemetry = (isLabQuery && (channelConfig.A.active || channelConfig.B.active)) ? getLabTelemetry() : null;

        const userHistoryContent = hasNewUpload
            ? `[Người dùng đã tải lên 1 hình ảnh] ${text || "Hãy đọc và phân tích thật chi tiết hình ảnh này."}`
            : (text || "Phân tích đồ thị dao động ký và thông số thí nghiệm này.");

        let promptMessage = text || "Hãy đọc, nhận dạng toàn bộ chữ, ký hiệu, số liệu, trục tọa độ và phân tích thật chi tiết hình ảnh này.";
        if (hasNewUpload) {
            promptMessage =
                "YÊU CẦU ĐỌC & PHÂN TÍCH ẢNH CHI TIẾT:\n" +
                (scanReportToSend ? (scanReportToSend + "\n\n") : "") +
                "- Hãy quan sát thật kỹ toàn bộ hình ảnh được tải lên: đọc chính xác mọi chữ viết, đề bài, câu hỏi trắc nghiệm/tự luận, số liệu, đơn vị, ký hiệu vật lý, trục tọa độ (tên trục, đơn vị, vạch chia, các điểm đặc biệt trên đồ thị) hoặc sơ đồ thí nghiệm.\n" +
                "- Trình bày đầy đủ, mạch lạc theo từng phần: (1) Tóm tắt dữ kiện/nội dung đọc được từ ảnh, (2) Phân tích & lời giải chi tiết từng bước kèm công thức, (3) Kết luận rõ ràng.\n" +
                "- Câu hỏi cụ thể của người dùng: " + (text || "Phân tích chi tiết toàn bộ nội dung trong ảnh.");
        } else if (isContinuingImageThread) {
            promptMessage =
                "CÂU HỎI NỐI TIẾP VỀ CÙNG MỘT HÌNH ẢNH / VẤN ĐỀ ĐANG TRAO ĐỔI:\n" +
                (scanReportToSend ? (scanReportToSend + "\n\n") : "") +
                "- Ảnh đính kèm chính là hình ảnh đã tải lên ở lượt trước trong cuộc hội thoại này. Hãy đối chiếu trực tiếp với hình ảnh và các phân tích trước đó để trả lời sâu, chính xác và nhất quán.\n" +
                "- Câu hỏi tiếp theo của người dùng: " + text;
        } else if (!isLabQuery) {
            promptMessage += "\n(Lưu ý: Đây là câu hỏi lý thuyết tổng quát, giải thích công thức chuẩn SGK, KHÔNG áp dụng hoặc gán số liệu đo của thiết bị vào câu trả lời).";
        } else if (scanReportToSend) {
            promptMessage += "\n\n" + scanReportToSend;
        }

        const recentHistory = foxChatHistory.slice(-12);

        const reqTimeoutMs = imgBase64ToSend ? 90000 : 45000;
        const reqMaxRetries = imgBase64ToSend ? 1 : 2;

        try {
            let result = await fetchGasChatWithRetry({
                message: promptMessage,
                frequency: measuredFreq,
                isQuickPrompt: isQuickPreset,
                role: currentFoxRole,
                imageBase64: imgBase64ToSend,
                history: recentHistory,
                labData: labTelemetry
            }, reqMaxRetries, reqTimeoutMs);

            let fullReply = (result && result.reply) ? String(result.reply) : "Fox-lab AI đã ghi nhận câu hỏi của bạn.";
            let contRounds = 0;
            const maxContRounds = 3;
            const usedKeysForContinuation = [];
            if (result && typeof result.usedKeyIndex === 'number') {
                usedKeysForContinuation.push(result.usedKeyIndex);
            }

            while (contRounds < maxContRounds && isReplyIncompleteByTokens(result, fullReply)) {
                contRounds++;
                const statusEl = document.getElementById('foxStatusText');
                if (statusEl) statusEl.innerText = `Đang nối tiếp token mới (${contRounds})...`;
                const typingTextEl = document.querySelector(`#${thinkingId} .fox-typing-text`);
                if (typingTextEl) typingTextEl.innerText = `Đang kết nối token mới để hoàn chỉnh câu trả lời (phần ${contRounds + 1})...`;

                const contHistory = recentHistory.concat([
                    { role: 'user', content: userHistoryContent },
                    { role: 'model', content: stripHtmlToPlainText(fullReply).slice(-2500) }
                ]).slice(-16);

                const contPrompt =
                    "CÂU TRẢ LỜI TRƯỚC ĐÓ ĐÃ CHẠM GIỚI HẠN TOKEN VÀ CHƯA HOÀN CHỈNH:\n" +
                    "--- PHẦN ĐÃ VIẾT ---\n" +
                    fullReply.slice(-1800) +
                    "\n--- HẾT PHẦN ĐÃ VIẾT ---\n" +
                    "Hãy TIẾP TỤC viết nối tiếp ngay từ chỗ bị dừng để hoàn chỉnh trọn vẹn câu trả lời cho câu hỏi: \"" +
                    (text || "Phân tích chi tiết hình ảnh / vấn đề này") +
                    "\". Không lặp lại phần đầu đã viết.";

                result = await fetchGasChatWithRetry({
                    message: contPrompt,
                    frequency: measuredFreq,
                    isQuickPrompt: false,
                    role: currentFoxRole,
                    imageBase64: imgBase64ToSend,
                    history: contHistory,
                    labData: labTelemetry,
                    isContinuation: true,
                    continuationRound: contRounds,
                    excludeKeyIndices: usedKeysForContinuation
                }, reqMaxRetries, reqTimeoutMs);

                if (result && typeof result.usedKeyIndex === 'number' && !usedKeysForContinuation.includes(result.usedKeyIndex)) {
                    usedKeysForContinuation.push(result.usedKeyIndex);
                }
                const nextChunk = (result && result.reply) ? String(result.reply).trim() : '';
                if (!nextChunk) break;
                fullReply = mergeContinuationText(fullReply, nextChunk);
            }

            removeTypingIndicator(thinkingId); 
            document.getElementById('foxStatusText').innerText = "Trực tuyến";
            let replyText = formatCompleteSentences(fullReply);

            const plainReplyForHistory = stripHtmlToPlainText(replyText);
            if (hasNewUpload) {
                activeConversationImageSummary = plainReplyForHistory.slice(0, 1200);
            }

            foxChatHistory.push({ role: 'user', content: userHistoryContent });
            foxChatHistory.push({ role: 'model', content: plainReplyForHistory });
            if (foxChatHistory.length > 16) foxChatHistory = foxChatHistory.slice(-16);

            addChatMessage('bot', replyText);
        } catch (e) {
            console.error('Fox-lab AI error:', e);
            removeTypingIndicator(thinkingId); 
            document.getElementById('foxStatusText').innerText = "Trực tuyến";
            let fallbackText = (e && e.name === 'AbortError')
                ? "Fox-lab AI đã ghi nhận câu hỏi của bạn. Quá trình phân tích ảnh đang mất nhiều thời gian hơn dự kiến, vui lòng thử gửi lại sau giây lát."
                : "Fox-lab AI đã ghi nhận câu hỏi của bạn. Hiện kết nối mạng tới máy chủ AI đang gián đoạn tạm thời, vui lòng thử gửi lại sau giây lát.";
            fallbackText = formatCompleteSentences(fallbackText);
            addChatMessage('bot', fallbackText);
        } finally {
            sendBtn.disabled = (chatInput.value.trim() === '' && !uploadedImageBase64);
        }
    }

    window.copyFoxText = function (btn) {
        const group = btn.closest('.fox-msg-group');
        const bubble = group ? group.querySelector('.fox-msg-bubble') : null;
        const textToCopy = btn.dataset.copyText || (bubble ? bubble.innerText : '');
        navigator.clipboard.writeText(textToCopy).then(() => {
            let oldText = btn.innerText;
            btn.innerText = "Đã Copy ✓";
            setTimeout(() => btn.innerText = oldText, 1500);
        });
    };
    
    async function addChatMessage(sender, text) {
        const row = document.createElement('div'); row.className = `fox-msg-row ${sender === 'user' ? 'fox-msg-user' : 'fox-msg-bot'}`;
        let html = ''; if (sender === 'bot') html += `<div class="fox-msg-avatar">${FOX_AVATAR_SVG}</div>`;
        const safeText = sanitizeChatHtml(text);
        const formattedText = sender === 'bot' ? formatMathText(safeText) : safeText;
        let actionBtns = sender === 'bot'
            ? `<button class="fox-speak-btn" onclick="speakFoxText(this)" title="Nghe AI đọc phản hồi">🔊 Nghe</button><button class="fox-copy-btn" onclick="copyFoxText(this)">Copy</button><button class="fox-export-btn" onclick="exportChatReport(this)">📥 Tải báo cáo</button>`
            : '';
        let actionsBar = sender === 'bot' ? `<div class="fox-msg-actions-bar">${actionBtns}</div>` : '';
        html += `<div class="fox-msg-group"><div class="fox-msg-bubble">${formattedText}</div>${actionsBar}</div>`;
        row.innerHTML = html;
        if (sender === 'bot') {
            const plainRaw = stripHtmlToPlainText(formattedText);
            const cBtn = row.querySelector('.fox-copy-btn');
            if (cBtn) cBtn.dataset.copyText = plainRaw;
            const sBtn = row.querySelector('.fox-speak-btn');
            if (sBtn) sBtn.dataset.speakText = plainRaw;
        }
        chatContent.appendChild(row); chatContent.scrollTop = chatContent.scrollHeight;

        if (sender === 'bot' && window.MathJax && MathJax.typesetPromise) {
            try {
                await MathJax.typesetPromise([row]);
            } catch (err) {
                console.log('MathJax typeset error:', err);
            }
        }
        return row;
    }

    function addTypingIndicator() {
        const id = 'typing_' + Date.now(), row = document.createElement('div');
        row.className = 'fox-msg-row fox-msg-bot'; row.id = id;
        row.innerHTML = '<div class="fox-msg-avatar">' + FOX_AVATAR_SVG + '</div><div class="fox-msg-group"><div class="fox-msg-bubble"><div class="fox-typing-indicator"><span class="fox-typing-text">Fox-lab đang phân tích...</span></div></div></div>';
        chatContent.appendChild(row); chatContent.scrollTop = chatContent.scrollHeight; return id;
    }
    function removeTypingIndicator(id) { const el = document.getElementById(id); if (el) el.remove(); }

/**
 * graph-snapshot.js
 * Module tự động gắn nút "📷 Xuất ảnh đồ thị" lên TẤT CẢ các vùng đồ thị (<canvas>)
 * trên mọi trang/tab của ứng dụng đo (Dao động kí, Phổ tần số, Mức cường độ âm, Báo cáo...).
 *
 * Đặc điểm:
 * - Chụp CHỈ vùng đồ thị (<canvas>), không dính nút bấm, menu hay giao diện xung quanh.
 * - Chụp được BẤT KỲ LÚC NÀO (kể cả khi sóng đang chạy thời gian thực hay đang Pause)
 *   mà không làm gián đoạn luồng đo.
 * - Tương thích cả máy tính và điện thoại quét mã QR (hỗ trợ cả trình duyệt trong Zalo).
 */
(function () {
  "use strict";

  const DEFAULT_CONFIG = {
    buttonText: "📷 Xuất ảnh đồ thị",
    filePrefix: "DoThi_DoAm",
    addTimestampWatermark: true, // Ghi nhỏ ngày giờ chụp ở góc dưới phải ảnh xuất
    minWidth: 140,               // Bỏ qua các canvas icon nhỏ
    minHeight: 80
  };

  const config = Object.assign({}, DEFAULT_CONFIG, window.GraphSnapshotConfig || {});

  // Chèn CSS một lần duy nhất
  function injectStyles() {
    if (document.getElementById("graph-snapshot-styles")) return;
    const style = document.createElement("style");
    style.id = "graph-snapshot-styles";
    style.textContent = `
      .gs-canvas-wrapper {
        position: relative !important;
        display: block;
        width: 100%;
      }
      .gs-snap-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 25;
        background: rgba(15, 23, 42, 0.78);
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 6px;
        padding: 5px 10px;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        backdrop-filter: blur(4px);
        transition: background 0.15s, transform 0.08s, opacity 0.15s;
        user-select: none;
        line-height: 1.2;
      }
      .gs-snap-btn:hover {
        background: #0284c7;
        border-color: #38bdf8;
      }
      .gs-snap-btn:active {
        transform: scale(0.96);
      }
      @media print {
        .gs-snap-btn, .gs-toast, .gs-modal {
          display: none !important;
        }
      }
      .gs-toast {
        position: fixed;
        bottom: 18px;
        right: 18px;
        z-index: 99999;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
        padding: 9px 15px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
      }
      .gs-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
      /* Modal xem/lưu ảnh dự phòng cho trình duyệt nhúng trên điện thoại (Zalo/FB) */
      .gs-modal {
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: rgba(15, 23, 42, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .gs-modal-card {
        background: #1e293b;
        color: #f8fafc;
        border-radius: 10px;
        padding: 14px;
        max-width: 95vw;
        max-height: 90vh;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      }
      .gs-modal-card img {
        max-width: 100%;
        max-height: 65vh;
        border: 1px solid #475569;
        border-radius: 6px;
        display: block;
        margin: 10px auto;
      }
      .gs-modal-close {
        background: #2563eb;
        color: #fff;
        border: none;
        padding: 7px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function showToast(message) {
    let toast = document.getElementById("gs-global-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "gs-global-toast";
      toast.className = "gs-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window._gsToastTimer);
    window._gsToastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function formatTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return {
      file: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
      display: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    };
  }

  // Xác định tên gợi nhớ cho từng đồ thị (Oscilloscope, FFT, dB...)
  function detectGraphLabel(canvas, customLabel) {
    if (customLabel) return customLabel;
    const attrTitle = canvas.getAttribute("data-graph-title") || canvas.getAttribute("aria-label") || canvas.id;
    if (attrTitle) {
      return attrTitle.replace(/[^a-zA-Z0-9À-ỹ_-]+/g, "_");
    }
    return "BieuDo";
  }

  // Hàm chụp CHỈ vùng đồ thị của một canvas bất kỳ tại thời điểm hiện tại
  function captureCanvasOnly(canvas, customName) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    // Tạo canvas phụ trong bộ nhớ để chụp nguyên khung hình hiện tại mà không làm dừng đồ thị đang chạy
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d");

    // Sao chép toàn bộ vùng đồ thị
    ctx.drawImage(canvas, 0, 0, w, h);

    const ts = formatTimestamp();

    // Tùy chọn: đóng dấu thời gian nhỏ ở góc dưới bên phải ảnh đồ thị để đối chiếu số liệu
    if (config.addTimestampWatermark) {
      const text = ts.display;
      ctx.save();
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      const metrics = ctx.measureText(text);
      const padX = 8;
      const boxW = metrics.width + padX * 2;
      const boxH = 20;
      const x = w - boxW - 6;
      const y = h - boxH - 6;

      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.fillRect(x, y, boxW, boxH);
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(text, x + padX, y + 14);
      ctx.restore();
    }

    const label = detectGraphLabel(canvas, customName);
    const fileName = `${config.filePrefix}_${label}_${ts.file}.png`;

    // Kiểm tra trình duyệt nhúng (Zalo, Facebook WebView) trên điện thoại
    const isInAppWebView = /Zalo|FBAN|FBAV|Instagram/i.test(navigator.userAgent || "");

    offscreen.toBlob((blob) => {
      if (!blob || isInAppWebView) {
        const dataUrl = offscreen.toDataURL("image/png");
        openFallbackPreview(dataUrl, fileName);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      showToast(`Đã lưu ảnh đồ thị: ${fileName}`);
    }, "image/png");
  }

  function openFallbackPreview(dataUrl, fileName) {
    const modal = document.createElement("div");
    modal.className = "gs-modal";
    modal.innerHTML = `
      <div class="gs-modal-card">
        <div style="font-weight:bold; font-size:14px;">Ảnh chụp vùng đồ thị (${fileName})</div>
        <div style="font-size:12px; color:#cbd5e1; margin-top:4px;">Nhấn giữ vào ảnh bên dưới để lưu về máy</div>
        <img src="${dataUrl}" alt="Đồ thị sóng âm" />
        <button class="gs-modal-close">Đóng</button>
      </div>
    `;
    modal.querySelector(".gs-modal-close").onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }

  // Gắn nút xuất ảnh vào từng vùng chứa <canvas>
  function attachButtonToCanvas(canvas) {
    if (!canvas || canvas.dataset.gsAttached === "true") return;
    if (canvas.getAttribute("data-no-export") === "true") return;

    const rect = canvas.getBoundingClientRect();
    const logicalW = canvas.width || rect.width;
    const logicalH = canvas.height || rect.height;
    if (logicalW < config.minWidth || logicalH < config.minHeight) return;

    canvas.dataset.gsAttached = "true";

    const parent = canvas.parentElement;
    if (!parent) return;

    const computedPos = window.getComputedStyle(parent).position;
    if (computedPos === "static") {
      parent.style.position = "relative";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gs-snap-btn no-print";
    btn.textContent = config.buttonText;
    btn.title = "Chụp và tải xuống chỉ riêng vùng đồ thị này dưới dạng ảnh PNG";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      captureCanvasOnly(canvas);
    });

    parent.appendChild(btn);
  }

  function scanAndAttachAll() {
    injectStyles();
    const canvases = document.querySelectorAll("canvas");
    canvases.forEach(attachButtonToCanvas);
  }

  // Xuất hàm toàn cục để có thể gọi từ bất kỳ nút tùy chỉnh nào trên giao diện
  window.exportGraphCanvas = function (target, customName) {
    const canvas = typeof target === "string" ? document.querySelector(target) : target;
    captureCanvasOnly(canvas, customName);
  };

  // Tự động chạy khi tải trang và theo dõi nếu có tab/đồ thị mới sinh ra
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAndAttachAll);
  } else {
    scanAndAttachAll();
  }

  let gsScanScheduled = false;
  const observer = new MutationObserver(() => {
    if (gsScanScheduled) return;
    gsScanScheduled = true;
    requestAnimationFrame(() => {
      gsScanScheduled = false;
      scanAndAttachAll();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

(function () {
    "use strict";

    const EXP_STORAGE_KEY = "daodongki_report_data";
    const EXP_DEFAULT_TITLE = "BÁO CÁO KẾT QUẢ THỰC HÀNH KHẢO SÁT SÓNG ÂM";

    let expOscRows = [];
    let expFftRows = [];
    let expDbRows = [];
    let expLiveImages = { osc: null, fft: null, db: null };
    let cachedFftSnapshot = null;
    let lastSyncedDbSignature = "";
    let expSingleRowFlags = { osc: false, fft: false, db: false };

    function showExpToast(text) {
        const toast = document.getElementById("expToastMsg");
        if (toast) {
            toast.textContent = text;
            toast.classList.add("show");
            clearTimeout(window._expToastTimer);
            window._expToastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
            return;
        }
        let globalToast = document.getElementById("gs-global-toast");
        if (!globalToast) {
            globalToast = document.createElement("div");
            globalToast.id = "gs-global-toast";
            globalToast.className = "gs-toast";
            document.body.appendChild(globalToast);
        }
        globalToast.textContent = text;
        globalToast.classList.add("show");
        clearTimeout(window._gsToastTimer);
        window._gsToastTimer = setTimeout(() => globalToast.classList.remove("show"), 2600);
    }

    function readStoredReportData() {
        try {
            const raw = localStorage.getItem(EXP_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return (parsed && typeof parsed === "object") ? parsed : null;
        } catch (e) {
            return null;
        }
    }

    // Tự động nhận diện có phải dữ liệu mẫu mặc định ban đầu hay không
    function isSampleOscRows(rows) {
        if (!Array.isArray(rows) || rows.length !== 3) return false;
        return rows[0]?.soChuKi === 5 && Number(rows[0]?.deltaT_ms) === 11.35 &&
               rows[1]?.soChuKi === 5 && Number(rows[1]?.deltaT_ms) === 11.38 &&
               rows[2]?.soChuKi === 5 && Number(rows[2]?.deltaT_ms) === 11.34;
    }

    function isSampleFftRows(rows) {
        if (!Array.isArray(rows) || rows.length !== 3) return false;
        return String(rows[0]?.nguon || "").includes("Âm thoa chuẩn 440 Hz") &&
               String(rows[1]?.nguon || "").includes("Sáo trúc");
    }

    function isSampleDbRows(rows) {
        if (!Array.isArray(rows) || rows.length !== 3) return false;
        return Number(rows[0]?.r) === 0.5 && Number(rows[0]?.lAvg) === 75.0 &&
               Number(rows[1]?.r) === 1.0 && Number(rows[1]?.lAvg) === 68.8;
    }

    // Cập nhật 1 dòng dữ liệu theo quy tắc:
    // - Nếu người dùng đã chỉnh bảng về còn 1 dòng (singleRow = true): ghi đè dòng 1 bằng dữ liệu mới nhất.
    // - Ngược lại: mỗi lần đồng bộ nối thêm 1 dòng mới (Lần 1 -> Lần 2 -> Lần 3...).
    function applySingleRowSync(existingRows, newRow, isSingleRowMode, isSampleChecker) {
        const cleanExisting = Array.isArray(existingRows) ? existingRows.slice() : [];
        if (cleanExisting.length === 0 || (typeof isSampleChecker === "function" && isSampleChecker(cleanExisting))) {
            return [newRow];
        }
        if (isSingleRowMode) {
            return [newRow];
        }
        cleanExisting.push(newRow);
        return cleanExisting;
    }

    // Lưu lại kết quả & ảnh đồ thị FFT ngay trước khi đóng modal FFT
    window.cacheFftSnapshotForReport = function () {
        if (typeof fftLastAnalysis === "undefined" || !fftLastAnalysis || fftLastAnalysis.isEmptySignal) return;
        const f0 = fftLastAnalysis.hasValidF0
            ? fftLastAnalysis.f0
            : (fftLastAnalysis.presentPeaks && fftLastAnalysis.presentPeaks[0] ? fftLastAnalysis.presentPeaks[0].freq : 0);
        const harms = (fftLastAnalysis.harmonicsList || [])
            .filter(h => h.isPresent)
            .map(h => `${h.order}f₀ (${Math.round(h.targetFreq)} Hz)`)
            .join(", ");
        let fftImg = null;
        const fftCanvas = document.getElementById("fftDisplayCanvas");
        if (fftCanvas && fftCanvas.width > 0) {
            try { fftImg = fftCanvas.toDataURL("image/png"); } catch (e) {}
        }
        if (f0 > 0) {
            cachedFftSnapshot = {
                f0,
                harms: harms || "Chỉ có 1 đỉnh cơ bản f₀ rõ nét",
                dacDiem: (fftLastAnalysis.harmonicsList && fftLastAnalysis.harmonicsList.filter(h => h.isPresent).length > 1)
                    ? "Sóng tuần hoàn giàu họa âm"
                    : "Sóng hình sin gần thuần khiết",
                img: fftImg,
                synced: false,
                capturedAt: Date.now()
            };
        }
    };

    // Giữ nguyên nút "📄 Xuất báo cáo" trên thanh công cụ, đồng thời hỗ trợ đồng bộ từng chức năng sang report.html
    function upgradeExportReportButtonsToSync() {
        const btn = document.getElementById("btnExportReport");
        if (!btn) return;
        if (btn.textContent.trim() !== "📄 Xuất báo cáo") {
            btn.textContent = "📄 Xuất báo cáo";
        }
        btn.title = "Mở trang phiếu báo cáo thí nghiệm A4 (report.html)";
        if (btn.dataset.exportBound !== "true") {
            btn.dataset.exportBound = "true";
            btn.removeAttribute("onclick");
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.navigateToStandaloneReport();
            });
        }
    }

    window.syncChannelModeToReport = function (isDual) {
        try {
            const prev = readStoredReportData() || {};
            const payload = Object.assign({}, prev, {
                _source: "main_app",
                _updatedAt: Date.now(),
                syncFeature: "mode_only",
                isDualChannel: Boolean(isDual),
                dualSource: Boolean(isDual)
            });
            delete payload.cacLanDo;
            delete payload.phoTanSo;
            delete payload.mucCuongDoAm;
            localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(payload));
            const bc = new BroadcastChannel("foxlab_report_sync");
            bc.postMessage({ type: "SYNC_REPORT_DATA", payload });
            bc.close();
        } catch (e) {}
    };

    window.syncFeatureToReport = function (featureType) {
        const isDual = (typeof getActiveChannelMode === "function") && (getActiveChannelMode() === "2");
        const prev = readStoredReportData() || {};
        const now = Date.now();

        const payload = Object.assign({}, prev, {
            _source: "main_app",
            _updatedAt: now,
            syncFeature: featureType,
            isLiveMeasurement: true,
            isDualChannel: isDual,
            dualSource: isDual
        });

        if (typeof totalTimeOnScreen === "number" && totalTimeOnScreen > 0) {
            payload.scaleX = ((totalTimeOnScreen / 10) * 1000).toFixed(2).replace(".", ",") + " ms/ô";
        }
        if (typeof currentZoomY === "number" && currentZoomY > 0) {
            payload.scaleY = (1.0 / currentZoomY).toFixed(2).replace(".", ",") + " V/ô";
        }
        if (typeof sampleRate === "number" && sampleRate > 0) {
            payload.sampleRate = Math.round(sampleRate) + " Hz";
        }
        if (typeof channelConfig !== "undefined" && channelConfig.A) {
            const hp = channelConfig.A.filterHP ? Math.round(channelConfig.A.filterHP.frequency.value) : 45;
            const lp = channelConfig.A.filterLP ? Math.round(channelConfig.A.filterLP.frequency.value) : 3000;
            payload.filterStatus = `Thông dải (${hp} – ${lp} Hz)`;
            payload.filterBand = `${hp} – ${lp} Hz`;
        }

        // Xóa dữ liệu của các chức năng khác trong gói đồng bộ tức thời để chỉ đồng bộ đúng chức năng được chọn
        delete payload.cacLanDo;
        delete payload.phoTanSo;
        delete payload.mucCuongDoAm;
        delete payload.anhDoThiBase64;
        delete payload.anhPhoBase64;
        delete payload.anhDbBase64;

        if (featureType === "osc" || featureType === "kinematics") {
            const targetCanvas = (featureType === "kinematics")
                ? document.getElementById("kinematicsCanvas")
                : document.getElementById("oscilloscope");
            let snapImg = null;
            if (targetCanvas && targetCanvas.width > 0) {
                try { snapImg = targetCanvas.toDataURL("image/png"); } catch (e) {}
            }

            let entry = null;
            if (typeof manualPoints !== "undefined" && Array.isArray(manualPoints) && manualPoints.length === 2 &&
                typeof getVisibleChannelAWindow === "function" && typeof calculateFromGraphClicks === "function") {
                const winInfo = getVisibleChannelAWindow();
                const res = winInfo ? calculateFromGraphClicks(manualPoints[0], manualPoints[1], winInfo) : null;
                if (res && res.dt_ms > 0 && res.T_ms > 0) {
                    const N = Math.max(1, Math.round(res.dt_ms / res.T_ms));
                    entry = { kenh: "", soChuKi: N, deltaT_ms: Number(res.dt_ms.toFixed(2)), imageBase64: snapImg };
                }
            }
            if (!entry) {
                let fHz = 0;
                if (typeof computeFrozenAutoFrequency === "function") fHz = computeFrozenAutoFrequency();
                if ((!fHz || fHz <= 0) && typeof detectedFrequency === "number" && detectedFrequency > 0) fHz = detectedFrequency;
                if (fHz > 0) {
                    const N = Math.max(1, Math.round((totalTimeOnScreen || 0.02) * fHz));
                    const dtMs = Number(((N * 1000) / fHz).toFixed(2));
                    entry = { kenh: "", soChuKi: N, deltaT_ms: dtMs, imageBase64: snapImg };
                }
            }
            if (!entry) {
                showExpToast("⚠️ Chưa có dữ liệu đồ thị hợp lệ để đồng bộ!");
                return;
            }
            payload.cacLanDo = [entry];
            payload.anhDoThiBase64 = snapImg;
        } else if (featureType === "twoSource") {
            const tsCanvas = (typeof isTwoSourceModalOpen !== "undefined" && isTwoSourceModalOpen)
                ? document.getElementById("twoSourceCanvas")
                : document.getElementById("oscilloscope");
            let snapImg = null;
            if (tsCanvas && tsCanvas.width > 0) {
                try { snapImg = tsCanvas.toDataURL("image/png"); } catch (e) {}
            }

            let entryA = null, entryB = null;
            if (typeof twoSourcePoints !== "undefined" && Array.isArray(twoSourcePoints.A) && twoSourcePoints.A.length === 2 &&
                typeof getVisibleChannelWindow === "function" && typeof calculateFromGraphClicks === "function") {
                const winA = getVisibleChannelWindow("A");
                const resA = winA ? calculateFromGraphClicks(twoSourcePoints.A[0], twoSourcePoints.A[1], winA, "A") : null;
                if (resA && resA.dt_ms > 0 && resA.T_ms > 0) {
                    const nA = Math.max(1, Math.round(resA.dt_ms / resA.T_ms));
                    entryA = { kenh: "Kênh A", soChuKi: nA, deltaT_ms: Number(resA.dt_ms.toFixed(2)), imageBase64: snapImg };
                }
            }
            if (typeof twoSourcePoints !== "undefined" && Array.isArray(twoSourcePoints.B) && twoSourcePoints.B.length === 2 &&
                typeof getVisibleChannelWindow === "function" && typeof calculateFromGraphClicks === "function") {
                const winB = getVisibleChannelWindow("B");
                const resB = winB ? calculateFromGraphClicks(twoSourcePoints.B[0], twoSourcePoints.B[1], winB, "B") : null;
                if (resB && resB.dt_ms > 0 && resB.T_ms > 0) {
                    const nB = Math.max(1, Math.round(resB.dt_ms / resB.T_ms));
                    entryB = { kenh: "Kênh B", soChuKi: nB, deltaT_ms: Number(resB.dt_ms.toFixed(2)), imageBase64: snapImg };
                }
            }
            if (!entryA) {
                const fA = (typeof currentCalcFreqA === "number" && currentCalcFreqA > 0) ? currentCalcFreqA : 440;
                const nA = Math.max(1, Math.round((totalTimeOnScreen || 0.02) * fA));
                entryA = { kenh: "Kênh A", soChuKi: nA, deltaT_ms: Number(((nA * 1000) / fA).toFixed(2)), imageBase64: snapImg };
            }
            if (!entryB) {
                const fB = (typeof currentCalcFreqB === "number" && currentCalcFreqB > 0) ? currentCalcFreqB : 440;
                const nB = Math.max(1, Math.round((totalTimeOnScreen || 0.02) * fB));
                entryB = { kenh: "Kênh B", soChuKi: nB, deltaT_ms: Number(((nB * 1000) / fB).toFixed(2)), imageBase64: snapImg };
            }
            payload.cacLanDo = [entryA, entryB];
            payload.anhDoThiBase64 = snapImg;
        } else if (featureType === "fft") {
            if (typeof cacheFftSnapshotForReport === "function") cacheFftSnapshotForReport();
            if (!cachedFftSnapshot || !(cachedFftSnapshot.f0 > 0)) {
                showExpToast("⚠️ Hãy nhấn 'Quét Họa âm' hoặc nhập f₀ trên phổ FFT trước khi đồng bộ!");
                return;
            }
            payload.phoTanSo = [{
                kenh: "",
                nguon: `Nguồn âm f₀ ≈ ${cachedFftSnapshot.f0.toFixed(1)} Hz`,
                f0: cachedFftSnapshot.f0.toFixed(1).replace(".", ","),
                hoaAm: cachedFftSnapshot.harms,
                dacDiem: cachedFftSnapshot.dacDiem,
                imageBase64: cachedFftSnapshot.img || null
            }];
            payload.anhPhoBase64 = cachedFftSnapshot.img || null;
        } else if (featureType === "db") {
            const hasDbA = (typeof dbHistoryA !== "undefined" && Array.isArray(dbHistoryA) && dbHistoryA.length > 0);
            const hasDbB = (isDual && typeof dbHistoryB !== "undefined" && Array.isArray(dbHistoryB) && dbHistoryB.length > 0);
            if (!hasDbA && !hasDbB) {
                showExpToast("⚠️ Chưa có dữ liệu mức cường độ âm (dB) để đồng bộ!");
                return;
            }
            const mainCanvas = document.getElementById("oscilloscope");
            let dbImg = null;
            if (mainCanvas && mainCanvas.width > 0 && (typeof getDisplayMode === "function" && getDisplayMode() === "dbMeter")) {
                try { dbImg = mainCanvas.toDataURL("image/png"); } catch (e) {}
            }
            const buildDbEntry = (histArr, chTag) => {
                const vals = histArr.map(item => typeof item === "number" ? item : (item.db || item.val || 0)).filter(v => v > 0);
                if (vals.length === 0) return null;
                const lMin = Math.min(...vals);
                const lMax = Math.max(...vals);
                const lAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
                let rEst = 1.0;
                if (typeof sourceRefState !== "undefined" && sourceRefState && sourceRefState.r0 > 0 && sourceRefState.L0 > 0) {
                    rEst = Number((sourceRefState.r0 * Math.pow(10, (sourceRefState.L0 - lAvg) / 20)).toFixed(2));
                }
                return {
                    kenh: chTag,
                    viTri: chTag ? `Điểm đo (${chTag})` : "Điểm đo",
                    r: rEst,
                    lMin: Number(lMin.toFixed(1)),
                    lMax: Number(lMax.toFixed(1)),
                    lAvg: Number(lAvg.toFixed(1)),
                    imageBase64: dbImg
                };
            };
            const listDb = [];
            if (hasDbA) {
                const eA = buildDbEntry(dbHistoryA, isDual ? "Kênh A" : "");
                if (eA) listDb.push(eA);
            }
            if (hasDbB) {
                const eB = buildDbEntry(dbHistoryB, "Kênh B");
                if (eB) listDb.push(eB);
            }
            if (listDb.length === 0) {
                showExpToast("⚠️ Chưa có giá trị dB hợp lệ để đồng bộ!");
                return;
            }
            payload.mucCuongDoAm = listDb;
            payload.anhDbBase64 = dbImg;
        }

        const serialized = JSON.stringify(payload);
        localStorage.setItem(EXP_STORAGE_KEY, serialized);
        window.name = "FOXLAB_DATA:" + serialized;
        try {
            const bc = new BroadcastChannel("foxlab_report_sync");
            bc.postMessage({ type: "SYNC_REPORT_DATA", payload });
            bc.close();
        } catch (e) {}

        const targetPage = window.FOX_REPORT_PAGE || "report.html";
        const reportWin = window.open(targetPage, "FoxLabReportWindow");
        if (!reportWin) {
            const link = document.createElement("a");
            link.href = targetPage;
            link.target = "FoxLabReportWindow";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        const labelMap = {
            osc: "Phân tích đồ thị",
            kinematics: "Đồ thị liên quan (u-t, v-t, a-t)",
            twoSource: "Xử lý 2 nguồn âm",
            fft: "Phổ họa âm FFT",
            db: "Mức cường độ âm (dB)"
        };
        showExpToast(`✅ Đã đồng bộ [${labelMap[featureType] || featureType}] sang báo cáo!`);
    };

    window.syncReportToStandalone = function () {
        window.navigateToStandaloneReport();
    };

    window.openExpReportModal = function () {
        window.navigateToStandaloneReport();
    };

    window.closeExpReportModal = function () {
        const overlay = document.getElementById("expReportModalOverlay");
        if (overlay) overlay.style.display = "none";
        document.body.classList.remove("printing-exp-report");
    };

    window.navigateToStandaloneReport = function () {
        const isDual = (typeof getActiveChannelMode === "function") && (getActiveChannelMode() === "2");
        window.syncChannelModeToReport(isDual);
        const targetPage = window.FOX_REPORT_PAGE || "report.html";
        const reportWin = window.open(targetPage, "FoxLabReportWindow");
        if (!reportWin) {
            window.location.href = targetPage;
        }
    };

    // Thu thập tự động 1 dòng số liệu & ảnh đồ thị cho mỗi lần đồng bộ từ Fox-lab
    window.syncFoxLabToReport = function (notifyUser) {
        let hasNewMeasurement = false;
        const banner = document.getElementById("expReportStatusBanner");
        const statusText = document.getElementById("expReportStatusText");
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== null) el.textContent = val; };

        // 0. Nạp trạng thái hiện tại từ localStorage để không bao giờ xung đột / mất dữ liệu đã lưu bên report.html
        const prev = readStoredReportData();
        if (prev) {
            if (prev.truong) setTxt("expSchoolName", prev.truong);
            if (prev.toChuyenMon) setTxt("expDeptName", prev.toChuyenMon);
            if (prev.nhom) setTxt("expGroupName", prev.nhom);
            if (prev.lop) setTxt("expClassName", prev.lop);
            if (prev.thanhVien) setTxt("expStudentNames", prev.thanhVien);
            const notesEl = document.getElementById("expStudentNotes");
            if (notesEl && prev.nhanXet) notesEl.innerHTML = prev.nhanXet;

            if (Array.isArray(prev.cacLanDo)) expOscRows = prev.cacLanDo.slice();
            if (Array.isArray(prev.phoTanSo)) expFftRows = prev.phoTanSo.slice();
            if (Array.isArray(prev.mucCuongDoAm)) expDbRows = prev.mucCuongDoAm.slice();

            if (prev.anhDoThiBase64 && !expLiveImages.osc) expLiveImages.osc = prev.anhDoThiBase64;
            if (prev.anhPhoBase64 && !expLiveImages.fft) expLiveImages.fft = prev.anhPhoBase64;
            if (prev.anhDbBase64 && !expLiveImages.db) expLiveImages.db = prev.anhDbBase64;

            // Đồng bộ chính xác trạng thái "Chỉnh 1 dòng (Ghi đè)" từ report_5.html
            const prevFlags = prev.singleRowFlags || {};
            const isGlobalSingle = (prev.singleRowMode === true);
            expSingleRowFlags = {
                osc: isGlobalSingle || Boolean(prevFlags.osc),
                fft: isGlobalSingle || Boolean(prevFlags.fft),
                db: isGlobalSingle || Boolean(prevFlags.db)
            };
        }

        // 1. Cập nhật thông số kỹ thuật từ máy đo Fox-lab
        const techMeta = {};
        if (typeof totalTimeOnScreen === "number" && totalTimeOnScreen > 0) {
            const msPerDiv = (totalTimeOnScreen / 10) * 1000;
            techMeta.scaleX = msPerDiv.toFixed(2).replace(".", ",") + " ms/ô";
            setTxt("expScaleX", techMeta.scaleX);
        }
        if (typeof currentZoomY === "number" && currentZoomY > 0) {
            const vPerDiv = 1.0 / currentZoomY;
            techMeta.scaleY = vPerDiv.toFixed(2).replace(".", ",") + " V/ô";
            setTxt("expScaleY", techMeta.scaleY);
        }
        if (typeof sampleRate === "number" && sampleRate > 0) {
            techMeta.sampleRate = Math.round(sampleRate) + " Hz";
            setTxt("expSampleRate", techMeta.sampleRate);
        }
        if (typeof channelConfig !== "undefined" && channelConfig.A) {
            const hp = channelConfig.A.filterHP ? Math.round(channelConfig.A.filterHP.frequency.value) : 45;
            const lp = channelConfig.A.filterLP ? Math.round(channelConfig.A.filterLP.frequency.value) : 3000;
            techMeta.filterStatus = `Thông dải (${hp} – ${lp} Hz)`;
            techMeta.filterBand = `${hp} – ${lp} Hz`;
            setTxt("expFilterStatus", techMeta.filterStatus);
            setTxt("expFilterBandCell", techMeta.filterBand);
        }

        const curMode = (typeof getDisplayMode === "function") ? getDisplayMode() : "oscilloscope";
        const chMode = (typeof getActiveChannelMode === "function") ? getActiveChannelMode() : "1";
        const hasSignalData = (typeof channelConfig !== "undefined") &&
            ((channelConfig.A && channelConfig.A.index > 256) || (channelConfig.B && channelConfig.B.index > 256));

        // 2. Chụp ảnh canvas hiện tại (ưu tiên modal đang mở, sau đó tới canvas chính)
        let activeOscSnap = null;
        let activeDbSnap = null;
        const activeCanvasEl = (typeof isTwoSourceModalOpen !== "undefined" && isTwoSourceModalOpen)
            ? document.getElementById("twoSourceCanvas")
            : ((typeof isKinematicsModalOpen !== "undefined" && isKinematicsModalOpen)
                ? document.getElementById("kinematicsCanvas")
                : document.getElementById("oscilloscope"));

        if (activeCanvasEl && activeCanvasEl.width > 0 && (hasSignalData || (typeof dbHistoryA !== "undefined" && dbHistoryA.length > 0))) {
            try {
                const snapDataUrl = activeCanvasEl.toDataURL("image/png");
                if (curMode === "dbMeter") {
                    activeDbSnap = snapDataUrl;
                    expLiveImages.db = snapDataUrl;
                } else {
                    activeOscSnap = snapDataUrl;
                    expLiveImages.osc = snapDataUrl;
                }
            } catch (e) {}
        }

        // 3. Thu thập 1 dòng số liệu Dao động kí kèm ảnh đồ thị của lần đo đó
        let singleOscEntry = null;
        if (curMode === "oscilloscope") {
            if (typeof manualPoints !== "undefined" && Array.isArray(manualPoints) && manualPoints.length === 2 &&
                typeof getVisibleChannelAWindow === "function" && typeof calculateFromGraphClicks === "function") {
                const winInfo = getVisibleChannelAWindow();
                if (winInfo) {
                    const res = calculateFromGraphClicks(manualPoints[0], manualPoints[1], winInfo);
                    if (res && res.dt_ms > 0 && res.T_ms > 0) {
                        const estCycles = Math.max(1, Math.round(res.dt_ms / res.T_ms));
                        singleOscEntry = { soChuKi: estCycles, deltaT_ms: Number(res.dt_ms.toFixed(2)), img: activeOscSnap };
                    }
                }
            } else if (typeof twoSourcePoints !== "undefined" && Array.isArray(twoSourcePoints.A) && twoSourcePoints.A.length === 2 &&
                typeof getVisibleChannelWindow === "function" && typeof calculateFromGraphClicks === "function") {
                const winA = getVisibleChannelWindow("A");
                if (winA) {
                    const resA = calculateFromGraphClicks(twoSourcePoints.A[0], twoSourcePoints.A[1], winA, "A");
                    if (resA && resA.dt_ms > 0 && resA.T_ms > 0) {
                        const estCycles = Math.max(1, Math.round(resA.dt_ms / resA.T_ms));
                        singleOscEntry = { soChuKi: estCycles, deltaT_ms: Number(resA.dt_ms.toFixed(2)), img: activeOscSnap };
                    }
                }
            }

            let liveFreq = (typeof detectedFrequency === "number" && detectedFrequency > 0)
                ? detectedFrequency
                : ((typeof lockedFrequency === "number" && lockedFrequency > 0 && lockedFrequency !== 440) ? lockedFrequency : 0);

            if (liveFreq <= 0 && hasSignalData && typeof computeFrozenAutoFrequency === "function") {
                const frozenF = computeFrozenAutoFrequency();
                if (frozenF > 0) liveFreq = frozenF;
            }

            if (liveFreq > 0) {
                techMeta.filterFreq = `${liveFreq.toFixed(1).replace(".", ",")} Hz (ổn định)`;
                techMeta.nguonAm = `Nguồn âm đo trực tiếp (~${liveFreq.toFixed(1)} Hz)`;
                setTxt("expFilterFreqCell", techMeta.filterFreq);
                setTxt("expSoundSource", techMeta.nguonAm);

                if (!singleOscEntry) {
                    const T_ms = 1000 / liveFreq;
                    const N = Math.max(1, Math.round(totalTimeOnScreen * liveFreq));
                    singleOscEntry = { soChuKi: N, deltaT_ms: Number((N * T_ms).toFixed(2)), img: activeOscSnap };
                }
            }

            if (singleOscEntry) {
                expOscRows = applySingleRowSync(expOscRows, singleOscEntry, expSingleRowFlags.osc, isSampleOscRows);
                window._expOscSyncCount = (Number(prev?.oscSyncCount) || 0) + 1;
                hasNewMeasurement = true;
            }
        }

        // 4. Thu thập 1 dòng dữ liệu Phổ tần số FFT kèm ảnh phổ
        if (typeof fftLastAnalysis !== "undefined" && fftLastAnalysis && !fftLastAnalysis.isEmptySignal) {
            cacheFftSnapshotForReport();
        }
        const fftOverlay = document.getElementById("fftModalOverlay");
        const isFftModalVisible = fftOverlay && fftOverlay.style.display === "flex";
        if (cachedFftSnapshot && cachedFftSnapshot.f0 > 0 && (!cachedFftSnapshot.synced || isFftModalVisible)) {
            const sourceLabel = (document.getElementById("expSoundSource")?.textContent?.trim())
                || techMeta.nguonAm
                || prev?.nguonAm
                || `Nguồn âm f₀ ≈ ${cachedFftSnapshot.f0.toFixed(1)} Hz`;
            const singleFftEntry = {
                nguon: sourceLabel,
                f0: cachedFftSnapshot.f0.toFixed(1).replace(".", ","),
                hoaAm: cachedFftSnapshot.harms,
                dacDiem: cachedFftSnapshot.dacDiem,
                img: cachedFftSnapshot.img || null
            };
            expFftRows = applySingleRowSync(expFftRows, singleFftEntry, expSingleRowFlags.fft, isSampleFftRows);
            if (cachedFftSnapshot.img) expLiveImages.fft = cachedFftSnapshot.img;
            cachedFftSnapshot.synced = true;
            window._expFftSyncCount = (Number(prev?.fftSyncCount) || 0) + 1;
            hasNewMeasurement = true;
        }

        // 5. Thu thập dữ liệu Mức cường độ âm (dB) cho Kênh A (và Kênh B nếu đo 2 kênh) kèm ảnh biểu đồ cột
        const hasDbA = (typeof dbHistoryA !== "undefined" && Array.isArray(dbHistoryA) && dbHistoryA.length > 0);
        const hasDbB = (chMode === "2" && typeof dbHistoryB !== "undefined" && Array.isArray(dbHistoryB) && dbHistoryB.length > 0);
        if (hasDbA || hasDbB) {
            const dbSig = `${dbStartTime || 0}_${hasDbA ? dbHistoryA.length : 0}_${hasDbB ? dbHistoryB.length : 0}`;
            if (curMode === "dbMeter" || dbSig !== lastSyncedDbSignature) {
                const buildDbEntry = (histArr, chTag) => {
                    const vals = histArr.map(item => typeof item === "number" ? item : (item.db || item.val || 0)).filter(v => v > 0);
                    if (vals.length === 0) return null;
                    const lMin = Math.min(...vals);
                    const lMax = Math.max(...vals);
                    const lAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
                    let rEst = 1.0;
                    if (typeof sourceRefState !== "undefined" && sourceRefState && sourceRefState.r0 > 0 && sourceRefState.L0 > 0) {
                        rEst = Number((sourceRefState.r0 * Math.pow(10, (sourceRefState.L0 - lAvg) / 20)).toFixed(2));
                    }
                    const nextIdx = (isSampleDbRows(expDbRows) || expSingleRowFlags.db) ? 1 : (expDbRows.length + 1);
                    const posLabel = chTag ? `Điểm ${nextIdx} (${chTag})` : `Điểm ${nextIdx}`;
                    return {
                        viTri: posLabel,
                        r: rEst,
                        lMin: Number(lMin.toFixed(1)),
                        lMax: Number(lMax.toFixed(1)),
                        lAvg: Number(lAvg.toFixed(1)),
                        img: activeDbSnap
                    };
                };

                let addedAnyDb = false;
                if (hasDbA) {
                    const entryA = buildDbEntry(dbHistoryA, chMode === "2" ? "Kênh A" : "");
                    if (entryA) {
                        expDbRows = applySingleRowSync(expDbRows, entryA, expSingleRowFlags.db, isSampleDbRows);
                        addedAnyDb = true;
                    }
                }
                if (hasDbB) {
                    const entryB = buildDbEntry(dbHistoryB, "Kênh B");
                    if (entryB) {
                        expDbRows = applySingleRowSync(expDbRows, entryB, expSingleRowFlags.db, isSampleDbRows);
                        addedAnyDb = true;
                    }
                }
                if (addedAnyDb) {
                    lastSyncedDbSignature = dbSig;
                    window._expDbSyncCount = (Number(prev?.dbSyncCount) || 0) + 1;
                    hasNewMeasurement = true;
                }
            }
        }

        window._expLatestTechMeta = techMeta;

        const hasAnyLiveData = hasNewMeasurement || Boolean(prev && prev.isLiveMeasurement);
        if (hasAnyLiveData) {
            if (banner) banner.classList.add("live-mode");
            if (statusText) {
                statusText.innerHTML = "<strong>✅ Đã đồng bộ số liệu &amp; đồ thị từ máy đo Fox-lab!</strong> Mỗi lần đồng bộ thêm 1 dòng dữ liệu (hoặc cập nhật 1 dòng mới nhất nếu bảng chỉ có 1 dòng).";
            }
            renderExpOscTable();
            renderExpFftTable();
            renderExpDbTable();
            redrawAllExpCanvases();
            saveExpReportToStorage(true);
            if (notifyUser && hasNewMeasurement) showExpToast("Đã đồng bộ 1 dòng dữ liệu mới từ Fox-lab!");
        } else {
            if (banner) banner.classList.remove("live-mode");
            if (statusText) {
                statusText.innerHTML = "<strong>Chế độ xem trước (Dữ liệu mẫu):</strong> Chưa có phép đo đang chạy trên máy đo. Hãy đo sóng trên Fox-lab rồi bấm <strong>Đồng bộ báo cáo</strong>.";
            }
            if (prev) {
                applyExpIncomingData(prev);
            } else {
                loadExpSampleAll(false);
            }
        }

        return hasNewMeasurement;
    };

    function saveExpReportToStorage(isLiveMeasurement) {
        try {
            const prev = readStoredReportData() || {};
            const meta = window._expLatestTechMeta || {};
            const getTxt = (id, fallback = "") => {
                const el = document.getElementById(id);
                if (el) {
                    const txt = el.textContent.trim();
                    if (txt) return txt;
                }
                return fallback;
            };
            const notesEl = document.getElementById("expStudentNotes");

            const payload = {
                isLiveMeasurement: Boolean(isLiveMeasurement),
                syncedAt: new Date().toISOString(),
                oscSyncCount: window._expOscSyncCount || prev.oscSyncCount || expOscRows.length,
                fftSyncCount: window._expFftSyncCount || prev.fftSyncCount || expFftRows.length,
                dbSyncCount: window._expDbSyncCount || prev.dbSyncCount || expDbRows.length,
                singleRowFlags: expSingleRowFlags,
                singleRowMode: Boolean(expSingleRowFlags.osc && expSingleRowFlags.fft && expSingleRowFlags.db),
                truong: getTxt("expSchoolName", prev.truong || ""),
                toChuyenMon: getTxt("expDeptName", prev.toChuyenMon || ""),
                tenThiNghiem: getTxt("expReportTitle", prev.tenThiNghiem || EXP_DEFAULT_TITLE),
                tieuDePhu: getTxt("expReportSubtitle", prev.tieuDePhu || ""),
                nguonAm: getTxt("expSoundSource", meta.nguonAm || prev.nguonAm || ""),
                nhom: getTxt("expGroupName", prev.nhom || ""),
                lop: getTxt("expClassName", prev.lop || ""),
                thanhVien: getTxt("expStudentNames", prev.thanhVien || ""),
                scaleX: getTxt("expScaleX", meta.scaleX || prev.scaleX || ""),
                scaleY: getTxt("expScaleY", meta.scaleY || prev.scaleY || ""),
                sampleRate: getTxt("expSampleRate", meta.sampleRate || prev.sampleRate || ""),
                filterStatus: getTxt("expFilterStatus", meta.filterStatus || prev.filterStatus || ""),
                filterBand: getTxt("expFilterBandCell", meta.filterBand || prev.filterBand || "45 – 3000 Hz"),
                filterFreq: getTxt("expFilterFreqCell", meta.filterFreq || prev.filterFreq || "440,1 Hz (ổn định)"),
                nhanXet: notesEl ? notesEl.innerHTML : (prev.nhanXet || ""),
                cacLanDo: expOscRows,
                phoTanSo: expFftRows,
                mucCuongDoAm: expDbRows,
                anhDoThiBase64: expLiveImages.osc || prev.anhDoThiBase64 || null,
                anhPhoBase64: expLiveImages.fft || prev.anhPhoBase64 || null,
                anhDbBase64: expLiveImages.db || prev.anhDbBase64 || null
            };
            localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(payload));
            return payload;
        } catch (e) {
            return null;
        }
    }

    function applyExpIncomingData(data) {
        if (!data || typeof data !== "object") return;
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
        setTxt("expSchoolName", data.truong);
        setTxt("expDeptName", data.toChuyenMon);
        setTxt("expReportTitle", data.tenThiNghiem);
        setTxt("expReportSubtitle", data.tieuDePhu);
        setTxt("expSoundSource", data.nguonAm);
        setTxt("expGroupName", data.nhom);
        setTxt("expClassName", data.lop);
        setTxt("expStudentNames", data.thanhVien);
        setTxt("expScaleX", data.scaleX);
        setTxt("expScaleY", data.scaleY);
        setTxt("expSampleRate", data.sampleRate);
        setTxt("expFilterStatus", data.filterStatus);
        const notesEl = document.getElementById("expStudentNotes");
        if (notesEl && data.nhanXet) notesEl.innerHTML = data.nhanXet;
        if (Array.isArray(data.cacLanDo)) expOscRows = data.cacLanDo.slice();
        if (Array.isArray(data.phoTanSo)) expFftRows = data.phoTanSo.slice();
        if (Array.isArray(data.mucCuongDoAm)) expDbRows = data.mucCuongDoAm.slice();
        if (data.singleRowFlags) {
            expSingleRowFlags = Object.assign({ osc: false, fft: false, db: false }, data.singleRowFlags);
        }
        expLiveImages.osc = data.anhDoThiBase64 || null;
        expLiveImages.fft = data.anhPhoBase64 || null;
        expLiveImages.db = data.anhDbBase64 || null;

        renderExpOscTable();
        renderExpFftTable();
        renderExpDbTable();
        redrawAllExpCanvases();
    }

    // Lắng nghe thay đổi từ tab report.html (khi người dùng xóa/chỉnh sửa bảng về còn 1 dòng bên file report)
    window.addEventListener("storage", (e) => {
        if (e.key === EXP_STORAGE_KEY && e.newValue) {
            try {
                const updated = JSON.parse(e.newValue);
                applyExpIncomingData(updated);
            } catch (err) {}
        }
    });

    window.applyExpPreset = function (mode) {
        document.querySelectorAll(".exp-rep-preset").forEach(b => b.classList.remove("active"));
        const activeBtn = document.getElementById(`expPreset-${mode}`);
        if (activeBtn) activeBtn.classList.add("active");

        const parts = ["1", "2", "3", "4"];
        const titleEl = document.getElementById("expReportTitle");
        if (mode === "all") {
            parts.forEach(p => { const c = document.getElementById(`expChk-part${p}`); if (c) c.checked = true; });
            const c5 = document.getElementById("expChk-part5"); if (c5) c5.checked = true;
            if (titleEl) titleEl.textContent = EXP_DEFAULT_TITLE;
        } else {
            const selected = String(mode).split(",");
            parts.forEach(p => {
                const c = document.getElementById(`expChk-part${p}`);
                if (c) c.checked = selected.includes(p);
            });
            const c5 = document.getElementById("expChk-part5"); if (c5) c5.checked = true;
            if (selected.length === 1 && titleEl) {
                const sec = document.getElementById(`expPart${selected[0]}`);
                if (sec && sec.dataset.title) titleEl.textContent = sec.dataset.title;
            }
        }
        syncExpCheckboxes();
    };

    window.toggleExpTbDropdown = function (dropdownId, event) {
        if (event) event.stopPropagation();
        document.querySelectorAll(".exp-tb-dropdown").forEach(el => {
            if (el.id !== dropdownId) el.classList.remove("open");
        });
        const target = document.getElementById(dropdownId);
        if (target) target.classList.toggle("open");
    };

    document.addEventListener("click", () => {
        document.querySelectorAll(".exp-tb-dropdown").forEach(el => el.classList.remove("open"));
    });

    window.syncExpCheckboxes = function () {
        let count = 0;
        const checkedParts = [];
        ["1", "2", "3", "4", "5"].forEach(num => {
            const chk = document.getElementById(`expChk-part${num}`);
            const el = document.getElementById(`expPart${num}`);
            if (chk && el) {
                el.classList.toggle("hidden-part", !chk.checked);
                if (chk.checked) {
                    count++;
                    if (num !== "5") checkedParts.push(`expPart${num}`);
                }
            }
        });
        const badge = document.getElementById("expSelectedCountBadge");
        if (badge) badge.textContent = `(${count})`;

        const titleEl = document.getElementById("expReportTitle");
        if (titleEl && typeof EXP_DEFAULT_TITLE !== "undefined") {
            if (checkedParts.length === 1) {
                const sec = document.getElementById(checkedParts[0]);
                if (sec && sec.dataset.title) titleEl.textContent = sec.dataset.title;
            } else {
                titleEl.textContent = EXP_DEFAULT_TITLE;
            }
        }
    };

    window.exportSelectedExpToPDF = function () {
        document.querySelectorAll(".exp-tb-dropdown").forEach(el => el.classList.remove("open"));
        const sheet = document.getElementById("expReportSheet");
        if (!sheet) return;
        const groupSlug = (document.getElementById("expGroupName")?.textContent || "Nhom01").trim().replace(/\s+/g, "_");
        const fileName = `FoxLab_BaoCao_${groupSlug}.pdf`;

        if (typeof html2pdf === "undefined") {
            showExpToast("⚠️ Chưa tải được thư viện xuất PDF, vui lòng kiểm tra kết nối mạng!");
            return;
        }
        showExpToast("⏳ Đang tạo file PDF, vui lòng đợi...");
        sheet.classList.add("exp-exporting-pdf");

        const opt = {
            margin: [8, 8, 8, 8],
            filename: fileName,
            image: { type: "jpeg", quality: 0.96 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["avoid-all", "css", "legacy"] }
        };
        html2pdf().set(opt).from(sheet).save().then(() => {
            sheet.classList.remove("exp-exporting-pdf");
            showExpToast(`✅ Đã tải xuống file PDF: ${fileName}`);
        }).catch(() => {
            sheet.classList.remove("exp-exporting-pdf");
            showExpToast("❌ Có lỗi xảy ra khi xuất PDF!");
        });
    };

    window.exportSingleExpPartToPDF = function (partId, fileTag) {
        const allParts = ["expPart1", "expPart2", "expPart3", "expPart4"];
        const prevStates = {};
        const titleEl = document.getElementById("expReportTitle");
        const prevTitle = titleEl ? titleEl.textContent : EXP_DEFAULT_TITLE;

        allParts.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            prevStates[id] = el.classList.contains("hidden-part");
            if (id === partId) {
                el.classList.remove("hidden-part", "temp-print-hide");
                if (el.dataset.title && titleEl) titleEl.textContent = el.dataset.title;
            } else {
                el.classList.add("temp-print-hide");
            }
        });
        const part5 = document.getElementById("expPart5");
        const prevPart5 = part5 ? part5.classList.contains("hidden-part") : false;
        if (part5) part5.classList.remove("hidden-part", "temp-print-hide");

        const sheet = document.getElementById("expReportSheet");
        if (!sheet) return;
        sheet.classList.add("exp-exporting-pdf");
        showExpToast(`⏳ Đang tạo PDF ${fileTag}...`);

        const opt = {
            margin: [8, 8, 8, 8],
            filename: `FoxLab_${fileTag}.pdf`,
            image: { type: "jpeg", quality: 0.96 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };
        html2pdf().set(opt).from(sheet).save().then(() => {
            sheet.classList.remove("exp-exporting-pdf");
            allParts.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.remove("temp-print-hide");
                el.classList.toggle("hidden-part", prevStates[id]);
            });
            if (part5) part5.classList.toggle("hidden-part", prevPart5);
            if (titleEl) titleEl.textContent = prevTitle;
            showExpToast(`✅ Đã tải PDF: FoxLab_${fileTag}.pdf`);
        }).catch(() => {
            sheet.classList.remove("exp-exporting-pdf");
        });
    };

    window.exportSelectedExpToExcelCSV = function () {
        document.querySelectorAll(".exp-tb-dropdown").forEach(el => el.classList.remove("open"));
        const rows = [
            ["BÁO CÁO KẾT QUẢ THÍ NGHIỆM SÓNG ÂM - Fox-lab"],
            ["Nhóm", document.getElementById("expGroupName")?.textContent?.trim() || "", "Lớp", document.getElementById("expClassName")?.textContent?.trim() || ""],
            []
        ];
        if (document.getElementById("expChk-part1")?.checked) {
            rows.push(["PHẦN I: DAO ĐỘNG KÍ (T, f)"], ["Lần đo", "Số chu kì N", "Δt (ms)", "Chu kì T (ms)", "Tần số f (Hz)"]);
            expOscRows.forEach((r, i) => {
                const T = r.deltaT_ms / (r.soChuKi || 1);
                const f = T > 0 ? 1000 / T : 0;
                rows.push([`Lần ${i + 1}`, r.soChuKi, r.deltaT_ms.toFixed(2), T.toFixed(2), f.toFixed(1)]);
            });
            rows.push([]);
        }
        if (document.getElementById("expChk-part2")?.checked) {
            rows.push(["PHẦN II: PHỔ TẦN SỐ (FFT)"], ["Nguồn âm", "f0 (Hz)", "Họa âm", "Đặc điểm"]);
            expFftRows.forEach(r => rows.push([r.nguon, r.f0, r.hoaAm, r.dacDiem]));
            rows.push([]);
        }
        if (document.getElementById("expChk-part3")?.checked) {
            rows.push(["PHẦN III: MỨC CƯỜNG ĐỘ ÂM (dB)"], ["Vị trí", "Khoảng cách r (m)", "L_min (dB)", "L_max (dB)", "L_TB (dB)"]);
            expDbRows.forEach(r => rows.push([r.viTri, r.r, r.lMin, r.lMax, r.lAvg]));
            rows.push([]);
        }
        if (document.getElementById("expChk-part4")?.checked) {
            rows.push(["PHẦN IV: BỘ LỌC SỐ"], ["Trạng thái bộ lọc", document.getElementById("expFilterStatus")?.textContent?.trim() || ""]);
            rows.push([]);
        }
        downloadExpCSV(rows, "FoxLab_BaoCao_DaChon.csv");
    };

    function triggerCleanA4Print(onAfterPrint) {
        document.body.classList.add("printing-exp-report");
        let restored = false;
        const cleanup = () => {
            if (restored) return;
            restored = true;
            document.body.classList.remove("printing-exp-report");
            window.removeEventListener("afterprint", cleanup);
            if (typeof onAfterPrint === "function") onAfterPrint();
        };
        window.addEventListener("afterprint", cleanup);
        setTimeout(() => {
            window.print();
            setTimeout(cleanup, 600);
        }, 80);
    }

    window.printCurrentExpReport = function () {
        triggerCleanA4Print();
    };

    window.printSingleExpPart = function (partId) {
        const allParts = ["expPart1", "expPart2", "expPart3", "expPart4"];
        const prevStates = {};
        const titleEl = document.getElementById("expReportTitle");
        const prevTitle = titleEl ? titleEl.textContent : EXP_DEFAULT_TITLE;

        allParts.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            prevStates[id] = el.classList.contains("hidden-part");
            if (id === partId) {
                el.classList.remove("hidden-part", "temp-print-hide");
                if (el.dataset.title && titleEl) {
                    titleEl.textContent = el.dataset.title;
                }
            } else {
                el.classList.add("temp-print-hide");
            }
        });

        const part5 = document.getElementById("expPart5");
        const prevPart5 = part5 ? part5.classList.contains("hidden-part") : false;
        if (part5) part5.classList.remove("hidden-part", "temp-print-hide");

        triggerCleanA4Print(() => {
            allParts.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.remove("temp-print-hide");
                el.classList.toggle("hidden-part", prevStates[id]);
            });
            if (part5) part5.classList.toggle("hidden-part", prevPart5);
            if (titleEl) titleEl.textContent = prevTitle;
        });
    };

    window.exportExpPartAsImage = function (partId, fileTag) {
        const section = document.getElementById(partId);
        if (!section) return;

        const clone = section.cloneNode(true);
        clone.querySelectorAll(".no-print").forEach(el => el.remove());

        const origCanvases = section.querySelectorAll("canvas");
        const cloneCanvases = clone.querySelectorAll("canvas");
        origCanvases.forEach((origC, idx) => {
            if (cloneCanvases[idx]) {
                const img = document.createElement("img");
                img.src = origC.toDataURL("image/png");
                img.style.width = (origC.offsetWidth || 680) + "px";
                img.style.maxWidth = "100%";
                img.style.height = "auto";
                img.style.display = "block";
                img.style.margin = "0 auto";
                cloneCanvases[idx].parentNode.replaceChild(img, cloneCanvases[idx]);
            }
        });

        const rect = section.getBoundingClientRect();
        const width = Math.ceil(rect.width) || 740;
        const height = Math.ceil(rect.height) + 28;

        const scopedStyle = `
            * { box-sizing: border-box; }
            .overline { text-decoration: overline; }
            .exp-part-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; color: #0f172a; background: #f1f5f9; border-left: 4px solid #0f172a; padding: 5px 8px; margin-bottom: 8px; }
            .exp-sub-heading { font-size: 11.8pt; font-weight: bold; margin: 9px 0 5px; color: #1e293b; }
            .exp-graph-box { border: 1px solid #334155; padding: 7px; text-align: center; background: #ffffff; margin-bottom: 10px; }
            .exp-graph-caption { font-size: 10.8pt; font-style: italic; margin-top: 5px; color: #1e293b; }
            table.exp-data-table { width: 100%; border-collapse: collapse; margin-bottom: 9px; font-size: 11pt; }
            table.exp-data-table th, table.exp-data-table td { border: 1px solid #0f172a; padding: 4px 6px; text-align: center; vertical-align: middle; }
            table.exp-data-table th { background-color: #f1f5f9; font-weight: bold; }
            table.exp-data-table tr.summary-row td { background-color: #f8fafc; font-weight: bold; }
            .exp-result-box { border: 1px solid #0f172a; background: #f8fafc; padding: 7px 11px; margin-bottom: 10px; font-size: 11.5pt; }
        `;
        const groupName = document.getElementById("expGroupName")?.textContent?.trim() || "Nhóm 01";
        const className = document.getElementById("expClassName")?.textContent?.trim() || "11";

        const wrapperHtml = `
            <div xmlns="http://www.w3.org/1999/xhtml" style="background:#ffffff; padding:12px 16px; font-family:'Times New Roman', serif; color:#0f172a;">
              <style>${scopedStyle}</style>
              <div style="display:flex; justify-content:space-between; font-size:11pt; border-bottom:1px solid #94a3b8; padding-bottom:4px; margin-bottom:6px;">
                <span><strong>Fox-lab</strong> | ${groupName} – Lớp ${className}</span>
                <span>Thời gian: ${new Date().toLocaleString("vi-VN")}</span>
              </div>
              ${clone.outerHTML}
            </div>
        `;

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 36}">
              <foreignObject width="100%" height="100%">
                ${wrapperHtml}
              </foreignObject>
            </svg>
        `;

        const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
            const scale = 2;
            const outCanvas = document.createElement("canvas");
            outCanvas.width = width * scale;
            outCanvas.height = (height + 36) * scale;
            const ctx = outCanvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            try {
                outCanvas.toBlob((blob) => {
                    if (!blob) return;
                    const pngUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = pngUrl;
                    a.download = `FoxLab_${fileTag}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
                    showExpToast(`Đã xuất ảnh trọn gói: FoxLab_${fileTag}.png`);
                }, "image/png");
            } catch (err) {
                printSingleExpPart(partId);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            printSingleExpPart(partId);
        };
        img.src = url;
    };

    window.loadExpSampleAll = function (notifyUser) {
        expLiveImages = { osc: null, fft: null, db: null };
        expSingleRowFlags = { osc: false, fft: false, db: false };
        expOscRows = [
            { soChuKi: 5, deltaT_ms: 11.35 },
            { soChuKi: 5, deltaT_ms: 11.38 },
            { soChuKi: 5, deltaT_ms: 11.34 }
        ];
        expFftRows = [
            { nguon: "Âm thoa chuẩn 440 Hz", f0: "440,2", hoaAm: "Chỉ có 1 đỉnh cơ bản rõ nét", dacDiem: "Sóng sin thuần khiết, âm thanh trong" },
            { nguon: "Sáo trúc (Nốt La 4)", f0: "442,0", hoaAm: "f₀, 2f₀ (884 Hz), 3f₀ (1326 Hz)", dacDiem: "Đường sóng có các gợn hài hòa, âm êm" },
            { nguon: "Giọng nói (Nguyên âm A)", f0: "215,5", hoaAm: "Nhiều họa âm bậc cao (431, 646, 862 Hz)", dacDiem: "Dạng sóng tuần hoàn phức tạp" }
        ];
        expDbRows = [
            { viTri: "Điểm 1", r: 0.5, lMin: 74.2, lMax: 75.8, lAvg: 75.0 },
            { viTri: "Điểm 2", r: 1.0, lMin: 68.1, lMax: 69.5, lAvg: 68.8 },
            { viTri: "Điểm 3", r: 2.0, lMin: 62.0, lMax: 63.4, lAvg: 62.7 }
        ];

        renderExpOscTable();
        renderExpFftTable();
        renderExpDbTable();
        redrawAllExpCanvases();
        saveExpReportToStorage(false);
        if (notifyUser) showExpToast("Đã nạp bộ dữ liệu mẫu tham khảo!");
    };

    window.redrawAllExpCanvases = function () {
        if (expLiveImages.osc) drawExpBase64ToCanvas("expCanvasOsc", expLiveImages.osc);
        else drawExpSampleOsc();

        if (expLiveImages.fft) drawExpBase64ToCanvas("expCanvasFFT", expLiveImages.fft);
        else drawExpSampleFFT();

        if (expLiveImages.db) drawExpBase64ToCanvas("expCanvasDb", expLiveImages.db);
        else drawExpSampleDb();

        drawExpSampleFilter();
    };

    function drawExpGrid(ctx, w, h, cols, rows) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            ctx.moveTo((i * w) / cols, 0);
            ctx.lineTo((i * w) / cols, h);
            ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
            ctx.beginPath();
            ctx.moveTo(0, (j * h) / rows);
            ctx.lineTo(w, (j * h) / rows);
            ctx.stroke();
        }
    }

    function drawExpSampleOsc() {
        const c = document.getElementById("expCanvasOsc");
        if (!c) return;
        const ctx = c.getContext("2d");
        const w = c.width, h = c.height;
        drawExpGrid(ctx, w, h, 14, 6);

        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();

        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        const totalMs = 28;
        for (let x = 0; x <= w; x++) {
            const t = ((x / w) * totalMs) / 1000;
            const y = h / 2 - h * 0.36 * Math.sin(2 * Math.PI * 440 * t);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        const x1 = (2.27 / totalMs) * w;
        const x2 = (13.64 / totalMs) * w;
        ctx.strokeStyle = "#dc2626";
        ctx.setLineDash([5, 4]);
        [x1, x2].forEach((xp, i) => {
            ctx.beginPath();
            ctx.moveTo(xp, 8);
            ctx.lineTo(xp, h - 8);
            ctx.stroke();
            ctx.fillStyle = "#dc2626";
            ctx.font = "bold 13px Times New Roman";
            ctx.fillText(i === 0 ? "t₁" : "t₂", xp + 5, 20);
        });
        ctx.setLineDash([]);
    }

    function drawExpSampleFFT() {
        const c = document.getElementById("expCanvasFFT");
        if (!c) return;
        const ctx = c.getContext("2d");
        const w = c.width, h = c.height;
        drawExpGrid(ctx, w, h, 12, 5);

        const baseLine = h - 24;
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(30, baseLine);
        ctx.lineTo(w - 15, baseLine);
        ctx.stroke();

        ctx.strokeStyle = "#1d4ed8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 30; x < w - 15; x++) {
            const freq = ((x - 30) / (w - 45)) * 2000;
            const p1 = 145 * Math.exp(-Math.pow((freq - 440) / 18, 2));
            const p2 = 62 * Math.exp(-Math.pow((freq - 880) / 18, 2));
            const p3 = 28 * Math.exp(-Math.pow((freq - 1320) / 18, 2));
            const y = baseLine - (p1 + p2 + p3 + 4);
            x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 12px Times New Roman";
        const x440 = 30 + (440 / 2000) * (w - 45);
        const x880 = 30 + (880 / 2000) * (w - 45);
        ctx.fillText("f₀ = 440 Hz", x440 - 28, baseLine - 152);
        ctx.fillText("2f₀ = 880 Hz", x880 - 30, baseLine - 70);
        ctx.fillText("Tần số f (Hz)", w - 95, h - 6);
    }

    function drawExpSampleDb() {
        const c = document.getElementById("expCanvasDb");
        if (!c) return;
        const ctx = c.getContext("2d");
        const w = c.width, h = c.height;
        drawExpGrid(ctx, w, h, 10, 5);

        const steps = [
            { label: "r = 0,5 m (75 dB)", y: h * 0.25 },
            { label: "r = 1,0 m (68,8 dB)", y: h * 0.48 },
            { label: "r = 2,0 m (62,7 dB)", y: h * 0.72 }
        ];

        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let x = 20; x <= w - 20; x++) {
            const ratio = x / w;
            const baseY = ratio < 0.35 ? steps[0].y : ratio < 0.68 ? steps[1].y : steps[2].y;
            const y = baseY + Math.sin(x * 0.35) * 4;
            x === 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 12px Times New Roman";
        ctx.fillText(steps[0].label, 45, steps[0].y - 10);
        ctx.fillText(steps[1].label, w * 0.39, steps[1].y - 10);
        ctx.fillText(steps[2].label, w * 0.72, steps[2].y - 10);
    }

    function drawExpSampleFilter() {
        const c = document.getElementById("expCanvasFilter");
        if (!c) return;
        const ctx = c.getContext("2d");
        const w = c.width, h = c.height;
        drawExpGrid(ctx, w, h, 14, 4);

        const midX = w / 2;
        ctx.strokeStyle = "#64748b";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, h);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 10; x < midX - 10; x++) {
            const y = h / 2 - 48 * Math.sin(x * 0.14) - 14 * Math.sin(x * 1.15) - 8 * Math.cos(x * 2.3);
            x === 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = midX + 10; x < w - 10; x++) {
            const y = h / 2 - 48 * Math.sin(x * 0.14);
            x === midX + 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 12px Times New Roman";
        ctx.fillText("Tắt lọc: Sóng bị gợn nhiễu", 18, 20);
        ctx.fillText("Bật lọc thông dải: Sóng sin mượt", midX + 18, 20);
    }

    function drawExpBase64ToCanvas(canvasId, base64) {
        const img = new Image();
        img.onload = () => {
            const c = document.getElementById(canvasId);
            if (!c) return;
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);

            const invertDark = document.getElementById("expInvertDarkToggle")?.checked;
            if (invertDark) {
                const imgData = ctx.getImageData(0, 0, c.width, c.height);
                const d = imgData.data;
                let sumLum = 0, samples = 0;
                for (let i = 0; i < d.length; i += 64) {
                    sumLum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                    samples++;
                }
                if (samples > 0 && (sumLum / samples) < 115) {
                    for (let i = 0; i < d.length; i += 4) {
                        const r = d[i], g = d[i + 1], b = d[i + 2];
                        const max = Math.max(r, g, b), min = Math.min(r, g, b);
                        const l = (max + min) / 2;
                        const newL = 255 - l;
                        const delta = newL - l;
                        d[i] = Math.min(255, Math.max(0, r + delta));
                        d[i + 1] = Math.min(255, Math.max(0, g + delta));
                        d[i + 2] = Math.min(255, Math.max(0, b + delta));
                    }
                    ctx.putImageData(imgData, 0, 0);
                }
            }
        };
        img.src = base64;
    }

    window.exportSingleExpCanvas = function (canvasId, tag) {
        const canvasEl = document.getElementById(canvasId);
        if (!canvasEl) return;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const fileName = `FoxLab_${tag}_${stamp}.png`;

        canvasEl.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showExpToast(`Đã xuất ảnh đồ thị: ${fileName}`);
        }, "image/png");
    };

    // --- Render Bảng Phần I ---
    function renderExpOscTable() {
        const tbody = document.getElementById("expOscBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        const listT = [], listF = [];

        expOscRows.forEach((row, idx) => {
            const N = row.soChuKi > 0 ? row.soChuKi : 1;
            const dt = Number(row.deltaT_ms) || 0;
            const T = dt > 0 ? dt / N : 0;
            const f = T > 0 ? 1000 / T : 0;
            if (T > 0) listT.push(T);
            if (f > 0) listF.push(f);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>Lần ${idx + 1}</strong></td>
                <td contenteditable="true" onblur="updateExpOsc(${idx}, 'soChuKi', this.textContent)">${N}</td>
                <td contenteditable="true" onblur="updateExpOsc(${idx}, 'deltaT_ms', this.textContent)">${dt.toFixed(2)}</td>
                <td>${T > 0 ? T.toFixed(2) : "—"}</td>
                <td>${f > 0 ? f.toFixed(1) : "—"}</td>
                <td class="no-print"><button type="button" class="exp-row-del-btn" onclick="delExpOsc(${idx})">✕</button></td>
            `;
            tbody.appendChild(tr);
        });

        const stats = (arr) => {
            if (!arr.length) return null;
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            const err = arr.reduce((a, b) => a + Math.abs(b - mean), 0) / arr.length;
            return { mean, err };
        };
        const stT = stats(listT), stF = stats(listF);
        const setEl = (id, val, isHtml = false) => { const el = document.getElementById(id); if (el) { if (isHtml) el.innerHTML = val; else el.textContent = val; } };
        setEl("expAvgT", stT ? stT.mean.toFixed(2) : "—");
        setEl("expErrT", stT ? "± " + stT.err.toFixed(2) : "—");
        setEl("expAvgF", stF ? stF.mean.toFixed(1) : "—");
        setEl("expErrF", stF ? "± " + stF.err.toFixed(1) : "—");

        setEl("expResT", stT ? `<i>T</i> = (${stT.mean.toFixed(2)} ± ${stT.err.toFixed(2)}) ms` : "<i>T</i> = (— ± —) ms", true);
        setEl("expResF", stF ? `<i>f</i> = (${stF.mean.toFixed(1)} ± ${stF.err.toFixed(1)}) Hz` : "<i>f</i> = (— ± —) Hz", true);
        setEl("expRelF", stF && stF.mean > 0 ? ((stF.err / stF.mean) * 100).toFixed(2) + "%" : "—");
    }

    window.updateExpOsc = function (i, k, val) {
        const n = parseFloat(val.replace(",", ".").trim());
        if (!isNaN(n) && n >= 0) expOscRows[i][k] = k === "soChuKi" ? Math.max(1, Math.round(n)) : n;
        if (expOscRows.length === 1) expSingleRowFlags.osc = true;
        renderExpOscTable();
        saveExpReportToStorage(true);
    };
    window.addExpOscRow = function () {
        expOscRows.push({ soChuKi: 5, deltaT_ms: 11.35 });
        expSingleRowFlags.osc = false;
        renderExpOscTable();
        saveExpReportToStorage(true);
    };
    window.delExpOsc = function (i) {
        const hadMultiple = expOscRows.length > 1;
        expOscRows.splice(i, 1);
        if (hadMultiple && expOscRows.length === 1) expSingleRowFlags.osc = true;
        renderExpOscTable();
        saveExpReportToStorage(true);
    };

    // --- Render Bảng Phần II ---
    function renderExpFftTable() {
        const tbody = document.getElementById("expFftBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        expFftRows.forEach((r, i) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td contenteditable="true" onblur="updateExpFft(${i}, 'nguon', this.textContent)">${r.nguon}</td>
                <td contenteditable="true" onblur="updateExpFft(${i}, 'f0', this.textContent)">${r.f0}</td>
                <td contenteditable="true" onblur="updateExpFft(${i}, 'hoaAm', this.textContent)">${r.hoaAm}</td>
                <td contenteditable="true" onblur="updateExpFft(${i}, 'dacDiem', this.textContent)">${r.dacDiem}</td>
                <td class="no-print"><button type="button" class="exp-row-del-btn" onclick="delExpFft(${i})">✕</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
    window.updateExpFft = function (i, k, val) {
        expFftRows[i][k] = val.trim();
        if (expFftRows.length === 1) expSingleRowFlags.fft = true;
        saveExpReportToStorage(true);
    };
    window.addExpFftRow = function () {
        expFftRows.push({ nguon: "Nguồn âm mới", f0: "512,0", hoaAm: "f₀, 2f₀", dacDiem: "Dao động tuần hoàn" });
        expSingleRowFlags.fft = false;
        renderExpFftTable();
        saveExpReportToStorage(true);
    };
    window.delExpFft = function (i) {
        const hadMultiple = expFftRows.length > 1;
        expFftRows.splice(i, 1);
        if (hadMultiple && expFftRows.length === 1) expSingleRowFlags.fft = true;
        renderExpFftTable();
        saveExpReportToStorage(true);
    };

    // --- Render Bảng Phần III ---
    function renderExpDbTable() {
        const tbody = document.getElementById("expDbBody");
        if (!tbody) return;
        tbody.innerHTML = "";
        const baseL = expDbRows.length ? expDbRows[0].lAvg : 0;
        expDbRows.forEach((r, i) => {
            const diff = i === 0 ? "0,0 dB (Mốc)" : (r.lAvg - baseL).toFixed(1) + " dB";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td contenteditable="true" onblur="updateExpDb(${i}, 'viTri', this.textContent, false)">${r.viTri}</td>
                <td contenteditable="true" onblur="updateExpDb(${i}, 'r', this.textContent, false)">${Number(r.r).toFixed(1)}</td>
                <td contenteditable="true" onblur="updateExpDb(${i}, 'lMin', this.textContent, false)">${Number(r.lMin).toFixed(1)}</td>
                <td contenteditable="true" onblur="updateExpDb(${i}, 'lMax', this.textContent, false)">${Number(r.lMax).toFixed(1)}</td>
                <td contenteditable="true" onblur="updateExpDb(${i}, 'lAvg', this.textContent, true)">${Number(r.lAvg).toFixed(1)}</td>
                <td>${diff}</td>
                <td class="no-print"><button type="button" class="exp-row-del-btn" onclick="delExpDb(${i})">✕</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
    window.updateExpDb = function (i, k, val, rerender) {
        if (k === "viTri") expDbRows[i][k] = val.trim();
        else expDbRows[i][k] = parseFloat(val.replace(",", ".")) || 0;
        if (expDbRows.length === 1) expSingleRowFlags.db = true;
        if (rerender) renderExpDbTable();
        saveExpReportToStorage(true);
    };
    window.addExpDbRow = function () {
        expDbRows.push({ viTri: `Điểm ${expDbRows.length + 1}`, r: 3.0, lMin: 58.0, lMax: 59.5, lAvg: 58.8 });
        expSingleRowFlags.db = false;
        renderExpDbTable();
        saveExpReportToStorage(true);
    };
    window.delExpDb = function (i) {
        const hadMultiple = expDbRows.length > 1;
        expDbRows.splice(i, 1);
        if (hadMultiple && expDbRows.length === 1) expSingleRowFlags.db = true;
        renderExpDbTable();
        saveExpReportToStorage(true);
    };

    // --- Xuất CSV từng phần & Toàn bộ ---
    window.exportSingleExpPartCSV = function (partId) {
        let rows = [
            ["Fox-lab - XUẤT SỐ LIỆU THÍ NGHIỆM"],
            ["Nhóm", document.getElementById("expGroupName")?.textContent?.trim() || "", "Lớp", document.getElementById("expClassName")?.textContent?.trim() || ""],
            []
        ];
        let fileName = "FoxLab_SoLieu.csv";

        if (partId === "expPart1") {
            fileName = "FoxLab_Phan1_DaoDongKi.csv";
            rows.push(["PHẦN I: ĐO CHU KÌ VÀ TẦN SỐ (DAO ĐỘNG KÍ)"], ["Lần đo", "Số chu kì N", "Δt (ms)", "Chu kì T (ms)", "Tần số f (Hz)"]);
            expOscRows.forEach((r, i) => {
                const T = r.deltaT_ms / (r.soChuKi || 1);
                const f = T > 0 ? 1000 / T : 0;
                rows.push([`Lần ${i + 1}`, r.soChuKi, r.deltaT_ms.toFixed(2), T.toFixed(2), f.toFixed(1)]);
            });
        } else if (partId === "expPart2") {
            fileName = "FoxLab_Phan2_PhoFFT.csv";
            rows.push(["PHẦN II: PHỔ TẦN SỐ (FFT)"], ["Nguồn âm", "Tần số cơ bản f0 (Hz)", "Các họa âm", "Đặc điểm & Âm sắc"]);
            expFftRows.forEach(r => rows.push([r.nguon, r.f0, r.hoaAm, r.dacDiem]));
        } else if (partId === "expPart3") {
            fileName = "FoxLab_Phan3_MucCuongDoAm.csv";
            rows.push(["PHẦN III: ĐO MỨC CƯỜNG ĐỘ ÂM (dB)"], ["Vị trí đo", "Khoảng cách r (m)", "L_min (dB)", "L_max (dB)", "L_TB (dB)"]);
            expDbRows.forEach(r => rows.push([r.viTri, r.r, r.lMin, r.lMax, r.lAvg]));
        }

        downloadExpCSV(rows, fileName);
    };

    window.exportAllExpCSV = function () {
        const rows = [
            ["BÁO CÁO KẾT QUẢ THÍ NGHIỆM SÓNG ÂM - Fox-lab"],
            ["Nhóm", document.getElementById("expGroupName")?.textContent?.trim() || "", "Lớp", document.getElementById("expClassName")?.textContent?.trim() || ""],
            [],
            ["PHẦN I: DAO ĐỘNG KÍ (T, f)"],
            ["Lần đo", "Số chu kì N", "Δt (ms)", "Chu kì T (ms)", "Tần số f (Hz)"]
        ];
        expOscRows.forEach((r, i) => {
            const T = r.deltaT_ms / (r.soChuKi || 1);
            const f = T > 0 ? 1000 / T : 0;
            rows.push([`Lần ${i + 1}`, r.soChuKi, r.deltaT_ms.toFixed(2), T.toFixed(2), f.toFixed(1)]);
        });
        rows.push([], ["PHẦN II: PHỔ TẦN SỐ (FFT)"], ["Nguồn âm", "f0 (Hz)", "Họa âm", "Đặc điểm"]);
        expFftRows.forEach(r => rows.push([r.nguon, r.f0, r.hoaAm, r.dacDiem]));
        rows.push([], ["PHẦN III: MỨC CƯỜNG ĐỘ ÂM (dB)"], ["Vị trí", "Khoảng cách r (m)", "L_min (dB)", "L_max (dB)", "L_TB (dB)"]);
        expDbRows.forEach(r => rows.push([r.viTri, r.r, r.lMin, r.lMax, r.lAvg]));

        downloadExpCSV(rows, "FoxLab_BaoCao_DayDu.csv");
    };

    function downloadExpCSV(rows, fileName) {
        const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showExpToast(`Đã xuất file Excel: ${fileName}`);
    }

    function bindExportButtonOnce() {
        upgradeExportReportButtonsToSync();
        const btn = document.getElementById("btnExportReport");
        return Boolean(btn && btn.dataset.exportBound === "true");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bindExportButtonOnce);
    } else if (!bindExportButtonOnce()) {
        const btnObserver = new MutationObserver(() => {
            if (bindExportButtonOnce()) btnObserver.disconnect();
        });
        btnObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
})();

// Đăng ký Service Worker duy nhất
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
            reg.update();
        }).catch(err => console.log('ServiceWorker registration failed:', err));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}
