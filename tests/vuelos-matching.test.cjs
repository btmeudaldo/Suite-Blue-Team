const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/vuelos.js', 'utf8');
const start = source.indexOf('function formatMinutesToHhMm');
const end = source.indexOf('// =========================================================\n// GESTION DE ALMACENAMIENTO LOCAL');
const context = vm.createContext({ Date, Math, String, Number, Array, Object });
vm.runInContext(source.slice(start, end), context);
const matchFlights = context.matchFlightsAndCalculateDeviations;

test('executive deviation shows the sum of absolute flight deviations and keeps the net balance', () => {
  const kpis = context.calculateExecutiveKpis([
    { scheduledMinutes: 60, flownMinutes: 55, deviationMinutes: -5, status: 'EARLY' },
    { scheduledMinutes: 60, flownMinutes: 55, deviationMinutes: -5, status: 'EARLY' },
    { scheduledMinutes: 60, flownMinutes: 65, deviationMinutes: 5, status: 'DELAYED' }
  ]);

  assert.equal(kpis.totalAbsoluteDeviationMinutes, 15);
  assert.equal(kpis.totalAbsoluteDeviationHoursFormatted, '00:15');
  assert.equal(kpis.netDeviationMinutes, -5);
  assert.equal(kpis.netDeviationHoursFormatted, '-00:05');
  assert.match(source, /DESVIACIÓN TOTAL/);
  assert.match(source, /Balance neto \$\{kpis\.netDeviationHoursFormatted\}/);
  assert.match(source, /Desviación Total \(suma absoluta\)/);
  assert.match(source, /Balance Neto \(Bloque\)/);
});

const booking = (bookingId, flightNumber, dateBegin, dateEnd) => ({
  bookingId, flightNumber, registration: 'EC-OKC', dateBegin: new Date(dateBegin), dateEnd: new Date(dateEnd),
  scheduledMinutes: 150, flightType: 'Instruction', pilotName: 'APEMO', studentName: 'EHERN', instructorName: 'APEMO'
});
const flown = (flightNumber, start, end) => ({
  flightNumber, registration: 'EC-OKC', date: new Date(start), start: new Date(start), end: new Date(end), blockMinutes: 150,
  departure: 'GCXO', arrival: 'GCXO', studentName: 'EHERN', instructorName: 'APEMO', pilotName: 'APEMO'
});

test('a booking on September 28 cannot consume flight 4195644 from September 27', () => {
  const bookings = [
    booking('book-28', '4195645', '2026-09-28T14:00:00Z', '2026-09-28T16:30:00Z'),
    booking('book-27', '4195644', '2026-09-27T14:00:00Z', '2026-09-27T16:30:00Z')
  ];
  const flights = [
    flown('4195645', '2026-09-28T14:00:00Z', '2026-09-28T16:30:00Z'),
    flown('4195644', '2026-09-27T14:00:00Z', '2026-09-27T16:30:00Z')
  ];
  const result = matchFlights(bookings, flights);
  const september27 = result.find(item => item.bookingId === 'book-27');
  assert.equal(september27.isCancelled, false);
  assert.equal(september27.legs[0].flightNumber, '4195644');
});

test('each flight gets its own booking even when the crew and aircraft are the same', () => {
  const bookings = [
    booking('first-booking', '4195001', '2026-09-27T09:00:00Z', '2026-09-27T11:30:00Z'),
    booking('second-booking', '4195002', '2026-09-27T12:00:00Z', '2026-09-27T14:30:00Z')
  ];
  const flights = [
    flown('4195001', '2026-09-27T09:00:00Z', '2026-09-27T11:30:00Z'),
    flown('4195002', '2026-09-27T12:00:00Z', '2026-09-27T14:30:00Z')
  ];
  const result = matchFlights(bookings, flights);
  assert.deepEqual(Array.from(result, item => item.legs.length), [1, 1]);
  assert.deepEqual(Array.from(result, item => item.flownMinutes), [150, 150]);
});

