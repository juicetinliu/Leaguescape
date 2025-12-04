export function parseCsvText(text) {
    return csv_parse_sync.parse(
        text, 
        {
            skip_empty_lines: true,
            columns: true,
            trim: true
        })
}

// export function parseCsvText(text) {
//     // Very small CSV parser: splits lines, supports simple quoted values without embedded newlines.
//     const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
//     if (lines.length === 0) return [];
//     const splitRow = (line) => {
//         const parts = [];
//         let cur = '';
//         let inQuotes = false;
//         for (let i = 0; i < line.length; i++) {
//             const ch = line[i];
//             if (ch === '"') {
//                 inQuotes = !inQuotes;
//                 continue;
//             }
//             if (ch === ',' && !inQuotes) {
//                 parts.push(cur.trim());
//                 cur = '';
//                 continue;
//             }
//             cur += ch;
//         }
//         parts.push(cur.trim());
//         return parts;
//     };

//     const headerParts = splitRow(lines[0]).map(h => h.trim().toLowerCase());
//     const rows = [];
//     for (let r = 1; r < lines.length; r++) {
//         const parts = splitRow(lines[r]);
//         if (parts.length === 0) continue;
//         // pad short rows
//         while (parts.length < headerParts.length) parts.push('');
//         const obj = {};
//         for (let i = 0; i < headerParts.length; i++) {
//             obj[headerParts[i]] = parts[i] || '';
//         }
//         rows.push(obj);
//     }
//     return rows;
// }