/**
 * ==========================================
 * "LA TIENDA MATEMÁTICA" - ARCHIVO DE LÓGICA
 * ==========================================
 */

// --- VARIABLES GLOBALES DE ESTADO ---
let miRol = null; // 'docente' o 'estudiante'
let codigoSalaActual = '';
let nombreEstudiante = '';
let gradoEstudiante = '';
let seccionEstudiante = '';

// Variables de juego (Estudiante)
let puntajeActual = 0;
let nivelActual = 1;
let tiempoRestanteReto = 60;
let totalErrores = 0;
let tiempoTotalJugado = 0;
let temporizadorReto = null;
let temporizadorTotal = null;

let montoColocadoPago = 0; // Dinero acumulado por monedas/billetes ingresados
let retoActivo = null; // Información de la pregunta actual
let carrito = []; // Items seleccionados
let totalAciertos = 0;
let channelSync = null;
let servidorWiFi = '';
let ultimoEstadoSala = null;
let autoSyncActivo = false;
let rondaActual = 0;
let totalRondasObjetivo = 25;
let ordenLlegadaActual = 1;

let resultBgCanvas = null;
let resultBgCtx = null;
let resultBgItems = [];
let resultBgAnimId = null;

function obtenerBaseServidor() {
    const baseRaw = (servidorWiFi || '').trim();
    if (baseRaw) {
        if (baseRaw === 'modo-local') {
            return null;
        }
        return baseRaw;
    }
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        const origin = window.location.origin;
        if (origin && origin !== 'null' && origin !== 'file://') {
            return origin;
        }
    }
    return 'http://127.0.0.1:3000';
}

// Productos base de la tienda
const productosBase = [
    { id: 1, emoji: "🍎", nombre: "Manzana" },
    { id: 2, emoji: "🍌", nombre: "Plátano" },
    { id: 3, emoji: "🍞", nombre: "Pan" },
    { id: 4, emoji: "🥛", nombre: "Leche" },
    { id: 5, emoji: "🍪", nombre: "Galletas" },
    { id: 6, emoji: "🍫", nombre: "Chocolate" },
    { id: 7, emoji: "🧃", nombre: "Jugo" },
    { id: 8, emoji: "🧀", nombre: "Queso" },
    { id: 9, emoji: "🥚", nombre: "Huevos" },
    { id: 10, emoji: "🍚", nombre: "Arroz" },
    { id: 11, emoji: "🥕", nombre: "Zanahoria" },
    { id: 12, emoji: "🍉", nombre: "Sandía" },
    { id: 13, emoji: "🧁", nombre: "Cupcake" },
    { id: 14, emoji: "☕", nombre: "Café" },
    { id: 15, emoji: "🍇", nombre: "Uvas" },
    { id: 16, emoji: "🥪", nombre: "Sandwich" },
    { id: 17, emoji: "🍊", nombre: "Naranja" },
    { id: 18, emoji: "🥦", nombre: "Brócoli" },
    { id: 19, emoji: "🍓", nombre: "Fresas" },
    { id: 20, emoji: "🥔", nombre: "Papa" },
    { id: 21, emoji: "🌽", nombre: "Maíz" },
    { id: 22, emoji: "🥥", nombre: "Coco" },
    { id: 23, emoji: "🍯", nombre: "Miel" },
    { id: 24, emoji: "🍗", nombre: "Pollo" },
    { id: 25, emoji: "🥝", nombre: "Kiwi" },
    { id: 26, emoji: "🍋", nombre: "Limón" },
    { id: 27, emoji: "🥨", nombre: "Pretzel" },
    { id: 28, emoji: "🍤", nombre: "Camarón" },
    { id: 29, emoji: "🥖", nombre: "Baguette" },
    { id: 30, emoji: "🧂", nombre: "Sal" }
];
let productosConPrecios = [];

function guardarDatoPersistente(clave, valor) {
    try {
        localStorage.setItem(clave, valor);
    } catch (error) {
        try {
            sessionStorage.setItem(clave, valor);
        } catch (fallbackError) {
            console.warn('No se pudo guardar la sesión local:', fallbackError);
        }
    }
}

function leerDatoPersistente(clave) {
    try {
        return localStorage.getItem(clave);
    } catch (error) {
        try {
            return sessionStorage.getItem(clave);
        } catch (fallbackError) {
            return null;
        }
    }
}

function eliminarDatoPersistente(clave) {
    try {
        localStorage.removeItem(clave);
    } catch (error) {
        try {
            sessionStorage.removeItem(clave);
        } catch (fallbackError) {
            console.warn('No se pudo eliminar la sesión local:', fallbackError);
        }
    }
}

