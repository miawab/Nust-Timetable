module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:module [external] (node:module, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:module", () => require("node:module"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[project]/lib/timetable-parser.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseLatestTimetableFromUploads",
    ()=>parseLatestTimetableFromUploads
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:fs [external] (node:fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$module__$5b$external$5d$__$28$node$3a$module$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:module [external] (node:module, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:path [external] (node:path, cjs)");
const __TURBOPACK__import$2e$meta__ = {
    get url () {
        return `file://${__turbopack_context__.P("lib/timetable-parser.ts")}`;
    },
    get turbopackHot () {
        return __turbopack_context__.m.hot;
    }
};
;
;
;
const require = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$module__$5b$external$5d$__$28$node$3a$module$2c$__cjs$29$__["createRequire"])(__TURBOPACK__import$2e$meta__.url);
const XLSX = __turbopack_context__.r("[project]/node_modules/xlsx/xlsx.mjs [app-route] (ecmascript)");
const UPLOADS_DIR = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(process.cwd(), 'data', 'uploads');
const DAY_NAMES = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday'
];
function normalizeHeader(value) {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}
function cleanCell(value) {
    return String(value ?? '').replace(/\r/g, '').trim();
}
function convertBatchYear(code) {
    const match = code.match(/^(\d)K(\d{2})$/i);
    if (!match) return Number.NaN;
    return Number(`${match[1]}0${match[2]}`);
}
function getStudyLevel(batchYear, currentYear) {
    const diff = currentYear - batchYear;
    if (diff === 1) return 'Freshman';
    if (diff === 2) return 'Sophomore';
    if (diff === 3) return 'Junior';
    if (diff === 4) return 'Senior';
    return `Year-${Math.max(diff, 0)}`;
}
function getDepartmentShortName(rawName) {
    const tokens = rawName.replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/).map((token)=>token.trim()).filter(Boolean).filter((token)=>![
            'nust',
            'of',
            'and',
            'the',
            'for'
        ].includes(token.toLowerCase()));
    const acronym = tokens.map((token)=>token[0]?.toUpperCase() ?? '').join('');
    return acronym || 'DEPT';
}
function parseBatchCode(batchCode) {
    const match = cleanCell(batchCode).match(/^(\dK\d{2})-([A-Za-z]+)-(\d+)([A-Za-z])$/i);
    if (!match) return null;
    return {
        batchYearCode: match[1].toUpperCase(),
        major: match[2].toUpperCase(),
        section: match[4].toUpperCase()
    };
}
function parseClassCell(rawValue) {
    const normalized = rawValue.replace(/\r/g, '').trim();
    if (!normalized) return {
        course: '',
        room: ''
    };
    const lines = normalized.split('\n').map((line)=>line.trim()).filter(Boolean);
    const firstLine = lines[0] ?? normalized;
    const roomMatch = normalized.match(/\(([^()]+)\)\s*$/);
    return {
        course: firstLine.replace(/\s*\([^()]*\)\s*$/, '').trim(),
        room: roomMatch?.[1]?.trim() ?? ''
    };
}
function getLatestWorkbookPath() {
    if (!__TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].existsSync(UPLOADS_DIR)) {
        throw new Error('Uploads directory does not exist.');
    }
    const files = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].readdirSync(UPLOADS_DIR).filter((file)=>/\.(xlsx|xls)$/i.test(file)).map((fileName)=>{
        const filePath = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$path__$5b$external$5d$__$28$node$3a$path$2c$__cjs$29$__["default"].join(UPLOADS_DIR, fileName);
        return {
            fileName,
            filePath,
            mtimeMs: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$fs__$5b$external$5d$__$28$node$3a$fs$2c$__cjs$29$__["default"].statSync(filePath).mtimeMs
        };
    }).sort((a, b)=>b.mtimeMs - a.mtimeMs);
    if (files.length === 0) {
        throw new Error('No Excel file found in data/uploads.');
    }
    const [latest] = files;
    return {
        fileName: latest.fileName,
        filePath: latest.filePath
    };
}
function ensurePath(data, department, major, studyLevel, section, day) {
    data[department] ??= {};
    data[department][major] ??= {};
    data[department][major][studyLevel] ??= {};
    data[department][major][studyLevel][section] ??= {};
    data[department][major][studyLevel][section][day] ??= [];
    return data[department][major][studyLevel][section][day];
}
function parseLatestTimetableFromUploads() {
    const { fileName, filePath } = getLatestWorkbookPath();
    const workbook = XLSX.readFile(filePath);
    const mappingSheet = workbook.Sheets['Mappings'];
    if (!mappingSheet) {
        throw new Error('Mappings sheet is missing in the workbook.');
    }
    const mappingRows = XLSX.utils.sheet_to_json(mappingSheet, {
        header: 1,
        defval: ''
    });
    if (mappingRows.length < 2) {
        throw new Error('Mappings sheet does not contain any mapping rows.');
    }
    const header = mappingRows[0].map(normalizeHeader);
    const sheetNameIdx = header.findIndex((col)=>col === 'sheetname');
    const batchIdx = header.findIndex((col)=>col === 'batch');
    const gridStartIdx = header.findIndex((col)=>col === 'gridstart');
    const gridEndIdx = header.findIndex((col)=>col === 'gridend');
    if ([
        sheetNameIdx,
        batchIdx,
        gridStartIdx,
        gridEndIdx
    ].some((idx)=>idx < 0)) {
        throw new Error('Mappings sheet is missing one or more required columns.');
    }
    const timetableSheetName = workbook.SheetNames.find((sheet)=>sheet !== 'Mappings' && sheet !== 'Processing Logs');
    if (!timetableSheetName) {
        throw new Error('No timetable sheets found in workbook.');
    }
    const firstTimetableSheet = workbook.Sheets[timetableSheetName];
    const departmentRaw = cleanCell(firstTimetableSheet?.A1?.v ?? '');
    const department = getDepartmentShortName(departmentRaw);
    const currentYear = new Date().getFullYear();
    const data = {};
    for (const row of mappingRows.slice(1)){
        const sheetName = cleanCell(row[sheetNameIdx]);
        const batchCode = cleanCell(row[batchIdx]);
        const gridStart = Number(row[gridStartIdx]);
        const gridEnd = Number(row[gridEndIdx]);
        if (!sheetName || !batchCode || !Number.isFinite(gridStart) || !Number.isFinite(gridEnd)) {
            continue;
        }
        const parsedBatch = parseBatchCode(batchCode);
        if (!parsedBatch) {
            continue;
        }
        const batchYear = convertBatchYear(parsedBatch.batchYearCode);
        if (!Number.isFinite(batchYear)) {
            continue;
        }
        const studyLevel = getStudyLevel(batchYear, currentYear);
        const major = parsedBatch.major;
        const section = parsedBatch.section;
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            continue;
        }
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: ''
        });
        const headerRow = rows[gridStart - 2] ?? [];
        const dayColumns = DAY_NAMES.map((day)=>{
            const index = headerRow.findIndex((cell)=>normalizeHeader(cell) === normalizeHeader(day));
            return {
                day,
                index
            };
        }).filter((entry)=>entry.index >= 0);
        for(let r = gridStart - 1; r <= gridEnd - 1; r += 1){
            const rowValues = rows[r] ?? [];
            const time = cleanCell(rowValues[0]);
            if (!/^\d{3,4}\s*-\s*\d{3,4}$/.test(time)) {
                continue;
            }
            for (const { day, index } of dayColumns){
                const rawCell = cleanCell(rowValues[index]);
                if (!rawCell) {
                    continue;
                }
                if (/lunch\s*\+\s*prayer\s*break|prayer\s*break/i.test(rawCell)) {
                    continue;
                }
                const { course, room } = parseClassCell(rawCell);
                if (!course) {
                    continue;
                }
                ensurePath(data, department, major, studyLevel, section, day).push({
                    time,
                    course,
                    room,
                    raw: rawCell
                });
            }
        }
    }
    return {
        sourceFile: fileName,
        departmentRaw,
        department,
        currentYear,
        generatedAt: new Date().toISOString(),
        data
    };
}
}),
"[project]/app/api/timetable/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$timetable$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/timetable-parser.ts [app-route] (ecmascript)");
;
;
const runtime = 'nodejs';
const dynamic = 'force-dynamic';
async function GET() {
    try {
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$timetable$2d$parser$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLatestTimetableFromUploads"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(parsed, {
            headers: {
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse timetable.';
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__139ro45._.js.map