test('fallback matching also requires the booking and flown leg to share a day', () => {
  const bookings = [booking('book-27', 'missing-number', '2026-09-27T14:00:00Z', '2026-09-27T16:30:00Z')];
  const flights = [flown('4195001', '2026-09-28T14:00:00Z', '2026-09-28T16:30:00Z')];
  const [result] = matchFlights(bookings, flights);
  assert.equal(result.isCancelled, true);
});

test('duplicate scheduled flight numbers are assigned to the matching student, not the first row', () => {
  const bookings = [
    { ...booking('wrong-student', '4193682', '2026-09-26T12:30:00Z', '2026-09-26T13:40:00Z'), registration: 'EC-NNX', studentName: 'ALUMNO INCORRECTO', instructorName: 'MMORE', scheduledMinutes: 70 },
    { ...booking('jmart-booking', '4193682', '2026-09-26T12:30:00Z', '2026-09-26T13:40:00Z'), registration: 'EC-NNX', studentName: 'JMART', instructorName: 'MMORE', scheduledMinutes: 70 }
  ];
  const flights = [{
    ...flown('4193682', '2026-09-26T12:30:00Z', '2026-09-26T13:40:00Z'),
    registration: 'EC-NNX', studentName: 'JMART', studentCode: 'JMART', instructorName: 'MMORE', instructorCode: 'MMORE'
  }];
  const result = matchFlights(bookings, flights);
  assert.equal(result.find(item => item.bookingId === 'jmart-booking').isCancelled, false);
  assert.equal(result.find(item => item.bookingId === 'wrong-student').isCancelled, true);
});

test('cancelled bookings retain Private Radar student and instructor codes', () => {
  const scheduled = {
    ...booking('cancelled-booking', '4192602', '2026-09-26T12:00:00Z', '2026-09-26T14:30:00Z'),
    studentCode: 'JMART', instructorCode: 'APEMO', pilotCode: 'APEMO'
  };
  const [result] = matchFlights([scheduled], []);
  assert.equal(result.isCancelled, true);
  assert.equal(result.studentCode, 'JMART');
  assert.equal(result.instructorCode, 'APEMO');
  assert.equal(result.pilotCode, 'APEMO');
});


test('a less specific duplicate booking cannot take a flight from a student-specific booking', () => {
  const bookings = [
    { ...booking('unspecified-student', '4192603', '2026-09-26T09:00:00Z', '2026-09-26T11:30:00Z'), studentName: '' },
    { ...booking('jmart-specific', '4192603', '2026-09-26T09:00:00Z', '2026-09-26T11:30:00Z'), studentName: 'J MART' }
  ];
  const flights = [{
    ...flown('4192603', '2026-09-26T09:00:00Z', '2026-09-26T11:30:00Z'),
    studentName: 'J MART', studentCode: 'JMART'
  }];
  const result = matchFlights(bookings, flights);
  assert.equal(result.find(item => item.bookingId === 'jmart-specific').isCancelled, false);
  assert.equal(result.find(item => item.bookingId === 'unspecified-student').isCancelled, true);
});

test('manual flight verification is stored on its booking and saved to the report', () => {
  const functionStart = source.indexOf('function toggleFlightVerification');
  const functionEnd = source.indexOf('\nfunction navigateVuelosDay', functionStart);
  const code = source.slice(functionStart, functionEnd);
  const flight = { bookingId: 'manual-review', flightNumber: '4192604' };
  let savedReport;
  let renders = 0;
  const state = {
    matchedFlights: [flight], reportDate: '26-09-2026', kpis: {},
    studentStats: [], instructorStats: [], pairStats: [], savedReports: []
  };
  const reviewContext = vm.createContext({
    vuelosState: state,
    saveLocalReport: report => { savedReport = report; },
    getLocalReportsList: () => [{ report_date: '26-09-2026', records: [flight] }],
    renderVuelosUI: () => { renders++; }
  });
  vm.runInContext(code, reviewContext);
  reviewContext.toggleFlightVerification(0, true);
  assert.equal(flight.verified, true);
  assert.equal(savedReport.matched[0].verified, true);
  assert.equal(state.savedReports[0].records[0].verified, true);
  assert.equal(renders, 0);
});

