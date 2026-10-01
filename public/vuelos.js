/**
 * @file vuelos.js
 * @description Modulo 100% Local de Auditoria y Control de Desviacion de Horas de Vuelo y Cancelaciones.
 * Private Radar: Programado vs. Horas Voladas (Bloque).
 * Parte de la suite local Blue Team Operations Suite.
 */

// =========================================================
// ESTADO GLOBAL DEL MODULO DE VUELOS
// =========================================================

let vuelosState = {
  matchedFlights: [],
  kpis: null,
  studentStats: [],
  instructorStats: [],
  pairStats: [],
  reportDate: '28/09/2026',
  activeTab: 'flights', // 'flights' | 'cancellations' | 'pairs' | 'instructors' | 'students' | 'history'
  statusFilter: 'ALL', // 'ALL' | 'ON_TIME' | 'DELAYED' | 'EARLY' | 'CANCELLED'
  searchQuery: '',
  savedReports: [],
  cumulativeData: { students: [], instructors: [], pairs: [] },
  showDropzone: false,
  progFile: null,
  volFile: null,
  isProcessing: false,
  saveNotice: '',
  sortConfig: {
    flights: { key: 'flightNumber', direction: 'asc' },
    cancellations: { key: 'flightNumber', direction: 'asc' },
    pairs: { key: 'totalDeviationMinutes', direction: 'desc' },
    instructors: { key: 'totalDeviationMinutes', direction: 'desc' },
    students: { key: 'totalDeviationMinutes', direction: 'desc' },
    cumInstructors: { key: 'total_deviation_min', direction: 'desc' },
    cumStudents: { key: 'total_deviation_min', direction: 'desc' }
  }
};

// Datos muestra del 28/09/2026 pre-cargados para pruebas y arranque rapido
const SEED_FLIGHTS_2809 = [
  {
    bookingId: '4878160',
    flightNumber: '4196126',
    registration: 'EC-OKM',
    flightType: 'Instruction',
    studentName: 'Vidal Perez Perez',
    studentCode: 'VPERE',
    instructorName: 'Luis Fernando Arteaga Darias',
    instructorCode: 'LARTE',
    pilotName: 'Luis Fernando Arteaga Darias',
    pilotCode: 'LARTE',
    route: 'GCXO -> GCHI -> GCXO',
    legsCount: 2,
    scheduledMinutes: 150,
    scheduledHoursFormatted: '02:30',
    flownMinutes: 145,
    flownHoursFormatted: '02:25',
    deviationMinutes: -5,
    deviationHoursFormatted: '-00:05',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'IR38-MEP01.APROXIMACIONES ILS - IR38-MEP01.APROXIMACIONES ILS DME I',
    comments: ''
  },
  {
    bookingId: '4861734',
    flightNumber: '4196160',
    registration: 'EC-NNX',
    flightType: 'Rental',
    studentName: 'Paula Simonetta Afonso Martinez',
    studentCode: 'PAFON',
    instructorName: '',
    instructorCode: '',
    pilotName: 'Paula Simonetta Afonso Martinez',
    pilotCode: 'PAFON',
    route: 'GCXO -> GCTS',
    legsCount: 1,
    scheduledMinutes: 240,
    scheduledHoursFormatted: '04:00',
    flownMinutes: 240,
    flownHoursFormatted: '04:00',
    deviationMinutes: 0,
    deviationHoursFormatted: '00:00',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'ALQx100PC - ALQx100 PC',
    comments: ''
  },
  {
    bookingId: '4872051',
    flightNumber: '4196225',
    registration: 'EC-OKC',
    flightType: 'Instruction',
    studentName: 'Laura Ansoleaga Tejera',
    studentCode: 'LANSO',
    instructorName: 'ALEJANDRO JAVIER PEÑA MONZÓN',
    instructorCode: 'APEMO',
    pilotName: 'ALEJANDRO JAVIER PEÑA MONZÓN',
    pilotCode: 'APEMO',
    route: 'GCXO -> GCXO',
    legsCount: 1,
    scheduledMinutes: 150,
    scheduledHoursFormatted: '02:30',
    flownMinutes: 150,
    flownHoursFormatted: '02:30',
    deviationMinutes: 0,
    deviationHoursFormatted: '00:00',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'IR01-SEP01 VUELO INSTRUMENTAL BÁSICO - IR01: SEP01.BÁSICOS INSTRUMENTALES I\nIR02-SEP02 VUELO INSTRUMENTAL BÁSICO - IR02: SEP02.BÁSICOS INSTRUMENTALES II',
    comments: ''
  },
  {
    bookingId: '4876000',
    flightNumber: '4196611',
    registration: 'EC-OKM',
    flightType: 'Instruction',
    studentName: 'Eduardo Hernández Hernández-Abad',
    studentCode: 'EHERN',
    instructorName: 'Eduardo José Domínguez González',
    instructorCode: 'EDOMI',
    pilotName: 'Eduardo José Domínguez González',
    pilotCode: 'EDOMI',
    route: 'GCXO -> GCXO',
    legsCount: 1,
    scheduledMinutes: 120,
    scheduledHoursFormatted: '02:00',
    flownMinutes: 115,
    flownHoursFormatted: '01:55',
    deviationMinutes: -5,
    deviationHoursFormatted: '-00:05',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'ME.3. FALLOS DE MOTOR - FALLOS DE MOTOR\nME.4.ABANDERAMIENTO Y CONTROL CON N-1 - ABANDERAMIENTO Y CONTROL CON N-1\nME.5.1.VUELO CON POTENCIA ASIMÉTRICA.I - VUELO CON POTENCIA ASIMÉTRICA.I',
    comments: ''
  },
  {
    bookingId: '4870387',
    flightNumber: '4196872',
    registration: 'EC-NNA',
    flightType: 'Rental',
    studentName: '',
    studentCode: '',
    instructorName: 'Paula Simonetta Afonso Martinez',
    instructorCode: 'PAFON',
    pilotName: 'Paula Simonetta Afonso Martinez',
    pilotCode: 'PAFON',
    route: 'GCTS -> GCXO',
    legsCount: 1,
    scheduledMinutes: 120,
    scheduledHoursFormatted: '02:00',
    flownMinutes: 125,
    flownHoursFormatted: '02:05',
    deviationMinutes: 5,
    deviationHoursFormatted: '+00:05',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'ALQx100PC - ALQx100 PC',
    comments: ''
  },
  {
    bookingId: '4871750',
    flightNumber: '4196920',
    registration: 'EC-OKC',
    flightType: 'Instruction',
    studentName: 'Santiago Castellano Martinez',
    studentCode: 'SCAST',
    instructorName: 'ALEJANDRO JAVIER PEÑA MONZÓN',
    instructorCode: 'APEMO',
    pilotName: 'ALEJANDRO JAVIER PEÑA MONZÓN',
    pilotCode: 'APEMO',
    route: 'GCXO -> GCXO',
    legsCount: 1,
    scheduledMinutes: 150,
    scheduledHoursFormatted: '02:30',
    flownMinutes: 150,
    flownHoursFormatted: '02:30',
    deviationMinutes: 0,
    deviationHoursFormatted: '00:00',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'IR01-SEP01 VUELO INSTRUMENTAL BÁSICO - IR01: SEP01.BÁSICOS INSTRUMENTALES I\nIR02-SEP02 VUELO INSTRUMENTAL BÁSICO - IR02: SEP02.BÁSICOS INSTRUMENTALES II',
    comments: ''
  },
  {
    bookingId: '4872410',
    flightNumber: '4197241',
    registration: 'EC-NNA',
    flightType: 'Rental',
    studentName: '',
    studentCode: '',
    instructorName: 'Aitor Camiruaga Manso',
    instructorCode: 'ACAMI',
    pilotName: 'Aitor Camiruaga Manso',
    pilotCode: 'ACAMI',
    route: 'GCXO -> GCXO',
    legsCount: 1,
    scheduledMinutes: 180,
    scheduledHoursFormatted: '03:00',
    flownMinutes: 180,
    flownHoursFormatted: '03:00',
    deviationMinutes: 0,
    deviationHoursFormatted: '00:00',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'ALQx100PC - ALQx100 PC',
    comments: ''
  },
  {
    bookingId: '4876001',
    flightNumber: '4197252',
    registration: 'EC-OKM',
    flightType: 'Instruction',
    studentName: 'Lucio Gonzalez Martin',
    studentCode: 'LGONZ',
    instructorName: 'Eduardo José Domínguez González',
    instructorCode: 'EDOMI',
    pilotName: 'Eduardo José Domínguez González',
    pilotCode: 'EDOMI',
    route: 'GCXO -> GCXO',
    legsCount: 1,
    scheduledMinutes: 120,
    scheduledHoursFormatted: '02:00',
    flownMinutes: 120,
    flownHoursFormatted: '02:00',
    deviationMinutes: 0,
    deviationHoursFormatted: '00:00',
    status: 'ON_TIME',
    isCancelled: false,
    cancelledMinutes: 0,
    cancelledHoursFormatted: '00:00',
    lessons: 'ME.1.FAMILIARIZACIÓN CON LA AERONAVE - FAMILIARIZACIÓN CON LA AERONAVE\nME.2. PÉRDIDAS Y CIRCUITOS - PÉRDIDAS Y CIRCUITOS\nME.3. FALLOS DE MOTOR - FALLOS DE MOTOR',
    comments: ''
  }
];

// =========================================================
// UTILIDADES DE FORMATO Y TIEMPO
// =========================================================