function difundirCambioPersistencia(tipo, payload) {
    if (channelSync) {
        channelSync.postMessage({ type: tipo, payload });
    }

    try {
        const clave = `__sync_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const dato = JSON.stringify({ type: tipo, payload });
        localStorage.setItem(clave, dato);
        localStorage.removeItem(clave);
    } catch (error) {}
}


function inicializarPersistenciaReactiva() {
    if (typeof window === 'undefined' || autoSyncActivo) return;

    autoSyncActivo = true;

    if ('BroadcastChannel' in window) {
        channelSync = new BroadcastChannel('tienda-matematica');
        channelSync.onmessage = (event) => {
            const { type, payload } = event.data || {};
            if (type === 'tienda-sync' && payload?.codigo === codigoSalaActual) {
                if (typeof activarSincronizacionReactiva === 'function') {
                    activarSincronizacionReactiva();
                }
            }
        };
    }

    window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('sala_') && codigoSalaActual) {
            if (typeof activarSincronizacionReactiva === 'function') {
                activarSincronizacionReactiva();
            }
        }
    });
}

// --- ENRUTADOR DE PANTALLAS ---
function mostrarPantalla(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    // El botón para volver al menú de inicio se gestiona en base a la pantalla
    const btnVolver = document.getElementById('btn-volver-inicio');
    if (screenId === 'pantalla-inicio') {
        btnVolver.style.display = 'none';
    } else {
        btnVolver.style.display = 'block';
    }

    if (['pantalla-espera-docente', 'pantalla-espera-estudiante', 'pantalla-control-docente'].includes(screenId) && codigoSalaActual) {
        refrescarSalaServidor();
    }

    if (screenId === 'pantalla-resultados') {
        iniciarFondoResultados();
    } else {
        detenerFondoResultados();
    }
}

function inicializarFondoResultados() {
    resultBgCanvas = document.getElementById('result-canvas-background');
    if (!resultBgCanvas) return;
    resultBgCtx = resultBgCanvas.getContext('2d');
    resultBgItems = [];
    window.addEventListener('resize', ajustarTamanoFondoResultados);
    ajustarTamanoFondoResultados();
}

function ajustarTamanoFondoResultados() {
    if (!resultBgCanvas) return;
    const rect = resultBgCanvas.getBoundingClientRect();
    resultBgCanvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
    resultBgCanvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
    if (resultBgCtx) {
        resultBgCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
}

function iniciarFondoResultados() {
    if (!resultBgCanvas || !resultBgCtx) {
        inicializarFondoResultados();
        if (!resultBgCanvas || !resultBgCtx) return;
    }

    resultBgItems = Array.from({ length: 28 }, () => ({
        x: Math.random() * resultBgCanvas.width / window.devicePixelRatio,
        y: Math.random() * resultBgCanvas.height / window.devicePixelRatio,
        radius: Math.random() * 12 + 5,
        vitesse: Math.random() * 0.7 + 0.3,
        alpha: Math.random() * 0.35 + 0.25,
        hue: Math.floor(Math.random() * 35) + 40,
        drift: Math.random() * 1.2 - 0.6,
        shape: Math.random() > 0.4 ? 'circle' : 'star'
    }));

    const animate = () => {
        if (!resultBgCtx || !resultBgCanvas) return;

        const width = resultBgCanvas.width / window.devicePixelRatio;
        const height = resultBgCanvas.height / window.devicePixelRatio;

        resultBgCtx.clearRect(0, 0, width, height);
        resultBgCtx.fillStyle = 'rgba(255,255,255,0.12)';
        resultBgCtx.fillRect(0, 0, width, height);

        resultBgItems.forEach(item => {
            item.y -= item.vitesse;
            item.x += item.drift;
            if (item.y + item.radius < -20) {
                item.y = height + 20;
                item.x = Math.random() * width;
            }
            if (item.x < -40) item.x = width + 40;
            if (item.x > width + 40) item.x = -40;

            const gradient = resultBgCtx.createRadialGradient(
                item.x,
                item.y,
                0,
                item.x,
                item.y,
                item.radius * 1.8
            );
            gradient.addColorStop(0, `hsla(${item.hue}, 90%, 70%, ${item.alpha})`);
            gradient.addColorStop(0.5, `hsla(${item.hue}, 90%, 70%, ${item.alpha * 0.45})`);
            gradient.addColorStop(1, 'hsla(210, 100%, 95%, 0)');

            resultBgCtx.fillStyle = gradient;
            resultBgCtx.beginPath();
            resultBgCtx.arc(item.x, item.y, item.radius * 1.6, 0, Math.PI * 2);
            resultBgCtx.fill();

            if (item.shape === 'star') {
                resultBgCtx.save();
                resultBgCtx.translate(item.x, item.y);
                resultBgCtx.rotate((Date.now() / 1400) * (item.drift > 0 ? 1 : -1));
                resultBgCtx.strokeStyle = `hsla(${item.hue}, 95%, 85%, ${item.alpha * 0.8})`;
                resultBgCtx.lineWidth = 2;
                resultBgCtx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const theta = (Math.PI * 2 * i) / 5;
                    const outer = item.radius * 0.9;
                    const inner = item.radius * 0.4;
                    resultBgCtx.lineTo(Math.cos(theta) * outer, Math.sin(theta) * outer);
                    resultBgCtx.lineTo(Math.cos(theta + Math.PI / 5) * inner, Math.sin(theta + Math.PI / 5) * inner);
                }
                resultBgCtx.closePath();
                resultBgCtx.stroke();
                resultBgCtx.restore();
            }
        });

        resultBgAnimId = requestAnimationFrame(animate);
    };

    if (!resultBgAnimId) {
        resultBgAnimId = requestAnimationFrame(animate);
    }
}

function detenerFondoResultados() {
    if (resultBgAnimId) {
        cancelAnimationFrame(resultBgAnimId);
        resultBgAnimId = null;
    }
    if (resultBgCtx && resultBgCanvas) {
        resultBgCtx.clearRect(0, 0, resultBgCanvas.width, resultBgCanvas.height);
    }
}

async function refrescarSalaServidor() {
    const base = obtenerBaseServidor();
    if (!base || !codigoSalaActual) return;

    try {
        const respuesta = await fetch(`${base}/api/state/${codigoSalaActual}`);
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (datos?.sala) {
            guardarDatoPersistente(`sala_${codigoSalaActual}`, JSON.stringify(datos.sala));
            actualizarVistaDesdeSala(datos.sala);
        }
    } catch (error) {
        // No bloquear el flujo si el servidor no responde.
    }
}

function irAlInicio() {
    desconectarYSalir();
    mostrarPantalla('pantalla-inicio');
}

window.addEventListener('DOMContentLoaded', () => {
    const btnVolver = document.getElementById('btn-volver-inicio');
    if (btnVolver) btnVolver.addEventListener('click', irAlInicio);

    inicializarFondoResultados();

    const btnDocenteInicio = document.getElementById('btn-docente-inicio');
    if (btnDocenteInicio) btnDocenteInicio.addEventListener('click', irARegistroDocente);

    const btnEstudianteInicio = document.getElementById('btn-estudiante-inicio');
    if (btnEstudianteInicio) btnEstudianteInicio.addEventListener('click', irAAccessoEstudiante);

    const btnGenerarSala = document.getElementById('btn-generar-sala');
    if (btnGenerarSala) btnGenerarSala.addEventListener('click', crearSalaJuego);

    const btnIngresarEstudiante = document.getElementById('btn-ingresar-estudiante');
    if (btnIngresarEstudiante) btnIngresarEstudiante.addEventListener('click', unirseASalaEstudiante);

    inicializarPersistenciaReactiva();
    inicializarMusicaFondo();
});

function iniciarMusicaPorInteraccion() {
    if (musicaFondoIniciada) return;
    musicaFondoIniciada = true;
    reproducirPistaActual();
}

// --- GESTIÓN DE MÚSICA DE FONDO ---
const MUSIC_STATE_KEY = 'tienda-musica-fondo';
const MUSIC_FILES = [
    { src: 'musica fondo1.mp3', label: 'Fondo 1' },
    { src: 'musica fondo2.mp3', label: 'Fondo 2' }
];
let musicaFondoPistas = [];
let pistaMusicalActual = 0;
let musicaFondoIniciada = false;

function cargarEstadoMusica() {
    try {
        const raw = localStorage.getItem(MUSIC_STATE_KEY);
        if (!raw) return { trackIndex: 0, currentTime: 0 };
        return JSON.parse(raw);
    } catch (e) {
        return { trackIndex: 0, currentTime: 0 };
    }
}


function guardarEstadoMusica(trackIndex, currentTime) {
    try {
        localStorage.setItem(MUSIC_STATE_KEY, JSON.stringify({ trackIndex, currentTime }));
    } catch (e) {
        // no bloquear si el almacenamiento falla
    }
}

function inicializarMusicaFondo() {
    const estado = cargarEstadoMusica();
    pistaMusicalActual = Number(estado.trackIndex) || 0;

    musicaFondoPistas = MUSIC_FILES.map((archivo, index) => {
        const audio = new Audio(archivo.src);
        audio.loop = false;
        audio.volume = 0.22;
        audio.preload = 'auto';
        audio.addEventListener('timeupdate', () => {
            if (index === pistaMusicalActual) {
                guardarEstadoMusica(pistaMusicalActual, audio.currentTime);
            }
        });
        audio.addEventListener('loadedmetadata', () => {
            if (index === pistaMusicalActual) {
                const estadoInterno = cargarEstadoMusica();
                if (estadoInterno.currentTime && estadoInterno.currentTime < audio.duration) {
                    audio.currentTime = estadoInterno.currentTime;
                }
            }
        });
        audio.addEventListener('ended', () => {
            if (index === pistaMusicalActual) {
                pistaMusicalActual = (pistaMusicalActual + 1) % musicaFondoPistas.length;
                guardarEstadoMusica(pistaMusicalActual, 0);
                reproducirPistaActual();
            }
        });
        return audio;
    });

    document.addEventListener('click', iniciarMusicaPorInteraccion, { once: true });
    document.addEventListener('keydown', iniciarMusicaPorInteraccion, { once: true });
    document.addEventListener('touchstart', iniciarMusicaPorInteraccion, { once: true });
}

function reproducirPistaActual() {
    if (!musicaFondoPistas.length) return;
    musicaFondoPistas.forEach((audio, index) => {
        if (index !== pistaMusicalActual && !audio.paused) {
            audio.pause();
        }
    });
    const pista = musicaFondoPistas[pistaMusicalActual];
    if (!pista) return;
    pista.play().catch(() => {
        // Si no se puede reproducir inmediatamente, se intentará tras la siguiente interacción
    });
}

// --- GENERADOR DE AUDIO CON SINTETIZADOR DE NAVEGADOR ---
function sonarEfecto(tipo) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (tipo === 'correcto') {
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (tipo === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (tipo === 'click') {
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        }
    } catch (e) {
        // Silencio si el navegador bloquea la reproducción de AudioContext
    }
}


/**
 * ==========================================
 * MODELO DE DATOS DE LOCALSTORAGE (SIN BD)
 * ==========================================
 */
// Estructura sala: "sala_MAT321" -> { codigo: 'MAT321', estado: 'espera|jugando|finalizado', precios: [...] }
// Estructura alumno: "estudiante_MAT321_Mateo" -> { nombre, grado, seccion, score, nivel, errores, tiempo, activo: bool }

async function sincronizarEstadoConServidor() {
    const base = obtenerBaseServidor();
    if (!base || !codigoSalaActual) return;

    const salaPersistida = leerDatoPersistente(`sala_${codigoSalaActual}`);
    const salaLocal = salaPersistida ? JSON.parse(salaPersistida) : null;
    const estudiantes = obtenerEstudiantesDeSala(codigoSalaActual);

    const payload = {
        codigo: codigoSalaActual,
        estado: salaLocal?.estado || 'espera',
        precios: salaLocal?.precios || productosConPrecios,
        estudiantes: estudiantes.map(estudiante => ({
            nombre: estudiante.nombre,
            grado: estudiante.grado,
            seccion: estudiante.seccion,
            score: estudiante.score || 0,
            nivel: estudiante.nivel || 1,
            ronda: estudiante.ronda || 0,
            errores: estudiante.errores || 0,
            tiempo: estudiante.tiempo || 0,
            activo: estudiante.activo !== false
        }))
    };

    try {
        await fetch(`${base}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                codigo: codigoSalaActual,
                room: {
                    codigo: codigoSalaActual,
                    estado: salaLocal?.estado || 'espera',
                    precios: salaLocal?.precios || productosConPrecios
                },
                students: estudiantes.map(estudiante => ({
                    nombre: estudiante.nombre,
                    grado: estudiante.grado,
                    seccion: estudiante.seccion,
                    score: estudiante.score || 0,
                    nivel: estudiante.nivel || 1,
                    ronda: estudiante.ronda || 0,
                    errores: estudiante.errores || 0,
                    tiempo: estudiante.tiempo || 0,
                    activo: estudiante.activo !== false
                }))
            })
        });
    } catch (error) {
        // Si el servidor no está disponible, la app conserva el modo local.
    }
}