test('flight and cancellation tables expose a verification checkbox', () => {
  assert.equal((source.match(/data-flight-verification-index="\$\{vuelosState\.matchedFlights\.indexOf\(f\)\}"/g) || []).length, 2);
});

test('programmed export keeps Private Radar crew identifier columns', () => {
  context.XLSX = {
    read: () => ({ SheetNames: ['Flights'], Sheets: { Flights: {} } }),
    utils: { sheet_to_json: () => [
      ['#', 'Registration', 'Date begin (UTC)', 'Date end (UTC)', 'Type', 'Pilot', 'Pilot code', 'Student', 'Student code', 'Instructor', 'Instructor code', 'Flight #'],
      ['booking-1', 'EC-NNX', new Date('2026-09-26T12:30:00'), new Date('2026-09-26T13:40:00'), 'Instruction', 'MMORE', 'MMORE', 'JMART', 'JMART', 'MMORE', 'MMORE', '4193682']
    ] }
  };
  const [parsed] = context.parseProgramadoExcel(new ArrayBuffer(0));
  assert.equal(parsed.studentCode, 'JMART');
  assert.equal(parsed.instructorCode, 'MMORE');
});

test('rendered verification checkboxes use a scoped change handler', () => {
  assert.match(source, /container\.querySelectorAll\('\[data-flight-verification-index\]'\)/);
  assert.match(source, /checkbox\.addEventListener\('change', \(\) =>\s*toggleFlightVerification/);
});

test('date navigation arrows move in the direction shown by their labels', () => {
  const previousLabel = source.indexOf('title="Día anterior"');
  const nextLabel = source.indexOf('title="Día siguiente"');
  const previousButton = source.slice(previousLabel - 240, previousLabel + 60);
  const nextButton = source.slice(nextLabel - 240, nextLabel + 60);
  assert.match(previousButton, /onclick="navigateVuelosDay\(-1\)"/);
  assert.match(previousButton, /currentIdx <= 0/);
  assert.match(nextButton, /onclick="navigateVuelosDay\(1\)"/);
  assert.match(nextButton, /currentIdx >= vuelosState\.savedReports\.length - 1/);
});

test('flight duration and instructor headers use the requested labels', () => {
  assert.ok(source.includes(">Instructor ⬍</th>"));
  assert.ok(source.includes(">Alumno ⬍</th>"));
  assert.ok(source.includes(">Bloque ⬍</th>"));
  assert.ok(source.includes("'Instructor'"));
  assert.ok(source.includes("'Alumno'"));
  assert.ok(source.includes("'Bloque'"));
  assert.equal(source.includes('>Instructor/PIC ⬍</th>'), false);
  assert.equal(source.includes('>Alumno (DUAL) ⬍</th>'), false);
  assert.equal(source.includes('>Instructor (PIC)</th>'), false);
  assert.equal(source.includes('>Volado ⬍</th>'), false);
});

test('differences image renders separate Instructor and Alumno columns', () => {
  assert.ok(source.includes("{ key: 'instructor', label: 'Instructor'"));
  assert.ok(source.includes("{ key: 'alumno', label: 'Alumno'"));
  assert.equal(source.includes("{ key: 'pilotos', label: 'Pilotos'"), false);

  const formatInst = context.formatInstructorCell;
  const formatAlu = context.formatAlumnoCell;

  assert.equal(formatInst({ instructorCode: 'EDOMI', instructorName: 'Eduardo Dominguez' }), 'EDOMI');
  assert.equal(formatAlu({ studentCode: 'LANSO', studentName: 'Laura Ansoleaga' }), 'LANSO');

  // Vuelo de alquiler/solo donde el piloto va como alumno
  const rentalFlight = { flightType: 'Rental', pilotCode: 'PAFON', pilotName: 'Paula Afonso' };
  assert.equal(formatInst(rentalFlight), '');
  assert.equal(formatAlu(rentalFlight), 'PAFON');
});

test('rental or time-building flight parses student as PIC and passenger as instructor', () => {
  context.XLSX = {
    read: () => ({ SheetNames: ['Flights'], Sheets: { Flights: {} } }),
    utils: { sheet_to_json: () => [
      ['#', 'Registration', 'Date begin (UTC)', 'Date end (UTC)', 'Type', 'Pilot', 'Pilot code', 'Student', 'Student code', 'Instructor', 'Instructor code', 'Passenger', 'Passenger code', 'Flight #'],
      ['booking-rental', 'EC-NNX', new Date('2026-09-28T10:00:00'), new Date('2026-09-28T12:00:00'), 'Rental', 'ALUMNO RENTER', 'ALU01', '', '', '', '', 'INSTRUCTOR PAX', 'INS01', '4199999']
    ] }
  };
  const [parsed] = context.parseProgramadoExcel(new ArrayBuffer(0));
  assert.equal(parsed.studentName, 'ALUMNO RENTER');
  assert.equal(parsed.studentCode, 'ALU01');
  assert.equal(parsed.instructorName, 'INSTRUCTOR PAX');
  assert.equal(parsed.instructorCode, 'INS01');
});

test('startup loads the latest dated report that has flight records', async () => {
  const reports = [
    { report_date: '21-08-2026', records: [{ flightNumber: 'oldest' }] },
    { report_date: '28-09-2026', records: [{ flightNumber: 'latest-data' }] },
    { report_date: '29-09-2026', records: [] }
  ];
  const initStart = source.indexOf('async function initVuelosView()');
  const initEnd = source.indexOf('// Estilos CSS complementarios', initStart);
  let loadedDate = '';
  const initContext = vm.createContext({
    getLocalReportsList: () => reports,
    getLatestReport: context.getLatestReport,
    fetch: async () => ({ ok: false }),
    localStorage: { setItem() {} },
    computeCumulativeHistory: () => [],
    loadVuelosReportForDate: date => { loadedDate = date; },
    vuelosState: {}
  });
  vm.runInContext(source.slice(initStart, initEnd), initContext);
  await initContext.initVuelosView();
  assert.equal(loadedDate, '28-09-2026');
});

test('export success feedback names the file and refreshes the visible notice', () => {
  const helperStart = source.indexOf('function showVuelosExportFeedback');
  const helperEnd = source.indexOf('\nasync function saveVuelosExcelToDesktop', helperStart);
  let renderCount = 0;
  let timerDelay = 0;
  const state = { saveNotice: '' };
  const feedbackContext = vm.createContext({
    vuelosState: state,
    renderVuelosUI: () => { renderCount++; },
    setTimeout: (_callback, delay) => { timerDelay = delay; }
  });
  vm.runInContext(source.slice(helperStart, helperEnd), feedbackContext);
  feedbackContext.showVuelosExportFeedback('Excel', 'Desviacion_Vuelos_28-09-2026.xlsx');
  assert.match(state.saveNotice, /Desviacion_Vuelos_28-09-2026\.xlsx/);
  assert.match(state.saveNotice, /Descargas/);
  assert.equal(renderCount, 1);
  assert.equal(timerDelay, 5000);
  assert.match(source, /await saveVuelosExcelToDesktop\(excelBytes, filename\);/);
  assert.match(source, /showVuelosExportFeedback\('Excel', filename, destination\)/);
  assert.doesNotMatch(source, /XLSX\.writeFile\(wb, filename\)/);
  assert.match(source, /await saveVuelosPdfToDesktop\(doc\.output\('arraybuffer'\), filename\);/);
  assert.match(source, /showVuelosExportFeedback\('PDF', filename, destination\)/);
  assert.doesNotMatch(source, /doc\.save\(filename\)/);
});

test('desktop PDF saver posts the generated bytes to the local server', async () => {
  const helperStart = source.indexOf('async function saveVuelosPdfToDesktop');
  const helperEnd = source.indexOf('\nasync function exportVuelosPdf', helperStart);
  assert.notEqual(helperStart, -1);
  const code = source.slice(helperStart, helperEnd);
  let request;
  const context = vm.createContext({
    encodeURIComponent,
    fetch: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ status: 'ok', explorer_opened: true })
      };
    }
  });
  vm.runInContext(code, context);

  const pdfBytes = new Uint8Array([37, 80, 68, 70, 45]).buffer;
  const result = await context.saveVuelosPdfToDesktop(pdfBytes, 'Informe_28-09-2026.pdf');

  assert.equal(request.url, '/api/vuelos/guardar_pdf');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/pdf');
  assert.equal(request.options.headers['X-Filename'], 'Informe_28-09-2026.pdf');
  assert.equal(request.options.body, pdfBytes);
  assert.equal(result.explorer_opened, true);
});