function formatMinutesToHhMm(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return '00:00';
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return sign + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function minutesToDecimalHours(minutes) {
  if (!minutes || isNaN(minutes)) return 0;
  return Number((minutes / 60).toFixed(2));
}

function parseHhMmToMinutes(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.round(val);
  const s = String(val).trim();
  if (!s) return 0;
  if (s.includes(':')) {
    const parts = s.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return (h * 60) + (h < 0 ? -m : m);
  }
  const n = parseFloat(s.replace(',', '.'));
  if (!isNaN(n)) {
    if (s.includes('.')) return Math.round(n * 60);
    return Math.round(n);
  }
  return 0;
}

// =========================================================
// CATÁLOGO OFICIAL DE INSTRUCTORES Y TRIPULANTES
// =========================================================

var INSTRUCTORES_CATALOG = [
  { code: 'RALVA', name: 'Álvarez De León, Rubén', role: 'INSTRUCTOR -SAFE' },
  { code: 'LARTE', name: 'Arteaga Darias, Luis Fernando', role: 'INSTRUCTOR' },
  { code: 'BTM', name: 'Blue Team, Flight School', role: 'BLUETEAM' },
  { code: 'ACAST', name: 'Castro Menendez, Angel', role: 'INSTRUCTOR TEÓRICA' },
  { code: 'TANIA', name: 'Chico Gonzalez, Tania Marlem', role: 'INSTRUCTOR TEÓRICA' },
  { code: 'CDIAZ', name: 'Diaz Luis, Cesar', role: 'INSTRUCTOR MCCI' },
  { code: 'EDOMI', name: 'Domínguez González, Eduardo José', role: 'INSTRUCTOR' },
  { code: 'GOICO', name: 'Fernández Goicoechea, Pedro María', role: 'HT' },
  { code: 'DUNA', name: 'González, Duna', role: 'INSTRUCTOR SIM' },
  { code: 'NCANO', name: 'Hernández Cano, Ignacio', role: 'ADMINISTRADOR' },
  { code: 'JHERN', name: 'Hernández Hernández, Joseba', role: 'ADMINISTRADOR' },
  { code: 'SMAR', name: 'Marichal Baez, Sergio', role: 'INSTRUCTOR TEÓRICA' },
  { code: 'GMART', name: 'Martinez Esteve, Georgina', role: 'INSTRUCTOR' },
  { code: 'EMASC', name: 'Mascarell Cardelle, Eduardo', role: 'INSTRUCTOR' },
  { code: 'VMILO', name: 'Milosavljevic, Vladimir', role: 'INSTRUCTOR' },
  { code: 'APEMO', name: 'Peña Monzón, Alejandro Javier', role: 'INSTRUCTOR' },
  { code: 'MMORE', name: 'Peña Moreno, Manuel', role: 'INSTRUCTOR' },
  { code: 'VTKI', name: 'Pérez, Vidal Tki', role: 'INSTRUCTOR TEÓRICA' },
  { code: 'CPERE', name: 'Pérez Medina, Carlos', role: 'INSTRUCTOR TEÓRICA' },
  { code: 'YULI', name: 'Romanyshyn Skaletska, Yuliya', role: 'EXAMINADOR' },
  { code: 'YRUIZ', name: 'Ruiz Calle, Yeray', role: 'ADMINISTRADOR' },
  { code: 'ESURI', name: 'Suria Martin, Eduardo', role: 'INSTRUCTOR MCCI' },
  { code: 'YVICE', name: 'Vicente Pérez, Yolanda', role: 'INSTRUCTOR TEÓRICA' }
];

var CUSTOM_INSTRUCTORES_CATALOG = [];

function getAllInstructors() {
  return [...INSTRUCTORES_CATALOG, ...CUSTOM_INSTRUCTORES_CATALOG];
}

function findInstructorByCode(code) {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  return getAllInstructors().find(i => i.code.toUpperCase() === clean) || null;
}

function findInstructorByName(name) {
  if (!name) return null;
  const clean = String(name).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!clean) return null;

  const catalog = getAllInstructors();
  // Coincidencia directa o inclusión
  const exact = catalog.find(i => {
    const iName = i.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return iName === clean || clean.includes(iName) || iName.includes(clean);
  });
  if (exact) return exact;

  // Coincidencia por palabras (ej. "Eduardo Domínguez" o "Eduardo José Domínguez González" vs "Domínguez González, Eduardo José")
  const tokens = clean.split(/[\s,]+/).filter(t => t.length > 2);
  if (tokens.length === 0) return null;

  let bestMatch = null;
  let maxScore = 0;
  for (const item of catalog) {
    const itemNorm = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let score = 0;
    for (const t of tokens) {
      if (itemNorm.includes(t)) score++;
    }
    if (score >= 2 && score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }
  return bestMatch;
}

function handleInstructorCodeAutocomplete(val) {
  const code = (val || '').trim().toUpperCase();
  const inst = findInstructorByCode(code);
  const nameInput = document.getElementById('edit-instructor-name');
  if (inst && nameInput) {
    nameInput.value = inst.name;
  }
}

function handleInstructorNameAutocomplete(val) {
  const name = (val || '').trim();
  const inst = findInstructorByName(name);
  const codeInput = document.getElementById('edit-instructor-code');
  if (inst && codeInput) {
    codeInput.value = inst.code;
  }
}

// =========================================================
// CATÁLOGO DINÁMICO DE ALUMNOS (PRECISIÓN Y AUTOCOMPLETADO)
// =========================================================

var STUDENTS_CATALOG = [
  {
    "code": "JABREU",
    "name": "Abreu Pardo, Jose Antonio"
  },
  {
    "code": "AACOS",
    "name": "Acosta Martín, Aaron"
  },
  {
    "code": "DAACO",
    "name": "Acosta Pacheco, Daniel"
  },
  {
    "code": "PAFON",
    "name": "Afonso Martinez, Paula Simonetta"
  },
  {
    "code": "",
    "name": "Aguilar López, Carlos"
  },
  {
    "code": "JALBA",
    "name": "Alba Ríos, Jorge"
  },
  {
    "code": "OVIDI",
    "name": "Alejandro, Ovidio Antonio"
  },
  {
    "code": "NALON",
    "name": "Alonso Castro, Nerea"
  },
  {
    "code": "HALON",
    "name": "Alonso Díaz, Himar"
  },
  {
    "code": "JGUTI",
    "name": "Alonso Gutierrez, Jorge"
  },
  {
    "code": "MAAAL",
    "name": "Álvarez Afonso, Miguel Ángel"
  },
  {
    "code": "RALVA",
    "name": "Álvarez De León , Rubén"
  },
  {
    "code": "AALVE",
    "name": "Alves Schormann, Anderson Flavio"
  },
  {
    "code": "RAMBR",
    "name": "Ambrosoli Abreu, Ricardo Francisco"
  },
  {
    "code": "AKOIT",
    "name": "Andre, Koitz"
  },
  {
    "code": "",
    "name": "Andujar Alvaro, Marco Antonio"
  },
  {
    "code": "LANSO",
    "name": "Ansoleaga Tejera, Laura"
  },
  {
    "code": "LANTO",
    "name": "Anton, Leonard Florian"
  },
  {
    "code": "AAREV",
    "name": "Arevalo, Arturo"
  },
  {
    "code": "LARTE",
    "name": "Arteaga Darias, Luis Fernando"
  },
  {
    "code": "SOREN",
    "name": "Arweson, Sören"
  },
  {
    "code": "",
    "name": "Arzola, David"
  },
  {
    "code": "",
    "name": "Ashford, Robert Peter David"
  },
  {
    "code": "IASSI",
    "name": "Assi, Ivomir"
  },
  {
    "code": "JAVIL",
    "name": "Avila Rios, Juan Francisco"
  },
  {
    "code": "LAYAL",
    "name": "Ayala López, Luis Ángel"
  },
  {
    "code": "JAZCA",
    "name": "Azcárate, Jesús"
  },
  {
    "code": "",
    "name": "Aznar Pinto, Luis Miguel"
  },
  {
    "code": "DBAEZ",
    "name": "Báez, Dácil Carmen"
  },
  {
    "code": "ZBAEZ",
    "name": "Baez Suarez, Zebensui"
  },
  {
    "code": "ABARB",
    "name": "Barbero Pareja, Alfonso"
  },
  {
    "code": "SBARO",
    "name": "Baron, Stefan"
  },
  {
    "code": "JABAR",
    "name": "Barrett, James Peter"
  },
  {
    "code": "JBARR",
    "name": "Barrios Fuentes, Joel"
  },
  {
    "code": "BELIO",
    "name": "Barthelemy, Eliot"
  },
  {
    "code": "",
    "name": "Basic, Domen"
  },
  {
    "code": "",
    "name": "Bayley, Dean"
  },
  {
    "code": "",
    "name": "Becker, Nadin"
  },
  {
    "code": "",
    "name": "Bellido Stein, Héctor Abel"
  },
  {
    "code": "JBENE",
    "name": "Beneyto Gomez De Barreda, Jaime Ignacio"
  },
  {
    "code": "",
    "name": "Bermúdez Bethencourt, Andrew"
  },
  {
    "code": "OBETA",
    "name": "Betancor Gonzalez, Oliver"
  },
  {
    "code": "DBICH",
    "name": "Bichtemann, Dennis"
  },
  {
    "code": "ABLANC",
    "name": "Blanco López, Armando"
  },
  {
    "code": "SPBLUE",
    "name": "Blue, Safety Pilot"
  },
  {
    "code": "BTM",
    "name": "Blue Team , Flight School"
  },
  {
    "code": "RBOET",
    "name": "Boettcher, Robert"
  },
  {
    "code": "",
    "name": "Bohnacker, Ulrich"
  },
  {
    "code": "",
    "name": "Borghetto, Simone"
  },
  {
    "code": "JBORG",
    "name": "Borgman, John Björn Kim"
  },
  {
    "code": "",
    "name": "Borrego Gasane, Jose Maria"
  },
  {
    "code": "",
    "name": "Bos, Joannes"
  },
  {
    "code": "TBRAN",
    "name": "Brandt, Torben"
  },
  {
    "code": "CBRAU",
    "name": "Braun, Christopher"
  },
  {
    "code": "JBRIC",
    "name": "Briceño Medina, Jesús Manuel"
  },
  {
    "code": "AYOZE",
    "name": "Brito, Ayoze Manuel"
  },
  {
    "code": "JANBR",
    "name": "Brunner, Joanis Jan"
  },
  {
    "code": "MBTM",
    "name": "Btm, Marian"
  },
  {
    "code": "BBUEN",
    "name": "Bueno, Blanca"
  },
  {
    "code": "EBUGA",
    "name": "Bugakova, Elena"
  },
  {
    "code": "RBUKE",
    "name": "Bukenas, Remighius"
  },
  {
    "code": "BFERG",
    "name": "Byrne, Fergal"
  },
  {
    "code": "",
    "name": "Caban, Grzegorz"
  },
  {
    "code": "JCABO",
    "name": "Cabot, Jordi"
  },
  {
    "code": "ACABR",
    "name": "Cabrera Díaz, Alejandro"
  },
  {
    "code": "ROCAB",
    "name": "Cabrera Fajardo, Roberto Vidal"
  },
  {
    "code": "",
    "name": "Cabrera Hernández, Leire"
  },
  {
    "code": "MMART",
    "name": "Cabrera Martín, Manuel José"
  },
  {
    "code": "ECABR",
    "name": "Cabrera Rodríguez, Eduardo"
  },
  {
    "code": "JCABR",
    "name": "Cabrera Suarez, Javier"
  },
  {
    "code": "",
    "name": "Cairós Padilla, Jairo"
  },
  {
    "code": "ECALS",
    "name": "Cal, Eudaldo Alvaro"
  },
  {
    "code": "FCALZ",
    "name": "Calzadilla Rodriguez, Francisco Jose"
  },
  {
    "code": "DCAMA",
    "name": "Camacho Chacón, David"
  },
  {
    "code": "ACAMI",
    "name": "Camiruaga Manso, Aitor"
  },
  {
    "code": "",
    "name": "Cano Cabezudo, Enrique"
  },
  {
    "code": "GCANT",
    "name": "Cantero Medialdea, Guillermo"
  },
  {
    "code": "ACARB",
    "name": "Carballo, Andrés"
  },
  {
    "code": "MCARD",
    "name": "Cardarelli, Matteo"
  },
  {
    "code": "SCARD",
    "name": "Cardinal Pereyra, Santiago Sebastian"
  },
  {
    "code": "SOCAR",
    "name": "Cardosi, Sofia"
  },
  {
    "code": "",
    "name": "Carnicero Pastor, Maria"
  },
  {
    "code": "ACARO",
    "name": "Caro Concepcion, Angel"
  },
  {
    "code": "PHILI",
    "name": "Carrington, Philip James"
  },
  {
    "code": "",
    "name": "Carro Sabina, Javier"
  },
  {
    "code": "RCASA",
    "name": "Casado Sánchez, Rafael"
  },
  {
    "code": "",
    "name": "Castañeda Vigara, Ernesto"
  },
  {
    "code": "LCAST",
    "name": "Castaño Delgado, Luis"
  },
  {
    "code": "SCAST",
    "name": "Castellano Martinez, Santiago"
  },
  {
    "code": "",
    "name": "Castillo Leal , Leiry Laura"
  },
  {
    "code": "MCAST",
    "name": "Castosa De La Fuente Amor, Miguel"
  },
  {
    "code": "ACAST",
    "name": "Castro Menendez, Angel"
  },
  {
    "code": "",
    "name": "Caus Mihalache, Roberto"
  },
  {
    "code": "MCEDRO",
    "name": "Cedronski, Michal Stanislaw"
  },
  {
    "code": "DCERD",
    "name": "Cerdán García, David"
  },
  {
    "code": "",
    "name": "Chesnut, John"
  },
  {
    "code": "TANIA",
    "name": "Chico Gonzalez, Tania Marlem"
  },
  {
    "code": "MCLIN",
    "name": "Clinckemaillie, Mathias"
  },
  {
    "code": "ACOLE",
    "name": "Coleman, Alexander"
  },
  {
    "code": "",
    "name": "Cológan Galván, Javier"
  },
  {
    "code": "RCONG",
    "name": "Congia, Roberto"
  },
  {
    "code": "",
    "name": "Corbella Pardo, Carmen"
  },
  {
    "code": "",
    "name": "Corbella Tena, Miguel Virgilio"
  },
  {
    "code": "ACORR",
    "name": "Correas Olivares, Antonio"
  },
  {
    "code": "MCOTT",
    "name": "Cotter Nuñez, Miguel Angel"
  },
  {
    "code": "",
    "name": "Coulthard, Tom"
  },
  {
    "code": "",
    "name": "Cruz Cabrera, Maria Candelaria"
  },
  {
    "code": "",
    "name": "Cruz Diaz, Onan"
  },
  {
    "code": "",
    "name": "Cuesta Caño, Vicente"
  },
  {
    "code": "RCUSH",
    "name": "Cushnahan, Ronan"
  },
  {
    "code": "RCUTI",
    "name": "Cutillas Gomez, Roberto"
  },
  {
    "code": "MDASI",
    "name": "Da Silva Madalena, Marco Antonio"
  },
  {
    "code": "CDABB",
    "name": "Dabbene, Celina Denis"
  },
  {
    "code": "",
    "name": "Danielson, Lee Martin"
  },
  {
    "code": "",
    "name": "Daparte López, Erik"
  },
  {
    "code": "ADORT",
    "name": "David Dorta, Abush"
  },
  {
    "code": "",
    "name": "De Abreu Pardo, Juan Carlos"
  },
  {
    "code": "HELDER",
    "name": "De Azevedo Alves, Helder Antonio"
  },
  {
    "code": "",
    "name": "De Castro Cruz, Francisco José"
  },
  {
    "code": "JACOP",
    "name": "De Cesare, Jacopo"
  },
  {
    "code": "ARAMR",
    "name": "De La Rosa Santana, Aram"
  },
  {
    "code": "ABDEL",
    "name": "De Leon Gonzalez, Abora Cel"
  },
  {
    "code": "ADELE",
    "name": "De Leon Perez, Jose Andrew"
  },
  {
    "code": "CVALE",
    "name": "De Valenzuela Pérez Cuadrado, Cesar"
  },
  {
    "code": "",
    "name": "Dekmock, Julie"
  },
  {
    "code": "",
    "name": "Del Pino Perez, Jacinto Amado"
  },
  {
    "code": "CRIO",
    "name": "Del Rio Seoane, Cristina"
  },
  {
    "code": "",
    "name": "Delgado Escobar, Víctor Martín"
  },
  {
    "code": "ADIPA",
    "name": "Di Paolo, Alessio"
  },
  {
    "code": "ADIAZ",
    "name": "Diaz Deswelgh, Apeles"
  },
  {
    "code": "CDIAZ",
    "name": "Diaz Luis, Cesar"
  },
  {
    "code": "",
    "name": "Diáz Monzón, Thiago"
  },
  {
    "code": "",
    "name": "Diaz Navarro, Joaquin"
  },
  {
    "code": "",
    "name": "Diaz Pérez, Carlos"
  },
  {
    "code": "PDIAZ",
    "name": "Díaz Pilar, Pablo"
  },
  {
    "code": "",
    "name": "Diaz Ramos, Guillermo"
  },
  {
    "code": "RDIEG",
    "name": "Dieguez Torrico, Rafael"
  },
  {
    "code": "",
    "name": "Dimitrenko, Egor"
  },
  {
    "code": "",
    "name": "Dolinsky, Jiri"
  },
  {
    "code": "MIDOM",
    "name": "Dominguez Felipe, Miguel Angel"
  },
  {
    "code": "ADOMI",
    "name": "Domínguez González, Antonio Jesús"
  },
  {
    "code": "EDOMI",
    "name": "Domínguez González, Eduardo José"
  },
  {
    "code": "",
    "name": "Domínguez Hernández, Oliver"
  },
  {
    "code": "JDOMI",
    "name": "Dominguez Perez, Javier"
  },
  {
    "code": "MDOMI",
    "name": "Domínguez Pérez, Miguel Ángel"
  },
  {
    "code": "ODONI",
    "name": "Doniz, Oliver"
  },
  {
    "code": "",
    "name": "Doran, Sinead"
  },
  {
    "code": "",
    "name": "Dorrington, Patrick Alexander"
  },
  {
    "code": "JDORT",
    "name": "Dorta Castañeda, Javier Alfonso"
  },
  {
    "code": "CDUAN",
    "name": "Duane, Conor"
  },
  {
    "code": "",
    "name": "Dzenis, Uldis"
  },
  {
    "code": "TEARL",
    "name": "Earle, Tomas"
  },
  {
    "code": "",
    "name": "Eatwell, Barry"
  },
  {
    "code": "TECKA",
    "name": "Eckardt, Thomas"
  },
  {
    "code": "TZARE",
    "name": "El Zared Khalifa, Tawfiq"
  },
  {
    "code": "FESCO",
    "name": "Escobar, Jose Fernando"
  },
  {
    "code": "EESTE",
    "name": "Estévez Herrera, Eduardo"
  },
  {
    "code": "MESTU",
    "name": "Estupiñan Milan, Manuel"
  },
  {
    "code": "MEUGE",
    "name": "Eugenio Ringham, Maximilio Enrique"
  },
  {
    "code": "DAFAY",
    "name": "Fay, Darragh Brian"
  },
  {
    "code": "GIULI",
    "name": "Feliciani, Giulia"
  },
  {
    "code": "",
    "name": "Fernández Acosta, Josue"
  },
  {
    "code": "DFERN",
    "name": "Fernandez Blanco, David"
  },
  {
    "code": "JFERN",
    "name": "Fernández García, Javier"
  },
  {
    "code": "GOICO",
    "name": "Fernández Goicoechea, Pedro María"
  },
  {
    "code": "AFERR",
    "name": "Ferrer Ramírez, Ana"
  },
  {
    "code": "AFFC",
    "name": "Ffc, Alumno"
  },
  {
    "code": "KAMIL",
    "name": "Figura, Kamila"
  },
  {
    "code": "CFILE",
    "name": "Filesari González, Cesar Augusto"
  },
  {
    "code": "",
    "name": "Fini, Federico"
  },
  {
    "code": "LUKEM",
    "name": "Fixter, Luke Michael"
  },
  {
    "code": "RFRANC",
    "name": "Franchi, Rodolf Jacques Oreste"
  },
  {
    "code": "FFRES",
    "name": "Fresneda Gómez, Fabio"
  },
  {
    "code": "AFUEN",
    "name": "Fuentes Rodríguez, Adrián"
  },
  {
    "code": "JFURT",
    "name": "Furtado Velo, Jonathan"
  },
  {
    "code": "RGALA",
    "name": "Galán, Rafael"
  },
  {
    "code": "",
    "name": "Galindo Afonso, Airam Xerach"
  },
  {
    "code": "SGALV",
    "name": "Galviz Gobea, José Saul"
  },
  {
    "code": "",
    "name": "Gando, Gando"
  },
  {
    "code": "MESQU",
    "name": "Garcia, Maria"
  },
  {
    "code": "JGALV",
    "name": "García Álvarez, Javier"
  },
  {
    "code": "",
    "name": "Garcia Armas, Raul Antonio"
  },
  {
    "code": "OGARC",
    "name": "García Callejo, Óliver"
  },
  {
    "code": "",
    "name": "García Carrasco, Iván"
  },
  {
    "code": "RGARC",
    "name": "García Fernandez, Roberto"
  },
  {
    "code": "IGARC",
    "name": "García Fernández, Ivan"
  },
  {
    "code": "SGARC",
    "name": "García González, Sebastian"
  },
  {
    "code": "",
    "name": "García Hernández, Karim"
  },
  {
    "code": "",
    "name": "Garcia King, Kevin"
  },
  {
    "code": "LGARC",
    "name": "Garcia Martinez, Luis"
  },
  {
    "code": "JAGAR",
    "name": "García Martinez, Javier"
  },
  {
    "code": "JGARC",
    "name": "García Peña, Jonathan"
  },
  {
    "code": "",
    "name": "Garcia Quiros, Rodrigo"
  },
  {
    "code": "AGARC",
    "name": "García Rodríguez, Agustín Miguel"
  },
  {
    "code": "",
    "name": "García Socas, Romen"
  },
  {
    "code": "",
    "name": "García Tayupo, Humberto"
  },
  {
    "code": "",
    "name": "García Torrens, Juan Antonio"
  },
  {
    "code": "GALDO",
    "name": "Gargiulo, Aldo Paolo"
  },
  {
    "code": "EGARZ",
    "name": "Garzón, Estefanía"
  },
  {
    "code": "AGASA",
    "name": "Gasalla Glumb, Alejandro"
  },
  {
    "code": "",
    "name": "Gascon, Maria Eugenia"
  },
  {
    "code": "SGAVI",
    "name": "Gavin, Sean"
  },
  {
    "code": "",
    "name": "Gaviño Overbeek, Ramona Cecilia"
  },
  {
    "code": "LGAWL",
    "name": "Gawle, Lukasz Jan"
  },
  {
    "code": "OGIAN",
    "name": "Gianoli Michelón, Omar"
  },
  {
    "code": "",
    "name": "Gilarranz Gomez, Lucio Alejandro"
  },
  {
    "code": "",
    "name": "Giornelli, Nicolo"
  },
  {
    "code": "UNAVA",
    "name": "Gisladottir, Una Valgerdur"
  },
  {
    "code": "",
    "name": "Gloux, Sylvain"
  },
  {
    "code": "AGOME",
    "name": "Gómez, Alejandro"
  },
  {
    "code": "FMIRA",
    "name": "Gómez, Francisco Javier"
  },
  {
    "code": "RGOME",
    "name": "Gomez Agueda, Roman Alexis"
  },
  {
    "code": "ALEND",
    "name": "Gómez Lende, Ana"
  },
  {
    "code": "",
    "name": "Gómez Medina, Jesús Francisco"
  },
  {
    "code": "CRUIZ",
    "name": "Gómez Ruiz, Carlos"
  },
  {
    "code": "CLAVA",
    "name": "Gonzalez, Pablo"
  },
  {
    "code": "DUNA",
    "name": "González, Duna"
  },
  {
    "code": "MARIA",
    "name": "González Argomaniz, Mariano"
  },
  {
    "code": "",
    "name": "González Cánovas, Domingo"
  },
  {
    "code": "PCHAV",
    "name": "González De Chaves Fernández, Pablo"
  },
  {
    "code": "",
    "name": "Gonzalez Garcia, Alberto"
  },
  {
    "code": "MGONZ",
    "name": "González García, Miriam"
  },
  {
    "code": "",
    "name": "González González, Alejandro"
  },
  {
    "code": "",
    "name": "González González, Antonio"
  },
  {
    "code": "",
    "name": "González González, Eladio"
  },
  {
    "code": "",
    "name": "González González, Ignacio"
  },
  {
    "code": "JGONZ",
    "name": "González González, Jesús"
  },
  {
    "code": "PGONZ",
    "name": "González León, Pablo"
  },
  {
    "code": "",
    "name": "Gonzalez Marrero, Marco Antonio"
  },
  {
    "code": "LGONZ",
    "name": "Gonzalez Martin, Lucio"
  },
  {
    "code": "AGONZ",
    "name": "Gonzalez Martinez, Alvaro"
  },
  {
    "code": "AGONZA",
    "name": "González Ortiz, Alejandro"
  },
  {
    "code": "",
    "name": "González Pimentel, Juan José"
  },
  {
    "code": "APROH",
    "name": "González Prohaska, Alejandro Gabriel"
  },
  {
    "code": "",
    "name": "González Rodríguez, Yessen"
  },
  {
    "code": "",
    "name": "Gonzalez Sanchez, Francisco"
  },
  {
    "code": "SGONZ",
    "name": "González Suárez, Samuel"
  },
  {
    "code": "NGONZ",
    "name": "Gonzalez Van Den Bosch, Noel Enrique"
  },
  {
    "code": "",
    "name": "Goryanets, Olexandr"
  },
  {
    "code": "",
    "name": "Goy, Gavin Walter"
  },
  {
    "code": "MARIU",
    "name": "Grabowski, Mariusz"
  },
  {
    "code": "",
    "name": "Grimaldi, Riccardo"
  },
  {
    "code": "",
    "name": "Groppelli, Maddalena"
  },
  {
    "code": "GROUPON",
    "name": "Groupon, Groupon"
  },
  {
    "code": "",
    "name": "Guanche Darias, Benjamin"
  },
  {
    "code": "JGUAR",
    "name": "Guarddon Ledbetter, Julian Drew Carlos"
  },
  {
    "code": "RGUEIM",
    "name": "Gueimonde Bautista, Rodrigo"
  },
  {
    "code": "AGUER",
    "name": "Guerra Artiles, Alejandro Efrain"
  },
  {
    "code": "OGUHL",
    "name": "Guhl, Oliver Philip"
  },
  {
    "code": "JGUZM",
    "name": "Guzman Nuez, Francisco Javier"
  },
  {
    "code": "MHAAS",
    "name": "Haase Rivero, Michael"
  },
  {
    "code": "HEOIN",
    "name": "Hahesy, Eoin"
  },
  {
    "code": "JHAHN",
    "name": "Hahn Hernández, Juan Carlos"
  },
  {
    "code": "",
    "name": "Hallin, Per Einar"
  },
  {
    "code": "EHALT",
    "name": "Halton, Elicia"
  },
  {
    "code": "HANGAR",
    "name": "Hangar, Hangar"
  },
  {
    "code": "",
    "name": "Havlicek, Jiri"
  },
  {
    "code": "JHAYW",
    "name": "Hayward, Jonathan Richard Alexande"
  },
  {
    "code": "",
    "name": "Heimpel, Peter"
  },
  {
    "code": "",
    "name": "Heredía Rodríguez, Ulises"
  },
  {
    "code": "DTKI",
    "name": "Hernández, Daniela Tki"
  },
  {
    "code": "VHERN",
    "name": "Hernández Arizaga, Vanessa"
  },
  {
    "code": "",
    "name": "Hernández Baute, Fernando"
  },
  {
    "code": "",
    "name": "Hernández Cano, Carlos"
  },
  {
    "code": "NCANO",
    "name": "Hernández Cano, Ignacio"
  },
  {
    "code": "CDAMI",
    "name": "Hernández Castillo, Christian Damian"
  },
  {
    "code": "",
    "name": "Hernández Delgado, Epifanio Jesús"
  },
  {
    "code": "",
    "name": "Hernandez Dorta, Alexis"
  },
  {
    "code": "JFARI",
    "name": "Hernández Fariña, Jesús"
  },
  {
    "code": "SFERN",
    "name": "Hernández Fernández, Silvia"
  },
  {
    "code": "JHERN",
    "name": "Hernández Hernández, Joseba"
  },
  {
    "code": "EHERN",
    "name": "Hernández Hernández-abad, Eduardo"
  },
  {
    "code": "",
    "name": "Hernández Lopez, Sergio"
  },
  {
    "code": "NHERN",
    "name": "Hernández Machin, Nereida"
  },
  {
    "code": "",
    "name": "Hernández Marrero, Jonathan"
  },
  {
    "code": "DHERN",
    "name": "Hernandez Martin, Daniela"
  },
  {
    "code": "CHERN",
    "name": "Hernández Ortega, Carlos"
  },
  {
    "code": "AHERN",
    "name": "Hernandez Velazquez, Ayoze"
  },
  {
    "code": "DHERR",
    "name": "Herrera Bissoli, Diego"
  },
  {
    "code": "AHERR",
    "name": "Herrera Diaz, Alejandro"
  },
  {
    "code": "JHERR",
    "name": "Herrero Martínez, Juan Antonio"
  },
  {
    "code": "JHICK",
    "name": "Hickey, Jack"
  },
  {
    "code": "IHIDA",
    "name": "Hidalgo Garrido, Ignacio Francisco"
  },
  {
    "code": "",
    "name": "Higham, Jonathan"
  },
  {
    "code": "VHORO",
    "name": "Horobet, Vasile-catalin"
  },
  {
    "code": "",
    "name": "Hughes, Isaac"
  },
  {
    "code": "LHURT",
    "name": "Hurtado Fernández-oliva, Luciana"
  },
  {
    "code": "MHURT",
    "name": "Hurtado Sáez, Mario"
  },
  {
    "code": "",
    "name": "Indirizzi, Luca"
  },
  {
    "code": "CIZAG",
    "name": "Izaguirre Pascual, Cayetana"
  },
  {
    "code": "",
    "name": "Jaswani Mahtani, Vikesh"
  },
  {
    "code": "MJATI",
    "name": "Játiva Carrión, Máximo"
  },
  {
    "code": "MJERO",
    "name": "Jeronimo, Mercedes"
  },
  {
    "code": "",
    "name": "Jimenez Camarena, Javier"
  },
  {
    "code": "DEBOR",
    "name": "Jorge, Debora"
  },
  {
    "code": "AJORG",
    "name": "Jorge Soler, Adrián"
  },
  {
    "code": "MJOSA",
    "name": "Josa Scheel, Mateo"
  },
  {
    "code": "",
    "name": "Kaplowitz, Zachary"
  },
  {
    "code": "DKAVA",
    "name": "Kavassy, Daniel Kristof"
  },
  {
    "code": "",
    "name": "Kell, Bernadette"
  },
  {
    "code": "AKENE",
    "name": "Kennedy, Aine Bridget"
  },
  {
    "code": "DKENN",
    "name": "Kennedy, Damien"
  },
  {
    "code": "LKEOH",
    "name": "Keohane, Liam Patrick"
  },
  {
    "code": "SKILD",
    "name": "Kilders Díaz, Sascha"
  },
  {
    "code": "JKILL",
    "name": "Killahena, Jonathan Patrick"
  },
  {
    "code": "",
    "name": "Kirrane, Martin"
  },
  {
    "code": "STANI",
    "name": "Klajban, Stanislav"
  },
  {
    "code": "IKONI",
    "name": "Konieczek, Irmina Magdalena"
  },
  {
    "code": "PAVLO",
    "name": "Kovalchuk, Pavlo"
  },
  {
    "code": "MKRAM",
    "name": "Kramer, Maximilian"
  },
  {
    "code": "CKRUG",
    "name": "Kruger, Carsten Ulf"
  },
  {
    "code": "GLASE",
    "name": "La Serna Afonso, Gustavo"
  },
  {
    "code": "",
    "name": "Lamberti González, Juan Miguel"
  },
  {
    "code": "BLAND",
    "name": "Landeros Sanchez, Brian Ever"
  },
  {
    "code": "SLARA",
    "name": "Lara González, Samuel"
  },
  {
    "code": "ILARR",
    "name": "Larraya González, Iñigo"
  },
  {
    "code": "ALASO",
    "name": "Lason, Alexander Adam"
  },
  {
    "code": "KSHON",
    "name": "Laurent, Kevin Shon"
  },
  {
    "code": "RALAWL",
    "name": "Lawlor, Robert"
  },
  {
    "code": "",
    "name": "Lehnert, Gerd Bernhard"
  },
  {
    "code": "MLEIT",
    "name": "Leite Oliveira, Marcos Paulo"
  },
  {
    "code": "",
    "name": "Lemes Arteaga, Jonathan Jesus"
  },
  {
    "code": "DLEON",
    "name": "Leon Rosario, Damaso"
  },
  {
    "code": "",
    "name": "Leon Suárez, Mario"
  },
  {
    "code": "NLIET",
    "name": "Lietz, Nora"
  },
  {
    "code": "",
    "name": "Llanos Guillermo, Oliver"
  },
  {
    "code": "LJOSE",
    "name": "Llanos López, Leonardo José"
  },
  {
    "code": "BLLOY",
    "name": "Lloyd, Brett Trevor"
  },
  {
    "code": "",
    "name": "Longuinos Santos Rodríguez, José"
  },
  {
    "code": "",
    "name": "López, Ezequiel"
  },
  {
    "code": "",
    "name": "Lopez Armas, Ignacio"
  },
  {
    "code": "",
    "name": "Lopez Esclapez, José Manuel"
  },
  {
    "code": "",
    "name": "Lopez García, Miguel"
  },
  {
    "code": "",
    "name": "López Kashaev, Daniel Felipe"
  },
  {
    "code": "HLORE",
    "name": "Lorenzo Álvarez, Héctor"
  },
  {
    "code": "LUGGE",
    "name": "Lugger, Bjorn-christoph"
  },
  {
    "code": "",
    "name": "Luis Delgado, Gustavo"
  },
  {
    "code": "ELUNG",
    "name": "Lungu, Eleonora"
  },
  {
    "code": "TLYNC",
    "name": "Lynch, Tara"
  },
  {
    "code": "MLYON",
    "name": "Lyons, Michael Francis"
  },
  {
    "code": "GMACA",
    "name": "Macaulay, George"
  },
  {
    "code": "",
    "name": "Machín Martín, Alberto"
  },
  {
    "code": "",
    "name": "Macías Ojeda, Antonio Manuel"
  },
  {
    "code": "CMACR",
    "name": "Macresy Estevan, Catherine Anne"
  },
  {
    "code": "KUMAR",
    "name": "Mahboobani, Kumar Divesh"
  },
  {
    "code": "",
    "name": "Manchon Aguirre, Gaston"
  },
  {
    "code": "IMANT",
    "name": "Mantesa Diaz, Ivan"
  },
  {
    "code": "IALVA",
    "name": "Marcelo Álvarez, Ian Daniel"
  },
  {
    "code": "AMARI",
    "name": "Marichal, Angel Luciano"
  },
  {
    "code": "VMARI",
    "name": "Marichal, Verónica Esmeralda"
  },
  {
    "code": "SMAR",
    "name": "Marichal Baez, Sergio"
  },
  {
    "code": "",
    "name": "Marichal Otero, Efrain"
  },
  {
    "code": "MMARI",
    "name": "Marin, Manuel"
  },
  {
    "code": "JMARQ",
    "name": "Marquez Díaz, Jaime"
  },
  {
    "code": "MMARR",
    "name": "Marrero Avila, Mario"
  },
  {
    "code": "",
    "name": "Marrero Rodríguez , Andrés Eduardo"
  },
  {
    "code": "",
    "name": "Martin Alonso, Adrian"
  },
  {
    "code": "MCABR",
    "name": "Martin Cabrera, Mauro"
  },
  {
    "code": "NCORD",
    "name": "Martin Cordoba, Natalia"
  },
  {
    "code": "",
    "name": "Martin Martin, Genaro"
  },
  {
    "code": "CMART",
    "name": "Martin Tesan, Carmelo Agustin"
  },
  {
    "code": "RMART",
    "name": "Martín-peñasco Capote, Raúl Anselmo"
  },
  {
    "code": "",
    "name": "Martinez De La Puente Azcarate, Asier"
  },
  {
    "code": "GMART",
    "name": "Martinez Esteve, Georgina"
  },
  {
    "code": "JMART",
    "name": "Martinez Mantolan, Javier"
  },
  {
    "code": "EMASC",
    "name": "Mascarell Cardelle, Eduardo"
  },
  {
    "code": "SMATT",
    "name": "Mattar Guadagno, Suleiman"
  },
  {
    "code": "",
    "name": "Mayoral Gutierrez, Felix Jonay"
  },
  {
    "code": "TMCCA",
    "name": "Mc Carville, Tiarnán Sean"
  },
  {
    "code": "MGRAT",
    "name": "Mcgrath, Megan Ciara"
  },
  {
    "code": "HMEDI",
    "name": "Medina Morales, Hugo"
  },
  {
    "code": "",
    "name": "Medina Pérez, Ana Isabel"
  },
  {
    "code": "",
    "name": "Melián García, Juan Miguel"
  },
  {
    "code": "AMENA",
    "name": "Mena Sánchez, Alejandro"
  },
  {
    "code": "MMENE",
    "name": "Meneghetti, Maurizio"
  },
  {
    "code": "OMESA",
    "name": "Mesa González, Óscar"
  },
  {
    "code": "",
    "name": "Mezcua Aldeano, Asier"
  },
  {
    "code": "AMILL",
    "name": "Milla, Ayran"
  },
  {
    "code": "VMILO",
    "name": "Milosavljevic, Vladimir"
  },
  {
    "code": "",
    "name": "Mist Baldursdóttir, Lara"
  },
  {
    "code": "GMODZ",
    "name": "Modzelewski, Grzegorz"
  },
  {
    "code": "OMONT",
    "name": "Montenegro Falcón, Ovidio"
  },
  {
    "code": "RAIM",
    "name": "Montero Perez, Raimundo"
  },
  {
    "code": "",
    "name": "Montes Mosteiro, David"
  },
  {
    "code": "",
    "name": "Montesino Alayon, Francisco Javier"
  },
  {
    "code": "OMONZ",
    "name": "Monzon, Oliver"
  },
  {
    "code": "MMORA",
    "name": "Morales, Marcos Manuel"
  },
  {
    "code": "CFEBE",
    "name": "Morales Febles, Carlos Jesús"
  },
  {
    "code": "",
    "name": "Moreno González, Ivan Carmelo"
  },
  {
    "code": "",
    "name": "Morera De Paz, Alberto"
  },
  {
    "code": "",
    "name": "Moya Martinez, Maria Belen"
  },
  {
    "code": "",
    "name": "Muriel Sánchez, Freddy"
  },
  {
    "code": "MNANG",
    "name": "Nangia, Michel"
  },
  {
    "code": "CNARO",
    "name": "Narozni, Cheherazade"
  },
  {
    "code": "GNAUG",
    "name": "Naughton, Gary"
  },
  {
    "code": "INAVA",
    "name": "Navarro De Corcuera, Ignacio"
  },
  {
    "code": "KONST",
    "name": "Nazarow-nenno, Konstanty"
  },
  {
    "code": "ENAZA",
    "name": "Nazarow-nenno, Eugeniusz"
  },
  {
    "code": "VACLA",
    "name": "Nekvapil, Vaclav"
  },
  {
    "code": "",
    "name": "Nemes, Lucian Victor"
  },
  {
    "code": "FNIEL",
    "name": "Nielsen Gerdo, Fabian Eduardo"
  },
  {
    "code": "",
    "name": "Nilgen, Fabian"
  },
  {
    "code": "",
    "name": "Nowak, Michal Lukasz"
  },
  {
    "code": "",
    "name": "Nuñez Garcia, Rubén"
  },
  {
    "code": "CFLAH",
    "name": "O´flaherty, Conor"
  },
  {
    "code": "BOMOR",
    "name": "O´mordha, Breandan"
  },
  {
    "code": "DOROU",
    "name": "O´rourke, Darragh John"
  },
  {
    "code": "",
    "name": "Obergfoell, Holger"
  },
  {
    "code": "AOBER",
    "name": "Obermaier, Alfred Johann"
  },
  {
    "code": "SOLIV",
    "name": "Oliva Cabrera, Saul"
  },
  {
    "code": "COLIV",
    "name": "Oliva García, Carlos"
  },
  {
    "code": "GOLIV",
    "name": "Olivares Pérez, Guayarmina"
  },
  {
    "code": "POLON",
    "name": "Olóndriz, Pablo"
  },
  {
    "code": "",
    "name": "Osado Pérez, Daniel"
  },
  {
    "code": "",
    "name": "Oskarsson, Viktor Emil"
  },
  {
    "code": "VPADI",
    "name": "Padilla Vega, Víctor"
  },
  {
    "code": "YPADR",
    "name": "Padrón Abreu, Yanelys"
  },
  {
    "code": "HPANC",
    "name": "Pancorbo, Hector Demetrio"
  },
  {
    "code": "",
    "name": "Parker, James"
  },
  {
    "code": "CPARD",
    "name": "Pastó García, Cristina"
  },
  {
    "code": "",
    "name": "Paulin Duncan, Calvin"
  },
  {
    "code": "APEMO",
    "name": "Peña Monzón, Alejandro Javier"
  },
  {
    "code": "MMORE",
    "name": "Peña Moreno, Manuel"
  },
  {
    "code": "MPEÑA",
    "name": "Peña Padilla, Miguel"
  },
  {
    "code": "",
    "name": "Pepito, Pepito"
  },
  {
    "code": "MPERA",
    "name": "Peraita García, Marcos Javier"
  },
  {
    "code": "CPERA",
    "name": "Perales García, Carolina"
  },
  {
    "code": "IBERR",
    "name": "Peralta Berrocal, Ivan"
  },
  {
    "code": "",
    "name": "Perdomo, Miguel Ángel"
  },
  {
    "code": "",
    "name": "Perera Pellegrino, Tobias Noel"
  },
  {
    "code": "VTKI",
    "name": "Pérez, Vidal Tki"
  },
  {
    "code": "",
    "name": "Perez Arranz, Ignacio"
  },
  {
    "code": "",
    "name": "Pérez Cabrera, Raimundo"
  },
  {
    "code": "JCORB",
    "name": "Perez Corbella, Javier"
  },
  {
    "code": "",
    "name": "Pérez Flores, Jonay Zebensui"
  },
  {
    "code": "APERE",
    "name": "Perez Hernandez, Anthony"
  },
  {
    "code": "DPERE",
    "name": "Perez Hernandez, Diego"
  },
  {
    "code": "",
    "name": "Pérez Hernandez, Juan Vidal"
  },
  {
    "code": "FHERN",
    "name": "Pérez Hernández, Francisco Agustín"
  },
  {
    "code": "CPERE",
    "name": "Pérez Medina, Carlos"
  },
  {
    "code": "JPERE",
    "name": "Perez Ortega, Javier"
  },
  {
    "code": "KPEDR",
    "name": "Perez Pedrianes, Kevin"
  },
  {
    "code": "OPERE",
    "name": "Perez Perez, Oscar"
  },
  {
    "code": "VPERE",
    "name": "Perez Perez, Vidal"
  },
  {
    "code": "",
    "name": "Pérez Plasencia, Francisco Manuel"
  },
  {
    "code": "",
    "name": "Pete Sanudo, Gala"
  },
  {
    "code": "",
    "name": "Peterka, Jiri"
  },
  {
    "code": "GPIJO",
    "name": "Pijoan Viñas, Genís"
  },
  {
    "code": "DPINO",
    "name": "Pino Perez, Daniel Jesus"
  },
  {
    "code": "APITE",
    "name": "Pitera Muriel, Antonio"
  },
  {
    "code": "MPLAS",
    "name": "Plasencia Hodgkinson, Marcos"
  },
  {
    "code": "",
    "name": "Pollet, Felix"
  },
  {
    "code": "TPREN",
    "name": "Prentoulis, Tzon Betoven"
  },
  {
    "code": "DPROT",
    "name": "Protasoni, Dino Alexander"
  },
  {
    "code": "JPUJO",
    "name": "Pujol Alvarez, Juan Miguel"
  },
  {
    "code": "QIAO",
    "name": "Qiao, Dongping"
  },
  {
    "code": "PRABA",
    "name": "Rabah Nelson, Paul Geoffrey Nassim"
  },
  {
    "code": "PRAMI",
    "name": "Ramírez Afonso, Patricia"
  },
  {
    "code": "CMORA",
    "name": "Ramón Morales, Carlos"
  },
  {
    "code": "ARAMO",
    "name": "Ramos Garcia, Adrian"
  },
  {
    "code": "DRAMO",
    "name": "Ramos Hernández, Daniel"
  },
  {
    "code": "",
    "name": "Ramos Hernández, Sergio"
  },
  {
    "code": "",
    "name": "Ramos Mendoza, Juan Jesús"
  },
  {
    "code": "",
    "name": "Ramos Rodriguez, Richard"
  },
  {
    "code": "",
    "name": "Reyes Hernandez, Carmen"
  },
  {
    "code": "",
    "name": "Reyes Lopez, Alicia"
  },
  {
    "code": "MREYE",
    "name": "Reyes Martinez, Miguel"
  },
  {
    "code": "",
    "name": "Rhyner, Kurt"
  },
  {
    "code": "",
    "name": "Rios Londoño, Esteban"
  },
  {
    "code": "ERIVE",
    "name": "Rivera Leon, Enrique Manuel"
  },
  {
    "code": "",
    "name": "Rivero Gonzalez, Sara"
  },
  {
    "code": "",
    "name": "Robayna Montañez, Alejandro"
  },
  {
    "code": "AROCE",
    "name": "Roces Alvarez, Alfredo"
  },
  {
    "code": "TRODR",
    "name": "Rodríguez, Tomás"
  },
  {
    "code": "ARODR",
    "name": "Rodríguez Álvarez, Airán"
  },
  {
    "code": "AADRI",
    "name": "Rodríguez Álvarez, Álvaro Adrián"
  },
  {
    "code": "",
    "name": "Rodriguez Fernandenz, Diego"
  },
  {
    "code": "FRODR",
    "name": "Rodríguez Glaría, Franco"
  },
  {
    "code": "",
    "name": "Rodríguez Martín, Alvaro"
  },
  {
    "code": "NRODR",
    "name": "Rodríguez Martín, Néstor"
  },
  {
    "code": "",
    "name": "Rodriguez Perez, Gabriel"
  },
  {
    "code": "",
    "name": "Rodríguez Rodríguez, Eligio"
  },
  {
    "code": "",
    "name": "Rodriguez Salas, Manuel"
  },
  {
    "code": "MRODR",
    "name": "Rodríguez Vargas, Marta"
  },
  {
    "code": "JROJA",
    "name": "Rojano Feriz, Johan"
  },
  {
    "code": "PROMA",
    "name": "Romanovs, Pavels"
  },
  {
    "code": "YULI",
    "name": "Romanyshyn Skaletska, Yuliya"
  },
  {
    "code": "GROMB",
    "name": "Rombaut, Guy"
  },
  {
    "code": "MROME",
    "name": "Romero Martínez, Miguel"
  },
  {
    "code": "MROSA",
    "name": "Rosario García, Marta"
  },
  {
    "code": "GROSE",
    "name": "Rosendo Negrin, Genesis Nicole"
  },
  {
    "code": "LROSS",
    "name": "Ross, Lorenzo Tobias"
  },
  {
    "code": "AROST",
    "name": "Rostro Buide, Alejandro"
  },
  {
    "code": "CRUBI",
    "name": "Rubiano, Carlos Gustavo"
  },
  {
    "code": "YRUIZ",
    "name": "Ruiz Calle, Yeray"
  },
  {
    "code": "",
    "name": "Rutolo Cendon, Juan Carlos"
  },
  {
    "code": "",
    "name": "Saeys, Ruth Godelieve"
  },
  {
    "code": "FSALA",
    "name": "Sala, Federico"
  },
  {
    "code": "",
    "name": "San Blas Camacho, Rosario Heredia"
  },
  {
    "code": "",
    "name": "San Martin Padilla, Daniel"
  },
  {
    "code": "",
    "name": "Sanchez Dominguez, Jesus"
  },
  {
    "code": "MSANC",
    "name": "Sanchez I Fontrodona, Marc"
  },
  {
    "code": "JSANC",
    "name": "Sánchez Naranjo, Jeanine"
  },
  {
    "code": "",
    "name": "Sánchez Rodríguez, Eva María"
  },
  {
    "code": "",
    "name": "Sandoval Romero, Alexmar Naomi"
  },
  {
    "code": "ASANT",
    "name": "Santana, Anabel"
  },
  {
    "code": "",
    "name": "Santana Cabello, Sonia"
  },
  {
    "code": "GSANT",
    "name": "Santana Castellano, Gabriel"
  },
  {
    "code": "",
    "name": "Santana Rosa, Jorge"
  },
  {
    "code": "DSANT",
    "name": "Santos, David"
  },
  {
    "code": "ASCHI",
    "name": "Schirmer, Andreas"
  },
  {
    "code": "TSCHO",
    "name": "Schroeder, Tino"
  },
  {
    "code": "",
    "name": "Schuette, Zen"
  },
  {
    "code": "",
    "name": "Schwab, Axel"
  },
  {
    "code": "PSEDL",
    "name": "Sedlacek, Pavel"
  },
  {
    "code": "",
    "name": "Segura Ponce, Roque Daniel"
  },
  {
    "code": "",
    "name": "Selytska, Tetiana"
  },
  {
    "code": "MSEMA",
    "name": "Semacoy Albertini, Maxence"
  },
  {
    "code": "LSIER",
    "name": "Sierra Perdomo, Luis Alberto"
  },
  {
    "code": "TSIVE",
    "name": "Siverio Siverio, Tania"
  },
  {
    "code": "",
    "name": "Skifte, Hans Ulrik"
  },
  {
    "code": "",
    "name": "Skridlevskiy, Ilya"
  },
  {
    "code": "",
    "name": "Sloane, Nicholas Thomas"
  },
  {
    "code": "ALEKS",
    "name": "Smirnov, Aleksei"
  },
  {
    "code": "TSNALL",
    "name": "Snall, Tomas Kai Kristian"
  },
  {
    "code": "",
    "name": "Sosa Peter, Cristian Sebastian"
  },
  {
    "code": "FSTAN",
    "name": "Stangl, Florian Ricardo"
  },
  {
    "code": "DSTEH",
    "name": "Stehmann, Dirk Hans"
  },
  {
    "code": "",
    "name": "Stevenson, David"
  },
  {
    "code": "ASUAR",
    "name": "Suarez Perez, Angel"
  },
  {
    "code": "",
    "name": "Suárez Reyes, Aday Francisco"
  },
  {
    "code": "",
    "name": "Suero Mena, Javier"
  },
  {
    "code": "ESURI",
    "name": "Suria Martin, Eduardo"
  },
  {
    "code": "VIKTO",
    "name": "Svetlichnyi, Viktor"
  },
  {
    "code": "",
    "name": "Szabolcs, Denes"
  },
  {
    "code": "JARNO",
    "name": "Talponen, Jarno Olavi"
  },
  {
    "code": "MTAPI",
    "name": "Tapia González, Jose Miguel"
  },
  {
    "code": "ABISA",
    "name": "Tapia Marrero, Abisai Gilbert"
  },
  {
    "code": "",
    "name": "Tavio Bonilla, Jacinto René"
  },
  {
    "code": "",
    "name": "Tki, Fiabisai"
  },
  {
    "code": "ABETH",
    "name": "Tki. Bethencourt Paz, Alejandro"
  },
  {
    "code": "",
    "name": "Toledo Ramos, Santiago"
  },
  {
    "code": "MARCI",
    "name": "Tomaszewski, Marcin Mariusz"
  },
  {
    "code": "",
    "name": "Torres González, Alexander"
  },
  {
    "code": "JTRUJ",
    "name": "Trujillo, Jesús Enrique"
  },
  {
    "code": "JKEVI",
    "name": "Trujillo Rodríguez, Juan Kevin"
  },
  {
    "code": "",
    "name": "Tunstall, Edwin"
  },
  {
    "code": "",
    "name": "Ugolin, Michela"
  },
  {
    "code": "AUMPI",
    "name": "Umpiérrez Suárez, Ángel David"
  },
  {
    "code": "HVAND",
    "name": "Van Der Sluis, Hendrick"
  },
  {
    "code": "",
    "name": "Van Marrewijk, Roy Robertus Cornelis"
  },
  {
    "code": "MVARG",
    "name": "Vargas Sanchez, Marina"
  },
  {
    "code": "",
    "name": "Varger Perez, Bryan Antonio"
  },
  {
    "code": "CVARL",
    "name": "Varley, Connor David"
  },
  {
    "code": "FVAZH",
    "name": "Vaz Hernandez, Francisco Agustin"
  },
  {
    "code": "",
    "name": "Vazquez Gomez, Claudio"
  },
  {
    "code": "SVEGA",
    "name": "Vega, Serafín"
  },
  {
    "code": "",
    "name": "Velasco Dujo, David"
  },
  {
    "code": "SVENE",
    "name": "Venero Rodriguez, Sara"
  },
  {
    "code": "",
    "name": "Verkest, Bert"
  },
  {
    "code": "",
    "name": "Verlinden, Pierre"
  },
  {
    "code": "JOSEF",
    "name": "Verner, Josef"
  },
  {
    "code": "YVICE",
    "name": "Vicente Pérez, Yolanda"
  },
  {
    "code": "",
    "name": "Vicenti, Giorgia Annalisa"
  },
  {
    "code": "JCAST",
    "name": "Vilar Castro, Jorge"
  },
  {
    "code": "JVILA",
    "name": "Vilar García-talavera, Jorge Manuel"
  },
  {
    "code": "DVILL",
    "name": "Villalgordo González, Daniel"
  },
  {
    "code": "CVILL",
    "name": "Villamizar Navarro, Carlos Mauricio"
  },
  {
    "code": "MVILL",
    "name": "Villarroya Medina, Marco"
  },
  {
    "code": "SVILL",
    "name": "Villegas Londoño, Santiago"
  },
  {
    "code": "JVILL",
    "name": "Villen Rodriguez, José Miguel"
  },
  {
    "code": "",
    "name": "Vincenzi, Gianluca"
  },
  {
    "code": "TVOSE",
    "name": "Vosen, Thomas"
  },
  {
    "code": "",
    "name": "Vyncke, Eric"
  },
  {
    "code": "DWADE",
    "name": "Wade Montesdeoca, Daniel Paul"
  },
  {
    "code": "JEROM",
    "name": "Warnimont, Jerome"
  },
  {
    "code": "CWATN",
    "name": "Watney Ramírez, Carlos Santiago"
  },
  {
    "code": "",
    "name": "Watson, Tara"
  },
  {
    "code": "ISAWE",
    "name": "Welsch, Isabel Carolina"
  },
  {
    "code": "PWESS",
    "name": "Wessel, Paul"
  },
  {
    "code": "GWHEL",
    "name": "Whelan, Graham Paul"
  },
  {
    "code": "",
    "name": "Wuestenhagen, Rainer"
  },
  {
    "code": "AYANE",
    "name": "Yanes Sritharach, Aimon"
  },
  {
    "code": "JZAMO",
    "name": "Zamora Ruiz, Jesús"
  },
  {
    "code": "JZANA",
    "name": "Zanasi, Jacopo"
  },
  {
    "code": "LZARA",
    "name": "Zarabozo, Lester"
  },
  {
    "code": "ZYURY",
    "name": "Zaytsev, Yury"
  },
  {
    "code": "KEVIN",
    "name": "Ziegler, Kevin"
  },
  {
    "code": "",
    "name": "Zouaghi, Anissa"
  },
  {
    "code": "PAWEL",
    "name": "Zysk, Pawel"
  }
];

function findStudentByCode(code) {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  return STUDENTS_CATALOG.find(s => s.code.toUpperCase() === clean) || null;
}

function findStudentByName(name) {
  if (!name) return null;
  const clean = String(name).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!clean) return null;

  const exact = STUDENTS_CATALOG.find(s => {
    const sName = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return sName === clean || clean.includes(sName) || sName.includes(clean);
  });
  if (exact) return exact;

  const tokens = clean.split(/[\s,]+/).filter(t => t.length > 2);
  if (tokens.length === 0) return null;

  let bestMatch = null;
  let maxScore = 0;
  for (const item of STUDENTS_CATALOG) {
    const itemNorm = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const itemTokens = itemNorm.split(/[\s,]+/).filter(t => t.length > 2);
    let matchedTokensCount = 0;
    let score = 0;
    for (const t of tokens) {
      if (itemTokens.includes(t)) {
        matchedTokensCount++;
        score += 2;
      } else if (itemNorm.includes(t)) {
        score += 1;
      }
    }
    const minMatchedRequired = tokens.length >= 2 ? 2 : 1;
    if (matchedTokensCount >= minMatchedRequired && score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }
  return bestMatch;
}

function handleStudentCodeAutocomplete(val) {
  const code = (val || '').trim().toUpperCase();
  const student = findStudentByCode(code);
  const nameInput = document.getElementById('edit-student-name');
  if (student && student.name && nameInput) {
    nameInput.value = student.name;
  }
}

function handleStudentNameAutocomplete(val) {
  const name = (val || '').trim();
  const student = findStudentByName(name);
  const codeInput = document.getElementById('edit-student-code');
  if (student && student.code && codeInput) {
    codeInput.value = student.code;
  }
}

function registerStudentInCatalog(code, name, save = true) {
  const c = String(code || '').trim().toUpperCase();
  const n = String(name || '').trim();
  if (!c && !n) return;

  let existing = null;
  if (c) existing = STUDENTS_CATALOG.find(s => s.code && s.code.toUpperCase() === c);
  if (!existing && n) existing = findStudentByName(n);

  if (existing) {
    if (c && !existing.code) existing.code = c;
    if (n && (!existing.name || existing.name.length < n.length)) existing.name = n;
  } else {
    STUDENTS_CATALOG.push({ code: c, name: n });
  }

  if (save && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('blue_team_custom_students_v1', JSON.stringify(STUDENTS_CATALOG));
    } catch {}
    refreshStudentDatalists();
  }
}