function mostrarNotificacion(mensaje, tipo = 'info', duracion = 2600) {
    const contenedor = document.getElementById('toast-container');
    if (!contenedor) return;

    const toast = document.createElement('div');
    const iconos = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: '💡'
    };

    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <div class="toast-icon">${iconos[tipo] || iconos.info}</div>
        <div class="toast-message">${mensaje}</div>
    `;

    contenedor.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 280);
    }, duracion);
}

function actualizarEstudianteEnLobby(estudianteObj) {
    guardarDatoPersistente(
        `estudiante_${codigoSalaActual}_${estudianteObj.nombre}`,
        JSON.stringify(estudianteObj)
    );
    difundirCambioPersistencia('tienda-sync', { codigo: codigoSalaActual });
    void sincronizarEstadoConServidor();
}

function obtenerEstudiantesDeSala(codigo) {
    const estudiantes = [];
    const fuentes = [localStorage, sessionStorage];

    fuentes.forEach(storage => {
        try {
            for (let i = 0; i < storage.length; i++) {
                const clave = storage.key(i);
                if (clave && clave.startsWith(`estudiante_${codigo}_`)) {
                    try {
                        estudiantes.push(JSON.parse(storage.getItem(clave)));
                    } catch (e) {}
                }
            }
        } catch (e) {}
    });

    return estudiantes;
}

function renderizarEstudiantesEnDocente(estudiantes) {
    const contador = document.getElementById('lobby-contador-docente');
    const lista = document.getElementById('lobby-lista-docente');
    if (!contador || !lista) return;

    contador.innerText = `${estudiantes.length} estudiante${estudiantes.length === 1 ? '' : 's'}`;
    lista.innerHTML = estudiantes.map(e => `<li>🎈 ${e.nombre}</li>`).join('');
}

function actualizarContadorEstudiante(estudiantes) {
    const contador = document.getElementById('lobby-contador-estudiante');
    if (!contador) return;
    contador.innerText = estudiantes.length;
}

function calcularSiguienteOrdenLlegada() {
    const estudiantes = obtenerEstudiantesDeSala(codigoSalaActual);
    const ordenes = estudiantes
        .map(est => Number(est.ordenLlegada) || 0)
        .filter(num => num > 0);
    return ordenes.length === 0 ? 1 : Math.max(...ordenes) + 1;
}

function actualizarVistaDesdeSala(sala) {
    const estudiantes = Array.isArray(sala?.estudiantes) ? sala.estudiantes : obtenerEstudiantesDeSala(codigoSalaActual);

    if (miRol === 'docente') {
        if (document.getElementById('pantalla-espera-docente').classList.contains('active')) {
            renderizarEstudiantesEnDocente(estudiantes);
        }
    }

    if (miRol === 'estudiante') {
        if (document.getElementById('pantalla-espera-estudiante').classList.contains('active')) {
            actualizarContadorEstudiante(estudiantes);
            if (sala?.estado === 'jugando') {
                comenzarDesafiosEstudiante();
            }
        }
    }
}

function eliminarTodosEstudiantesSala(codigo) {
    const keysAEliminar = [];
    const fuentes = [localStorage, sessionStorage];

    fuentes.forEach(storage => {
        try {
            for (let i = 0; i < storage.length; i++) {
                const clave = storage.key(i);
                if (clave && clave.startsWith(`estudiante_${codigo}_`)) {
                    keysAEliminar.push({ storage, clave });
                }
            }
        } catch (e) {}
    });

    keysAEliminar.forEach(({ storage, clave }) => storage.removeItem(clave));
}

function eliminarEstudianteDocente(nombre) {
    if (!codigoSalaActual || !nombre) {
        mostrarNotificacion('No se pudo eliminar el estudiante.', 'warning');
        return;
    }

    const clave = `estudiante_${codigoSalaActual}_${nombre}`;
    eliminarDatoPersistente(clave);
    mostrarNotificacion(`Estudiante ${nombre} eliminado.`, 'success');

    const estudiantes = obtenerEstudiantesDeSala(codigoSalaActual);
    renderizarEstudiantesEnDocente(estudiantes);
    if (miRol === 'docente' && document.getElementById('pantalla-control-docente').classList.contains('active')) {
        actualizarPanelSeguimientoDocente(estudiantes);
    }

    difundirCambioPersistencia('tienda-sync', { codigo: codigoSalaActual });
    void sincronizarEstadoConServidor();
}


/**
 * ==========================================
 * REGISTROS DE INTEGRACIÓN DOCENTE
 * ==========================================
 */
function irARegistroDocente() {
    sonarEfecto('click');
    miRol = 'docente';
    mostrarPantalla('pantalla-registro-docente');
}

function validarAccesoDocente() {
    const input = document.getElementById('teacher-password');
    const password = (input?.value || '').trim();

    if (password === '2026') {
        sonarEfecto('correcto');
        mostrarNotificacion('Acceso autorizado. Bienvenido al panel del profesor.', 'success');
        mostrarPantalla('pantalla-panel-docente');
        if (input) input.value = '';
    } else {
        sonarEfecto('error');
        mostrarNotificacion('Contraseña incorrecta. Intenta nuevamente.', 'error');
    }
}

function crearSalaJuego() {
    sonarEfecto('click');

    const codigoFijo = '2026COLE';
    codigoSalaActual = codigoFijo;

    // Generar Precios Aleatorios para la partida
    productosConPrecios = productosBase.map(p => {
        // Precios enteros o con decimales sencillos (.50) para primaria
        const precioDecimales = Math.random() > 0.5 ? 0.00 : 0.50;
        const precioEntero = Math.floor(Math.random() * 8) + 1; // S/1 a S/8
        return {
            ...p,
            precio: parseFloat((precioEntero + precioDecimales).toFixed(2))
        };
    });

    const datosSala = {
        codigo: codigoSalaActual,
        estado: 'espera',
        precios: productosConPrecios
    };

    // Almacenar sala
    guardarDatoPersistente(`sala_${codigoSalaActual}`, JSON.stringify(datosSala));
    eliminarTodosEstudiantesSala(codigoSalaActual);
    inicializarPersistenciaReactiva();
    difundirCambioPersistencia('tienda-sync', { codigo: codigoSalaActual });

    // Preparar pantalla
    document.getElementById('lobby-codigo-docente').innerText = codigoSalaActual;
    mostrarPantalla('pantalla-espera-docente');

    // Iniciar el listener de LocalStorage para sincronización reactiva
    activarSincronizacionReactiva();
    void sincronizarEstadoConServidor();
}

function iniciarJuegoDocente() {
    const salaRaw = leerDatoPersistente(`sala_${codigoSalaActual}`);
    if (!salaRaw) return;

    const sala = JSON.parse(salaRaw);
    sala.estado = 'jugando';
    guardarDatoPersistente(`sala_${codigoSalaActual}`, JSON.stringify(sala));
    difundirCambioPersistencia('tienda-sync', { codigo: codigoSalaActual });

    sonarEfecto('correcto');
    mostrarPantalla('pantalla-control-docente');
    void sincronizarEstadoConServidor();
}

function finalizarJuegoDocente() {
    const salaRaw = leerDatoPersistente(`sala_${codigoSalaActual}`);
    if (!salaRaw) return;

    const sala = JSON.parse(salaRaw);
    sala.estado = 'finalizado';
    guardarDatoPersistente(`sala_${codigoSalaActual}`, JSON.stringify(sala));
    difundirCambioPersistencia('tienda-sync', { codigo: codigoSalaActual });

    sonarEfecto('correcto');
    procesarYMostrarResultados();
    void sincronizarEstadoConServidor();
}


/**
 * ==========================================
 * REGISTROS DE INTEGRACIÓN ESTUDIANTE
 * ==========================================
 */
function irAAccessoEstudiante() {
    sonarEfecto('click');
    miRol = 'estudiante';
    mostrarPantalla('pantalla-acceso-estudiante');
}

async function unirseASalaEstudiante() {
    const nombre = document.getElementById('student-name').value.trim();
    const grado = document.getElementById('student-grade').value.trim();
    const seccion = document.getElementById('student-section').value.trim();
    const codigo = document.getElementById('student-code').value.trim().toUpperCase();

    if (!nombre || !grado || !seccion || !codigo) {
        mostrarNotificacion('Completa todos los datos antes de entrar a comprar.', 'warning');
        return;
    }

    let salaRaw = leerDatoPersistente(`sala_${codigo}`);
    const base = obtenerBaseServidor();
    if (base) {
        try {
            const respuesta = await fetch(`${base}/api/state/${codigo}`);
            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos?.sala) {
                    salaRaw = JSON.stringify(datos.sala);
                    guardarDatoPersistente(`sala_${codigo}`, salaRaw);
                }
            }
        } catch (error) {
            // Si no hay servidor disponible, usamos lo que haya en local.
        }
    }

    if (!salaRaw) {
        mostrarNotificacion('Ese código de sala no existe. Pídeselo a tu docente.', 'error');
        return;
    }

    const sala = JSON.parse(salaRaw);
    if (sala.estado !== 'espera') {
        mostrarNotificacion('El juego ya comenzó o ya fue terminado.', 'warning');
        return;
    }

    // Registro del alumno
    codigoSalaActual = codigo;
    nombreEstudiante = nombre;
    gradoEstudiante = grado;
    seccionEstudiante = seccion;
    productosConPrecios = sala.precios;

    const miPerfil = {
        nombre: nombreEstudiante,
        grado: gradoEstudiante,
        seccion: seccionEstudiante,
        score: 0,
        nivel: 1,
        ronda: 0,
        errores: 0,
        tiempo: 0,
        activo: true
    };

    actualizarEstudianteEnLobby(miPerfil);

    document.getElementById('lobby-codigo-estudiante').innerText = codigoSalaActual;
    mostrarPantalla('pantalla-espera-estudiante');

    inicializarPersistenciaReactiva();
    activarSincronizacionReactiva();
    await sincronizarEstadoConServidor();
    sonarEfecto('correcto');
}


/**
 * ==========================================
 * SINCRONIZACIÓN EN TIEMPO REAL (REACTIVA)
 * ==========================================
 */
let syncInterval = null;

function activarSincronizacionReactiva() {
    if (syncInterval) clearInterval(syncInterval);

    const refrescarDesdeServidor = async () => {
        const base = obtenerBaseServidor();
        if (!base || !codigoSalaActual) return null;

        try {
            const respuesta = await fetch(`${base}/api/state/${codigoSalaActual}`);
            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos?.sala) {
                    ultimoEstadoSala = datos.sala;
                    guardarDatoPersistente(`sala_${codigoSalaActual}`, JSON.stringify(datos.sala));
                    return datos.sala;
                }
            }
        } catch (error) {
            // Sincronización externa no disponible; se mantiene el modo local.
        }
        return null;
    };

    const sincronizarIntervalo = async () => {
        const salaRemota = await refrescarDesdeServidor();
        const salaRaw = leerDatoPersistente(`sala_${codigoSalaActual}`);
        if (!salaRaw) return;

        const sala = salaRemota || JSON.parse(salaRaw);
        const estudiantes = Array.isArray(sala?.estudiantes) && sala.estudiantes.length > 0
            ? sala.estudiantes
            : obtenerEstudiantesDeSala(codigoSalaActual);

        // --- VISTA DOCENTE ---
        actualizarVistaDesdeSala(sala);

        if (miRol === 'docente') {
            if (document.getElementById('pantalla-control-docente').classList.contains('active')) {
                const estudiantesControl = Array.isArray(sala?.estudiantes) ? sala.estudiantes : estudiantes;
                actualizarPanelSeguimientoDocente(estudiantesControl);
            }
        }

        // --- VISTA ESTUDIANTE ---
        if (miRol === 'estudiante') {
            if (document.getElementById('pantalla-espera-estudiante').classList.contains('active')) {
                const estudiantesActuales = Array.isArray(sala?.estudiantes) ? sala.estudiantes : estudiantes;
                actualizarContadorEstudiante(estudiantesActuales);

                if (sala.estado === 'jugando') {
                    comenzarDesafiosEstudiante();
                }
            }

            if (sala.estado === 'finalizado' && document.getElementById('pantalla-juego').classList.contains('active')) {
                clearInterval(temporizadorReto);
                clearInterval(temporizadorTotal);
                procesarYMostrarResultados();
            }
        }
    };

    sincronizarIntervalo();
    syncInterval = setInterval(sincronizarIntervalo, 1000);
}


/**
 * ==========================================
 * LÓGICA DE MONITOREO DEL DOCENTE
 * ==========================================
 */
function filtrarTablaDocente() {
    const input = document.getElementById('buscador-estudiantes');
    const filtro = (input?.value || '').trim().toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-tabla-docente tr');

    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        fila.style.display = texto.includes(filtro) ? '' : 'none';
    });
}

function actualizarPanelSeguimientoDocente(estudiantes) {
    const tbody = document.getElementById('cuerpo-tabla-docente');
    tbody.innerHTML = '';

    if (estudiantes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">Esperando a que entren los alumnos...</td></tr>`;
    }

    let sumaPuntajes = 0;
    let totalRespuestas = 0;
    let erroresGlobales = 0;

    estudiantes.forEach(est => {
        sumaPuntajes += est.score;
        erroresGlobales += est.errores;
        totalRespuestas += (est.score / 15); // Estimación matemática de aciertos

        const rondaActualEst = Math.min(est.ronda || 0, totalRondasObjetivo);
        const progresoPct = Math.round((rondaActualEst / totalRondasObjetivo) * 100);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${est.nombre}</strong></td>
            <td>${est.grado} "${est.seccion}"</td>
            <td>${est.ordenLlegada ? `${est.ordenLlegada}°` : '—'}</td>
            <td><span class="total-highlight">${est.score} pts</span></td>
            <td>Nivel ${est.nivel}</td>
            <td class="progress-cell">
                <div class="progress-track">
                    <div class="progress-fill" style="width:${progresoPct}%"></div>
                </div>
                <small>${rondaActualEst}/${totalRondasObjetivo} problemas</small>
            </td>
            <td>${est.tiempo}s</td>
            <td style="color:var(--red-kid);">${est.errores}</td>
            <td><span class="counter-badge" style="background-color: var(--green-kid);">${est.ordenLlegada ? 'Terminado' : 'Jugando'}</span></td>
            <td><button class="btn btn-red btn-sm" onclick="eliminarEstudianteDocente(${JSON.stringify(est.nombre)})">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });

    filtrarTablaDocente();

    const promedio = Math.round(sumaPuntajes / estudiantes.length);
    document.getElementById('metric-promedio').innerText = `${promedio} pts`;
    document.getElementById('metric-respuestas').innerText = Math.round(totalRespuestas);
    document.getElementById('metric-errores').innerText = erroresGlobales;
}