test('desktop PDF saver explains when the app server has not loaded the save route', async () => {
  const helperStart = source.indexOf('async function saveVuelosPdfToDesktop');
  const helperEnd = source.indexOf('\nasync function exportVuelosPdf', helperStart);
  const context = vm.createContext({
    encodeURIComponent,
    fetch: async () => ({
      ok: false,
      status: 404,
      headers: { get: () => 'text/html; charset=utf-8' },
      json: async () => { throw new SyntaxError("Unexpected token '<'"); }
    })
  });
  vm.runInContext(source.slice(helperStart, helperEnd), context);

  await assert.rejects(
    context.saveVuelosPdfToDesktop(new ArrayBuffer(0), 'Informe.pdf'),
    /reinicia la aplicación/i
  );
});

test('parseHhMmToMinutes correctly parses HH:MM, decimal hours, and minutes', () => {
  const parseFn = context.parseHhMmToMinutes;
  assert.equal(parseFn('03:30'), 210);
  assert.equal(parseFn('0:25'), 25);
  assert.equal(parseFn('1:50'), 110);
  assert.equal(parseFn('00:00'), 0);
  assert.equal(parseFn('2.5'), 150);
  assert.equal(parseFn(90), 90);
  assert.equal(parseFn(''), 0);
  assert.equal(parseFn(null), 0);
});