function registerInstructorInCatalog(code, name, save = true) {
  const c = String(code || '').trim().toUpperCase();
  const n = String(name || '').trim();
  if (!c && !n) return;

  const all = getAllInstructors();
  let existing = null;
  if (c) existing = all.find(i => i.code.toUpperCase() === c);
  if (!existing && n) existing = findInstructorByName(n);

  if (existing) {
    if (c && !existing.code) existing.code = c;
    if (n && (!existing.name || existing.name.length < n.length)) existing.name = n;
  } else {
    CUSTOM_INSTRUCTORES_CATALOG.push({ code: c, name: n, role: 'Instructor' });
  }

  if (save && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('blue_team_custom_instructors_v1', JSON.stringify(CUSTOM_INSTRUCTORES_CATALOG));
    } catch {}
    refreshInstructorDatalists();
  }
}

function refreshStudentDatalists() {
  if (typeof document === 'undefined') return;
  const codesDatalist = document.getElementById('student-codes-datalist');
  const namesDatalist = document.getElementById('student-names-datalist');
  if (codesDatalist) {
    codesDatalist.innerHTML = STUDENTS_CATALOG.filter(s => s.code).map(s => `
      <option value="${s.code}">${s.name}</option>
    `).join('');
  }
  if (namesDatalist) {
    namesDatalist.innerHTML = STUDENTS_CATALOG.filter(s => s.name).map(s => `
      <option value="${s.name}">[${s.code || 'S/C'}]</option>
    `).join('');
  }
}

function refreshInstructorDatalists() {
  if (typeof document === 'undefined') return;
  const codesDatalist = document.getElementById('instructor-codes-datalist');
  const namesDatalist = document.getElementById('instructor-names-datalist');
  const all = getAllInstructors();
  if (codesDatalist) {
    codesDatalist.innerHTML = all.filter(i => i.code).map(i => `
      <option value="${i.code}">${i.name} — ${i.role || 'Instructor'}</option>
    `).join('');
  }
  if (namesDatalist) {
    namesDatalist.innerHTML = all.filter(i => i.name).map(i => `
      <option value="${i.name}">[${i.code || 'S/C'}] ${i.role || 'Instructor'}</option>
    `).join('');
  }
}

function loadStoredCatalogs() {
  if (typeof localStorage === 'undefined') return;
  try {
    const customStudents = localStorage.getItem('blue_team_custom_students_v1');
    if (customStudents) {
      const parsed = JSON.parse(customStudents);
      for (const s of parsed) {
        registerStudentInCatalog(s.code, s.name, false);
      }
    }
    const customInstructors = localStorage.getItem('blue_team_custom_instructors_v1');
    if (customInstructors) {
      const parsed = JSON.parse(customInstructors);
      for (const i of parsed) {
        registerInstructorInCatalog(i.code, i.name, false);
      }
    }
  } catch (e) {
    console.warn('Error loading custom catalogs from localStorage:', e);
  }
}

function populateCatalogsFromReports(reports) {
  if (!Array.isArray(reports)) return;
  for (const rep of reports) {
    const records = rep.records || rep.matched || [];
    for (const r of records) {
      if (r.studentCode || r.studentName) registerStudentInCatalog(r.studentCode, r.studentName, false);
      if (r.instructorCode || r.instructorName) registerInstructorInCatalog(r.instructorCode, r.instructorName, false);
    }
  }
}

function formatMinutesToH_Mm(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '0:00';
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatInstructorCell(f) {
  if (!f) return '';
  if (f.instructorCode) return f.instructorCode;
  if (f.instructorName) {
    const found = findInstructorByName(f.instructorName);
    if (found && found.code) return found.code;
    return f.instructorName;
  }
  // Si no hay instructor explícito pero el piloto o pasajero es instructor
  if (f.pilotCode) {
    const instByPilotCode = findInstructorByCode(f.pilotCode);
    if (instByPilotCode && instByPilotCode.code) return instByPilotCode.code;
  }
  if (f.pilotName) {
    const instByPilotName = findInstructorByName(f.pilotName);
    if (instByPilotName && instByPilotName.code) return instByPilotName.code;
  }
  return '';
}

function formatAlumnoCell(f) {
  if (!f) return '';
  // 1. Siempre preferir el indicativo/código oficial del alumno si existe
  if (f.studentCode) return f.studentCode;
  if (f.studentName) {
    const found = findStudentByName(f.studentName);
    if (found && found.code) return found.code;
    // Si no tiene código en el catálogo oficial de Private Radar, mostrar el nombre (se ajusta al espacio en PDF/tabla)
    return f.studentName;
  }
  const isRentalOrSolo = /rental|alquiler|time\s*build|solo/i.test(f.flightType || '');
  if (isRentalOrSolo) {
    if (f.pilotCode) {
      const isInst = findInstructorByCode(f.pilotCode);
      if (!isInst) {
        const found = findStudentByCode(f.pilotCode);
        if (found && found.code) return found.code;
        return f.pilotCode;
      }
    }
    if (f.pilotName) {
      const isInst = findInstructorByName(f.pilotName);
      if (!isInst) {
        const found = findStudentByName(f.pilotName);
        if (found && found.code) return found.code;
        return f.pilotName;
      }
    }
  }
  return '';
}

function formatPilotosCell(f) {
  if (!f) return '';
  const pilots = [];
  const inst = formatInstructorCell(f);
  const alu = formatAlumnoCell(f);
  if (inst) pilots.push(inst);
  if (alu && alu !== inst) pilots.push(alu);
  if (pilots.length === 0 && (f.pilotCode || f.pilotName)) {
    pilots.push(f.pilotCode || f.pilotName);
  }
  return pilots.join(' / ');
}

const PREDEFINED_CANCELLATION_REASONS = [
  'Meteorología adversa',
  'Avería mecánica / Mantenimiento',
  'Indisposición del Alumno',
  'Indisposición del Instructor',
  'Operacional / Tráfico Aéreo / NOTAM',
  'Reprogramación de Escuela',
  'No presentado (No show)'
];

function formatFlightInfoCell(f) {
  if (!f) return '';
  const isCancelled = Boolean(f.isCancelled || f.status === 'CANCELLED');
  let rawRoute = (f.route || '').trim();

  let cleanRoute = rawRoute
    .replace(/\(\s*n\/?a\s*\)/gi, '')
    .replace(/\bn\/?a\b/gi, '')
    .replace(/[()]/g, '')
    .replace(/\s*->\s*/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim();

  // Si la ruta es N/A, (N/A), guión o 'Cancelado', no se considera ruta física válida
  if (!cleanRoute || /^n\/?a$/i.test(cleanRoute) || /^\(n\/?a\)$/i.test(cleanRoute) || cleanRoute === '-' || cleanRoute === 'N/A-N/A' || /^cancelad[oa]$/i.test(cleanRoute)) {
    cleanRoute = '';
  }

  if (!isCancelled) {
    return cleanRoute || (rawRoute && !/^n\/?a$/i.test(rawRoute) ? rawRoute : '—');
  }

  // Para vuelos cancelados: obtener motivo de cancelación o comentarios
  let rawReason = (f.cancellationReason || f.comments || '').trim();

  // Eliminar cualquier 'N/A', '(N/A)' y cualquier paréntesis
  let cleanReason = rawReason
    .replace(/\(\s*n\/?a\s*\)/gi, '')
    .replace(/\bn\/?a\b/gi, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim();

  if (!cleanReason || /^cancelad[oa]$/i.test(cleanReason)) {
    cleanReason = 'Cancelado';
  }

  // Si hay una ruta previa válida y es distinta del motivo, mostrar "Ruta - Motivo" (sin paréntesis ni N/A)
  if (cleanRoute && cleanRoute.toLowerCase() !== cleanReason.toLowerCase()) {
    return `${cleanRoute} - ${cleanReason}`;
  }

  return cleanReason;
}

function formatDateToDdMmYyyy(date) {
  if (!date) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  }
  const d = date instanceof Date ? date : new Date(date);
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  const parts = String(date).split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
  }
  return String(date);
}

function normalizeDateStr(dateStr) {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    return `${String(dateStr.getDate()).padStart(2, '0')}-${String(dateStr.getMonth() + 1).padStart(2, '0')}-${dateStr.getFullYear()}`;
  }
  const str = String(dateStr).trim();
  const parts = str.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
    }
    return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
  }
  return str.replace(/\//g, '-');
}

function parseDateStrToTimestamp(dateStr) {
  if (!dateStr) return 0;
  const normalized = normalizeDateStr(dateStr);
  const parts = normalized.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
  }
  return 0;
}

function getLatestReport(reports, requireRecords = false) {
  if (!Array.isArray(reports)) return null;
  return reports.reduce((latest, report) => {
    const reportDate = parseDateStrToTimestamp(report?.report_date);
    const records = report?.records || report?.matched;
    if (!reportDate || (requireRecords && (!Array.isArray(records) || records.length === 0))) {
      return latest;
    }
    return !latest || reportDate > parseDateStrToTimestamp(latest.report_date) ? report : latest;
  }, null);
}

function renderPersonBadgeHtml(code, name) {
  if (!name && !code) return '<span style="opacity:0.4;">—</span>';
  let resolvedCode = code;
  let resolvedName = name;
  if (!resolvedCode && resolvedName) {
    const student = findStudentByName(resolvedName);
    if (student) {
      resolvedCode = student.code;
    } else {
      const inst = findInstructorByName(resolvedName);
      if (inst) resolvedCode = inst.code;
    }
  }
  if ((!resolvedName || resolvedName === resolvedCode) && resolvedCode) {
    const inst = findInstructorByCode(resolvedCode);
    if (inst) resolvedName = inst.name;
    else {
      const student = findStudentByCode(resolvedCode);
      if (student) resolvedName = student.name;
    }
  }
  let badgeHtml = '';
  if (resolvedCode) {
    badgeHtml = `<span class="crew-code-badge" title="Identificador Private Radar: ${resolvedCode}">${resolvedCode}</span>`;
  }
  return `<div class="person-badge-container">${badgeHtml}<span style="font-weight: 500;">${resolvedName || resolvedCode}</span></div>`;
}

// =========================================================
// MOTOR DE ANALITICA Y REGLAS DE NEGOCIO
// =========================================================

function calculateExecutiveKpis(matchedFlights) {
  if (!matchedFlights || matchedFlights.length === 0) {
    return {
      totalFlights: 0,
      executedFlightsCount: 0,
      cancelledFlightsCount: 0,
      totalScheduledMinutes: 0,
      totalBookedMinutes: 0,
      totalScheduledHoursFormatted: '00:00',
      totalScheduledHoursDecimal: 0,
      totalFlownMinutes: 0,
      totalFlownHoursFormatted: '00:00',
      totalFlownHoursDecimal: 0,
      netDeviationMinutes: 0,
      netDeviationHoursFormatted: '00:00',
      netDeviationHoursDecimal: 0,
      totalAbsoluteDeviationMinutes: 0,
      totalAbsoluteDeviationHoursFormatted: '00:00',
      absDeviationMinutes: 0,
      onTimeFlightsCount: 0,
      onTimeRate: 100,
      delayedFlightsCount: 0,
      earlyFlightsCount: 0,
      totalCancelledMinutes: 0,
      totalCancelledHoursFormatted: '00:00',
      totalCancelledHoursDecimal: 0,
      cancellationRate: 0
    };
  }

  const totalFlights = matchedFlights.length;
  let executedScheduledMinutes = 0;
  let totalBookedMinutes = 0;
  let totalFlownMinutes = 0;
  let absDeviationMinutes = 0;
  let onTimeFlightsCount = 0;
  let delayedFlightsCount = 0;
  let earlyFlightsCount = 0;
  let cancelledFlightsCount = 0;
  let totalCancelledMinutes = 0;

  const processedGroups = new Set();

  for (const f of matchedFlights) {
    if (f.linkedGroupId) {
      if (processedGroups.has(f.linkedGroupId)) continue;
      processedGroups.add(f.linkedGroupId);

      const groupMembers = matchedFlights.filter(x => x.linkedGroupId === f.linkedGroupId);
      const isGroupCancelled = groupMembers.every(x => x.isCancelled || x.status === 'CANCELLED');
      const groupSched = f.linkedGroupTotalScheduledMinutes ?? groupMembers.reduce((max, x) => Math.max(max, x.scheduledMinutes || 0), 0);
      const groupFlown = isGroupCancelled ? 0 : groupMembers.reduce((sum, x) => sum + (x.flownMinutes || 0), 0);
      const groupDev = isGroupCancelled ? 0 : (groupFlown - groupSched);

      totalBookedMinutes += groupSched;

      if (isGroupCancelled) {
        cancelledFlightsCount += groupMembers.length;
        totalCancelledMinutes += groupSched;
        continue;
      }

      executedScheduledMinutes += groupSched;
      totalFlownMinutes += groupFlown;
      absDeviationMinutes += Math.abs(groupDev);

      let groupStatus = f.linkedGroupStatus;
      if (!groupStatus) {
        if (groupDev > 5) groupStatus = 'DELAYED';
        else if (groupDev < -5) groupStatus = 'EARLY';
        else groupStatus = 'ON_TIME';
      }

      if (groupStatus === 'ON_TIME') {
        onTimeFlightsCount += groupMembers.length;
      } else if (groupStatus === 'EARLY') {
        earlyFlightsCount += groupMembers.length;
      } else {
        delayedFlightsCount += groupMembers.length;
      }
    } else {
      totalBookedMinutes += f.scheduledMinutes || 0;

      if (f.isCancelled || f.status === 'CANCELLED') {
        cancelledFlightsCount++;
        totalCancelledMinutes += f.scheduledMinutes || 0;
        continue;
      }

      executedScheduledMinutes += f.scheduledMinutes || 0;
      totalFlownMinutes += f.flownMinutes || 0;
      absDeviationMinutes += Math.abs(f.deviationMinutes || 0);

      if (f.status === 'ON_TIME') {
        onTimeFlightsCount++;
      } else if (f.status === 'EARLY') {
        earlyFlightsCount++;
      } else {
        delayedFlightsCount++;
      }
    }
  }

  const executedFlightsCount = totalFlights - cancelledFlightsCount;
  const netDeviationMinutes = totalFlownMinutes - executedScheduledMinutes;
  const onTimeRate =
    executedFlightsCount > 0 ? Math.round((onTimeFlightsCount / executedFlightsCount) * 100) : 0;
  const cancellationRate =
    totalFlights > 0 ? Math.round((cancelledFlightsCount / totalFlights) * 100) : 0;

  return {
    totalFlights,
    executedFlightsCount,
    cancelledFlightsCount,
    totalScheduledMinutes: executedScheduledMinutes,
    totalBookedMinutes,
    totalScheduledHoursFormatted: formatMinutesToHhMm(executedScheduledMinutes),
    totalScheduledHoursDecimal: minutesToDecimalHours(executedScheduledMinutes),
    totalFlownMinutes,
    totalFlownHoursFormatted: formatMinutesToHhMm(totalFlownMinutes),
    totalFlownHoursDecimal: minutesToDecimalHours(totalFlownMinutes),
    netDeviationMinutes,
    netDeviationHoursFormatted: `${netDeviationMinutes > 0 ? '+' : ''}${formatMinutesToHhMm(netDeviationMinutes)}`,
    netDeviationHoursDecimal: minutesToDecimalHours(netDeviationMinutes),
    totalAbsoluteDeviationMinutes: absDeviationMinutes,
    totalAbsoluteDeviationHoursFormatted: formatMinutesToHhMm(absDeviationMinutes),
    absDeviationMinutes,
    onTimeFlightsCount,
    onTimeRate,
    delayedFlightsCount,
    earlyFlightsCount,
    totalCancelledMinutes,
    totalCancelledHoursFormatted: formatMinutesToHhMm(totalCancelledMinutes),
    totalCancelledHoursDecimal: minutesToDecimalHours(totalCancelledMinutes),
    cancellationRate
  };
}

