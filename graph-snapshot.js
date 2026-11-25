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

  const observer = new MutationObserver(() => {
    scanAndAttachAll();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
