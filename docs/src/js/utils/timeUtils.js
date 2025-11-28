/**
 * Convert milliseconds to HH:MM:SS
 * @param {*} ms number of milliseconds 
 * @returns HH:MM:SS corresponding to the milliseconds duration
 */
export function msToHms(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * Convert HH:MM:SS to milliseconds
 * @param {*} hms - HH:MM:SS 
 * @returns total milliseconds corresponding to that duration
 */
export function hmsToMs(hms) {
    // Validate format HH:MM:SS where minutes and seconds are 00-59 and hours is >= 0
    const re = /^(\d+):([0-5]\d):([0-5]\d)$/;
    const m = String(hms).trim().match(re);
    if (!m) return null;
    const hrs = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const secs = parseInt(m[3], 10);
    return ((hrs * 60 + mins) * 60 + secs) * 1000;
}