test('flight views include manual edit, add flight, and delete action triggers', () => {
  assert.match(source, /openFlightEditModal/);
  assert.match(source, /deleteFlightByIndex/);
  assert.match(source, /Añadir Vuelo/);
  assert.match(source, /vuelos-flight-edit-modal/);
  assert.match(source, /recalculateAndPersistVuelos/);
});

test('maintenance reservations are filtered out of programmed bookings', () => {
  assert.match(source, /\/maintenance\|mantenimiento\/i/);
});

test('linked flights table merges scheduled time, deviation, and status using rowspan', () => {
  // Contiguous grouping of linked group members
  assert.match(source, /const displayFlights = \[\];/);
  assert.match(source, /const processedLinkedGroups = new Set\(\);/);
  assert.match(source, /displayFlights\.push\(\.\.\.members\);/);

  // Rowspan on scheduled time, deviation, and status
  assert.match(source, /rowspan="\$\{groupCount\}"/);
  assert.match(source, /🔗 Tramo \$\{legIndex\}\/\$\{groupCount\}/);
  assert.match(source, /unlinkFlights\('\$\{f\.linkedGroupId\}'\)/);
});

test('unified export button displays dropdown with Excel, PDF, and Image options', () => {
  assert.match(source, /id="btn-export-dropdown"/);
  assert.match(source, /id="export-dropdown-menu"/);
  assert.match(source, /handleExportOption\('excel'\)/);
  assert.match(source, /handleExportOption\('pdf'\)/);
  assert.match(source, /handleExportOption\('image'\)/);
  assert.match(source, /function toggleExportMenu/);
  assert.match(source, /function handleExportOption/);
});

test('instructores.json contains the official list of 23 instructors without emails', () => {
  const jsonRaw = fs.readFileSync('instructores.json', 'utf8');
  const catalog = JSON.parse(jsonRaw);
  assert.equal(catalog.length, 23);

  // Check sample instructors
  const ralva = catalog.find(i => i.code === 'RALVA');
  assert.ok(ralva);
  assert.equal(ralva.name, 'Álvarez De León, Rubén');
  assert.equal(ralva.role, 'INSTRUCTOR -SAFE');
  assert.equal(ralva.email, undefined);

  const edomi = catalog.find(i => i.code === 'EDOMI');
  assert.ok(edomi);
  assert.equal(edomi.name, 'Domínguez González, Eduardo José');

  // Ensure no email fields exist in any entry
  for (const item of catalog) {
    assert.ok(item.code);
    assert.ok(item.name);
    assert.ok(item.role);
    assert.equal(item.email, undefined);
    assert.ok(!/@/.test(JSON.stringify(item)));
  }
});

