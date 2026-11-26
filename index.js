// FoxLab v6.5.2 - Synchronized Numerical Derivative Capture & Storage
const STORAGE_KEY = 'foxlab_measurements_v6_5_2';

function computeNumericalDerivatives(tArray, uArray, dtSeconds = 0.001) {
  const n = uArray.length;
  const rawU = uArray.slice();
  const rawV = new Array(n).fill(0);
  const rawA = new Array(n).fill(0);

  if (n < 2) {
    return { rawU, rawV, rawA };
  }

  for (let i = 0; i < n; i++) {
    const dt = (Array.isArray(tArray) && tArray.length === n && i > 0)
      ? Math.max((tArray[i] - tArray[i - 1]) / 1000.0, 1e-6)
      : dtSeconds;

    if (i === 0) {
      rawV[0] = (rawU[1] - rawU[0]) / dt;
    } else if (i === n - 1) {
      rawV[n - 1] = (rawU[n - 1] - rawU[n - 2]) / dt;
    } else {
      const dt2 = (Array.isArray(tArray) && tArray.length === n && i + 1 < n)
        ? Math.max((tArray[i + 1] - tArray[i - 1]) / 1000.0, 1e-6)
        : 2 * dt;
      rawV[i] = (rawU[i + 1] - rawU[i - 1]) / dt2;
    }
  }

  for (let i = 0; i < n; i++) {
    const dt = (Array.isArray(tArray) && tArray.length === n && i > 0)
      ? Math.max((tArray[i] - tArray[i - 1]) / 1000.0, 1e-6)
      : dtSeconds;

    if (i === 0 && n >= 3) {
      rawA[0] = (rawV[1] - rawV[0]) / dt;
    } else if (i === n - 1 && n >= 3) {
      rawA[n - 1] = (rawV[n - 1] - rawV[n - 2]) / dt;
    } else if (n >= 3) {
      const dt2 = (Array.isArray(tArray) && tArray.length === n && i + 1 < n)
        ? Math.max((tArray[i + 1] - tArray[i - 1]) / 1000.0, 1e-6)
        : 2 * dt;
      rawA[i] = (rawV[i + 1] - rawV[i - 1]) / dt2;
    }
  }

  return { rawU, rawV, rawA };
}

function recordMeasurement(label, tMsArray, uArray) {
  const { rawU, rawV, rawA } = computeNumericalDerivatives(tMsArray, uArray);
  const record = {
    id: 'run_' + Date.now(),
    label: label || ('Lan do ' + new Date().toLocaleTimeString('vi-VN')),
    timestamp: new Date().toISOString(),
    version: '6.5.2',
    tMs: tMsArray.slice(),
    rawU,
    rawV,
    rawA
  };

  const existing = getAllMeasurements();
  existing.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return record;
}

function getAllMeasurements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function clearMeasurements() {
  localStorage.removeItem(STORAGE_KEY);
}

window.FoxLabCore = {
  computeNumericalDerivatives,
  recordMeasurement,
  getAllMeasurements,
  clearMeasurements
};