/**
 * ==========================================
 * DESARROLLO DEL JUEGO (ESTUDIANTE)
 * ==========================================
 */
function comenzarDesafiosEstudiante() {
    mostrarPantalla('pantalla-juego');
    inicializarTiendaUI();
    
    puntajeActual = 0;
    nivelActual = 1;
    totalErrores = 0;
    totalAciertos = 0;
    tiempoTotalJugado = 0;

    // Cronómetro general de la partida activa
    temporizadorTotal = setInterval(() => {
        tiempoTotalJugado++;
    }, 1000);

    crearNuevoReto();
}

function generarSemillaUnica(...valores) {
    const texto = valores.join('|');
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
        hash = ((hash << 5) - hash + texto.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function obtenerSemillaDeJuego() {
    return generarSemillaUnica(
        codigoSalaActual || 'sala',
        nombreEstudiante || 'estudiante',
        String(rondaActual || 1)
    );
}

function filtrarProductos() {
    const input = document.getElementById('buscador-productos');
    const filtro = (input?.value || '').trim().toLowerCase();
    const cards = document.querySelectorAll('#tienda-productos .product-card');

    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(filtro) ? '' : 'none';
    });
}

function renderizarProductos() {
    const grid = document.getElementById('tienda-productos');
    if (!grid) return;

    grid.innerHTML = '';

    productosConPrecios.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-emoji">${p.emoji}</div>
            <div class="product-name">${p.nombre}</div>
            <div class="product-price">S/ ${p.precio.toFixed(2)}</div>
            <button class="btn btn-green btn-sm" onclick="agregarAlCarrito(${p.id})">➕ Agregar</button>
        `;
        grid.appendChild(card);
    });

    filtrarProductos();
}

function inicializarTiendaUI() {
    renderizarProductos();
}

function actualizarPreciosPorRonda() {
    const semilla = obtenerSemillaDeJuego();

    productosConPrecios = productosBase.map((producto, index) => {
        const baseAleatoria = ((semilla + index * 17) % 8) + 1;
        const ajusteRonda = 1 + (rondaActual / totalRondasObjetivo) * 0.45;
        const precioRaw = baseAleatoria + (index % 4) * 0.5 + (rondaActual * 0.25);
        const precioFinal = parseFloat((Math.round(precioRaw * ajusteRonda * 2) / 2).toFixed(2));
        return {
            ...producto,
            precio: precioFinal
        };
    });

    renderizarProductos();
}

function finalizarJuegoEstudiante() {
    clearInterval(temporizadorReto);
    clearInterval(temporizadorTotal);
    sonarEfecto('correcto');
    mostrarNotificacion('¡Completaste los 25 problemas de compra! Excelente trabajo.', 'success');

    const ordenLlegada = calcularSiguienteOrdenLlegada();
    actualizarEstudianteEnLobby({
        nombre: nombreEstudiante,
        grado: gradoEstudiante,
        seccion: seccionEstudiante,
        score: puntajeActual,
        nivel: nivelActual,
        ronda: rondaActual,
        errores: totalErrores,
        tiempo: tiempoTotalJugado,
        activo: false,
        ordenLlegada
    });

    procesarYMostrarResultados();
}

function crearNuevoReto() {
    vaciarCarrito();

    const siguienteRonda = Math.min(rondaActual + 1, totalRondasObjetivo);
    rondaActual = siguienteRonda;
    actualizarPreciosPorRonda();

    retoActivo = generarRetoMatematico(nivelActual, rondaActual);
    tiempoRestanteReto = retoActivo.tiempo || 55;
    document.getElementById('challenge-desc').innerText = retoActivo.descripcion;
    document.getElementById('hud-puntos').innerText = puntajeActual;
    document.getElementById('hud-nivel').innerText = nivelActual;
    document.getElementById('hud-ronda').innerText = `${rondaActual}/${totalRondasObjetivo}`;
    document.getElementById('monto-pagado').innerText = 'S/ 0.00';
    montoColocadoPago = 0;

    actualizarBarraTiempo();
    if (temporizadorReto) clearInterval(temporizadorReto);
    temporizadorReto = setInterval(() => {
        tiempoRestanteReto--;
        document.getElementById('hud-timer').innerText = tiempoRestanteReto;
        actualizarBarraTiempo();

        if (tiempoRestanteReto <= 0) {
            clearInterval(temporizadorReto);
            sonarEfecto('error');
            mostrarNotificacion('Se acabó el tiempo de compra para este cliente.', 'warning');
            totalErrores++;
            crearNuevoReto();
        }
    }, 1000);

    actualizarEstudianteEnLobby({
        nombre: nombreEstudiante,
        grado: gradoEstudiante,
        seccion: seccionEstudiante,
        score: puntajeActual,
        nivel: nivelActual,
        ronda: rondaActual,
        errores: totalErrores,
        tiempo: tiempoTotalJugado,
        activo: true
    });
}

function actualizarBarraTiempo() {
    const fill = document.getElementById('timer-bar');
    const pct = (tiempoRestanteReto / 60) * 100;
    fill.style.width = `${pct}%`;
    if (pct < 30) {
        fill.style.backgroundColor = 'var(--red-kid)';
    } else {
        fill.style.backgroundColor = 'var(--green-kid)';
    }
}

// --- GENERADOR DE RETOS MATEMÁTICOS ---
function generarRetoMatematico(nivel, problemaIndex = 1) {
    const semilla = generarSemillaUnica(obtenerSemillaDeJuego(), String(problemaIndex), String(nivel));
    const cantidadProductos = 2 + (Math.abs(semilla) % 3); // 2, 3 o 4 productos
    const seleccion = [];
    let candidato = Math.abs(semilla) % productosConPrecios.length;

    while (seleccion.length < cantidadProductos) {
        const producto = productosConPrecios[candidato % productosConPrecios.length];
        if (!seleccion.some(p => p.id === producto.id)) {
            seleccion.push(producto);
        }
        candidato += 1 + ((problemaIndex + seleccion.length) % 5);
    }

    const nombres = seleccion.map(p => `${p.emoji} ${p.nombre}`);
    const listaProductos = nombres.length > 1
        ? nombres.slice(0, -1).join(', ') + ' y ' + nombres.slice(-1)
        : nombres[0];

    const sumaBase = seleccion.reduce((total, prod) => total + prod.precio, 0);
    const incrementoPorRonda = 1 + (rondaActual / totalRondasObjetivo) * 0.35;
    const precioMeta = parseFloat((Math.round(sumaBase * incrementoPorRonda * 2) / 2).toFixed(2));

    const tiempoBase = 65 - (cantidadProductos - 2) * 8 - Math.floor((rondaActual - 1) / 7) * 3;
    const tiempoAsignado = Math.max(30, tiempoBase);

    const billetes = [5, 10, 20, 50, 100, 200];
    const billete = billetes[Math.abs(semilla + 3) % billetes.length];
    const tipoReto = Math.abs(semilla + problemaIndex) % 7;
    const cantidadRepetida = 2 + ((Math.abs(semilla + 5) % 3));
    const descuentoPct = 10 + ((Math.abs(semilla + 9) % 5) * 5);

    switch (tipoReto) {
        case 0:
            return {
                descripcion: `Problema ${problemaIndex}: compra ${listaProductos} y paga S/ ${precioMeta.toFixed(2)} exactos. Usa las monedas y billetes del cajero.`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => ({ ok: total === precioMeta, msg: `El total correcto era S/ ${precioMeta.toFixed(2)}.` })
            };

        case 1: {
            const vuelto = parseFloat((billete - precioMeta).toFixed(2));
            return {
                descripcion: `Problema ${problemaIndex}: el cliente paga con un billete de S/ ${billete}. Compra ${listaProductos} y devuelve el vuelto correcto: S/ ${vuelto.toFixed(2)}.`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => ({ ok: total === vuelto, msg: `El vuelto correcto era S/ ${vuelto.toFixed(2)}.` })
            };
        }

        case 2: {
            const producto = seleccion[0];
            const precioRepetido = parseFloat((producto.precio * cantidadRepetida).toFixed(2));
            return {
                descripcion: `Problema ${problemaIndex}: lleva ${cantidadRepetida} unidades de ${producto.emoji} ${producto.nombre}. ¿Cuánto pagas?`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => {
                    const cumple = car.some(i => i.id === producto.id && i.cant === cantidadRepetida);
                    return { ok: cumple && total === precioRepetido, msg: `El total correcto era S/ ${precioRepetido.toFixed(2)}.` };
                }
            };
        }

        case 3: {
            const producto = seleccion[0];
            const precioConDescuento = parseFloat((producto.precio * (1 - descuentoPct / 100)).toFixed(2));
            return {
                descripcion: `Problema ${problemaIndex}: la ${producto.emoji} ${producto.nombre} tiene ${descuentoPct}% de descuento. Compra 1 unidad y paga S/ ${precioConDescuento.toFixed(2)}.`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => ({ ok: car.some(i => i.id === producto.id && i.cant === 1) && total === precioConDescuento, msg: `El precio con descuento era S/ ${precioConDescuento.toFixed(2)}.` })
            };
        }

        case 4: {
            const precioCombo = parseFloat((precioMeta + 1.5).toFixed(2));
            return {
                descripcion: `Problema ${problemaIndex}: arma un combo con ${listaProductos} y paga S/ ${precioCombo.toFixed(2)}.`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => ({ ok: total === precioCombo, msg: `El combo costaba S/ ${precioCombo.toFixed(2)}.` })
            };
        }

        case 5: {
            const totalBillete = Math.max(billete, precioMeta + 5);
            const vuelto = parseFloat((totalBillete - precioMeta).toFixed(2));
            return {
                descripcion: `Problema ${problemaIndex}: el cliente paga con S/ ${totalBillete}. Compra ${listaProductos} y devuelve S/ ${vuelto.toFixed(2)} de vuelto.`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => ({ ok: total === vuelto, msg: `El vuelto correcto era S/ ${vuelto.toFixed(2)}.` })
            };
        }

        default: {
            return {
                descripcion: `Problema ${problemaIndex}: revisa ${listaProductos} y paga S/ ${precioMeta.toFixed(2)} exactos con monedas y billetes reales.`,
                tiempo: tiempoAsignado,
                evaluar: (car, total) => ({ ok: total === precioMeta, msg: `El total correcto era S/ ${precioMeta.toFixed(2)}.` })
            };
        }
    }
}


/**
 * ==========================================
 * SISTEMA INTERACTIVO DE CARRITO
 * ==========================================
 */
function agregarAlCarrito(id) {
    sonarEfecto('click');
    const prod = productosConPrecios.find(p => p.id === id);
    const yaExiste = carrito.find(item => item.id === id);

    if (yaExiste) {
        yaExiste.cant++;
    } else {
        carrito.push({ ...prod, cant: 1 });
    }
    renderizarCarrito();
}

function eliminarDelCarrito(id) {
    sonarEfecto('click');
    carrito = carrito.filter(item => item.id !== id);
    renderizarCarrito();
}

function vaciarCarrito() {
    carrito = [];
    montoColocadoPago = 0;
    renderizarCarrito();
    document.getElementById('monto-pagado').innerText = "S/ 0.00";
}

function renderizarCarrito() {
    const listDOM = document.getElementById('carrito-items');
    listDOM.innerHTML = '';

    if (carrito.length === 0) {
        listDOM.innerHTML = `<p class="empty-cart-msg">El carrito está vacío</p>`;
        actualizarTotalesCarrito(0);
        return;
    }

    let subtotal = 0;
    carrito.forEach(item => {
        const itemTotal = item.precio * item.cant;
        subtotal += itemTotal;

        const row = document.createElement('div');
        row.className = "cart-item";
        row.innerHTML = `
            <span>${item.emoji} ${item.nombre} x${item.cant}</span>
            <div>
                <span>S/ ${itemTotal.toFixed(2)}</span>
                <button class="btn btn-red btn-sm" onclick="eliminarDelCarrito(${item.id})" style="margin-left:8px; padding:3px 6px;">X</button>
            </div>
        `;
        listDOM.appendChild(row);
    });

    actualizarTotalesCarrito(subtotal);
}

function actualizarTotalesCarrito(subtotal) {
    let descuento = 0;
    
    // Si estamos en nivel de descuentos, aplicamos la regla visual
    if (nivelActual === 5 && carrito.length > 0) {
        // En nivel 5 evaluamos la manzana (primer elemento con descuento si está)
        const itemBuscado = carrito[0];
        descuento = (itemBuscado.precio * itemBuscado.cant) * 0.20; 
    }

    const total = Math.max(0, subtotal - descuento);

    document.getElementById('cart-subtotal').innerText = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById('cart-descuento').innerText = `S/ ${descuento.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `S/ ${total.toFixed(2)}`;
}


/**
 * ==========================================
 * SISTEMA DE CAJA REGISTRADORA VIRTUAL
 * ==========================================
 */
function agregarDineroPago(monto) {
    sonarEfecto('click');
    montoColocadoPago += monto;
    document.getElementById('monto-pagado').innerText = `S/ ${montoColocadoPago.toFixed(2)}`;
}

function resetearPago() {
    montoColocadoPago = 0;
    document.getElementById('monto-pagado').innerText = 'S/ 0.00';
    mostrarNotificacion('Puedes volver a ingresar monedas y billetes.', 'info');
}

function procesarPagoReto() {
    if (!retoActivo) return;

    // Evaluamos el carrito comprado y el pago
    const resultado = retoActivo.evaluar(carrito, montoColocadoPago);

    if (resultado.ok) {
        totalAciertos++;
        sonarEfecto('correcto');
        mostrarNotificacion('¡Excelente compra! El cajero validó tu pago con éxito.', 'success');
        puntajeActual += 15;
        
        // Subir de nivel de forma lógica cada 30 puntos
        if (puntajeActual >= nivelActual * 30 && nivelActual < 8) {
            nivelActual++;
            mostrarNotificacion(`¡Felicidades! Subiste al Nivel ${nivelActual}.`, 'info');
        }

        if (rondaActual >= totalRondasObjetivo) {
            finalizarJuegoEstudiante();
        } else {
            crearNuevoReto();
        }
    } else {
        sonarEfecto('error');
        totalErrores++;
        mostrarNotificacion(`Monto incorrecto. ${resultado.msg}. ¡Sigue intentando!`, 'error');
        
        // Reset del pago para permitir corregir
        montoColocadoPago = 0;
        document.getElementById('monto-pagado').innerText = "S/ 0.00";

        // Registrar error en "base de datos"
        actualizarEstudianteEnLobby({
            nombre: nombreEstudiante,
            grado: gradoEstudiante,
            seccion: seccionEstudiante,
            score: puntajeActual,
            nivel: nivelActual,
            ronda: rondaActual,
            errores: totalErrores,
            tiempo: tiempoTotalJugado,
            activo: true
        });
    }
}


/**
 * ==========================================
 * PROCESAMIENTO Y TABLA DE RESULTADOS FINALES
 * ==========================================
 */
function procesarYMostrarResultados() {
    mostrarPantalla('pantalla-resultados');

    const estudiantes = obtenerEstudiantesDeSala(codigoSalaActual);
    
    document.getElementById('final-aciertos').innerText = totalAciertos;
    document.getElementById('final-errores').innerText = totalErrores;
    document.getElementById('final-puntos').innerText = `${puntajeActual} pts`;
    
    // Ordenar de mayor a menor puntaje para el podio
    estudiantes.sort((a, b) => b.score - a.score);

    // Renderizar Podio de Ganadores
    document.getElementById('podio-nombre-1').innerText = estudiantes[0] ? estudiantes[0].nombre : 'Vacante';
    document.getElementById('podio-score-1').innerText = estudiantes[0] ? `${estudiantes[0].score} pts` : '0 pts';

    document.getElementById('podio-nombre-2').innerText = estudiantes[1] ? estudiantes[1].nombre : 'Vacante';
    document.getElementById('podio-score-2').innerText = estudiantes[1] ? `${estudiantes[1].score} pts` : '0 pts';

    document.getElementById('podio-nombre-3').innerText = estudiantes[2] ? estudiantes[2].nombre : 'Vacante';
    document.getElementById('podio-score-3').innerText = estudiantes[2] ? `${estudiantes[2].score} pts` : '0 pts';

    // Rellenar tabla final
    const tbody = document.getElementById('cuerpo-tabla-finales');
    tbody.innerHTML = '';

    if (estudiantes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No hubo participantes registrados en la partida.</td></tr>`;
    } else {
        estudiantes.forEach((est, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${index + 1}</strong></td>
                <td>👦👧 ${est.nombre}</td>
                <td>${est.grado} "${est.seccion}"</td>
                <td><span class="total-highlight">${est.score} pts</span></td>
                <td>Nivel ${est.nivel}</td>
                <td>${est.errores} fallos</td>
                <td>${est.tiempo} segundos</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Configurar Botones Dinámicos al final
    const actionsRow = document.getElementById('final-actions');
    actionsRow.innerHTML = '';

    if (miRol === 'docente') {
        actionsRow.innerHTML = `
            <button class="btn btn-action" onclick="exportarResultadosCSV()">📥 Descargar Excel (.CSV)</button>
            <button class="btn btn-docente" onclick="irAlInicio()">🏠 Salir al Inicio</button>
        `;
    } else {
        actionsRow.innerHTML = `
            <button class="btn btn-play" onclick="jugarDeNuevo()">🔄 Jugar de nuevo</button>
            <button class="btn btn-estudiante" onclick="irAlInicio()">🏠 Volver al Inicio</button>
        `;
    }
}

function jugarDeNuevo() {
    desconectarYSalir();
    window.location.reload();
}

// --- EXPORTAR A EXCEL DIRECTO (CSV COMPATIBLE) ---
function exportarResultadosCSV() {
    const estudiantes = obtenerEstudiantesDeSala(codigoSalaActual);
    if (estudiantes.length === 0) {
        mostrarNotificacion('No hay datos cargados para exportar.', 'warning');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Cabecera del archivo
    csvContent += "Puesto,Estudiante,Grado,Seccion,Puntaje Final,Nivel Alcanzado,Errores Cometidos,Tiempo Activo (Segundos)\n";

    estudiantes.sort((a, b) => b.score - a.score);
    estudiantes.forEach((est, index) => {
        const fila = `"${index + 1}","${est.nombre}","${est.grado}","${est.seccion}","${est.score}","${est.nivel}","${est.errores}","${est.tiempo}"`;
        csvContent += fila + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TiendaMatematica_Resultados_Sala_${codigoSalaActual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


/**
 * ==========================================
 * SISTEMA DE LIMPIEZA / DESCONEXIÓN
 * ==========================================
 */
function desconectarYSalir() {
    if (syncInterval) clearInterval(syncInterval);
    if (temporizadorReto) clearInterval(temporizadorReto);
    if (temporizadorTotal) clearInterval(temporizadorTotal);

    if (miRol === 'estudiante' && nombreEstudiante) {
        // Marcarnos como desconectados
        eliminarDatoPersistente(`estudiante_${codigoSalaActual}_${nombreEstudiante}`);
    }

    miRol = null;
    codigoSalaActual = '';
    nombreEstudiante = '';
    gradoEstudiante = '';
    seccionEstudiante = '';
    carrito = [];
    montoColocadoPago = 0;
}