test('vuelos.js embeds INSTRUCTORES_CATALOG and provides lookup and autocomplete datalists', () => {
  assert.ok(Array.isArray(context.INSTRUCTORES_CATALOG));
  assert.equal(context.INSTRUCTORES_CATALOG.length, 23);

  // Lookup by code
  const inst = context.findInstructorByCode('RALVA');
  assert.equal(inst.name, 'Álvarez De León, Rubén');

  // Lookup by name
  const byName = context.findInstructorByName('Eduardo José Domínguez González');
  assert.equal(byName.code, 'EDOMI');

  // Autocomplete datalists in modal
  assert.match(source, /id="instructor-codes-datalist"/);
  assert.match(source, /id="instructor-names-datalist"/);
  assert.match(source, /list="instructor-codes-datalist"/);
  assert.match(source, /list="instructor-names-datalist"/);
  assert.match(source, /handleInstructorCodeAutocomplete/);
  assert.match(source, /handleInstructorNameAutocomplete/);
});

test('unassigned executed flights are preserved in results and never dropped', () => {
  const bookings = [
    booking('book-1', '4200001', '2026-09-30T10:00:00Z', '2026-09-30T12:00:00Z')
  ];
  const flights = [
    flown('4200001', '2026-09-30T10:00:00Z', '2026-09-30T12:00:00Z'),
    flown('4200002', '2026-09-30T12:30:00Z', '2026-09-30T13:30:00Z') // Leg 2 without booking
  ];
  const result = matchFlights(bookings, flights);
  assert.equal(result.length, 2);

  const unassigned = result.find(f => f.flightNumber === '4200002');
  assert.ok(unassigned);
  assert.equal(unassigned.bookingId, null);
  assert.equal(unassigned.flownMinutes, 150);
  assert.equal(unassigned.scheduledMinutes, 0);
  assert.equal(unassigned.isCancelled, false);
});

test('vuelos.js embeds STUDENTS_CATALOG and provides student code and name autocomplete datalists', () => {
  assert.ok(Array.isArray(context.STUDENTS_CATALOG));
  assert.ok(context.STUDENTS_CATALOG.length >= 30);

  // Lookup by code
  const student = context.findStudentByCode('JMART');
  assert.ok(student);
  assert.equal(student.name, 'Martinez Mantolan, Javier');

  // Lookup by name
  const byName = context.findStudentByName('Natalia Martin Cordoba');
  assert.ok(byName);
  assert.equal(byName.code, 'NCORD');

  // Dynamic registration
  context.registerStudentInCatalog('NUEVO', 'Alumno Nuevo Test', false);
  const foundNew = context.findStudentByCode('NUEVO');
  assert.ok(foundNew);
  assert.equal(foundNew.name, 'Alumno Nuevo Test');

  // Datalists in source
  assert.match(source, /id="student-codes-datalist"/);
  assert.match(source, /id="student-names-datalist"/);
  assert.match(source, /list="student-codes-datalist"/);
  assert.match(source, /list="student-names-datalist"/);
  assert.match(source, /handleStudentCodeAutocomplete/);
  assert.match(source, /handleStudentNameAutocomplete/);
});

