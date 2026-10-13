const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("Iniciando pruebas de Informe PDF para Items Suspendidos...");

const jsContent = fs.readFileSync(path.join(__dirname, '../public/items_suspendidos.js'), 'utf-8');
const htmlContent = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf-8');

// 1. Verificar presencia de funciones clave
assert.ok(jsContent.includes('function cleanTextForPdf'), 'cleanTextForPdf debe existir');
assert.ok(jsContent.includes('function descargarPDFInformeCFI'), 'descargarPDFInformeCFI debe existir');
assert.ok(jsContent.includes('function descargarPDFInformeAlumno'), 'descargarPDFInformeAlumno debe existir');
assert.ok(jsContent.includes('function getItemsCFIProblematicos'), 'getItemsCFIProblematicos debe existir');

// 2. Verificar que cleanTextForPdf sanitiza emojis
const evalContext = {};
const cleanFnCode = jsContent.match(/function cleanTextForPdf\([\s\S]*?\n\}/)[0];
const cleanTextForPdf = new Function('return ' + cleanFnCode)();

assert.strictEqual(cleanTextForPdf('🟡 Ítem abierto'), '[ABIERTO] Ítem abierto');
assert.strictEqual(cleanTextForPdf('🔴 Sin superar'), '[SUSPENDIDO] Sin superar');
assert.strictEqual(cleanTextForPdf('💬 Con vuelo posterior'), '[V. POSTERIOR] Con vuelo posterior');
assert.strictEqual(cleanTextForPdf('↳ Requiere reprogramar'), '-> Requiere reprogramar');
assert.strictEqual(cleanTextForPdf('Víctor Padilla'), 'Víctor Padilla');
assert.strictEqual(cleanTextForPdf('Evaluación de Maniobras — MEP'), 'Evaluación de Maniobras - MEP');

// 3. Verificar elementos en el HTML
assert.ok(htmlContent.includes('onclick="abrirModalInformeCFI()"'), 'Botón abrirModalInformeCFI debe estar en index.html');
assert.ok(htmlContent.includes('id="cfi-filter-orientacion"'), 'Selector de orientación debe estar en index.html');
assert.ok(htmlContent.includes('id="cfi-chk-resumen"'), 'Checkbox de resumen debe estar en index.html');
assert.ok(htmlContent.includes('onclick="descargarPDFInformeCFI()"'), 'Botón de descarga PDF debe estar en index.html');
assert.ok(jsContent.includes('descargarPDFInformeAlumno'), 'Botón para PDF individual de alumno debe estar en items_suspendidos.js');

console.log("¡Todas las validaciones pasaron exitosamente!");