function aggregateByStudent(matchedFlights) {
  const map = new Map();
  const processedGroups = new Set();

  for (const f of matchedFlights) {
    if (!f.studentName && !f.studentCode) continue;
    const key = f.studentName || f.studentCode;
    if (!map.has(key)) {
      map.set(key, {
        studentName: f.studentName || '',
        studentCode: f.studentCode || '',
        flightsCount: 0,
        cancelledFlightsCount: 0,
        totalScheduledMinutes: 0,
        totalFlownMinutes: 0,
        totalDeviationMinutes: 0,
        flights: []
      });
    }
    const entry = map.get(key);
    entry.flightsCount++;
    entry.flights.push(f);
    if (!entry.studentCode && f.studentCode) entry.studentCode = f.studentCode;

    if (f.isCancelled || f.status === 'CANCELLED') {
      entry.cancelledFlightsCount++;
    } else {
      entry.totalFlownMinutes += (f.flownMinutes || 0);

      if (f.linkedGroupId) {
        if (!processedGroups.has(f.linkedGroupId)) {
          processedGroups.add(f.linkedGroupId);
          const sched = f.linkedGroupTotalScheduledMinutes ?? f.scheduledMinutes ?? 0;
          entry.totalScheduledMinutes += sched;
        }
      } else {
        entry.totalScheduledMinutes += (f.scheduledMinutes || 0);
      }
    }
  }

  return Array.from(map.values()).map(s => {
    const totalDeviationMinutes = s.totalFlownMinutes - s.totalScheduledMinutes;
    return {
      ...s,
      totalDeviationMinutes,
      totalScheduledHoursFormatted: formatMinutesToHhMm(s.totalScheduledMinutes),
      totalFlownHoursFormatted: formatMinutesToHhMm(s.totalFlownMinutes),
      totalDeviationFormatted: `${totalDeviationMinutes > 0 ? '+' : ''}${formatMinutesToHhMm(totalDeviationMinutes)}`,
      status: Math.abs(totalDeviationMinutes) <= 5 ? 'ON_TIME' : totalDeviationMinutes > 5 ? 'DELAYED' : 'EARLY'
    };
  });
}

function aggregateByInstructor(matchedFlights) {
  const map = new Map();
  const processedGroups = new Set();

  for (const f of matchedFlights) {
    const instName = f.instructorName;
    const instCode = f.instructorCode;
    if (!instName && !instCode) continue;
    const key = instName || instCode;
    if (!map.has(key)) {
      map.set(key, {
        instructorName: instName || '',
        instructorCode: instCode || '',
        flightsCount: 0,
        cancelledFlightsCount: 0,
        totalScheduledMinutes: 0,
        totalFlownMinutes: 0,
        totalDeviationMinutes: 0,
        flights: []
      });
    }
    const entry = map.get(key);
    entry.flightsCount++;
    entry.flights.push(f);
    if (!entry.instructorCode && instCode) entry.instructorCode = instCode;

    if (f.isCancelled || f.status === 'CANCELLED') {
      entry.cancelledFlightsCount++;
    } else {
      entry.totalFlownMinutes += (f.flownMinutes || 0);

      if (f.linkedGroupId) {
        if (!processedGroups.has(f.linkedGroupId)) {
          processedGroups.add(f.linkedGroupId);
          const sched = f.linkedGroupTotalScheduledMinutes ?? f.scheduledMinutes ?? 0;
          entry.totalScheduledMinutes += sched;
        }
      } else {
        entry.totalScheduledMinutes += (f.scheduledMinutes || 0);
      }
    }
  }

  return Array.from(map.values()).map(i => {
    const totalDeviationMinutes = i.totalFlownMinutes - i.totalScheduledMinutes;
    return {
      ...i,
      totalDeviationMinutes,
      totalScheduledHoursFormatted: formatMinutesToHhMm(i.totalScheduledMinutes),
      totalFlownHoursFormatted: formatMinutesToHhMm(i.totalFlownMinutes),
      totalDeviationFormatted: `${totalDeviationMinutes > 0 ? '+' : ''}${formatMinutesToHhMm(totalDeviationMinutes)}`,
      status: Math.abs(totalDeviationMinutes) <= 5 ? 'ON_TIME' : totalDeviationMinutes > 5 ? 'DELAYED' : 'EARLY'
    };
  });
}

function aggregateByPair(matchedFlights) {
  const map = new Map();
  const processedGroups = new Set();

  for (const f of matchedFlights) {
    if (!f.studentName && !f.studentCode) continue;
    const instName = f.instructorName || 'Sin Instructor';
    const instCode = f.instructorCode || '';
    const key = `${f.studentName || f.studentCode}__${instName}`;
    if (!map.has(key)) {
      map.set(key, {
        studentName: f.studentName || '',
        studentCode: f.studentCode || '',
        instructorName: instName,
        instructorCode: instCode,
        flightsCount: 0,
        cancelledFlightsCount: 0,
        totalScheduledMinutes: 0,
        totalFlownMinutes: 0,
        totalDeviationMinutes: 0,
        flights: []
      });
    }
    const entry = map.get(key);
    entry.flightsCount++;
    entry.flights.push(f);
    if (!entry.studentCode && f.studentCode) entry.studentCode = f.studentCode;
    if (!entry.instructorCode && instCode) entry.instructorCode = instCode;

    if (f.isCancelled || f.status === 'CANCELLED') {
      entry.cancelledFlightsCount++;
    } else {
      entry.totalFlownMinutes += (f.flownMinutes || 0);

      if (f.linkedGroupId) {
        if (!processedGroups.has(f.linkedGroupId)) {
          processedGroups.add(f.linkedGroupId);
          const sched = f.linkedGroupTotalScheduledMinutes ?? f.scheduledMinutes ?? 0;
          entry.totalScheduledMinutes += sched;
        }
      } else {
        entry.totalScheduledMinutes += (f.scheduledMinutes || 0);
      }
    }
  }

  return Array.from(map.values()).map(p => {
    const totalDeviationMinutes = p.totalFlownMinutes - p.totalScheduledMinutes;
    return {
      ...p,
      totalDeviationMinutes,
      totalScheduledHoursFormatted: formatMinutesToHhMm(p.totalScheduledMinutes),
      totalFlownHoursFormatted: formatMinutesToHhMm(p.totalFlownMinutes),
      totalDeviationFormatted: `${totalDeviationMinutes > 0 ? '+' : ''}${formatMinutesToHhMm(totalDeviationMinutes)}`,
      status: Math.abs(totalDeviationMinutes) <= 5 ? 'ON_TIME' : totalDeviationMinutes > 5 ? 'DELAYED' : 'EARLY'
    };
  });
}

// =========================================================
// PARSEO DE ARCHIVOS EXCEL (SHEETJS)
// =========================================================

function cleanStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function calculateMinutesBetween(start, end) {
  if (!start || !end) return 0;
  const dStart = start instanceof Date ? start : new Date(start);
  const dEnd = end instanceof Date ? end : new Date(end);
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return 0;
  const diffMs = dEnd.getTime() - dStart.getTime();
  return Math.max(0, Math.round(diffMs / (60 * 1000)));
}

function isSameCalendarDay(left, right) {
  if (!left || !right) return false;
  const leftDate = left instanceof Date ? left : new Date(left);
  const rightDate = right instanceof Date ? right : new Date(right);
  if (isNaN(leftDate.getTime()) || isNaN(rightDate.getTime())) return false;
  return leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate();
}

function bookingAndLegShareDay(booking, flight) {
  const bookingDay = booking.dateBegin || booking.dateEnd;
  const flightDay = flight.date || flight.start || flight.taxi;
  return isSameCalendarDay(bookingDay, flightDay);
}

function normalizeCrewIdentity(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function crewIdentityMatches(scheduledValue, flownName, flownCode) {
  if (!scheduledValue || (!flownName && !flownCode)) return true;
  const scheduledIdentity = normalizeCrewIdentity(scheduledValue);
  return [flownName, flownCode].some(value => {
    const flownIdentity = normalizeCrewIdentity(value);
    return flownIdentity && (scheduledIdentity === flownIdentity ||
      scheduledIdentity.includes(flownIdentity) || flownIdentity.includes(scheduledIdentity));
  });
}

function bookingCrewMatchesLeg(booking, flight) {
  return crewIdentityMatches(booking.studentName, flight.studentName, flight.studentCode) &&
    crewIdentityMatches(booking.instructorName, flight.instructorName, flight.instructorCode) &&
    crewIdentityMatches(booking.pilotName, flight.pilotName, flight.pilotCode);
}

function crewMatchScore(booking, flight) {
  return [
    [booking.studentName, booking.studentCode, flight.studentName, flight.studentCode],
    [booking.instructorName, booking.instructorCode, flight.instructorName, flight.instructorCode],
    [booking.pilotName, booking.pilotCode, flight.pilotName, flight.pilotCode]
  ].filter(([scheduledName, scheduledCode, flownName, flownCode]) =>
    (scheduledName || scheduledCode) && (flownName || flownCode) &&
    crewIdentityMatches(scheduledName || scheduledCode, flownName, flownCode)
  ).length;
}

function hasMoreSpecificBookingForLeg(booking, flight, bookings) {
  const currentScore = crewMatchScore(booking, flight);
  return bookings.some(candidate =>
    candidate !== booking &&
    candidate.flightNumber === booking.flightNumber &&
    bookingAndLegShareDay(candidate, flight) &&
    bookingCrewMatchesLeg(candidate, flight) &&
    crewMatchScore(candidate, flight) > currentScore
  );
}

function parseProgramadoExcel(input) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS no está cargado.');
  const wb = XLSX.read(input, { type: 'array', cellDates: true });
  const sheet = wb.Sheets['Flights'] || wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error("No se encontró la hoja 'Flights' en el Excel de Programación.");
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 2) {
    return [];
  }

  // Buscar fila cabecera: contiene 'Registration' o 'Flight #' o 'Date begin (UTC)'
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const row = rawRows[i];
    if (row.some((cell) => cleanStr(cell).toLowerCase() === 'registration' || cleanStr(cell).toLowerCase().includes('flight #'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("No se encontró la fila de cabecera en el Excel de Programación.");
  }

  const headers = rawRows[headerRowIdx].map(cleanStr);
  const colIndex = {
    bookingId: headers.findIndex((h) => h === '#'),
    registration: headers.findIndex((h) => h.toLowerCase() === 'registration'),
    dateBegin: headers.findIndex((h) => h.toLowerCase().includes('date begin')),
    dateEnd: headers.findIndex((h) => h.toLowerCase().includes('date end')),
    type: headers.findIndex((h) => h.toLowerCase() === 'type'),
    pilot: headers.findIndex((h) => h.toLowerCase() === 'pilot'),
    student: headers.findIndex((h) => h.toLowerCase() === 'student'),
    studentCode: headers.findIndex((h) => /^student\s*(code|id)$/i.test(h)),
    instructor: headers.findIndex((h) => h.toLowerCase() === 'instructor'),
    instructorCode: headers.findIndex((h) => /^instructor\s*(code|id)$/i.test(h)),
    flightNumber: headers.findIndex((h) => h.toLowerCase().includes('flight #')),
    pilotCode: headers.findIndex((h) => /^pilot\s*(code|id)$/i.test(h)),
    passenger: headers.findIndex((h) => /passenger|pasajer|pax/i.test(h)),
    passengerCode: headers.findIndex((h) => /^(passenger|pasajer|pax)\s*(code|id)$/i.test(h)),
    lessons: headers.findIndex((h) => h.toLowerCase() === 'lessons'),
    comments: headers.findIndex((h) => h.toLowerCase() === 'comments'),
    status: headers.findIndex((h) => h.toLowerCase() === 'status'),
  };

  const bookings = [];

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !row.some((c) => c !== '')) continue;

    const bookingId = cleanStr(row[colIndex.bookingId]);
    if (!bookingId) continue;

    const flightType = cleanStr(row[colIndex.type]) || 'Instruction';
    if (/maintenance|mantenimiento/i.test(flightType)) {
      continue;
    }

    const dateBegin = row[colIndex.dateBegin] instanceof Date ? row[colIndex.dateBegin] : null;
    const dateEnd = row[colIndex.dateEnd] instanceof Date ? row[colIndex.dateEnd] : null;
    const scheduledMinutes = calculateMinutesBetween(dateBegin, dateEnd);

    const pilotName = cleanStr(row[colIndex.pilot]);
    const pilotCode = colIndex.pilotCode !== -1 ? cleanStr(row[colIndex.pilotCode]) : '';
    let studentName = colIndex.student !== -1 ? cleanStr(row[colIndex.student]) : '';
    let studentCode = colIndex.studentCode !== -1 ? cleanStr(row[colIndex.studentCode]) : '';
    let instructorName = colIndex.instructor !== -1 ? cleanStr(row[colIndex.instructor]) : '';
    let instructorCode = colIndex.instructorCode !== -1 ? cleanStr(row[colIndex.instructorCode]) : '';
    const passengerName = colIndex.passenger !== -1 ? cleanStr(row[colIndex.passenger]) : '';
    const passengerCode = colIndex.passengerCode !== -1 ? cleanStr(row[colIndex.passengerCode]) : '';

    // En Private Radar, para alquiler / time building / solo o cuando el instructor va como pasajero:
    const isRentalOrSolo = /rental|alquiler|time\s*build|solo/i.test(flightType);
    if (!studentName && pilotName && (isRentalOrSolo || passengerName)) {
      studentName = pilotName;
      studentCode = pilotCode;
    }
    if (!instructorName && passengerName) {
      instructorName = passengerName;
      instructorCode = passengerCode;
    }

    // Si no hay instructor explícito pero el piloto o pasajero es instructor de la escuela:
    if (!instructorName && !instructorCode && pilotName) {
      const matchInstByPilot = findInstructorByName(pilotName) || findInstructorByCode(pilotCode);
      if (matchInstByPilot) {
        instructorName = matchInstByPilot.name;
        instructorCode = matchInstByPilot.code;
      }
    }

    if (instructorCode && !instructorName) {
      const matchInst = findInstructorByCode(instructorCode);
      if (matchInst) instructorName = matchInst.name;
    } else if (instructorName && !instructorCode) {
      const matchInst = findInstructorByName(instructorName);
      if (matchInst) instructorCode = matchInst.code;
    }

    if (studentCode && !studentName) {
      const matchStu = findStudentByCode(studentCode);
      if (matchStu) studentName = matchStu.name;
    } else if (studentName && !studentCode) {
      const matchStu = findStudentByName(studentName);
      if (matchStu) studentCode = matchStu.code;
    }

    bookings.push({
      bookingId,
      flightNumber: cleanStr(row[colIndex.flightNumber]),
      registration: cleanStr(row[colIndex.registration]),
      dateBegin,
      dateEnd,
      scheduledMinutes,
      flightType,
      pilotName,
      pilotCode,
      studentName,
      studentCode,
      instructorName,
      instructorCode,
      lessons: cleanStr(row[colIndex.lessons]),
      comments: cleanStr(row[colIndex.comments]),
      status: cleanStr(row[colIndex.status]),
    });
  }

  return bookings;
}

function parseVoladoExcel(input) {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS no está cargado.');
  const wb = XLSX.read(input, { type: 'array', cellDates: true });
  const sheet = wb.Sheets['Flights'] || wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error("No se encontró la hoja 'Flights' en el Excel de Horas Voladas.");
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length < 2) {
    return [];
  }

  // Buscar fila cabecera: contiene 'Start (LT)' o 'Taxi (LT)' o 'Registration'
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const row = rawRows[i];
    if (row.some((cell) => cleanStr(cell).toLowerCase().includes('start (lt)') || cleanStr(cell).toLowerCase().includes('taxi (lt)'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error("No se encontró la fila de cabecera en el Excel de Horas Voladas.");
  }

  const headers = rawRows[headerRowIdx].map(cleanStr);
  const colIndex = {
    flightNumber: headers.findIndex((h) => h === '#'),
    registration: headers.findIndex((h) => h.toLowerCase() === 'registration'),
    model: headers.findIndex((h) => h.toLowerCase() === 'model'),
    base: headers.findIndex((h) => h.toLowerCase() === 'base'),
    departure: headers.findIndex((h) => h.toLowerCase() === 'departure'),
    arrival: headers.findIndex((h) => h.toLowerCase() === 'arrival'),
    date: headers.findIndex((h) => h.toLowerCase() === 'date'),
    start: headers.findIndex((h) => h.toLowerCase().includes('start (lt)')),
    taxi: headers.findIndex((h) => h.toLowerCase().includes('taxi (lt)')),
    end: headers.findIndex((h) => h.toLowerCase().includes('end (lt)')),
    flightType: headers.findIndex((h) => h.toLowerCase().includes('flight type')),
    hobbsOut: headers.findIndex((h) => h.toLowerCase() === 'hobbs out'),
    hobbsIn: headers.findIndex((h) => h.toLowerCase() === 'hobbs in'),
    lessons: headers.findIndex((h) => h.toLowerCase() === 'lessons'),
  };

  // Buscar grupos de columnas de tripulación (Code name, First name, Last name, Function)
  const crewSlots = [];
  for (let c = 0; c < headers.length; c++) {
    if (
      headers[c].toLowerCase() === 'first name' &&
      headers[c + 1]?.toLowerCase() === 'last name'
    ) {
      const funcIdx = headers.findIndex((h, idx) => idx > c && h.toLowerCase() === 'function');
      const codeIdx = c > 0 && headers[c - 1]?.toLowerCase().includes('code') ? c - 1 : -1;
      crewSlots.push({
        codeIdx,
        firstNameIdx: c,
        lastNameIdx: c + 1,
        functionIdx: funcIdx !== -1 ? funcIdx : c + 2,
      });
    }
  }

  const flights = [];

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !row.some((c) => c !== '')) continue;

    const flightNumber = cleanStr(row[colIndex.flightNumber]);
    if (!flightNumber) continue;

    const taxi = row[colIndex.taxi] instanceof Date ? row[colIndex.taxi] : null;
    const start = row[colIndex.start] instanceof Date ? row[colIndex.start] : null;
    const end = row[colIndex.end] instanceof Date ? row[colIndex.end] : null;
    // En Private Radar / Blue Team, taxi time / off-block es el inicio del bloque
    const blockStart = taxi || start;
    const blockMinutes = calculateMinutesBetween(blockStart, end);

    // Extraer miembros de tripulación e identificadores de código
    let studentName = '';
    let studentCode = '';
    let instructorName = '';
    let instructorCode = '';
    let pilotName = '';
    let pilotCode = '';

    for (const slot of crewSlots) {
      const code = slot.codeIdx !== -1 ? cleanStr(row[slot.codeIdx]) : '';
      const first = cleanStr(row[slot.firstNameIdx]);
      const last = cleanStr(row[slot.lastNameIdx]);
      const func = cleanStr(row[slot.functionIdx]).toUpperCase();
      const fullName = [first, last].filter(Boolean).join(' ');

      if (!fullName && !code) continue;

      if (func.includes('DUAL')) {
        studentName = fullName;
        studentCode = code;
      } else if (func.includes('SUPER')) {
        instructorName = fullName;
        instructorCode = code;
      } else if (func.includes('PIC') || func.includes('FI') || func.includes('INSTRUCTOR')) {
        if (!pilotName) {
          pilotName = fullName;
          pilotCode = code;
        }
        const isRentalOrSolo = /solo|rental|alquiler|time\s*build/i.test(cleanStr(row[colIndex.flightType]));
        if (isRentalOrSolo) {
          studentName = fullName;
          studentCode = code;
        } else {
          instructorName = fullName;
          instructorCode = code;
        }
      }
    }

    const flightType = cleanStr(row[colIndex.flightType]) || 'Instruction';
    if (/rental|alquiler|time\s*build/i.test(flightType)) {
      if (!studentName && pilotName) {
        studentName = pilotName;
        studentCode = pilotCode;
      }
      if (!studentName && instructorName) {
        studentName = instructorName;
        studentCode = instructorCode;
        instructorName = '';
        instructorCode = '';
      }
    }

    if (instructorCode && !instructorName) {
      const matchInst = findInstructorByCode(instructorCode);
      if (matchInst) instructorName = matchInst.name;
    } else if (instructorName && !instructorCode) {
      const matchInst = findInstructorByName(instructorName);
      if (matchInst) instructorCode = matchInst.code;
    }

    flights.push({
      flightNumber,
      registration: cleanStr(row[colIndex.registration]),
      model: cleanStr(row[colIndex.model]),
      base: cleanStr(row[colIndex.base]),
      departure: cleanStr(row[colIndex.departure]),
      arrival: cleanStr(row[colIndex.arrival]),
      date: row[colIndex.date] instanceof Date ? row[colIndex.date] : start,
      start,
      taxi,
      end,
      blockMinutes,
      flightType,
      studentName,
      studentCode,
      instructorName,
      instructorCode,
      pilotName,
      pilotCode,
      hobbsOut: typeof row[colIndex.hobbsOut] === 'number' ? row[colIndex.hobbsOut] : null,
      hobbsIn: typeof row[colIndex.hobbsIn] === 'number' ? row[colIndex.hobbsIn] : null,
      lessons: cleanStr(row[colIndex.lessons]),
    });
  }

  return flights;
}

function matchFlightsAndCalculateDeviations(bookings, flights) {
  const assignedFlights = new Set();
  const results = [];

  for (const booking of bookings) {
    const matchedLegs = [];

    // 1. Emparejamiento directo por número de vuelo
    const primaryLeg = flights.find(
      (f) =>
        booking.flightNumber &&
        f.flightNumber === booking.flightNumber &&
        bookingAndLegShareDay(booking, f) &&
        bookingCrewMatchesLeg(booking, f) &&
        !hasMoreSpecificBookingForLeg(booking, f, bookings) &&
        !assignedFlights.has(f)
    );

    if (primaryLeg) {
      matchedLegs.push(primaryLeg);
      assignedFlights.add(primaryLeg);
    } else {
      // 2. Emparejamiento de respaldo por matrícula y tripulación
      const fallbackLeg = flights.find(
        (f) =>
          !assignedFlights.has(f) &&
          bookingAndLegShareDay(booking, f) &&
          f.registration === booking.registration &&
          bookingCrewMatchesLeg(booking, f) &&
          !hasMoreSpecificBookingForLeg(booking, f, bookings) &&
          ((booking.studentName && f.studentName === booking.studentName) ||
            (booking.pilotName && f.pilotName === booking.pilotName) ||
            (booking.instructorName && f.instructorName === booking.instructorName))
      );

      if (fallbackLeg) {
        matchedLegs.push(fallbackLeg);
        assignedFlights.add(fallbackLeg);
      }
    }

    // Regla de Negocio: Si una reserva no aparece en Volado, está CANCELADA
    const isCancelled = matchedLegs.length === 0;
    const flownMinutes = isCancelled
      ? 0
      : matchedLegs.reduce((sum, leg) => sum + (leg.blockMinutes || 0), 0);
    const scheduledMinutes = booking.scheduledMinutes || 0;

    // Regla Inmutable: Vuelos cancelados tienen desviación = 0 (no distorsiona puntualidad)
    const deviationMinutes = isCancelled ? 0 : flownMinutes - scheduledMinutes;
    let status = 'ON_TIME';
    if (isCancelled) {
      status = 'CANCELLED';
    } else if (deviationMinutes > 5) {
      status = 'DELAYED';
    } else if (deviationMinutes < -5) {
      status = 'EARLY';
    }

    let studentName = matchedLegs[0]?.studentName || booking.studentName || '';
    let studentCode = matchedLegs[0]?.studentCode || booking.studentCode || '';
    let instructorName = matchedLegs[0]?.instructorName || booking.instructorName || '';
    let instructorCode = matchedLegs[0]?.instructorCode || booking.instructorCode || '';
    let pilotName = matchedLegs[0]?.pilotName || booking.pilotName || '';
    let pilotCode = matchedLegs[0]?.pilotCode || booking.pilotCode || '';

    // Auto-completar indicativo de alumno desde catálogo o nombre si falta
    if (studentCode && !studentName) {
      const stu = findStudentByCode(studentCode);
      if (stu) studentName = stu.name;
    } else if (studentName && !studentCode) {
      const stu = findStudentByName(studentName);
      if (stu) studentCode = stu.code;
    }

    // Auto-completar indicativo de instructor desde catálogo o nombre si falta
    if (instructorCode && !instructorName) {
      const inst = findInstructorByCode(instructorCode);
      if (inst) instructorName = inst.name;
    } else if (instructorName && !instructorCode) {
      const inst = findInstructorByName(instructorName);
      if (inst) instructorCode = inst.code;
    } else if (!instructorName && !instructorCode && pilotName) {
      const inst = findInstructorByName(pilotName) || findInstructorByCode(pilotCode);
      if (inst) {
        instructorName = inst.name;
        instructorCode = inst.code;
      }
    }

    const route =
      matchedLegs.length > 0
        ? matchedLegs
            .map((l, i) => (i === 0 ? `${l.departure} -> ${l.arrival}` : `-> ${l.arrival}`))
            .join(' ')
        : 'N/A';

    const flightDateBegin = booking.dateBegin || matchedLegs[0]?.date || matchedLegs[0]?.start;
    const flightDateEnd = booking.dateEnd || matchedLegs[0]?.end;

    results.push({
      bookingId: booking.bookingId,
      flightNumber: booking.flightNumber || matchedLegs[0]?.flightNumber || 'N/A',
      registration: booking.registration,
      flightType: booking.flightType || matchedLegs[0]?.flightType || 'Instruction',
      studentName,
      studentCode,
      instructorName,
      instructorCode,
      pilotName,
      pilotCode,
      route,
      legsCount: matchedLegs.length,
      legs: matchedLegs,
      dateBegin: flightDateBegin,
      dateEnd: flightDateEnd,
      scheduledMinutes,
      scheduledHoursFormatted: formatMinutesToHhMm(scheduledMinutes),
      scheduledHoursDecimal: minutesToDecimalHours(scheduledMinutes),
      flownMinutes,
      flownHoursFormatted: formatMinutesToHhMm(flownMinutes),
      flownHoursDecimal: minutesToDecimalHours(flownMinutes),
      deviationMinutes,
      deviationHoursFormatted: `${deviationMinutes > 0 ? '+' : ''}${formatMinutesToHhMm(deviationMinutes)}`,
      deviationHoursDecimal: minutesToDecimalHours(deviationMinutes),
      status,
      isCancelled,
      cancellationReason: isCancelled ? (booking.cancellationReason || booking.comments || '') : '',
      cancelledMinutes: isCancelled ? scheduledMinutes : 0,
      cancelledHoursFormatted: isCancelled ? formatMinutesToHhMm(scheduledMinutes) : '00:00',
      lessons: booking.lessons || matchedLegs[0]?.lessons || '',
      comments: booking.comments || ''
    });
  }

  // Incluir SIEMPRE todos los vuelos realizados (del Excel de Horas Voladas)
  // aunque no hayan casado inicialmente con una reserva programada:
  for (const f of flights) {
    if (assignedFlights.has(f)) continue;

    const flownMinutes = f.blockMinutes || 0;
    const flightDateBegin = f.date || f.start;
    const flightDateEnd = f.end;
    const route = (f.departure && f.arrival)
      ? `${f.departure} -> ${f.arrival}`
      : (f.departure || f.arrival || 'Local');

    if (f.studentCode || f.studentName) registerStudentInCatalog(f.studentCode, f.studentName, false);
    if (f.instructorCode || f.instructorName) registerInstructorInCatalog(f.instructorCode, f.instructorName, false);

    results.push({
      bookingId: null,
      flightNumber: f.flightNumber || 'S/N',
      registration: f.registration || 'EC-???',
      flightType: f.flightType || 'Instruction',
      studentName: f.studentName || '',
      studentCode: f.studentCode || '',
      instructorName: f.instructorName || '',
      instructorCode: f.instructorCode || '',
      pilotName: f.pilotName || f.studentName || '',
      pilotCode: f.pilotCode || f.studentCode || '',
      route,
      legsCount: 1,
      legs: [f],
      dateBegin: flightDateBegin,
      dateEnd: flightDateEnd,
      scheduledMinutes: 0,
      scheduledHoursFormatted: '00:00',
      scheduledHoursDecimal: 0,
      flownMinutes,
      flownHoursFormatted: formatMinutesToHhMm(flownMinutes),
      flownHoursDecimal: minutesToDecimalHours(flownMinutes),
      deviationMinutes: 0,
      deviationHoursFormatted: '00:00',
      deviationHoursDecimal: 0,
      status: 'ON_TIME',
      isCancelled: false,
      cancelledMinutes: 0,
      cancelledHoursFormatted: '00:00',
      lessons: f.lessons || '',
      comments: 'Vuelo realizado (sin reserva asignada)'
    });
  }

  return results;
}