test('linked group KPI calculation avoids duplicate scheduled hours and computes correct net and absolute deviations', () => {
  // Simulating 1 booking of 2h30m (150 min) divided into 3 legs of 55m, 45m, 60m (total flown 160m)
  const groupFlights = [
    {
      flightNumber: '4200265',
      scheduledMinutes: 150,
      flownMinutes: 55,
      deviationMinutes: 10,
      linkedGroupId: 'grp-test-1',
      linkedGroupTotalScheduledMinutes: 150,
      linkedGroupTotalFlownMinutes: 160,
      linkedGroupDeviationMinutes: 10,
      linkedGroupStatus: 'DELAYED',
      isLinkedLead: true,
      isLinkedFollower: false,
      status: 'DELAYED'
    },
    {
      flightNumber: '4200233',
      scheduledMinutes: 0,
      flownMinutes: 45,
      deviationMinutes: 0,
      linkedGroupId: 'grp-test-1',
      linkedGroupTotalScheduledMinutes: 150,
      linkedGroupTotalFlownMinutes: 160,
      linkedGroupDeviationMinutes: 10,
      linkedGroupStatus: 'DELAYED',
      isLinkedLead: false,
      isLinkedFollower: true,
      status: 'DELAYED'
    },
    {
      flightNumber: '4199928',
      scheduledMinutes: 0,
      flownMinutes: 60,
      deviationMinutes: 0,
      linkedGroupId: 'grp-test-1',
      linkedGroupTotalScheduledMinutes: 150,
      linkedGroupTotalFlownMinutes: 160,
      linkedGroupDeviationMinutes: 10,
      linkedGroupStatus: 'DELAYED',
      isLinkedLead: false,
      isLinkedFollower: true,
      status: 'DELAYED'
    }
  ];

  const kpis = context.calculateExecutiveKpis(groupFlights);
  // Total scheduled must be 150 min (2:30), NOT 450 min (7:30)!
  assert.equal(kpis.totalScheduledMinutes, 150);
  assert.equal(kpis.totalScheduledHoursFormatted, '02:30');
  // Total flown must be 160 min (2:40)
  assert.equal(kpis.totalFlownMinutes, 160);
  assert.equal(kpis.totalFlownHoursFormatted, '02:40');
  // Net deviation must be +10 min, absolute deviation 10 min
  assert.equal(kpis.netDeviationMinutes, 10);
  assert.equal(kpis.netDeviationHoursFormatted, '+00:10');
  assert.equal(kpis.totalAbsoluteDeviationMinutes, 10);
  assert.equal(kpis.totalAbsoluteDeviationHoursFormatted, '00:10');
});

test('cancellations card only displays cancellations without loss', () => {
  // Label must be CANCELACIONES, not CANCELACIONES / PÉRDIDA
  assert.match(source, /<div class="vuelos-kpi-label">CANCELACIONES<\/div>/);
  assert.doesNotMatch(source, /<div class="vuelos-kpi-label">CANCELACIONES \/ PÉRDIDA<\/div>/);
  assert.match(source, /<span>⚠️ Cancelaciones<\/span>/);
  assert.doesNotMatch(source, /<span>⚠️ Cancelaciones y Pérdidas<\/span>/);
});

test('linked flights merge Alumno and Instructor cells vertically with rowspan and center in middle', () => {
  // In the HTML table: Alumno and Instructor must only render once per group (on isFirstInGroup) with rowspan
  assert.match(source, /Alumno: fusionado y centrado verticalmente si pertenece a un bloque vinculado/);
  assert.match(source, /Instructor: fusionado y centrado verticalmente si pertenece a un bloque vinculado/);
  assert.match(source, /\(!isLinked \|\| isFirstInGroup\) \? `\s*<td \$\{isLinked && groupCount > 1 \? `rowspan="\$\{groupCount\}"` : ''\} style="padding: 10px 14px; text-align: center; vertical-align: middle;/);

  // In the Differences image canvas: Instructor and Alumno are unified and drawn at currentY + groupHeight / 2
  assert.match(source, /Texto Celda Unificada Instructor y Alumno \(unidos y centrados en el medio del bloque\)/);
  assert.match(source, /ctx\.fillText\(instName, colMap\.instructor\.x \+ 12, currentY \+ groupHeight \/ 2/);
  assert.match(source, /ctx\.fillText\(alumName, colMap\.alumno\.x \+ 12, currentY \+ groupHeight \/ 2/);
});

test('cancelled flights appear in differences image and reports with cancellation reason', () => {
  // Differences image export must include cancelled flights
  assert.match(source, /if \(f\.isCancelled \|\| f\.status === 'CANCELLED'\) \{\s*items\.push\(\{\s*isGroup: false,\s*isCancelled: true/);
  assert.match(source, /cancellationReason: f\.cancellationReason \|\| f\.comments \|\| ''/);

  // Excel export must use 'Horas Canceladas' and 'Motivo de Cancelación'
  assert.match(source, /\['Horas Canceladas', \(kpis\.totalCancelledHoursFormatted/);
  assert.match(source, /'Motivo de Cancelación'/);

  // PDF export must display 'CANCELADO' cleanly without parentheses and have 'Horas Canceladas' table
  assert.match(source, /f\.isCancelled \? 'CANCELADO'/);
  assert.match(source, /doc\.text\(`Vuelos Cancelados \(\$\{cancelados\.length\} reservas no ejecutadas\)`/);
});

test('flight edit modal provides dedicated cancellation reason select and input and persists it', () => {
  assert.match(source, /id="edit-cancellation-reason"/);
  assert.match(source, /id="edit-cancellation-reason-select"/);
  assert.match(source, /id="cancellation-reasons-datalist"/);
  assert.match(source, /id="edit-cancellation-reason-container"/);
  assert.match(source, /cancellationReason = isCancelled/);
  assert.match(source, /cancellationReason: isCancelled \? \(cancellationReason \|\| 'Cancelado'\) : ''/);
});

test('formatAlumnoCell and formatInstructorCell return short identifiers and resolve from catalogs', () => {
  const formatAlu = context.formatAlumnoCell;
  const formatInst = context.formatInstructorCell;

  // Alumno cancelado con nombre completo: debe devolver AHERR (no el nombre largo que se corta)
  assert.equal(formatAlu({ studentName: 'Alejandro Herrera Diaz', studentCode: '' }), 'AHERR');
  assert.equal(formatAlu({ studentName: 'Javier Martinez Mantolan', studentCode: '' }), 'JMART');

  // Instructor en reserva con nombre o piloto: debe devolver MMORE
  assert.equal(formatInst({ instructorName: 'Manuel Peña Moreno', instructorCode: '' }), 'MMORE');
  assert.equal(formatInst({ pilotCode: 'MMORE' }), 'MMORE');

  // Alumno sin identificativo en Private Radar: no inventar código sintético, mostrar el nombre (se ajusta al espacio)
  assert.equal(formatAlu({ studentName: 'Aguilar López, Carlos', studentCode: '' }), 'Aguilar López, Carlos');
  assert.equal(formatAlu({ studentName: 'Andujar Alvaro, Marco Antonio', studentCode: '' }), 'Andujar Alvaro, Marco Antonio');
});

test('Información column replaces Ruta and formatFlightInfoCell strips N/A and parentheses', () => {
  const formatInfo = context.formatFlightInfoCell;

  // Normal flight: displays cleaned route
  assert.equal(formatInfo({ isCancelled: false, route: 'GCXO -> GCHI -> GCXO' }), 'GCXO-GCHI-GCXO');
  assert.equal(formatInfo({ isCancelled: false, route: 'N/A' }), '—');

  // Cancelled flight with N/A and parentheses: strips them completely
  assert.equal(formatInfo({ isCancelled: true, route: 'N/A', cancellationReason: '(Meteorología adversa)' }), 'Meteorología adversa');
  assert.equal(formatInfo({ isCancelled: true, route: 'N/A', cancellationReason: 'Cancelado (N/A)' }), 'Cancelado');
  assert.equal(formatInfo({ isCancelled: true, route: 'GCXO -> GCHI', cancellationReason: '(Avería técnica)' }), 'GCXO-GCHI - Avería técnica');
  assert.equal(formatInfo({ isCancelled: true, route: 'N/A', cancellationReason: 'No presentado (No show)' }), 'No presentado No show');

  // Headers must use Información instead of Ruta
  assert.match(source, /label: 'Información'/);
  assert.match(source, /<th[^>]*>Información<\/th>/);
  assert.match(source, /\['Vuelo', 'Matr\.', 'Alumno', 'Instructor', 'Información'/);
  assert.match(source, /'Información',\s*'Programado'/);
});