// =========================================================
// GESTION DE ALMACENAMIENTO LOCAL (LOCALSTORAGE)
// =========================================================

const STORAGE_KEY = 'blue_team_flight_reports_v1';

function getLocalReportsList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function syncReportsToDisk(list) {
  try {
    await fetch('/api/vuelos/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    });
  } catch (err) {
    console.warn('Persistencia en disco diferida (modo offline):', err);
  }
}

function saveLocalReport(report) {
  try {
    const list = getLocalReportsList();
    const dateKey = normalizeDateStr(report.report_date);
    const existingIdx = list.findIndex(r => normalizeDateStr(r.report_date) === dateKey);

    const recordToSave = {
      report_date: dateKey,
      total_flights: report.matched?.length || report.total_flights || 0,
      records: report.matched || report.records || [],
      kpis: report.kpis,
      studentStats: report.studentStats,
      instructorStats: report.instructorStats,
      pairStats: report.pairStats,
      saved_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      list[existingIdx] = recordToSave;
    } else {
      list.unshift(recordToSave);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    syncReportsToDisk(list);
    return true;
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
    return false;
  }
}

function computeCumulativeHistory() {
  const list = getLocalReportsList();
  const instMap = new Map();
  const studMap = new Map();

  for (const report of list) {
    const records = report.records || [];
    for (const f of records) {
      if (f.isCancelled || f.status === 'CANCELLED') continue;

      // Instructor
      const iName = f.instructorName || f.pilotName;
      const iCode = f.instructorCode || f.pilotCode;
      if (iName || iCode) {
        const key = iName || iCode;
        if (!instMap.has(key)) {
          instMap.set(key, { instructor_name: iName || '', instructor_code: iCode || '', flights_count: 0, total_deviation_min: 0 });
        }
        const item = instMap.get(key);
        item.flights_count++;
        item.total_deviation_min += f.deviationMinutes || 0;
        if (!item.instructor_code && iCode) item.instructor_code = iCode;
      }

      // Alumno
      if (f.studentName || f.studentCode) {
        const key = f.studentName || f.studentCode;
        if (!studMap.has(key)) {
          studMap.set(key, { student_name: f.studentName || '', student_code: f.studentCode || '', flights_count: 0, total_deviation_min: 0 });
        }
        const item = studMap.get(key);
        item.flights_count++;
        item.total_deviation_min += f.deviationMinutes || 0;
        if (!item.student_code && f.studentCode) item.student_code = f.studentCode;
      }
    }
  }

  const instructors = Array.from(instMap.values()).map(i => ({
    ...i,
    total_deviation_formatted: `${i.total_deviation_min > 0 ? '+' : ''}${formatMinutesToHhMm(i.total_deviation_min)}`
  }));

  const students = Array.from(studMap.values()).map(s => ({
    ...s,
    total_deviation_formatted: `${s.total_deviation_min > 0 ? '+' : ''}${formatMinutesToHhMm(s.total_deviation_min)}`
  }));

  return { instructors, students };
}

// =========================================================
// CONTROLADORES DE EVENTOS Y VISTA
// =========================================================

function sortDataList(list, config) {
  if (!config?.key || !list) return list || [];
  return [...list].sort((a, b) => {
    let valA = a[config.key];
    let valB = b[config.key];
    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    let res = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      res = valA - valB;
    } else {
      res = String(valA).localeCompare(String(valB), 'es', { numeric: true, sensitivity: 'base' });
    }
    return config.direction === 'desc' ? -res : res;
  });
}

function handleVuelosSort(tableKey, columnKey) {
  const curr = vuelosState.sortConfig[tableKey];
  if (curr?.key === columnKey) {
    curr.direction = curr.direction === 'asc' ? 'desc' : 'asc';
  } else {
    const isNum = columnKey.toLowerCase().includes('min') || columnKey.toLowerCase().includes('count') || columnKey.toLowerCase().includes('sched') || columnKey.toLowerCase().includes('flown');
    vuelosState.sortConfig[tableKey] = { key: columnKey, direction: isNum ? 'desc' : 'asc' };
  }
  renderVuelosUI();
}

function setVuelosTab(tabId) {
  vuelosState.activeTab = tabId;
  renderVuelosUI();
}

function setVuelosStatusFilter(filter) {
  vuelosState.statusFilter = filter;
  renderVuelosUI();
}

function handleVuelosSearch(query) {
  vuelosState.searchQuery = query;
  renderVuelosUI();
}

function toggleVuelosDropzone() {
  vuelosState.showDropzone = !vuelosState.showDropzone;
  renderVuelosUI();
}

function loadVuelosReportForDate(dateKey) {
  if (!dateKey) return;
  clearFlightSelections();
  const list = getLocalReportsList();
  const found = list.find(r => normalizeDateStr(r.report_date) === normalizeDateStr(dateKey));
  if (found) {
    vuelosState.matchedFlights = found.records || [];
    vuelosState.kpis = calculateExecutiveKpis(vuelosState.matchedFlights);
    vuelosState.studentStats = aggregateByStudent(vuelosState.matchedFlights);
    vuelosState.instructorStats = aggregateByInstructor(vuelosState.matchedFlights);
    vuelosState.pairStats = aggregateByPair(vuelosState.matchedFlights);
    vuelosState.reportDate = found.report_date;
    vuelosState.cumulativeData = computeCumulativeHistory();
    renderVuelosUI();
  }
}

function toggleFlightVerification(flightIndex, isVerified) {
  const flight = vuelosState.matchedFlights[flightIndex];
  if (!flight) return;

  flight.verified = Boolean(isVerified);
  saveLocalReport({
    report_date: vuelosState.reportDate,
    matched: vuelosState.matchedFlights,
    kpis: vuelosState.kpis,
    studentStats: vuelosState.studentStats,
    instructorStats: vuelosState.instructorStats,
    pairStats: vuelosState.pairStats
  });
  vuelosState.savedReports = getLocalReportsList();
}

function recalculateAndPersistVuelos(notice = '') {
  vuelosState.kpis = calculateExecutiveKpis(vuelosState.matchedFlights);
  vuelosState.studentStats = aggregateByStudent(vuelosState.matchedFlights);
  vuelosState.instructorStats = aggregateByInstructor(vuelosState.matchedFlights);
  vuelosState.pairStats = aggregateByPair(vuelosState.matchedFlights);

  saveLocalReport({
    report_date: vuelosState.reportDate,
    matched: vuelosState.matchedFlights,
    kpis: vuelosState.kpis,
    studentStats: vuelosState.studentStats,
    instructorStats: vuelosState.instructorStats,
    pairStats: vuelosState.pairStats
  });

  vuelosState.savedReports = getLocalReportsList();
  vuelosState.cumulativeData = computeCumulativeHistory();

  if (notice) {
    vuelosState.saveNotice = notice;
    setTimeout(() => {
      vuelosState.saveNotice = '';
      renderVuelosUI();
    }, 4000);
  }
  renderVuelosUI();
}

let currentEditingFlightIndex = -1;

function openFlightEditModal(flightIndex) {
  currentEditingFlightIndex = (typeof flightIndex === 'number') ? flightIndex : -1;
  const isNew = currentEditingFlightIndex < 0 || currentEditingFlightIndex >= vuelosState.matchedFlights.length;
  const flight = !isNew ? vuelosState.matchedFlights[currentEditingFlightIndex] : null;

  const modal = document.getElementById('vuelos-flight-edit-modal');
  if (!modal) return;

  document.getElementById('modal-edit-title').textContent = isNew ? '➕ Añadir Nuevo Vuelo' : `✏️ Editar Vuelo #${flight.flightNumber || 'Sin número'}`;
  document.getElementById('edit-flight-num').value = flight?.flightNumber || '';
  document.getElementById('edit-registration').value = flight?.registration || 'EC-';
  document.getElementById('edit-route').value = flight?.route || 'GCXO -> GCXO';
  document.getElementById('edit-flight-type').value = flight?.flightType || 'Instruction';
  document.getElementById('edit-student-code').value = flight?.studentCode || '';
  document.getElementById('edit-student-name').value = flight?.studentName || '';
  document.getElementById('edit-instructor-code').value = flight?.instructorCode || '';
  document.getElementById('edit-instructor-name').value = flight?.instructorName || '';
  document.getElementById('edit-sched-time').value = flight?.scheduledHoursFormatted || '01:30';
  document.getElementById('edit-flown-time').value = flight?.isCancelled ? '00:00' : (flight?.flownHoursFormatted || '01:30');
  const isCancelled = Boolean(flight?.isCancelled);
  document.getElementById('edit-is-cancelled').checked = isCancelled;
  const reasonInput = document.getElementById('edit-cancellation-reason');
  const reasonSelect = document.getElementById('edit-cancellation-reason-select');
  const currentReason = flight?.cancellationReason || (isCancelled ? (flight?.comments || '') : '');
  if (reasonInput) {
    reasonInput.value = currentReason;
  }
  if (reasonSelect) {
    if (PREDEFINED_CANCELLATION_REASONS.includes(currentReason)) {
      reasonSelect.value = currentReason;
    } else if (currentReason) {
      reasonSelect.value = 'Otro';
    } else {
      reasonSelect.value = '';
    }
  }
  const reasonContainer = document.getElementById('edit-cancellation-reason-container');
  if (reasonContainer) {
    reasonContainer.style.display = isCancelled ? 'block' : 'none';
  }
  document.getElementById('edit-lessons').value = flight?.lessons || '';
  document.getElementById('edit-comments').value = flight?.comments || '';

  const flownInput = document.getElementById('edit-flown-time');
  if (flownInput) {
    flownInput.disabled = Boolean(flight?.isCancelled);
    flownInput.style.opacity = flight?.isCancelled ? '0.5' : '1';
  }

  modal.style.display = 'flex';
}

function closeFlightEditModal() {
  const modal = document.getElementById('vuelos-flight-edit-modal');
  if (modal) modal.style.display = 'none';
  currentEditingFlightIndex = -1;
}

function handleCancellationReasonSelect(val) {
  const reasonInput = document.getElementById('edit-cancellation-reason');
  if (!reasonInput) return;
  if (!val || val === 'Otro') {
    if (val === 'Otro' && (!reasonInput.value || PREDEFINED_CANCELLATION_REASONS.includes(reasonInput.value))) {
      reasonInput.value = '';
    }
    reasonInput.focus();
  } else {
    reasonInput.value = val;
  }
}

function handleCancelledToggle(checkbox) {
  const flownInput = document.getElementById('edit-flown-time');
  if (flownInput) {
    flownInput.disabled = checkbox.checked;
    flownInput.style.opacity = checkbox.checked ? '0.5' : '1';
    if (checkbox.checked) flownInput.value = '00:00';
  }
  const reasonContainer = document.getElementById('edit-cancellation-reason-container');
  if (reasonContainer) {
    reasonContainer.style.display = checkbox.checked ? 'block' : 'none';
    if (checkbox.checked) {
      const reasonSelect = document.getElementById('edit-cancellation-reason-select');
      const reasonInput = document.getElementById('edit-cancellation-reason');
      if (reasonSelect && !reasonSelect.value) {
        reasonSelect.focus();
      } else if (reasonInput && !reasonInput.value) {
        reasonInput.focus();
      }
    }
  }
}

function saveFlightEditModal() {
  const flightNumber = (document.getElementById('edit-flight-num').value || '').trim();
  const registration = (document.getElementById('edit-registration').value || '').trim().toUpperCase();
  const route = (document.getElementById('edit-route').value || '').trim();
  const flightType = (document.getElementById('edit-flight-type').value || 'Instruction').trim();
  const studentCode = (document.getElementById('edit-student-code').value || '').trim().toUpperCase();
  const studentName = (document.getElementById('edit-student-name').value || '').trim();
  const instructorCode = (document.getElementById('edit-instructor-code').value || '').trim().toUpperCase();
  const instructorName = (document.getElementById('edit-instructor-name').value || '').trim();
  const schedStr = (document.getElementById('edit-sched-time').value || '').trim();
  const flownStr = (document.getElementById('edit-flown-time').value || '').trim();
  const isCancelled = document.getElementById('edit-is-cancelled').checked;
  const cancellationReason = isCancelled
    ? ((document.getElementById('edit-cancellation-reason')?.value || document.getElementById('edit-cancellation-reason-select')?.value || '').trim())
    : '';
  const lessons = (document.getElementById('edit-lessons').value || '').trim();
  let comments = (document.getElementById('edit-comments').value || '').trim();
  if (isCancelled && cancellationReason && (!comments || comments === 'Cancelado')) {
    comments = cancellationReason;
  }

  // Agregar al autocompletado si se introduce un alumno o instructor nuevo
  if (studentCode || studentName) {
    registerStudentInCatalog(studentCode, studentName);
  }
  if (instructorCode || instructorName) {
    registerInstructorInCatalog(instructorCode, instructorName);
  }

  if (!flightNumber && !registration) {
    alert('Por favor introduce al menos el número de vuelo o la matrícula.');
    return;
  }

  const schedMinutes = parseHhMmToMinutes(schedStr);
  const flownMinutes = isCancelled ? 0 : parseHhMmToMinutes(flownStr);
  const deviationMinutes = isCancelled ? 0 : flownMinutes - schedMinutes;

  let status = 'ON_TIME';
  if (isCancelled) {
    status = 'CANCELLED';
  } else if (deviationMinutes > 5) {
    status = 'DELAYED';
  } else if (deviationMinutes < -5) {
    status = 'EARLY';
  }

  const isNew = currentEditingFlightIndex < 0 || currentEditingFlightIndex >= vuelosState.matchedFlights.length;
  const existing = !isNew ? vuelosState.matchedFlights[currentEditingFlightIndex] : {};

  const updatedFlight = {
    ...existing,
    bookingId: existing.bookingId || ('manual-' + Date.now()),
    flightNumber: flightNumber || existing.flightNumber || 'S/N',
    registration: registration || existing.registration || 'EC-???',
    flightType,
    studentCode,
    studentName,
    instructorCode,
    instructorName,
    pilotCode: studentCode || instructorCode || existing.pilotCode || '',
    pilotName: studentName || instructorName || existing.pilotName || '',
    route: route || existing.route || 'GCXO -> GCXO',
    legsCount: existing.legsCount || 1,
    scheduledMinutes: schedMinutes,
    scheduledHoursFormatted: formatMinutesToHhMm(schedMinutes),
    scheduledHoursDecimal: minutesToDecimalHours(schedMinutes),
    flownMinutes,
    flownHoursFormatted: formatMinutesToHhMm(flownMinutes),
    flownHoursDecimal: minutesToDecimalHours(flownMinutes),
    deviationMinutes,
    deviationHoursFormatted: `${deviationMinutes > 0 ? '+' : ''}${formatMinutesToHhMm(deviationMinutes)}`,
    deviationHoursDecimal: minutesToDecimalHours(deviationMinutes),
    status,
    isCancelled,
    cancellationReason: isCancelled ? (cancellationReason || 'Cancelado') : '',
    cancelledMinutes: isCancelled ? schedMinutes : 0,
    cancelledHoursFormatted: isCancelled ? formatMinutesToHhMm(schedMinutes) : '00:00',
    lessons,
    comments,
    verified: existing.verified ?? true
  };

  if (isNew) {
    vuelosState.matchedFlights.push(updatedFlight);
  } else {
    vuelosState.matchedFlights[currentEditingFlightIndex] = updatedFlight;
  }

  closeFlightEditModal();
  recalculateAndPersistVuelos(isNew ? `Vuelo #${updatedFlight.flightNumber} añadido correctamente.` : `Vuelo #${updatedFlight.flightNumber} actualizado correctamente.`);
}

function deleteFlightByIndex(flightIndex) {
  if (flightIndex < 0 || flightIndex >= vuelosState.matchedFlights.length) return;
  const target = vuelosState.matchedFlights[flightIndex];
  const num = target?.flightNumber || 'este vuelo';
  if (!confirm(`¿Estás seguro de que deseas eliminar el vuelo #${num} del informe?`)) {
    return;
  }
  vuelosState.matchedFlights.splice(flightIndex, 1);
  recalculateAndPersistVuelos(`Vuelo #${num} eliminado del informe.`);
}

// =========================================================
// VINCULACION MANUAL DE VUELOS (MULTI-TRAMO / ESCALAS)
// =========================================================

const selectedFlightIndices = new Set();

function toggleFlightSelection(flightIndex, isSelected) {
  if (isSelected) {
    selectedFlightIndices.add(flightIndex);
  } else {
    selectedFlightIndices.delete(flightIndex);
  }
  updateLinkButtonVisibility();
}

function toggleSelectAllFlights(selectAll) {
  selectedFlightIndices.clear();
  if (selectAll && vuelosState.matchedFlights) {
    vuelosState.matchedFlights.forEach((_, idx) => selectedFlightIndices.add(idx));
  }
  updateLinkButtonVisibility();
  const checkboxes = document.querySelectorAll('.flight-select-cb');
  checkboxes.forEach(cb => cb.checked = selectAll);
}

function updateLinkButtonVisibility() {
  const btn = document.getElementById('btn-link-selected-flights');
  if (btn) {
    if (selectedFlightIndices.size >= 2) {
      btn.style.display = 'inline-flex';
      btn.innerHTML = `<span>🔗</span><span>Vincular (${selectedFlightIndices.size}) Vuelos</span>`;
    } else {
      btn.style.display = 'none';
    }
  }
}

function clearFlightSelections() {
  selectedFlightIndices.clear();
  updateLinkButtonVisibility();
  const checkboxes = document.querySelectorAll('.flight-select-cb');
  checkboxes.forEach(cb => cb.checked = false);
}

function openLinkFlightsModal() {
  if (selectedFlightIndices.size < 2) {
    alert('Por favor selecciona al menos 2 vuelos para vincularlos.');
    return;
  }
  const modal = document.getElementById('vuelos-link-modal');
  if (!modal) return;

  const indices = Array.from(selectedFlightIndices).sort((a, b) => a - b);
  const selectedFlights = indices.map(idx => vuelosState.matchedFlights[idx]).filter(Boolean);

  let totalFlownMin = 0;
  let suggestedSchedMin = 0;
  const listEl = document.getElementById('link-modal-flights-list');
  listEl.innerHTML = selectedFlights.map((f) => {
    totalFlownMin += (f.flownMinutes || 0);
    if (!suggestedSchedMin && f.scheduledMinutes > 0) suggestedSchedMin = f.scheduledMinutes;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #1e293b; border-radius: 6px; font-size: 13px;">
        <span style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--primary, #38bdf8);">${f.registration} #${f.flightNumber}</span>
        <span style="color: var(--text-muted); font-size: 12px;">${f.route}</span>
        <span style="font-weight: 700; color: #10b981;">Bloque: ${f.flownHoursFormatted}</span>
      </div>
    `;
  }).join('');

  if (suggestedSchedMin === 0) suggestedSchedMin = totalFlownMin;

  document.getElementById('link-modal-total-flown').textContent = formatMinutesToHhMm(totalFlownMin) + ' h';
  const schedInput = document.getElementById('link-modal-sched-input');
  schedInput.value = formatMinutesToHhMm(suggestedSchedMin);

  function updateLinkDiffPreview() {
    const sched = parseHhMmToMinutes(schedInput.value);
    const diff = totalFlownMin - sched;
    const diffEl = document.getElementById('link-modal-diff-preview');
    if (diffEl) {
      const isRed = sched > totalFlownMin;
      const isGreen = totalFlownMin > sched;
      diffEl.textContent = `${diff > 0 ? '+' : diff < 0 ? '-' : ''}${formatMinutesToHhMm(Math.abs(diff))} h`;
      diffEl.style.color = isRed ? '#f43f5e' : isGreen ? '#10b981' : '#38bdf8';
    }
  }

  schedInput.oninput = updateLinkDiffPreview;
  updateLinkDiffPreview();

  modal.style.display = 'flex';
}

function closeLinkFlightsModal() {
  const modal = document.getElementById('vuelos-link-modal');
  if (modal) modal.style.display = 'none';
}

function confirmLinkFlights() {
  if (selectedFlightIndices.size < 2) return;
  const indices = Array.from(selectedFlightIndices).sort((a, b) => a - b);
  const schedStr = document.getElementById('link-modal-sched-input').value;
  const schedMinutes = parseHhMmToMinutes(schedStr);

  const groupId = 'grp-' + Date.now();
  let totalFlownMin = 0;

  for (const idx of indices) {
    const f = vuelosState.matchedFlights[idx];
    if (f) totalFlownMin += (f.flownMinutes || 0);
  }

  const groupDiffMin = totalFlownMin - schedMinutes;
  let groupStatus = 'ON_TIME';
  if (groupDiffMin > 5) groupStatus = 'DELAYED';
  else if (groupDiffMin < -5) groupStatus = 'EARLY';

  // Determinar como líder el vuelo con reserva programada formal o el primero
  let leadIdx = indices.find(idx => {
    const f = vuelosState.matchedFlights[idx];
    return f && f.bookingId && !String(f.bookingId).startsWith('manual-');
  });
  if (leadIdx === undefined) leadIdx = indices[0];

  indices.forEach((idx) => {
    const f = vuelosState.matchedFlights[idx];
    if (f) {
      const isLead = (idx === leadIdx);
      f.linkedGroupId = groupId;
      f.linkedGroupTotalScheduledMinutes = schedMinutes;
      f.linkedGroupTotalFlownMinutes = totalFlownMin;
      f.linkedGroupDeviationMinutes = groupDiffMin;
      f.linkedGroupStatus = groupStatus;
      f.isLinkedLead = isLead;
      f.isLinkedFollower = !isLead;

      if (isLead) {
        f.scheduledMinutes = schedMinutes;
        f.scheduledHoursFormatted = formatMinutesToHhMm(schedMinutes);
        f.scheduledHoursDecimal = minutesToDecimalHours(schedMinutes);
        f.deviationMinutes = groupDiffMin;
        f.deviationHoursFormatted = `${groupDiffMin > 0 ? '+' : ''}${formatMinutesToHhMm(groupDiffMin)}`;
        f.status = groupStatus;
      } else {
        // En tramos adicionales del grupo, tiempo programado a 0 para que no duplique en sumatorios globales
        f.scheduledMinutes = 0;
        f.scheduledHoursFormatted = '00:00';
        f.scheduledHoursDecimal = 0;
        f.deviationMinutes = 0;
        f.deviationHoursFormatted = '00:00';
        f.status = groupStatus;
      }
    }
  });

  closeLinkFlightsModal();
  clearFlightSelections();
  recalculateAndPersistVuelos(`Se vincularon ${indices.length} vuelos en un único bloque de ${formatMinutesToHhMm(schedMinutes)} h.`);
}

function unlinkFlights(groupId) {
  if (!groupId) return;
  if (!confirm('¿Deseas desvincular estos vuelos para que vuelvan a ser independientes?')) return;

  for (const f of vuelosState.matchedFlights) {
    if (f.linkedGroupId === groupId) {
      delete f.linkedGroupId;
      delete f.linkedGroupTotalScheduledMinutes;
      delete f.linkedGroupTotalFlownMinutes;
      delete f.linkedGroupDeviationMinutes;
      delete f.linkedGroupStatus;
      delete f.isLinkedLead;
      delete f.isLinkedFollower;

      const sched = f.scheduledMinutes || 0;
      const flown = f.flownMinutes || 0;
      const dev = f.isCancelled ? 0 : flown - sched;
      f.deviationMinutes = dev;
      f.deviationHoursFormatted = `${dev > 0 ? '+' : ''}${formatMinutesToHhMm(dev)}`;
      f.status = f.isCancelled ? 'CANCELLED' : (dev > 5 ? 'DELAYED' : (dev < -5 ? 'EARLY' : 'ON_TIME'));
    }
  }

  clearFlightSelections();
  recalculateAndPersistVuelos('Vuelos desvinculados correctamente.');
}

function navigateVuelosDay(delta) {
  const list = vuelosState.savedReports;
  if (!list || list.length === 0) return;
  const currentIdx = list.findIndex(r => normalizeDateStr(r.report_date) === normalizeDateStr(vuelosState.reportDate));
  const nextIdx = currentIdx + delta;
  if (nextIdx >= 0 && nextIdx < list.length) {
    loadVuelosReportForDate(list[nextIdx].report_date);
  }
}

function loadSampleData2809() {
  vuelosState.matchedFlights = SEED_FLIGHTS_2809;
  vuelosState.kpis = calculateExecutiveKpis(SEED_FLIGHTS_2809);
  vuelosState.studentStats = aggregateByStudent(SEED_FLIGHTS_2809);
  vuelosState.instructorStats = aggregateByInstructor(SEED_FLIGHTS_2809);
  vuelosState.pairStats = aggregateByPair(SEED_FLIGHTS_2809);
  vuelosState.reportDate = '28-09-2026';
  vuelosState.showDropzone = false;

  saveLocalReport({
    report_date: '28-09-2026',
    matched: SEED_FLIGHTS_2809,
    kpis: vuelosState.kpis,
    studentStats: vuelosState.studentStats,
    instructorStats: vuelosState.instructorStats,
    pairStats: vuelosState.pairStats
  });

  vuelosState.savedReports = getLocalReportsList();
  vuelosState.cumulativeData = computeCumulativeHistory();
  vuelosState.saveNotice = 'Datos de muestra del 28/09/2026 cargados con éxito.';
  renderVuelosUI();
  setTimeout(() => { vuelosState.saveNotice = ''; renderVuelosUI(); }, 4000);
}

// Procesa los 2 archivos Excel seleccionados por el usuario
async function processUploadedExcels(progBuffer, volBuffer) {
  vuelosState.isProcessing = true;
  renderVuelosUI();

  try {
    const bookings = parseProgramadoExcel(progBuffer);
    const flights = parseVoladoExcel(volBuffer);
    const matched = matchFlightsAndCalculateDeviations(bookings, flights);

    if (!matched || matched.length === 0) {
      throw new Error('No se encontraron vuelos válidos en los archivos.');
    }

    // Agrupar por día calendario
    const daysMap = new Map();
    for (const f of matched) {
      const flightDate = f.dateBegin || f.legs?.[0]?.date || f.legs?.[0]?.start;
      const dStr = formatDateToDdMmYyyy(flightDate);
      const key = normalizeDateStr(dStr);
      if (!daysMap.has(key)) {
        daysMap.set(key, { dateStr: dStr, dateKey: key, flights: [] });
      }
      daysMap.get(key).flights.push(f);
    }

    // Guardar cada dia como informe independiente
    const sortedEntries = Array.from(daysMap.values()).sort(
      (a, b) => parseDateStrToTimestamp(b.dateKey) - parseDateStrToTimestamp(a.dateKey)
    );

    for (const entry of sortedEntries) {
      const dayMatched = entry.flights;
      saveLocalReport({
        report_date: entry.dateKey,
        matched: dayMatched,
        kpis: calculateExecutiveKpis(dayMatched),
        studentStats: aggregateByStudent(dayMatched),
        instructorStats: aggregateByInstructor(dayMatched),
        pairStats: aggregateByPair(dayMatched)
      });
    }

    // Cargar el dia mas reciente
    const latest = sortedEntries[0];
    vuelosState.matchedFlights = latest.flights;
    vuelosState.kpis = calculateExecutiveKpis(latest.flights);
    vuelosState.studentStats = aggregateByStudent(latest.flights);
    vuelosState.instructorStats = aggregateByInstructor(latest.flights);
    vuelosState.pairStats = aggregateByPair(latest.flights);
    vuelosState.reportDate = latest.dateKey;
    vuelosState.showDropzone = false;
    vuelosState.savedReports = getLocalReportsList();
    vuelosState.cumulativeData = computeCumulativeHistory();

    vuelosState.saveNotice = `¡Procesados con éxito ${matched.length} vuelos en ${sortedEntries.length} jornada(s)!`;
    setTimeout(() => { vuelosState.saveNotice = ''; renderVuelosUI(); }, 4000);
  } catch (err) {
    alert(`Error al procesar Excels: ${err.message}`);
  } finally {
    vuelosState.isProcessing = false;
    renderVuelosUI();
  }
}

// =========================================================
// EXPORTACION: EXCEL (.XLSX) Y PDF DIARIO
// =========================================================

function showVuelosExportFeedback(format, filename, destination = 'Revisa Descargas.') {
  vuelosState.saveNotice = `${format} generado: ${filename}. ${destination}`;
  renderVuelosUI();
  setTimeout(() => {
    vuelosState.saveNotice = '';
    renderVuelosUI();
  }, 5000);
}

async function saveVuelosExcelToDesktop(excelBytes, filename) {
  const response = await fetch('/api/vuelos/guardar_excel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'X-Filename': encodeURIComponent(filename)
    },
    body: excelBytes
  });
  const contentType = response.headers?.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    if (response.status === 404) {
      throw new Error('El servidor de la aplicación aún no tiene el guardado de Excel. Cierra y reinicia la aplicación completa.');
    }
    throw new Error(`El servidor respondió con un formato inesperado (${response.status}).`);
  }
  const result = await response.json();
  if (!response.ok || result.status !== 'ok') {
    throw new Error(result.error || `El servidor no pudo guardar el Excel (${response.status})`);
  }
  return result;
}

async function exportVuelosExcel() {
  if (!vuelosState.matchedFlights || vuelosState.matchedFlights.length === 0) {
    alert('No hay vuelos cargados para exportar.');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('La librería SheetJS no está disponible.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const kpis = vuelosState.kpis || {};
  const wsResumenData = [
    ['BLUE TEAM FLIGHT SCHOOL - INFORME DIARIO DE DESVIACIÓN DE VUELOS'],
    ['Fecha Operativa:', vuelosState.reportDate],
    ['Generado el:', new Date().toLocaleString('es-ES')],
    [],
    ['MÉTRICA EJECUTIVA', 'VALOR'],
    ['Vuelos Analizados (Programados)', kpis.totalFlights],
    ['Vuelos Volados Efectivos', kpis.executedFlightsCount],
    ['Vuelos Cancelados', kpis.cancelledFlightsCount],
    ['Horas Programadas (Ejecutadas)', kpis.totalScheduledHoursFormatted + ' h'],
    ['Horas Voladas (Bloque)', kpis.totalFlownHoursFormatted + ' h'],
    ['Desviación Total (suma absoluta)', kpis.totalAbsoluteDeviationHoursFormatted + ' h'],
    ['Balance Neto (Bloque)', kpis.netDeviationHoursFormatted + ' h'],
    ['Horas Canceladas', (kpis.totalCancelledHoursFormatted || '00:00') + ' h'],
    ['Tasa de Cancelación', (kpis.cancellationRate || 0) + ' %']
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(wsResumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // Hoja 2: Detalle de Vuelos
  const wsVuelosData = [
    ['Vuelo #', 'Matrícula', 'Alumno Cod', 'Alumno Nombre', 'Instructor Cod', 'Instructor Nombre', 'Información', 'Programado', 'Bloque', 'Desviación', 'Estado', 'Lección', 'Comentarios / Motivo']
  ];
  for (const f of vuelosState.matchedFlights) {
    wsVuelosData.push([
      f.flightNumber,
      f.registration,
      f.studentCode || '',
      f.studentName || '',
      f.instructorCode || '',
      f.instructorName || '',
      formatFlightInfoCell(f),
      f.scheduledHoursFormatted,
      f.isCancelled ? '—' : f.flownHoursFormatted,
      f.isCancelled ? '—' : f.deviationHoursFormatted,
      f.isCancelled ? 'CANCELADO' : f.status,
      f.lessons || '',
      f.isCancelled ? formatFlightInfoCell(f) : (f.comments || '')
    ]);
  }
  const wsVuelos = XLSX.utils.aoa_to_sheet(wsVuelosData);
  XLSX.utils.book_append_sheet(wb, wsVuelos, 'Vuelos');

  // Hoja 3: Cancelaciones
  const wsCanceladosData = [
    ['Vuelo #', 'Matrícula', 'Alumno Cod', 'Alumno Nombre', 'Instructor Cod', 'Instructor Nombre', 'Horas Canceladas', 'Lección', 'Motivo de Cancelación']
  ];
  const cancelados = vuelosState.matchedFlights.filter(f => f.isCancelled || f.status === 'CANCELLED');
  for (const c of cancelados) {
    wsCanceladosData.push([
      c.flightNumber,
      c.registration,
      c.studentCode || '',
      c.studentName || '',
      c.instructorCode || '',
      c.instructorName || '',
      c.scheduledHoursFormatted,
      c.lessons || '',
      formatFlightInfoCell(c)
    ]);
  }
  const wsCancelados = XLSX.utils.aoa_to_sheet(wsCanceladosData);
  XLSX.utils.book_append_sheet(wb, wsCancelados, 'Cancelaciones');

  // Guardar el Excel localmente y seleccionarlo en el Explorador de Windows.
  const filename = `Desviacion_Vuelos_${normalizeDateStr(vuelosState.reportDate)}.xlsx`;
  try {
    const excelBytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const result = await saveVuelosExcelToDesktop(excelBytes, filename);
    const destination = result.ubicacion === 'Descargas'
      ? (result.explorer_opened ? 'Guardado en Descargas y seleccionado en el Explorador.' : 'Guardado en Descargas; no se pudo abrir el Explorador.')
      : (result.explorer_opened ? 'Descargas no permitió guardarlo; quedó en Informes_Vuelos y está seleccionado en el Explorador.' : 'Descargas no permitió guardarlo; quedó en Informes_Vuelos dentro de la aplicación.');
    showVuelosExportFeedback('Excel', filename, destination);
  } catch (error) {
    console.error('No se pudo generar el Excel de vuelos.', error);
    alert(`No se pudo guardar el Excel: ${error?.message || error}`);
  }
}

async function saveVuelosPdfToDesktop(pdfBytes, filename) {
  const response = await fetch('/api/vuelos/guardar_pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Filename': encodeURIComponent(filename)
    },
    body: pdfBytes
  });
  const contentType = response.headers?.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    if (response.status === 404) {
      throw new Error('El servidor de la aplicación aún no tiene el guardado de PDF. Cierra y reinicia la aplicación completa.');
    }
    throw new Error(`El servidor respondió con un formato inesperado (${response.status}).`);
  }
  const result = await response.json();
  if (!response.ok || result.status !== 'ok') {
    throw new Error(result.error || `El servidor no pudo guardar el PDF (${response.status})`);
  }
  return result;
}

async function exportVuelosPdf() {
  if (!vuelosState.matchedFlights || vuelosState.matchedFlights.length === 0) {
    alert('No hay vuelos cargados para generar el informe PDF.');
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('La librería jsPDF no está disponible.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // 1. Header Banner
  doc.setFillColor(15, 36, 56);
  doc.rect(14, currentY, pageWidth - 28, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BLUE TEAM FLIGHT SCHOOL', 20, currentY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('INFORME DIARIO DE CONTROL DE DESVIACIÓN DE VUELOS Y CANCELACIONES', 20, currentY + 14);

  // Fecha en la esquina derecha del banner
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(vuelosState.reportDate, pageWidth - 20, currentY + 11, { align: 'right' });
  currentY += 24;

  // 2. Executive KPIs Box
  const kpis = vuelosState.kpis || {};
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'FD');

  const colWidth = (pageWidth - 28) / 5;
  const kpiItems = [
    { label: 'VUELOS', val: String(kpis.totalFlights || 0) },
    { label: 'PROGRAMADO', val: (kpis.totalScheduledHoursFormatted || '00:00') + ' h' },
    { label: 'VOLADO BLOQUE', val: (kpis.totalFlownHoursFormatted || '00:00') + ' h' },
    { label: 'DESV. TOTAL', val: (kpis.totalAbsoluteDeviationHoursFormatted || '00:00') + ' h', subval: `Balance neto ${kpis.netDeviationHoursFormatted || '00:00'} h`, color: [245, 158, 11] },
    { label: 'CANCELADOS', val: `${kpis.totalCancelledHoursFormatted || '00:00'} h (${kpis.cancelledFlightsCount || 0})`, color: [244, 63, 94] }
  ];

  kpiItems.forEach((item, idx) => {
    const x = 14 + idx * colWidth + colWidth / 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x, currentY + 7, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    if (item.color) {
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(item.val, x, currentY + 15, { align: 'center' });
    if (item.subval) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(item.subval, x, currentY + 19, { align: 'center' });
    }
  });

  currentY += 26;

  // 3. Tabla de Vuelos
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Detalle Operativo de Vuelos', 14, currentY);
  currentY += 3;

  const tableRows = vuelosState.matchedFlights.map(f => [
    f.flightNumber,
    f.registration,
    (f.studentCode ? `[${f.studentCode}] ` : '') + (f.studentName || '—'),
    (f.instructorCode ? `[${f.instructorCode}] ` : '') + (f.instructorName || '—'),
    formatFlightInfoCell(f),
    f.scheduledHoursFormatted,
    f.isCancelled ? '—' : f.flownHoursFormatted,
    f.isCancelled ? '—' : f.deviationHoursFormatted,
    f.isCancelled ? 'CANCELADO' : (f.status === 'ON_TIME' ? 'Puntual' : f.deviationHoursFormatted)
  ]);

  doc.autoTable({
    startY: currentY,
    head: [['Vuelo', 'Matr.', 'Alumno', 'Instructor', 'Información', 'Prog.', 'Bloque', 'Desv.', 'Estado']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center' },
      1: { halign: 'center' },
      4: { halign: 'left' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
      8: { halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: function (data) {
      if (data.section === 'body') {
        const rawRow = vuelosState.matchedFlights[data.row.index];
        if (rawRow?.isCancelled) {
          if (data.column.index === 8) {
            data.cell.styles.textColor = [244, 63, 94];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 4. Seccion Cancelaciones si existen
  const cancelados = vuelosState.matchedFlights.filter(f => f.isCancelled || f.status === 'CANCELLED');
  if (cancelados.length > 0 && currentY < 250) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(244, 63, 94);
    doc.text(`Vuelos Cancelados (${cancelados.length} reservas no ejecutadas)`, 14, currentY);
    currentY += 3;

    const cancelRows = cancelados.map(c => [
      c.flightNumber,
      c.registration,
      (c.studentCode ? `[${c.studentCode}] ` : '') + (c.studentName || '—'),
      (c.instructorCode ? `[${c.instructorCode}] ` : '') + (c.instructorName || '—'),
      c.scheduledHoursFormatted,
      formatFlightInfoCell(c)
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Vuelo', 'Matr.', 'Alumno', 'Instructor', 'Horas Canceladas', 'Motivo de Cancelación']],
      body: cancelRows,
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] }
    });
  }

  // Guardar el PDF localmente y seleccionarlo en el Explorador de Windows.
  const filename = `Informe_Desviacion_Bloque_${normalizeDateStr(vuelosState.reportDate)}.pdf`;
  try {
    const result = await saveVuelosPdfToDesktop(doc.output('arraybuffer'), filename);
    const destination = result.ubicacion === 'Descargas'
      ? (result.explorer_opened ? 'Guardado en Descargas y seleccionado en el Explorador.' : 'Guardado en Descargas; no se pudo abrir el Explorador.')
      : (result.explorer_opened ? 'Descargas no permitió guardarlo; quedó en Informes_Vuelos y está seleccionado en el Explorador.' : 'Descargas no permitió guardarlo; quedó en Informes_Vuelos dentro de la aplicación.');
    showVuelosExportFeedback('PDF', filename, destination);
  } catch (error) {
    console.error('No se pudo generar el PDF de vuelos.', error);
    alert(`No se pudo guardar el PDF: ${error?.message || error}`);
  }
}

// =========================================================
// EXPORTACION DE IMAGEN CON SOLO DIFERENCIAS (PARA EMAIL)
// =========================================================

async function saveVuelosImageToDesktop(imageBytes, filename) {
  const response = await fetch('/api/vuelos/guardar_imagen', {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      'X-Filename': encodeURIComponent(filename)
    },
    body: imageBytes
  });
  const contentType = response.headers?.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    if (response.status === 404) {
      throw new Error('El servidor de la aplicación aún no tiene el guardado de imágenes. Cierra y reinicia la aplicación.');
    }
    throw new Error(`El servidor respondió con un formato inesperado (${response.status}).`);
  }
  const result = await response.json();
  if (!response.ok || result.status !== 'ok') {
    throw new Error(result.error || `El servidor no pudo guardar la imagen (${response.status})`);
  }
  return result;
}

function getDifferencesFlightsForExport() {
  const items = [];
  const processedGroups = new Set();

  for (const f of vuelosState.matchedFlights) {
    if (f.isCancelled || f.status === 'CANCELLED') {
      items.push({
        isGroup: false,
        isCancelled: true,
        cancellationReason: f.cancellationReason || f.comments || '',
        flight: f,
        scheduledMinutes: f.scheduledMinutes || 0,
        flownMinutes: 0,
        deviationMinutes: -(f.scheduledMinutes || 0)
      });
      continue;
    }

    if (f.linkedGroupId) {
      if (processedGroups.has(f.linkedGroupId)) continue;
      processedGroups.add(f.linkedGroupId);

      const groupFlights = vuelosState.matchedFlights.filter(x => x.linkedGroupId === f.linkedGroupId);
      const totalFlownMin = groupFlights.reduce((sum, x) => sum + (x.flownMinutes || 0), 0);
      const totalSchedMin = f.linkedGroupTotalScheduledMinutes || groupFlights[0].scheduledMinutes || 0;
      const diffMin = totalFlownMin - totalSchedMin;

      if (Math.abs(diffMin) > 5) {
        items.push({
          isGroup: true,
          groupId: f.linkedGroupId,
          flights: groupFlights,
          scheduledMinutes: totalSchedMin,
          flownMinutes: totalFlownMin,
          deviationMinutes: diffMin
        });
      }
    } else {
      if (Math.abs(f.deviationMinutes || 0) > 5) {
        items.push({
          isGroup: false,
          flight: f,
          scheduledMinutes: f.scheduledMinutes || 0,
          flownMinutes: f.flownMinutes || 0,
          deviationMinutes: f.deviationMinutes || 0
        });
      }
    }
  }

  return items;
}

function renderDifferencesTableToCanvas(items) {
  const colWidths = {
    matricula: 90,
    ruta: 220,
    programado: 95,
    bloque: 85,
    diferencia: 95,
    instructor: 135,
    alumno: 145
  };
  const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0); // 865px
  const headerHeight = 42;
  const rowHeight = 36;
  const totalLegs = items.reduce((sum, it) => sum + (it.isGroup ? it.flights.length : 1), 0);
  const totalHeight = headerHeight + (totalLegs * rowHeight);

  const canvas = document.createElement('canvas');
  const dpr = 2; // High-DPI 2x Retina scale
  canvas.width = totalWidth * dpr;
  canvas.height = totalHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Fondo blanco puro
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Borde exterior
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, totalWidth, totalHeight);

  const cols = [
    { key: 'matricula', label: 'Matricula', width: colWidths.matricula, align: 'left' },
    { key: 'ruta', label: 'Información', width: colWidths.ruta, align: 'left' },
    { key: 'programado', label: 'Programado', width: colWidths.programado, align: 'center' },
    { key: 'bloque', label: 'Bloque', width: colWidths.bloque, align: 'center' },
    { key: 'diferencia', label: 'Diferencía', width: colWidths.diferencia, align: 'center' },
    { key: 'instructor', label: 'Instructor', width: colWidths.instructor, align: 'left' },
    { key: 'alumno', label: 'Alumno', width: colWidths.alumno, align: 'left' }
  ];

  let curX = 0;
  const colMap = {};
  cols.forEach(c => {
    c.x = curX;
    colMap[c.key] = c;
    curX += c.width;
  });

  // Cabecera
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';

  cols.forEach(c => {
    const textX = c.align === 'center' ? c.x + c.width / 2 : c.x + 12;
    ctx.textAlign = c.align === 'center' ? 'center' : 'left';
    ctx.fillText(c.label, textX, headerHeight / 2);
    if (c.x + c.width < totalWidth) {
      ctx.beginPath();
      ctx.moveTo(c.x + c.width, 0);
      ctx.lineTo(c.x + c.width, headerHeight);
      ctx.stroke();
    }
  });

  // Línea horizontal bajo la cabecera
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(totalWidth, headerHeight);
  ctx.stroke();

  // Dibujar Filas de Datos
  let currentY = headerHeight;

  items.forEach(it => {
    if (!it.isGroup) {
      const f = it.flight;
      const isRed = it.isCancelled || it.scheduledMinutes > it.flownMinutes;
      const isGreen = !it.isCancelled && it.flownMinutes > it.scheduledMinutes;

      // Relleno celda Diferencia
      if (it.isCancelled) {
        ctx.fillStyle = '#fee2e2';
        ctx.fillRect(colMap.diferencia.x, currentY, colMap.diferencia.width, rowHeight);
      } else if (isRed || isGreen) {
        ctx.fillStyle = isRed ? '#fce8e6' : '#e6f4ea';
        ctx.fillRect(colMap.diferencia.x, currentY, colMap.diferencia.width, rowHeight);
      }

      ctx.fillStyle = '#000000';
      ctx.font = '13px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'middle';

      // Matricula
      ctx.textAlign = 'left';
      ctx.fillText(f.registration || '', colMap.matricula.x + 12, currentY + rowHeight / 2);

      // Información (Ruta o motivo de cancelación sin N/A ni paréntesis, ajustado a maxWidth)
      const infoText = formatFlightInfoCell(f);
      if (it.isCancelled) {
        ctx.fillStyle = '#b91c1c';
        ctx.font = '500 12px "Segoe UI", Arial, sans-serif';
      } else {
        ctx.fillStyle = '#000000';
        ctx.font = '13px "Segoe UI", Arial, sans-serif';
      }
      ctx.fillText(infoText, colMap.ruta.x + 12, currentY + rowHeight / 2, colMap.ruta.width - 24);
      ctx.fillStyle = '#000000';
      ctx.font = '13px "Segoe UI", Arial, sans-serif';

      // Programado
      ctx.textAlign = 'center';
      ctx.fillText(formatMinutesToH_Mm(it.scheduledMinutes), colMap.programado.x + colMap.programado.width / 2, currentY + rowHeight / 2);

      // Bloque
      ctx.fillText(it.isCancelled ? '—' : formatMinutesToH_Mm(it.flownMinutes), colMap.bloque.x + colMap.bloque.width / 2, currentY + rowHeight / 2);

      // Diferencia (sin signo, o CANCELADO)
      if (it.isCancelled) {
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
        ctx.fillText('CANCELADO', colMap.diferencia.x + colMap.diferencia.width / 2, currentY + rowHeight / 2);
      } else {
        ctx.fillText(formatMinutesToH_Mm(Math.abs(it.deviationMinutes)), colMap.diferencia.x + colMap.diferencia.width / 2, currentY + rowHeight / 2);
      }

      // Instructor
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formatInstructorCell(f), colMap.instructor.x + 12, currentY + rowHeight / 2, colMap.instructor.width - 24);

      // Alumno
      ctx.fillText(formatAlumnoCell(f), colMap.alumno.x + 12, currentY + rowHeight / 2, colMap.alumno.width - 24);

      // Lineas divisorias verticales para esta fila
      cols.forEach(c => {
        if (c.x + c.width < totalWidth) {
          ctx.beginPath();
          ctx.moveTo(c.x + c.width, currentY);
          ctx.lineTo(c.x + c.width, currentY + rowHeight);
          ctx.stroke();
        }
      });

      // Linea horizontal inferior
      ctx.beginPath();
      ctx.moveTo(0, currentY + rowHeight);
      ctx.lineTo(totalWidth, currentY + rowHeight);
      ctx.stroke();

      currentY += rowHeight;
    } else {
      // Vuelos agrupados/vinculados
      const legsCount = it.flights.length;
      const groupHeight = legsCount * rowHeight;
      const isRed = it.scheduledMinutes > it.flownMinutes;
      const isGreen = it.flownMinutes > it.scheduledMinutes;

      // Relleno celda Diferencia agrupada
      if (isRed || isGreen) {
        ctx.fillStyle = isRed ? '#fce8e6' : '#e6f4ea';
        ctx.fillRect(colMap.diferencia.x, currentY, colMap.diferencia.width, groupHeight);
      }

      const leadFlight = it.flights[0];
      const instFlight = it.flights.find(x => x.instructorCode || x.instructorName) || leadFlight;
      const alumFlight = it.flights.find(x => x.studentCode || x.studentName) || leadFlight;
      const instName = formatInstructorCell(instFlight);
      const alumName = formatAlumnoCell(alumFlight);

      it.flights.forEach((leg, idx) => {
        const legY = currentY + idx * rowHeight;
        ctx.fillStyle = '#000000';
        ctx.font = '13px "Segoe UI", Arial, sans-serif';
        ctx.textBaseline = 'middle';

        // Matricula
        ctx.textAlign = 'left';
        ctx.fillText(leg.registration || '', colMap.matricula.x + 12, legY + rowHeight / 2);

        // Información (Ruta del tramo)
        const infoText = formatFlightInfoCell(leg);
        ctx.fillText(infoText, colMap.ruta.x + 12, legY + rowHeight / 2, colMap.ruta.width - 24);

        // Bloque del tramo
        ctx.textAlign = 'center';
        ctx.fillText(formatMinutesToH_Mm(leg.flownMinutes), colMap.bloque.x + colMap.bloque.width / 2, legY + rowHeight / 2);

        // Lineas horizontales divisorias de tramos solo en matricula, ruta y bloque
        // (Instructor y Alumno permanecen unidos en una sola celda como Programado y Diferencia)
        if (idx < legsCount - 1) {
          ctx.beginPath();
          ctx.moveTo(0, legY + rowHeight);
          ctx.lineTo(colMap.ruta.x + colMap.ruta.width, legY + rowHeight);
          ctx.moveTo(colMap.bloque.x, legY + rowHeight);
          ctx.lineTo(colMap.bloque.x + colMap.bloque.width, legY + rowHeight);
          ctx.stroke();
        }
      });

      // Texto Celda Unificada Programado
      ctx.fillStyle = '#000000';
      ctx.font = '13px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatMinutesToH_Mm(it.scheduledMinutes), colMap.programado.x + colMap.programado.width / 2, currentY + groupHeight / 2);

      // Texto Celda Unificada Diferencia
      ctx.fillText(formatMinutesToH_Mm(Math.abs(it.deviationMinutes)), colMap.diferencia.x + colMap.diferencia.width / 2, currentY + groupHeight / 2);

      // Texto Celda Unificada Instructor y Alumno (unidos y centrados en el medio del bloque)
      ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(instName, colMap.instructor.x + 12, currentY + groupHeight / 2, colMap.instructor.width - 24);
      ctx.fillText(alumName, colMap.alumno.x + 12, currentY + groupHeight / 2, colMap.alumno.width - 24);

      // Lineas verticales continuas para todo el grupo
      cols.forEach(c => {
        if (c.x + c.width < totalWidth) {
          ctx.beginPath();
          ctx.moveTo(c.x + c.width, currentY);
          ctx.lineTo(c.x + c.width, currentY + groupHeight);
          ctx.stroke();
        }
      });

      // Linea horizontal al final del grupo
      ctx.beginPath();
      ctx.moveTo(0, currentY + groupHeight);
      ctx.lineTo(totalWidth, currentY + groupHeight);
      ctx.stroke();

      currentY += groupHeight;
    }
  });

  return canvas;
}

function toggleExportMenu(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const menu = document.getElementById('export-dropdown-menu');
  if (!menu) return;
  const isVisible = menu.style.display === 'block';
  menu.style.display = isVisible ? 'none' : 'block';
}

function handleExportOption(format) {
  const menu = document.getElementById('export-dropdown-menu');
  if (menu) menu.style.display = 'none';

  if (format === 'excel') {
    exportVuelosExcel();
  } else if (format === 'pdf') {
    exportVuelosPdf();
  } else if (format === 'image') {
    openDifferencesImageModal();
  }
}

function openDifferencesImageModal() {
  const items = getDifferencesFlightsForExport();
  if (items.length === 0) {
    alert('No hay vuelos con diferencia respecto a lo programado en esta jornada.');
    return;
  }

  const canvas = renderDifferencesTableToCanvas(items);
  currentDifferencesCanvas = canvas;

  const modal = document.getElementById('vuelos-image-modal');
  const imgPreview = document.getElementById('image-modal-preview');
  if (modal && imgPreview) {
    imgPreview.src = canvas.toDataURL('image/png');
    modal.style.display = 'flex';
  }
}

function closeDifferencesImageModal() {
  const modal = document.getElementById('vuelos-image-modal');
  if (modal) modal.style.display = 'none';
}

async function copyDifferencesImageToClipboard() {
  if (!currentDifferencesCanvas) return;
  currentDifferencesCanvas.toBlob(async (blob) => {
    if (!blob) {
      alert('No se pudo generar la imagen para el portapapeles.');
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      const alertNotice = document.getElementById('image-modal-copy-notice');
      if (alertNotice) {
        alertNotice.style.display = 'block';
        setTimeout(() => { alertNotice.style.display = 'none'; }, 4000);
      }
      showVuelosExportFeedback('Imagen', 'Copiada al portapapeles', '¡Lista para pegar en tu email con Ctrl+V!');
    } catch (err) {
      console.error('Error al escribir en portapapeles:', err);
      alert('Tu navegador no permitió la copia directa. Usa el botón "Guardar PNG" para guardarla en tu disco.');
    }
  }, 'image/png');
}

async function saveDifferencesImageFromModal() {
  if (!currentDifferencesCanvas) return;
  const filename = `Desviaciones_Email_${normalizeDateStr(vuelosState.reportDate)}.png`;
  currentDifferencesCanvas.toBlob(async (blob) => {
    if (!blob) return;
    try {
      const buffer = await blob.arrayBuffer();
      const result = await saveVuelosImageToDesktop(new Uint8Array(buffer), filename);
      const destination = result.ubicacion === 'Descargas'
        ? (result.explorer_opened ? 'Guardada en Descargas y seleccionada en el Explorador.' : 'Guardada en Descargas.')
        : (result.explorer_opened ? 'Guardada en Informes_Vuelos y seleccionada en el Explorador.' : 'Guardada en Informes_Vuelos.');
      showVuelosExportFeedback('Imagen', filename, destination);
      closeDifferencesImageModal();
    } catch (err) {
      alert(`No se pudo guardar la imagen: ${err.message || err}`);
    }
  }, 'image/png');
}

// =========================================================
// RENDERIZADO VISUAL DEL MODULO
// =========================================================

function renderVuelosUI() {
  const container = document.getElementById('view-vuelos');
  if (!container) return;

  const kpis = vuelosState.kpis || calculateExecutiveKpis(vuelosState.matchedFlights);
  const activeTab = vuelosState.activeTab;
  const statusFilter = vuelosState.statusFilter;
  const query = (vuelosState.searchQuery || '').toLowerCase();

  // Filtrado de vuelos
  const filteredFlights = vuelosState.matchedFlights.filter(f => {
    const matchesSearch =
      !query ||
      (f.studentName && f.studentName.toLowerCase().includes(query)) ||
      (f.studentCode && f.studentCode.toLowerCase().includes(query)) ||
      (f.instructorName && f.instructorName.toLowerCase().includes(query)) ||
      (f.instructorCode && f.instructorCode.toLowerCase().includes(query)) ||
      (f.registration && f.registration.toLowerCase().includes(query)) ||
      (f.flightNumber && f.flightNumber.includes(query));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ON_TIME' && f.status === 'ON_TIME') ||
      (statusFilter === 'DELAYED' && f.status === 'DELAYED') ||
      (statusFilter === 'EARLY' && f.status === 'EARLY') ||
      (statusFilter === 'CANCELLED' && (f.isCancelled || f.status === 'CANCELLED'));

    return matchesSearch && matchesStatus;
  });

  const sortedFlights = sortDataList(filteredFlights, vuelosState.sortConfig.flights);

  // Cancelados
  const cancelledFlightsList = vuelosState.matchedFlights.filter(f => f.isCancelled || f.status === 'CANCELLED');
  const filteredCancelled = cancelledFlightsList.filter(f => {
    if (!query) return true;
    return (
      (f.studentName && f.studentName.toLowerCase().includes(query)) ||
      (f.instructorName && f.instructorName.toLowerCase().includes(query)) ||
      (f.registration && f.registration.toLowerCase().includes(query)) ||
      (f.flightNumber && f.flightNumber.includes(query)) ||
      (f.comments && f.comments.toLowerCase().includes(query))
    );
  });
  const sortedCancelled = sortDataList(filteredCancelled, vuelosState.sortConfig.cancellations);

  const sortedPairs = sortDataList(vuelosState.pairStats, vuelosState.sortConfig.pairs);
  const sortedInstructors = sortDataList(vuelosState.instructorStats, vuelosState.sortConfig.instructors);
  const sortedStudents = sortDataList(vuelosState.studentStats, vuelosState.sortConfig.students);
  const sortedCumInstructors = sortDataList(vuelosState.cumulativeData.instructors, vuelosState.sortConfig.cumInstructors);
  const sortedCumStudents = sortDataList(vuelosState.cumulativeData.students, vuelosState.sortConfig.cumStudents);

  const currentNormalized = normalizeDateStr(vuelosState.reportDate);
  const currentIdx = vuelosState.savedReports.findIndex(r => normalizeDateStr(r.report_date) === currentNormalized);

  let html = `
    <!-- Cabecera del Modulo -->
    <header class="app-header">
      <div class="brand-area">
        <div class="logo-badge" style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: var(--primary);">✈️</div>
        <div>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <h1 class="brand-title" style="margin: 0;">Control de Desviación de Vuelos</h1>
            
            <!-- Selector de Fecha -->
            ${vuelosState.savedReports.length > 0 ? `
              <div class="vuelos-date-navigator">
                <button type="button" class="btn-date-nav" onclick="navigateVuelosDay(-1)" ${currentIdx <= 0 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Día anterior">◀</button>
                <select class="vuelos-date-select" onchange="loadVuelosReportForDate(this.value)">
                  ${vuelosState.savedReports.map(r => `
                    <option value="${r.report_date}" ${normalizeDateStr(r.report_date) === currentNormalized ? 'selected' : ''}>
                      📅 ${r.report_date} (${r.total_flights} vuelos)
                    </option>
                  `).join('')}
                </select>
                <button type="button" class="btn-date-nav" onclick="navigateVuelosDay(1)" ${currentIdx >= vuelosState.savedReports.length - 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Día siguiente">▶</button>
              </div>
            ` : `<span class="badge-tech badge-local">📅 ${vuelosState.reportDate}</span>`}
          </div>
          <p class="brand-subtitle">Auditoría 100% Local: Programación vs. Horas de Bloque Voladas (Private Radar)</p>
        </div>
      </div>

      <div class="header-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary" onclick="openFlightEditModal(-1)" style="background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4); color: #10b981;" title="Añadir un nuevo vuelo manualmente">
          <span>➕</span>
          <span>Añadir Vuelo</span>
        </button>
        <button type="button" id="btn-link-selected-flights" class="btn btn-secondary" onclick="openLinkFlightsModal()" style="display: none; background: rgba(56, 189, 248, 0.2); border-color: rgba(56, 189, 248, 0.5); color: #38bdf8; font-weight: 700;" title="Vincular vuelos seleccionados como tramos de un solo bloque">
          <span>🔗</span>
          <span>Vincular Vuelos</span>
        </button>
        <button type="button" class="btn btn-secondary" onclick="toggleVuelosDropzone()">
          <span>📁</span>
          <span>${vuelosState.showDropzone ? 'Cerrar Subida' : 'Cargar Excels'}</span>
        </button>

        <!-- Botón Exportar Unificado con menú desplegable -->
        <div class="export-dropdown-wrapper" style="position: relative; display: inline-block;">
          <button type="button" id="btn-export-dropdown" class="btn btn-primary" onclick="toggleExportMenu(event)" style="background: #0284c7; border-color: #0284c7; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;" title="Exportar informe en Excel, PDF o Imagen">
            <span>📤</span>
            <span>Exportar</span>
            <span style="font-size: 10px; margin-left: 2px;">▼</span>
          </button>
          <div id="export-dropdown-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 6px); background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; box-shadow: 0 12px 28px rgba(0, 0, 0, 0.65); z-index: 1000; min-width: 250px; overflow: hidden;">
            <div style="padding: 8px 12px 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              Formato de Exportación
            </div>
            <button type="button" class="export-menu-item" onclick="handleExportOption('excel')" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #f8fafc; text-align: left; cursor: pointer; font-size: 13px;">
              <span style="font-size: 18px;">📊</span>
              <div>
                <div style="font-weight: 600; color: #10b981;">Excel (.xlsx)</div>
                <div style="font-size: 11px; color: var(--text-muted);">Informe completo con hojas detalladas</div>
              </div>
            </button>
            <button type="button" class="export-menu-item" onclick="handleExportOption('pdf')" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #f8fafc; text-align: left; cursor: pointer; font-size: 13px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <span style="font-size: 18px;">📄</span>
              <div>
                <div style="font-weight: 600; color: #38bdf8;">PDF Diario (.pdf)</div>
                <div style="font-size: 11px; color: var(--text-muted);">Documento formal listo para firma</div>
              </div>
            </button>
            <button type="button" class="export-menu-item" onclick="handleExportOption('image')" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; background: transparent; border: none; color: #f8fafc; text-align: left; cursor: pointer; font-size: 13px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <span style="font-size: 18px;">📸</span>
              <div>
                <div style="font-weight: 600; color: #f59e0b;">Imagen para Email (.png)</div>
                <div style="font-size: 11px; color: var(--text-muted);">Tabla compacta de diferencias</div>
              </div>
            </button>
          </div>
        </div>
        <button type="button" class="btn btn-secondary" onclick="loadSampleData2809()" title="Cargar datos de muestra del 28/09/2026">
          <span>🔄</span>
          <span>Cargar Muestra (28/09)</span>
        </button>
      </div>
    </header>

    ${vuelosState.saveNotice ? `
      <div class="state-notice" style="border-color: #10b981; background: rgba(16, 185, 129, 0.15); color: #10b981;">
        ✅ <strong>${vuelosState.saveNotice}</strong>
      </div>
    ` : ''}

    <!-- Zona de Carga de Archivos (Colapsable) -->
    ${vuelosState.showDropzone || vuelosState.matchedFlights.length === 0 ? `
      <div class="vuelos-dropzone-card">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--text-main);">
          📥 Cargar Archivos de Private Radar (Día o Mes Completo)
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Selecciona ambos archivos descargados de Private Radar. Si contienen múltiples días, el sistema los agrupará automáticamente por jornada.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <!-- Dropzone Programado -->
          <label class="vuelos-file-box" for="input-excel-prog">
            <span style="font-size: 28px;">📑</span>
            <strong>1. Excel de Programación</strong>
            <span style="font-size: 12px; color: var(--text-muted);">Report_372_*.xlsx</span>
            <input type="file" id="input-excel-prog" accept=".xlsx, .xls" style="display: none;" onchange="handleProgFileSelect(this)">
            <span id="name-excel-prog" style="font-size: 12px; color: var(--primary); font-weight: 600;">${vuelosState.progFile ? vuelosState.progFile.name : 'Seleccionar archivo...'}</span>
          </label>

          <!-- Dropzone Volado -->
          <label class="vuelos-file-box" for="input-excel-vol">
            <span style="font-size: 28px;">✈️</span>
            <strong>2. Excel de Horas Voladas</strong>
            <span style="font-size: 12px; color: var(--text-muted);">Hours_372_*.xlsx</span>
            <input type="file" id="input-excel-vol" accept=".xlsx, .xls" style="display: none;" onchange="handleVolFileSelect(this)">
            <span id="name-excel-vol" style="font-size: 12px; color: var(--primary); font-weight: 600;">${vuelosState.volFile ? vuelosState.volFile.name : 'Seleccionar archivo...'}</span>
          </label>
        </div>

        ${vuelosState.isProcessing ? `
          <p style="color: var(--primary); font-weight: 600; text-align: center; margin-top: 14px;">
            ⏳ Procesando y calculando desviaciones...
          </p>
        ` : ''}
      </div>
    ` : ''}

    <!-- Panel de KPIs Ejecutivos -->
    <div class="vuelos-kpi-grid">
      <!-- 1. Vuelos -->
      <div class="vuelos-kpi-card">
        <div class="vuelos-kpi-icon" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">✈️</div>
        <div>
          <div class="vuelos-kpi-label">VUELOS ANALIZADOS</div>
          <div class="vuelos-kpi-val">${kpis.totalFlights}</div>
        </div>
      </div>

      <!-- 2. Programado -->
      <div class="vuelos-kpi-card">
        <div class="vuelos-kpi-icon" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">⏱️</div>
        <div>
          <div class="vuelos-kpi-label">HORAS PROGRAMADAS</div>
          <div class="vuelos-kpi-val">${kpis.totalScheduledHoursFormatted} h</div>
        </div>
      </div>

      <!-- 3. Volado -->
      <div class="vuelos-kpi-card">
        <div class="vuelos-kpi-icon" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">✅</div>
        <div>
          <div class="vuelos-kpi-label">HORAS VOLADAS (BLOQUE)</div>
          <div class="vuelos-kpi-val">${kpis.totalFlownHoursFormatted} h</div>
        </div>
      </div>

      <!-- 4. Desviacion Total -->
      <div class="vuelos-kpi-card">
        <div class="vuelos-kpi-icon" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">📈</div>
        <div>
          <div class="vuelos-kpi-label">DESVIACIÓN TOTAL</div>
          <div class="vuelos-kpi-val" style="color: #f59e0b;">
            ${kpis.totalAbsoluteDeviationHoursFormatted} h
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">Balance neto ${kpis.netDeviationHoursFormatted} h</div>
        </div>
      </div>

      <!-- 5. Cancelaciones -->
      <div class="vuelos-kpi-card" style="border: 1px solid ${kpis.cancelledFlightsCount > 0 ? 'rgba(244, 63, 94, 0.5)' : 'var(--border-color)'};">
        <div class="vuelos-kpi-icon" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e;">⚠️</div>
        <div>
          <div class="vuelos-kpi-label">CANCELACIONES</div>
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="vuelos-kpi-val" style="color: ${kpis.cancelledFlightsCount > 0 ? '#f43f5e' : 'inherit'};">
              ${kpis.cancelledFlightsCount || 0}
            </span>
            <span style="font-size: 12px; font-weight: 600; color: ${kpis.cancelledFlightsCount > 0 ? '#f43f5e' : 'var(--text-muted)'};">
              (${kpis.cancelledFlightsCount === 1 ? 'vuelo cancelado' : 'vuelos cancelados'})
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            ${kpis.cancelledFlightsCount > 0 ? `Tasa: ${kpis.cancellationRate || 0}% del total` : 'Sin cancelaciones'}
          </div>
        </div>
      </div>
    </div>

    <!-- Pestañas de Navegacion -->
    <div class="vuelos-tabs-bar">
      <button class="vuelos-tab ${activeTab === 'flights' ? 'active' : ''}" onclick="setVuelosTab('flights')">
        <span>✈️ Detalle de Vuelos</span>
        <span class="vuelos-tab-badge">${vuelosState.matchedFlights.length}</span>
      </button>
      <button class="vuelos-tab ${activeTab === 'cancellations' ? 'active' : ''}" onclick="setVuelosTab('cancellations')">
        <span>⚠️ Cancelaciones</span>
        <span class="vuelos-tab-badge" style="${kpis.cancelledFlightsCount > 0 ? 'background: #f43f5e; color: #fff;' : ''}">${kpis.cancelledFlightsCount || 0}</span>
      </button>
      <button class="vuelos-tab ${activeTab === 'pairs' ? 'active' : ''}" onclick="setVuelosTab('pairs')">
        <span>👥 Parejas Alumno + Instructor</span>
        <span class="vuelos-tab-badge">${vuelosState.pairStats.length}</span>
      </button>
      <button class="vuelos-tab ${activeTab === 'instructors' ? 'active' : ''}" onclick="setVuelosTab('instructors')">
        <span>🎖️ Por Instructor</span>
        <span class="vuelos-tab-badge">${vuelosState.instructorStats.length}</span>
      </button>
      <button class="vuelos-tab ${activeTab === 'students' ? 'active' : ''}" onclick="setVuelosTab('students')">
        <span>👨‍🎓 Por Alumno</span>
        <span class="vuelos-tab-badge">${vuelosState.studentStats.length}</span>
      </button>
      <button class="vuelos-tab ${activeTab === 'history' ? 'active' : ''}" onclick="setVuelosTab('history')">
        <span>📈 Histórico Acumulado</span>
      </button>
    </div>

    <!-- CONTENIDO TAB 1: DETALLE DE VUELOS -->
    ${activeTab === 'flights' ? `
      <div>
        <!-- Barra de Filtros y Busqueda -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap;">
          <input
            type="text"
            class="form-input"
            style="max-width: 320px; font-size: 13px;"
            placeholder="🔍 Buscar alumno, instructor, matrícula, vuelo..."
            value="${vuelosState.searchQuery}"
            oninput="handleVuelosSearch(this.value)"
          >

          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${[
              { id: 'ALL', label: 'Todos' },
              { id: 'ON_TIME', label: 'Puntuales (±5m)' },
              { id: 'DELAYED', label: 'Con Exceso (>5m)' },
              { id: 'EARLY', label: 'Adelantados' },
              { id: 'CANCELLED', label: 'Cancelados' }
            ].map(st => `
              <button
                type="button"
                class="btn btn-sm ${statusFilter === st.id ? (st.id === 'CANCELLED' ? 'btn-danger-chip' : 'btn-primary') : 'btn-secondary'}"
                onclick="setVuelosStatusFilter('${st.id}')"
                style="${statusFilter === st.id && st.id === 'CANCELLED' ? 'background: #f43f5e; color: #fff; border-color: #f43f5e;' : ''}"
              >
                ${st.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Tabla de Vuelos -->
        <div class="table-container" style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #0b1120; border-bottom: 1px solid var(--border-color);">
                <th style="padding: 10px 8px; text-align: center; width: 36px;">
                  <input type="checkbox" id="flight-select-all-cb" onchange="toggleSelectAllFlights(this.checked)" title="Seleccionar todos para vincular">
                </th>
                <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('flights', 'flightNumber')">Vuelo # ⬍</th>
                <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('flights', 'registration')">Matrícula ⬍</th>
                <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('flights', 'studentName')">Alumno ⬍</th>
                <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('flights', 'instructorName')">Instructor ⬍</th>
                <th style="padding: 10px 14px;">Información</th>
                <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('flights', 'scheduledMinutes')">Programado ⬍</th>
                <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('flights', 'flownMinutes')">Bloque ⬍</th>
                <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('flights', 'deviationMinutes')">Desviación ⬍</th>
                <th style="padding: 10px 14px; text-align: center;">Estado</th>
                <th style="padding: 10px 14px; text-align: center;">Verificado</th>
                <th style="padding: 10px 14px; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                // Mantener los tramos de cada grupo vinculados de forma contigua para permitir la fusión de celdas (rowspan)
                const displayFlights = [];
                const processedLinkedGroups = new Set();
                for (const flight of sortedFlights) {
                  if (flight.linkedGroupId) {
                    if (processedLinkedGroups.has(flight.linkedGroupId)) continue;
                    processedLinkedGroups.add(flight.linkedGroupId);
                    const members = sortedFlights.filter(x => x.linkedGroupId === flight.linkedGroupId);
                    displayFlights.push(...members);
                  } else {
                    displayFlights.push(flight);
                  }
                }

                return displayFlights.map(f => {
                  const flightIdx = vuelosState.matchedFlights.indexOf(f);
                  const isLinked = Boolean(f.linkedGroupId);
                  const groupMembers = isLinked ? displayFlights.filter(x => x.linkedGroupId === f.linkedGroupId) : [f];
                  const groupCount = groupMembers.length;
                  const isFirstInGroup = !isLinked || f === groupMembers[0];
                  const legIndex = isLinked ? groupMembers.indexOf(f) + 1 : 1;

                  const totalSched = isLinked ? (f.linkedGroupTotalScheduledMinutes ?? groupMembers[0].scheduledMinutes ?? 0) : f.scheduledMinutes;
                  const totalFlown = isLinked ? (f.linkedGroupTotalFlownMinutes ?? groupMembers.reduce((sum, x) => sum + (x.flownMinutes || 0), 0)) : f.flownMinutes;
                  const groupDiff = isLinked ? (f.linkedGroupDeviationMinutes ?? (totalFlown - totalSched)) : f.deviationMinutes;

                  let groupStatus = isLinked ? f.linkedGroupStatus : f.status;
                  if (isLinked && !groupStatus) {
                    if (groupDiff > 5) groupStatus = 'DELAYED';
                    else if (groupDiff < -5) groupStatus = 'EARLY';
                    else groupStatus = 'ON_TIME';
                  }

                  const rowBg = isLinked ? 'background: rgba(56, 189, 248, 0.02);' : '';
                  const isLastLegInGroup = !isLinked || (legIndex === groupCount);
                  const trBorder = isLinked && !isLastLegInGroup ? 'border-bottom: none;' : 'border-bottom: 1px solid var(--border-color);';
                  const cellBottomBorder = isLinked && !isLastLegInGroup ? 'border-bottom: 1px solid rgba(255, 255, 255, 0.06);' : 'border-bottom: 1px solid var(--border-color);';

                  return `
                  <tr style="${trBorder} ${rowBg}">
                    <td style="padding: 10px 8px; text-align: center; ${cellBottomBorder}">
                      <input type="checkbox" class="flight-select-cb" data-flight-select-index="${flightIdx}" ${selectedFlightIndices.has(flightIdx) ? 'checked' : ''} onchange="toggleFlightSelection(${flightIdx}, this.checked)" title="Seleccionar para vincular">
                    </td>
                    <td style="padding: 10px 14px; font-weight: 700; font-family: 'JetBrains Mono', monospace; ${cellBottomBorder}">
                      ${f.flightNumber}
                      ${isLinked ? `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 1px 5px; border-radius: 4px; font-size: 10px; margin-left: 4px; vertical-align: middle;" title="Tramo ${legIndex} de ${groupCount} en bloque unificado">🔗 Tramo ${legIndex}/${groupCount}</span>` : ''}
                    </td>
                    <td style="padding: 10px 14px; ${cellBottomBorder}">
                      <span style="background: var(--bg-input); padding: 2px 7px; border-radius: 4px; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${f.registration}</span>
                    </td>
                    <!-- Alumno: fusionado y centrado verticalmente si pertenece a un bloque vinculado -->
                    ${(!isLinked || isFirstInGroup) ? `
                      <td ${isLinked && groupCount > 1 ? `rowspan="${groupCount}"` : ''} style="padding: 10px 14px; text-align: center; vertical-align: middle; ${isLinked ? 'background: rgba(56, 189, 248, 0.03); border-left: 1px solid rgba(56, 189, 248, 0.15); border-right: 1px solid rgba(56, 189, 248, 0.15); border-top: 1px solid rgba(56, 189, 248, 0.15); border-bottom: 1px solid rgba(56, 189, 248, 0.15);' : cellBottomBorder}">
                        <div style="display: inline-flex; align-items: center; justify-content: center;">
                          ${renderPersonBadgeHtml(
                            f.studentCode || (isLinked ? (groupMembers.find(m => m.studentCode)?.studentCode || '') : ''),
                            f.studentName || (isLinked ? (groupMembers.find(m => m.studentName)?.studentName || '') : '')
                          )}
                        </div>
                      </td>
                    ` : ''}

                    <!-- Instructor: fusionado y centrado verticalmente si pertenece a un bloque vinculado -->
                    ${(!isLinked || isFirstInGroup) ? `
                      <td ${isLinked && groupCount > 1 ? `rowspan="${groupCount}"` : ''} style="padding: 10px 14px; text-align: center; vertical-align: middle; ${isLinked ? 'background: rgba(56, 189, 248, 0.03); border-left: 1px solid rgba(56, 189, 248, 0.15); border-right: 1px solid rgba(56, 189, 248, 0.15); border-top: 1px solid rgba(56, 189, 248, 0.15); border-bottom: 1px solid rgba(56, 189, 248, 0.15);' : cellBottomBorder}">
                        <div style="display: inline-flex; align-items: center; justify-content: center;">
                          ${renderPersonBadgeHtml(
                            f.instructorCode || (isLinked ? (groupMembers.find(m => m.instructorCode)?.instructorCode || '') : ''),
                            f.instructorName || (isLinked ? (groupMembers.find(m => m.instructorName)?.instructorName || '') : '')
                          )}
                        </div>
                      </td>
                    ` : ''}
                    <td style="padding: 10px 14px; min-width: 140px; max-width: 250px; line-height: 1.35; overflow-wrap: break-word; color: ${f.isCancelled ? '#f43f5e' : 'var(--text-muted)'}; ${cellBottomBorder}">
                      ${f.isCancelled ? `
                        <div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                          <span style="font-weight: 600; font-size: 12px;">${formatFlightInfoCell(f)}</span>
                        </div>
                      ` : `
                        <span>${formatFlightInfoCell(f)}${f.legsCount > 1 ? ` (${f.legsCount} tramos)` : ''}</span>
                      `}
                    </td>

                    <!-- Programado: fusionado si pertenece a un bloque vinculado -->
                    ${(!isLinked || isFirstInGroup) ? `
                      <td ${isLinked && groupCount > 1 ? `rowspan="${groupCount}"` : ''} style="padding: 10px 14px; text-align: center; vertical-align: middle; ${isLinked ? 'font-weight: 700; background: rgba(56, 189, 248, 0.06); border-left: 1px solid rgba(56, 189, 248, 0.25); border-right: 1px solid rgba(56, 189, 248, 0.25); border-top: 1px solid rgba(56, 189, 248, 0.25); border-bottom: 1px solid rgba(56, 189, 248, 0.25);' : 'border-bottom: 1px solid var(--border-color);'}">
                        <div style="${isLinked ? 'font-family: \'JetBrains Mono\', monospace; color: var(--primary, #38bdf8); font-size: 13px;' : ''}">${formatMinutesToHhMm(totalSched)}</div>
                        ${isLinked && groupCount > 1 ? `<div style="font-size: 10px; color: var(--text-muted); font-weight: 600; margin-top: 2px;">Bloque (${groupCount} tramos)</div>` : ''}
                      </td>
                    ` : ''}

                    <!-- Bloque Volado (por tramo individual) -->
                    <td style="padding: 10px 14px; text-align: center; font-weight: 600; ${cellBottomBorder}">${f.isCancelled ? '<span style="opacity:0.4;">—</span>' : f.flownHoursFormatted}</td>

                    <!-- Desviación: fusionada si pertenece a un bloque vinculado -->
                    ${(!isLinked || isFirstInGroup) ? `
                      <td ${isLinked && groupCount > 1 ? `rowspan="${groupCount}"` : ''} style="padding: 10px 14px; text-align: center; vertical-align: middle; font-weight: 700; color: ${f.isCancelled ? 'var(--text-muted)' : (groupDiff > 5 ? '#f59e0b' : groupDiff < -5 ? '#10b981' : 'inherit')}; ${isLinked ? 'background: rgba(56, 189, 248, 0.03); border-left: 1px solid rgba(56, 189, 248, 0.15); border-right: 1px solid rgba(56, 189, 248, 0.15); border-top: 1px solid rgba(56, 189, 248, 0.15); border-bottom: 1px solid rgba(56, 189, 248, 0.15);' : 'border-bottom: 1px solid var(--border-color);'}">
                        ${f.isCancelled ? '<span style="opacity:0.4;">—</span>' : `${groupDiff > 0 ? '+' : ''}${formatMinutesToHhMm(groupDiff)}`}
                      </td>
                    ` : ''}

                    <!-- Estado: fusionado si pertenece a un bloque vinculado -->
                    ${(!isLinked || isFirstInGroup) ? `
                      <td ${isLinked && groupCount > 1 ? `rowspan="${groupCount}"` : ''} style="padding: 10px 14px; text-align: center; vertical-align: middle; ${isLinked ? 'border-top: 1px solid rgba(56, 189, 248, 0.15); border-bottom: 1px solid rgba(56, 189, 248, 0.15); border-right: 1px solid rgba(56, 189, 248, 0.15);' : 'border-bottom: 1px solid var(--border-color);'}">
                        ${f.isCancelled ? `
                          <span style="background: rgba(244, 63, 94, 0.2); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.4); padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                            Cancelado
                          </span>
                        ` : `
                          <span style="background: ${groupStatus === 'ON_TIME' ? 'rgba(16, 185, 129, 0.2)' : groupStatus === 'EARLY' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${groupStatus === 'ON_TIME' ? '#10b981' : groupStatus === 'EARLY' ? '#38bdf8' : '#f59e0b'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                            ${groupStatus === 'ON_TIME' ? 'Puntual' : `${groupDiff > 0 ? '+' : ''}${formatMinutesToHhMm(groupDiff)}`}
                          </span>
                        `}
                      </td>
                    ` : ''}

                    <td style="padding: 10px 14px; text-align: center; ${cellBottomBorder}">
                      <input type="checkbox" aria-label="Verificar vuelo ${f.flightNumber}" data-flight-verification-index="${vuelosState.matchedFlights.indexOf(f)}" ${f.verified ? 'checked' : ''}>
                    </td>
                    <td style="padding: 10px 14px; text-align: center; ${cellBottomBorder}">
                      <div style="display: flex; gap: 4px; justify-content: center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="openFlightEditModal(${flightIdx})" title="Editar datos o tiempos del vuelo" style="padding: 3px 8px; font-size: 12px;">✏️</button>
                        ${isLinked ? `<button type="button" class="btn btn-sm btn-secondary" onclick="unlinkFlights('${f.linkedGroupId}')" title="Desvincular tramo del grupo" style="padding: 3px 8px; font-size: 12px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">🔗✖️</button>` : ''}
                        <button type="button" class="btn btn-sm btn-secondary" onclick="deleteFlightByIndex(${flightIdx})" title="Eliminar vuelo del informe" style="padding: 3px 8px; font-size: 12px; color: #f43f5e; border-color: rgba(244, 63, 94, 0.3);">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `;}).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <!-- CONTENIDO TAB 2: CANCELACIONES -->
    ${activeTab === 'cancellations' ? `
      <div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 18px;">
          <div class="vuelos-kpi-card">
            <div class="vuelos-kpi-icon" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e;">⚠️</div>
            <div>
              <div class="vuelos-kpi-label">VUELOS CANCELADOS</div>
              <div class="vuelos-kpi-val" style="color: #f43f5e;">${kpis.cancelledFlightsCount || 0}</div>
            </div>
          </div>
          <div class="vuelos-kpi-card">
            <div class="vuelos-kpi-icon" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">📊</div>
            <div>
              <div class="vuelos-kpi-label">TASA DE CANCELACIÓN</div>
              <div class="vuelos-kpi-val">${kpis.cancellationRate || 0}% <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">(de ${kpis.totalFlights || 0} programados)</span></div>
            </div>
          </div>
        </div>

        ${cancelledFlightsList.length === 0 ? `
          <div style="text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 44px; margin-bottom: 12px;">✅</div>
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">¡Cero Cancelaciones Registradas!</h3>
            <p style="color: var(--text-muted); font-size: 14px;">Todos los vuelos programados para esta jornada se realizaron satisfactoriamente sin incidencias de cancelación.</p>
          </div>
        ` : `
          <div class="table-container" style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow-x: auto;">
            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #0b1120; border-bottom: 1px solid var(--border-color);">
                  <th style="padding: 10px 14px;">Vuelo / Reserva #</th>
                  <th style="padding: 10px 14px;">Matrícula</th>
                  <th style="padding: 10px 14px;">Alumno</th>
                  <th style="padding: 10px 14px;">Instructor</th>
                  <th style="padding: 10px 14px; text-align: center;">Horas Canceladas</th>
                  <th style="padding: 10px 14px;">Lección / Misión</th>
                  <th style="padding: 10px 14px;">Motivo de Cancelación</th>
                  <th style="padding: 10px 14px; text-align: center;">Estado</th>
                  <th style="padding: 10px 14px; text-align: center;">Verificado</th>
                  <th style="padding: 10px 14px; text-align: center;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${sortedCancelled.map(f => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 10px 14px; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${f.flightNumber}</td>
                    <td style="padding: 10px 14px;">
                      <span style="background: var(--bg-input); padding: 2px 7px; border-radius: 4px; font-weight: 700; font-family: 'JetBrains Mono', monospace;">${f.registration}</span>
                    </td>
                    <td style="padding: 10px 14px;">${renderPersonBadgeHtml(f.studentCode, f.studentName)}</td>
                    <td style="padding: 10px 14px;">${renderPersonBadgeHtml(f.instructorCode, f.instructorName)}</td>
                    <td style="padding: 10px 14px; text-align: center; font-weight: 700; color: #f43f5e;">${f.scheduledHoursFormatted}</td>
                    <td style="padding: 10px 14px; color: var(--text-muted); font-size: 12px;">${f.lessons || '—'}</td>
                    <td style="padding: 10px 14px; font-size: 12px; min-width: 160px; max-width: 280px; overflow-wrap: break-word; line-height: 1.35;">
                      <div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.3); padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; line-height: 1.3;">
                          ${formatFlightInfoCell(f)}
                        </span>
                        ${(() => {
                          const info = formatFlightInfoCell(f);
                          const cleanComments = (f.comments || '')
                            .replace(/\(\s*n\/?a\s*\)/gi, '')
                            .replace(/\bn\/?a\b/gi, '')
                            .replace(/[()]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                          return (cleanComments && cleanComments.toLowerCase() !== info.toLowerCase() && cleanComments.toLowerCase() !== (f.cancellationReason || '').toLowerCase())
                            ? `<span style="color: var(--text-muted); font-size: 11px;">${cleanComments}</span>`
                            : '';
                        })()}
                      </div>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                      <span style="background: rgba(244, 63, 94, 0.2); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.4); padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                        Cancelado
                      </span>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                      <input type="checkbox" aria-label="Verificar vuelo ${f.flightNumber}" data-flight-verification-index="${vuelosState.matchedFlights.indexOf(f)}" ${f.verified ? 'checked' : ''}>
                    </td>
                    <td style="padding: 10px 14px; text-align: center;">
                      <div style="display: flex; gap: 4px; justify-content: center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="openFlightEditModal(${vuelosState.matchedFlights.indexOf(f)})" title="Editar o recuperar vuelo" style="padding: 3px 8px; font-size: 12px;">✏️</button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="deleteFlightByIndex(${vuelosState.matchedFlights.indexOf(f)})" title="Eliminar cancelación" style="padding: 3px 8px; font-size: 12px; color: #f43f5e; border-color: rgba(244, 63, 94, 0.3);">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    ` : ''}

    <!-- CONTENIDO TAB 3: PAREJAS ALUMNO + INSTRUCTOR -->
    ${activeTab === 'pairs' ? `
      <div class="table-container" style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #0b1120; border-bottom: 1px solid var(--border-color);">
              <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('pairs', 'studentName')">Alumno ⬍</th>
              <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('pairs', 'instructorName')">Instructor ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('pairs', 'flightsCount')">Vuelos ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('pairs', 'totalScheduledMinutes')">Programado ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('pairs', 'totalFlownMinutes')">Bloque ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('pairs', 'totalDeviationMinutes')">Desviación ⬍</th>
            </tr>
          </thead>
          <tbody>
            ${sortedPairs.map(p => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px 14px;">${renderPersonBadgeHtml(p.studentCode, p.studentName)}</td>
                <td style="padding: 10px 14px;">${renderPersonBadgeHtml(p.instructorCode, p.instructorName)}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 600;">${p.flightsCount}</td>
                <td style="padding: 10px 14px; text-align: center;">${p.totalScheduledHoursFormatted}</td>
                <td style="padding: 10px 14px; text-align: center;">${p.totalFlownHoursFormatted}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 700; color: ${p.totalDeviationMinutes > 5 ? '#f59e0b' : p.totalDeviationMinutes < -5 ? '#10b981' : 'inherit'};">
                  ${p.totalDeviationFormatted}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- CONTENIDO TAB 4: POR INSTRUCTOR -->
    ${activeTab === 'instructors' ? `
      <div class="table-container" style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #0b1120; border-bottom: 1px solid var(--border-color);">
              <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('instructors', 'instructorName')">Instructor ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('instructors', 'flightsCount')">Vuelos ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('instructors', 'totalScheduledMinutes')">Programado ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('instructors', 'totalFlownMinutes')">Bloque ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('instructors', 'totalDeviationMinutes')">Desviación ⬍</th>
            </tr>
          </thead>
          <tbody>
            ${sortedInstructors.map(i => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px 14px;">${renderPersonBadgeHtml(i.instructorCode, i.instructorName)}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 600;">${i.flightsCount}</td>
                <td style="padding: 10px 14px; text-align: center;">${i.totalScheduledHoursFormatted}</td>
                <td style="padding: 10px 14px; text-align: center;">${i.totalFlownHoursFormatted}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 700; color: ${i.totalDeviationMinutes > 5 ? '#f59e0b' : i.totalDeviationMinutes < -5 ? '#10b981' : 'inherit'};">
                  ${i.totalDeviationFormatted}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- CONTENIDO TAB 5: POR ALUMNO -->
    ${activeTab === 'students' ? `
      <div class="table-container" style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow-x: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #0b1120; border-bottom: 1px solid var(--border-color);">
              <th style="padding: 10px 14px; cursor: pointer;" onclick="handleVuelosSort('students', 'studentName')">Alumno ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('students', 'flightsCount')">Vuelos ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('students', 'totalScheduledMinutes')">Programado ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('students', 'totalFlownMinutes')">Bloque ⬍</th>
              <th style="padding: 10px 14px; text-align: center; cursor: pointer;" onclick="handleVuelosSort('students', 'totalDeviationMinutes')">Desviación ⬍</th>
            </tr>
          </thead>
          <tbody>
            ${sortedStudents.map(s => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px 14px;">${renderPersonBadgeHtml(s.studentCode, s.studentName)}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 600;">${s.flightsCount}</td>
                <td style="padding: 10px 14px; text-align: center;">${s.totalScheduledHoursFormatted}</td>
                <td style="padding: 10px 14px; text-align: center;">${s.totalFlownHoursFormatted}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 700; color: ${s.totalDeviationMinutes > 5 ? '#f59e0b' : s.totalDeviationMinutes < -5 ? '#10b981' : 'inherit'};">
                  ${s.totalDeviationFormatted}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- CONTENIDO TAB 6: HISTORICO ACUMULADO -->
    ${activeTab === 'history' ? `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Instructores Acumulado -->
        <div style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow: hidden;">
          <div style="padding: 12px 16px; background: #0b1120; font-weight: 700; font-size: 14px; border-bottom: 1px solid var(--border-color);">
            🎖️ Desviación Acumulada por Instructor
          </div>
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-muted);">
                <th style="padding: 8px 12px; text-align: left;">Instructor</th>
                <th style="padding: 8px 12px; text-align: center;">Vuelos</th>
                <th style="padding: 8px 12px; text-align: center;">Desv. Total</th>
              </tr>
            </thead>
            <tbody>
              ${sortedCumInstructors.map(i => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 8px 12px;">${renderPersonBadgeHtml(i.instructor_code, i.instructor_name)}</td>
                  <td style="padding: 8px 12px; text-align: center;">${i.flights_count}</td>
                  <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: ${i.total_deviation_min > 0 ? '#f59e0b' : '#10b981'};">${i.total_deviation_formatted}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Alumnos Acumulado -->
        <div style="background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color); overflow: hidden;">
          <div style="padding: 12px 16px; background: #0b1120; font-weight: 700; font-size: 14px; border-bottom: 1px solid var(--border-color);">
            👨‍🎓 Desviación Acumulada por Alumno
          </div>
          <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-muted);">
                <th style="padding: 8px 12px; text-align: left;">Alumno</th>
                <th style="padding: 8px 12px; text-align: center;">Vuelos</th>
                <th style="padding: 8px 12px; text-align: center;">Desv. Total</th>
              </tr>
            </thead>
            <tbody>
              ${sortedCumStudents.map(s => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 8px 12px;">${renderPersonBadgeHtml(s.student_code, s.student_name)}</td>
                  <td style="padding: 8px 12px; text-align: center;">${s.flights_count}</td>
                  <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: ${s.total_deviation_min > 0 ? '#f59e0b' : '#10b981'};">${s.total_deviation_formatted}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <!-- Modal para Editar / Añadir Vuelo -->
    <div id="vuelos-flight-edit-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px;">
      <div style="background: var(--bg-card, #0f172a); border: 1px solid var(--border-color, #334155); border-radius: 12px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); padding: 24px; color: var(--text-main, #f8fafc);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color, #334155); padding-bottom: 14px; margin-bottom: 18px;">
          <h3 id="modal-edit-title" style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-main);">✏️ Editar Vuelo</h3>
          <button type="button" onclick="closeFlightEditModal()" style="background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer;" title="Cerrar">✕</button>
        </div>

        <form onsubmit="event.preventDefault(); saveFlightEditModal();" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Vuelo # / ID</label>
              <input type="text" id="edit-flight-num" class="form-input" style="width: 100%; font-family: 'JetBrains Mono', monospace;" required placeholder="ej. 4199418">
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Matrícula</label>
              <input type="text" id="edit-registration" class="form-input" style="width: 100%; font-family: 'JetBrains Mono', monospace;" required placeholder="ej. EC-NNX">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Ruta / Destino</label>
              <input type="text" id="edit-route" class="form-input" style="width: 100%;" placeholder="ej. GCTS-GCTS 255 NM">
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Tipo de Vuelo</label>
              <select id="edit-flight-type" class="form-input" style="width: 100%;">
                <option value="Instruction">Instruction</option>
                <option value="Rental">Rental</option>
                <option value="Solo">Solo</option>
                <option value="Supervised Solo">Supervised Solo</option>
                <option value="Check">Check</option>
              </select>
            </div>
          </div>

          <datalist id="student-codes-datalist">
            ${STUDENTS_CATALOG.filter(s => s.code).map(s => `
              <option value="${s.code}">${s.name}</option>
            `).join('')}
          </datalist>

          <datalist id="student-names-datalist">
            ${STUDENTS_CATALOG.filter(s => s.name).map(s => `
              <option value="${s.name}">[${s.code || 'S/C'}]</option>
            `).join('')}
          </datalist>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Cód. Alumno</label>
              <input type="text" id="edit-student-code" list="student-codes-datalist" oninput="handleStudentCodeAutocomplete(this.value)" class="form-input" style="width: 100%; font-family: 'JetBrains Mono', monospace;" placeholder="NCORD" autocomplete="off">
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Nombre Alumno</label>
              <input type="text" id="edit-student-name" list="student-names-datalist" oninput="handleStudentNameAutocomplete(this.value)" class="form-input" style="width: 100%;" placeholder="ej. Natalia Martin Cordoba" autocomplete="off">
            </div>
          </div>

          <datalist id="instructor-codes-datalist">
            ${INSTRUCTORES_CATALOG.filter(i => i.code).map(i => `
              <option value="${i.code}">${i.name} — ${i.role || 'Instructor'}</option>
            `).join('')}
          </datalist>

          <datalist id="instructor-names-datalist">
            ${INSTRUCTORES_CATALOG.filter(i => i.name).map(i => `
              <option value="${i.name}">[${i.code || 'S/C'}] ${i.role || 'Instructor'}</option>
            `).join('')}
          </datalist>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 14px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Cód. Instructor</label>
              <input type="text" id="edit-instructor-code" list="instructor-codes-datalist" oninput="handleInstructorCodeAutocomplete(this.value)" class="form-input" style="width: 100%; font-family: 'JetBrains Mono', monospace;" placeholder="EDOMI" autocomplete="off">
            </div>
            <div>
              <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Nombre Instructor</label>
              <input type="text" id="edit-instructor-name" list="instructor-names-datalist" oninput="handleInstructorNameAutocomplete(this.value)" class="form-input" style="width: 100%;" placeholder="ej. Eduardo José Domínguez González" autocomplete="off">
            </div>
          </div>

          <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; align-items: end;">
              <div>
                <label style="font-size: 12px; font-weight: 700; color: var(--primary, #38bdf8); display: block; margin-bottom: 4px;">⏱️ Programado (HH:MM)</label>
                <input type="text" id="edit-sched-time" class="form-input" style="width: 100%; font-family: 'JetBrains Mono', monospace; font-weight: 700; text-align: center;" placeholder="03:30" required>
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 700; color: #10b981; display: block; margin-bottom: 4px;">✅ Bloque Volado (HH:MM)</label>
                <input type="text" id="edit-flown-time" class="form-input" style="width: 100%; font-family: 'JetBrains Mono', monospace; font-weight: 700; text-align: center;" placeholder="03:10">
              </div>
              <div style="padding-bottom: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 600; color: #f43f5e;">
                  <input type="checkbox" id="edit-is-cancelled" onchange="handleCancelledToggle(this)">
                  <span>¿Vuelo Cancelado?</span>
                </label>
              </div>
            </div>

            <div id="edit-cancellation-reason-container" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(244, 63, 94, 0.3);">
              <label for="edit-cancellation-reason-select" style="font-size: 12px; font-weight: 700; color: #f43f5e; display: block; margin-bottom: 6px;">
                ⚠️ Motivo de Cancelación
              </label>
              <select
                id="edit-cancellation-reason-select"
                class="form-input"
                style="width: 100%; border-color: rgba(244, 63, 94, 0.4); background: #1e293b; color: #f8fafc; margin-bottom: 8px; cursor: pointer;"
                onchange="handleCancellationReasonSelect(this.value)"
              >
                <option value="">-- Selecciona motivo de cancelación --</option>
                <option value="Meteorología adversa">Meteorología adversa</option>
                <option value="Avería mecánica / Mantenimiento">Avería mecánica / Mantenimiento</option>
                <option value="Indisposición del Alumno">Indisposición del Alumno</option>
                <option value="Indisposición del Instructor">Indisposición del Instructor</option>
                <option value="Operacional / Tráfico Aéreo / NOTAM">Operacional / Tráfico Aéreo / NOTAM</option>
                <option value="Reprogramación de Escuela">Reprogramación de Escuela</option>
                <option value="No presentado (No show)">No presentado (No show)</option>
                <option value="Otro">Otro motivo (especificar abajo)...</option>
              </select>
              <input
                type="text"
                id="edit-cancellation-reason"
                list="cancellation-reasons-datalist"
                class="form-input"
                style="width: 100%; border-color: rgba(244, 63, 94, 0.4); background: rgba(244, 63, 94, 0.05);"
                placeholder="Detalle o motivo de cancelación..."
              >
              <datalist id="cancellation-reasons-datalist">
                <option value="Meteorología adversa"></option>
                <option value="Avería mecánica / Mantenimiento"></option>
                <option value="Indisposición del Alumno"></option>
                <option value="Indisposición del Instructor"></option>
                <option value="Operacional / Tráfico Aéreo / NOTAM"></option>
                <option value="Reprogramación de Escuela"></option>
                <option value="No presentado (No show)"></option>
              </datalist>
            </div>
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Lección / Misión</label>
            <input type="text" id="edit-lessons" class="form-input" style="width: 100%;" placeholder="ej. NIGHT01 - Básicos instrumentales">
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 4px;">Comentarios / Observaciones</label>
            <input type="text" id="edit-comments" class="form-input" style="width: 100%;" placeholder="ej. T&G antes del vuelo solo">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; border-top: 1px solid var(--border-color, #334155); padding-top: 14px;">
            <button type="button" class="btn btn-secondary" onclick="closeFlightEditModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="background: var(--primary, #0284c7); border-color: var(--primary, #0284c7); font-weight: 700;">💾 Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal para Vincular Vuelos (Multi-tramo) -->
    <div id="vuelos-link-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px;">
      <div style="background: var(--bg-card, #0f172a); border: 1px solid var(--border-color, #334155); border-radius: 12px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); padding: 24px; color: var(--text-main, #f8fafc);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color, #334155); padding-bottom: 14px; margin-bottom: 18px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-main);">🔗 Vincular Vuelos en Bloque Único</h3>
          <button type="button" onclick="closeLinkFlightsModal()" style="background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer;" title="Cerrar">✕</button>
        </div>

        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.5;">
          Cuando una reserva se ha dividido en varios vuelos porque aterriza en otros aeródromos, vincúlalos aquí para unificar el tiempo programado del bloque y calcular la diferencia global.
        </p>

        <div style="margin-bottom: 14px;">
          <label style="font-size: 12px; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 6px;">Tramos Seleccionados:</label>
          <div id="link-modal-flights-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; background: var(--bg-input, #020617); padding: 8px; border-radius: 8px; border: 1px solid var(--border-color, #334155);"></div>
        </div>

        <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: center; text-align: center;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #10b981; margin-bottom: 4px;">SUMA BLOQUE</div>
              <div id="link-modal-total-flown" style="font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #10b981;">0:00 h</div>
            </div>
            <div>
              <label for="link-modal-sched-input" style="font-size: 11px; font-weight: 700; color: var(--primary, #38bdf8); display: block; margin-bottom: 4px;">PROGRAMADO (H:MM)</label>
              <input type="text" id="link-modal-sched-input" class="form-input" style="width: 100%; text-align: center; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 15px;" placeholder="2:30">
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">DIFERENCIA</div>
              <div id="link-modal-diff-preview" style="font-size: 16px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #38bdf8;">0:00 h</div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-color, #334155); padding-top: 14px;">
          <button type="button" class="btn btn-secondary" onclick="closeLinkFlightsModal()">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="confirmLinkFlights()" style="background: var(--primary, #0284c7); border-color: var(--primary, #0284c7); font-weight: 700;">🔗 Confirmar Vinculación</button>
        </div>
      </div>
    </div>

    <!-- Modal para Exportar Imagen de Diferencias (Email) -->
    <div id="vuelos-image-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; backdrop-filter: blur(4px); align-items: center; justify-content: center; padding: 20px;">
      <div style="background: var(--bg-card, #0f172a); border: 1px solid var(--border-color, #334155); border-radius: 12px; width: 100%; max-width: 950px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); padding: 24px; color: var(--text-main, #f8fafc);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color, #334155); padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-main);">📸 Imagen de Vuelos con Diferencias (para Email)</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted);">Solo muestra vuelos con diferencia. Rojo = se programó más y voló menos. Verde = se voló más.</p>
          </div>
          <button type="button" onclick="closeDifferencesImageModal()" style="background: none; border: none; font-size: 20px; color: var(--text-muted); cursor: pointer;" title="Cerrar">✕</button>
        </div>

        <div id="image-modal-copy-notice" style="display: none; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-weight: 600; text-align: center;">
          📋 ¡Imagen copiada al portapapeles! Ya puedes ir a tu correo o chat y pegarla directamente con <strong>Ctrl + V</strong>.
        </div>

        <div style="background: #ffffff; padding: 12px; border-radius: 8px; overflow-x: auto; display: flex; justify-content: center; margin-bottom: 16px; border: 1px solid var(--border-color, #334155);">
          <img id="image-modal-preview" alt="Vista previa de la tabla de diferencias" style="max-width: 100%; height: auto; display: block; border-radius: 2px;">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; border-top: 1px solid var(--border-color, #334155); padding-top: 14px; flex-wrap: wrap;">
          <div style="font-size: 12px; color: var(--text-muted);">
            💡 Pulsa <strong>Copiar Imagen al Portapapeles</strong> y pégala con <strong>Ctrl+V</strong> directo en Outlook o Gmail.
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="closeDifferencesImageModal()">Cerrar</button>
            <button type="button" class="btn btn-secondary" onclick="saveDifferencesImageFromModal()" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
              <span>💾</span>
              <span>Guardar PNG</span>
            </button>
            <button type="button" class="btn btn-primary" onclick="copyDifferencesImageToClipboard()" style="background: #10b981; border-color: #10b981; font-weight: 700;">
              <span>📋</span>
              <span>Copiar Imagen al Portapapeles</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  updateLinkButtonVisibility();
  for (const checkbox of container.querySelectorAll('[data-flight-verification-index]')) {
    checkbox.addEventListener('change', () =>
      toggleFlightVerification(Number(checkbox.dataset.flightVerificationIndex), checkbox.checked)
    );
  }
}

// Handlers de archivos en los input files
function handleProgFileSelect(input) {
  const file = input.files?.[0];
  if (!file) return;
  vuelosState.progFile = file;
  document.getElementById('name-excel-prog').textContent = file.name;
  checkAndTriggerExcelProcessing();
}

function handleVolFileSelect(input) {
  const file = input.files?.[0];
  if (!file) return;
  vuelosState.volFile = file;
  document.getElementById('name-excel-vol').textContent = file.name;
  checkAndTriggerExcelProcessing();
}

function checkAndTriggerExcelProcessing() {
  if (vuelosState.progFile && vuelosState.volFile) {
    const readerP = new FileReader();
    const readerV = new FileReader();
    readerP.onload = () => {
      readerV.onload = () => {
        processUploadedExcels(readerP.result, readerV.result);
      };
      readerV.readAsArrayBuffer(vuelosState.volFile);
    };
    readerP.readAsArrayBuffer(vuelosState.progFile);
  }
}

// =========================================================
// INICIALIZADOR DEL MODULO AL ABRIR LA PESTAÑA
// =========================================================

async function initVuelosView() {
  let list = getLocalReportsList();

  // Reconciliar con archivo de almacenamiento en disco si existe
  try {
    const res = await fetch('/api/vuelos/informes');
    if (res.ok) {
      const diskList = await res.json();
      if (Array.isArray(diskList) && diskList.length > 0) {
        if (!list || list.length === 0 || diskList.length >= list.length) {
          list = diskList;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
      }
    }
  } catch (e) {
    // Si no responde el endpoint, continúa en modo local
  }

  if (!list || list.length === 0) {
    saveLocalReport({
      report_date: '28-09-2026',
      matched: SEED_FLIGHTS_2809,
      kpis: calculateExecutiveKpis(SEED_FLIGHTS_2809),
      studentStats: aggregateByStudent(SEED_FLIGHTS_2809),
      instructorStats: aggregateByInstructor(SEED_FLIGHTS_2809),
      pairStats: aggregateByPair(SEED_FLIGHTS_2809)
    });
    list = getLocalReportsList();
  }

  vuelosState.savedReports = list;
  if (typeof loadStoredCatalogs === 'function') loadStoredCatalogs();
  if (typeof populateCatalogsFromReports === 'function' && Array.isArray(list) && list.length > 0) {
    populateCatalogsFromReports(list);
  }
  vuelosState.cumulativeData = computeCumulativeHistory();

  // Load by calendar date, not insertion order: importing a month inserts days separately.
  const latestReport = getLatestReport(list, true) || getLatestReport(list);
  if (latestReport) loadVuelosReportForDate(latestReport.report_date);
}

// Estilos CSS complementarios inyectados para el modulo
if (typeof document !== 'undefined') {
  const vuelosStyleEl = document.createElement('style');
  vuelosStyleEl.textContent = `
  .vuelos-date-navigator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-card);
    padding: 3px 8px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
  }
  .btn-date-nav {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 11px;
    padding: 2px 4px;
  }
  .vuelos-date-select {
    background: transparent;
    border: none;
    color: var(--primary);
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    outline: none;
  }
  .vuelos-dropzone-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 20px;
  }
  .vuelos-file-box {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px;
    text-align: center;
    background: var(--bg-input);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: var(--transition-fast);
  }
  .vuelos-file-box:hover {
    border-color: var(--primary);
    background: rgba(56, 189, 248, 0.05);
  }
  .vuelos-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }
  .vuelos-kpi-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .vuelos-kpi-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .vuelos-kpi-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }
  .vuelos-kpi-val {
    font-size: 20px;
    font-weight: 800;
    margin-top: 2px;
  }
  .vuelos-tabs-bar {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 18px;
    overflow-x: auto;
  }
  .vuelos-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 10px 16px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: var(--transition-fast);
    white-space: nowrap;
  }
  .vuelos-tab:hover {
    color: var(--text-main);
  }
  .vuelos-tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  .vuelos-tab-badge {
    background: var(--bg-input);
    color: var(--text-muted);
    padding: 1px 7px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
  }
  .vuelos-tab.active .vuelos-tab-badge {
    background: rgba(56, 189, 248, 0.2);
    color: var(--primary);
  }
  .person-badge-container {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .crew-code-badge {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(56, 189, 248, 0.15);
    color: var(--primary);
    border: 1px solid rgba(56, 189, 248, 0.3);
    letter-spacing: 0.5px;
    user-select: none;
  }
  #vuelos-flight-edit-modal select.form-input,
  #vuelos-flight-edit-modal input.form-input {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f8fafc;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    box-sizing: border-box;
  }
  #vuelos-flight-edit-modal select.form-input:focus,
  #vuelos-flight-edit-modal input.form-input:focus {
    border-color: #38bdf8;
    outline: none;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
  }
  .export-dropdown-wrapper {
    position: relative;
    display: inline-block;
  }
  .export-menu-item {
    transition: background 0.15s ease;
  }
  .export-menu-item:hover {
    background: rgba(255, 255, 255, 0.08) !important;
  }
`;
  if (document.head) document.head.appendChild(vuelosStyleEl);

  document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.export-dropdown-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      const menu = document.getElementById('export-dropdown-menu');
      if (menu) menu.style.display = 'none';
    }
  });
}
