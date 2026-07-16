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
let channelSync = null;
let servidorWiFi = '';
let ultimoEstadoSala = null;
let autoSyncActivo = false;
let rondaActual = 0;
let totalRondasObjetivo = 30;

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
    { id: 16, emoji: "🥪", nombre: "Sandwich" }
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
}

function irAlInicio() {
    desconectarYSalir();
    mostrarPantalla('pantalla-inicio');
}

window.addEventListener('DOMContentLoaded', () => {
    const btnVolver = document.getElementById('btn-volver-inicio');
    if (btnVolver) btnVolver.addEventListener('click', irAlInicio);

    const btnDocenteInicio = document.getElementById('btn-docente-inicio');
    if (btnDocenteInicio) btnDocenteInicio.addEventListener('click', irARegistroDocente);

    const btnEstudianteInicio = document.getElementById('btn-estudiante-inicio');
    if (btnEstudianteInicio) btnEstudianteInicio.addEventListener('click', irAAccessoEstudiante);

    const btnGenerarSala = document.getElementById('btn-generar-sala');
    if (btnGenerarSala) btnGenerarSala.addEventListener('click', crearSalaJuego);

    const btnIngresarEstudiante = document.getElementById('btn-ingresar-estudiante');
    if (btnIngresarEstudiante) btnIngresarEstudiante.addEventListener('click', unirseASalaEstudiante);

    inicializarPersistenciaReactiva();
});

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
    if (!salaRaw) {
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
                // Se mantiene el modo local si el servidor no responde.
            }
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
        if (!base || !codigoSalaActual) return;

        try {
            const respuesta = await fetch(`${base}/api/state/${codigoSalaActual}`);
            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos?.sala) {
                    ultimoEstadoSala = datos.sala;
                    guardarDatoPersistente(`sala_${codigoSalaActual}`, JSON.stringify(datos.sala));
                }
            }
        } catch (error) {
            // Sincronización externa no disponible; se mantiene el modo local.
        }
    };

    refrescarDesdeServidor();

    // Verificación cada segundo para simular comunicación bidireccional inmediata
    syncInterval = setInterval(() => {
        const salaRaw = leerDatoPersistente(`sala_${codigoSalaActual}`);
        if (!salaRaw) return;

        const sala = JSON.parse(salaRaw);
        const estudiantes = Array.isArray(sala?.estudiantes) && sala.estudiantes.length > 0
            ? sala.estudiantes
            : obtenerEstudiantesDeSala(codigoSalaActual);

        // --- VISTA DOCENTE ---
        actualizarVistaDesdeSala(sala);

        if (miRol === 'docente') {
            if (document.getElementById('pantalla-control-docente').classList.contains('active')) {
                // Actualizar Panel de monitoreo en vivo
                const estudiantesControl = Array.isArray(sala?.estudiantes) ? sala.estudiantes : estudiantes;
                actualizarPanelSeguimientoDocente(estudiantesControl);
            }
        }

        // --- VISTA ESTUDIANTE ---
        if (miRol === 'estudiante') {
            if (document.getElementById('pantalla-espera-estudiante').classList.contains('active')) {
                const estudiantesActuales = Array.isArray(sala?.estudiantes) ? sala.estudiantes : estudiantes;
                actualizarContadorEstudiante(estudiantesActuales);

                // Si el docente da inicio a la partida
                if (sala.estado === 'jugando') {
                    comenzarDesafiosEstudiante();
                }
            }

            // Si el docente finaliza la partida mientras el alumno está comprando
            if (sala.estado === 'finalizado' && document.getElementById('pantalla-juego').classList.contains('active')) {
                clearInterval(temporizadorReto);
                clearInterval(temporizadorTotal);
                procesarYMostrarResultados();
            }
        }
    }, 1000);
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
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Esperando a que entren los alumnos...</td></tr>`;
        return;
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
            <td><span class="counter-badge" style="background-color: var(--green-kid);">Jugando</span></td>
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
        const variacion = ((rondaActual + index) % 5) * 0.50;
        const baseAleatoria = ((semilla + index * 13) % 9) + 1;
        const precioBase = 1 + baseAleatoria + (index % 3) * 0.5;
        const precioFinal = parseFloat((precioBase + variacion + (semilla % 10) * 0.08).toFixed(2));
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
    mostrarNotificacion('¡Completaste los 30 problemas de compra! Excelente trabajo.', 'success');
    procesarYMostrarResultados();
}

function crearNuevoReto() {
    vaciarCarrito();
    tiempoRestanteReto = 60;
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

    const siguienteRonda = Math.min(rondaActual + 1, totalRondasObjetivo);
    rondaActual = siguienteRonda;
    actualizarPreciosPorRonda();

    retoActivo = generarRetoMatematico(nivelActual, rondaActual);
    document.getElementById('challenge-desc').innerText = retoActivo.descripcion;
    document.getElementById('hud-puntos').innerText = puntajeActual;
    document.getElementById('hud-nivel').innerText = nivelActual;
    document.getElementById('hud-ronda').innerText = `${rondaActual}/${totalRondasObjetivo}`;

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
    const r1 = productosConPrecios[Math.abs(semilla) % productosConPrecios.length];
    let r2 = productosConPrecios[Math.abs(semilla + 7) % productosConPrecios.length];
    while (r1.id === r2.id) {
        r2 = productosConPrecios[Math.abs(semilla + 11) % productosConPrecios.length];
    }

    const tipoReto = (problemaIndex - 1) % 10;
    const cantidad = 2 + ((semilla + problemaIndex) % 3);
    const descuentoPct = 10 + ((semilla + problemaIndex) % 5) * 5;
    const metaDinero = 12 + ((semilla + problemaIndex) % 9) + (problemaIndex % 3);

    switch (tipoReto) {
        case 0:
            return {
                descripcion: `Problema ${problemaIndex}: compra exactamente 1 ${r1.emoji} y 1 ${r2.emoji}. Paga la cantidad correcta para este cliente personalizado.`,
                evaluar: (car, total) => {
                    const tieneR1 = car.some(i => i.id === r1.id && i.cant === 1);
                    const tieneR2 = car.some(i => i.id === r2.id && i.cant === 1);
                    const correcto = (tieneR1 && tieneR2 && car.length === 2);
                    const precioReal = r1.precio + r2.precio;
                    return { ok: correcto && total === precioReal, msg: `El total correcto era S/ ${precioReal.toFixed(2)}` };
                }
            };

        case 1: {
            const billeteSencillo = 20;
            const precioSuma = r1.precio + r2.precio;
            const vueltoEsperado = billeteSencillo - precioSuma;
            return {
                descripcion: `Problema ${problemaIndex}: tienes un billete de S/20. Compra 1 ${r1.emoji} y 1 ${r2.emoji} y calcula cuántos soles de vuelto recibes.`,
                evaluar: (car, total) => {
                    const tieneR1 = car.some(i => i.id === r1.id);
                    const tieneR2 = car.some(i => i.id === r2.id);
                    return { ok: tieneR1 && tieneR2 && parseFloat(total.toFixed(2)) === parseFloat(vueltoEsperado.toFixed(2)), msg: `El vuelto correcto era S/ ${vueltoEsperado.toFixed(2)}` };
                }
            };
        }

        case 2: {
            const precioMult = r1.precio * cantidad;
            return {
                descripcion: `Problema ${problemaIndex}: lleva exactamente ${cantidad} unidades de ${r1.emoji}. ¿Cuánto pagarás en total?`,
                evaluar: (car, total) => {
                    const cumpleCant = car.some(i => i.id === r1.id && i.cant === cantidad);
                    return { ok: cumpleCant && car.length === 1 && total === precioMult, msg: `El precio de ${cantidad} unidades es S/ ${precioMult.toFixed(2)}` };
                }
            };
        }

        case 3: {
            const precioPar = Math.round(r1.precio) * 2;
            return {
                descripcion: `Problema ${problemaIndex}: si 2 unidades de ${r1.emoji} cuestan S/ ${precioPar.toFixed(2)}, compra solo una unidad y paga su precio justo.`,
                evaluar: (car, total) => {
                    const precioUnitario = precioPar / 2;
                    const tieneR1 = car.some(i => i.id === r1.id && i.cant === 1);
                    return { ok: tieneR1 && car.length === 1 && total === precioUnitario, msg: `La mitad de S/ ${precioPar.toFixed(2)} es S/ ${precioUnitario.toFixed(2)}` };
                }
            };
        }

        case 4: {
            const descuentoMonto = r1.precio * (descuentoPct / 100);
            const precioFinalDescuento = r1.precio - descuentoMonto;
            return {
                descripcion: `Problema ${problemaIndex}: ¡Oferta del ${descuentoPct}%! La ${r1.emoji} tiene descuento. Agrégala y paga su precio rebajado.`,
                evaluar: (car, total) => {
                    const tieneR1 = car.some(i => i.id === r1.id && i.cant === 1);
                    return { ok: tieneR1 && car.length === 1 && parseFloat(total.toFixed(2)) === parseFloat(precioFinalDescuento.toFixed(2)), msg: `El precio rebajado era S/ ${precioFinalDescuento.toFixed(2)}` };
                }
            };
        }

        case 5: {
            const precioCombo = r1.precio + r2.precio + (r1.precio * 0.5);
            return {
                descripcion: `Problema ${problemaIndex}: forma un combo con ${r1.emoji} y ${r2.emoji}; paga exactamente S/ ${precioCombo.toFixed(2)}.`,
                evaluar: (car, total) => {
                    const tieneR1 = car.some(i => i.id === r1.id && i.cant === 1);
                    const tieneR2 = car.some(i => i.id === r2.id && i.cant === 1);
                    return { ok: tieneR1 && tieneR2 && car.length === 2 && total === precioCombo, msg: `El combo cuesta S/ ${precioCombo.toFixed(2)}` };
                }
            };
        }

        case 6: {
            const precioTriple = r1.precio * 3;
            return {
                descripcion: `Problema ${problemaIndex}: lleva 3 unidades de ${r1.emoji} y paga el total justo.`,
                evaluar: (car, total) => {
                    const cumpleCant = car.some(i => i.id === r1.id && i.cant === 3);
                    return { ok: cumpleCant && car.length === 1 && total === precioTriple, msg: `3 unidades cuestan S/ ${precioTriple.toFixed(2)}` };
                }
            };
        }

        case 7: {
            return {
                descripcion: `Problema ${problemaIndex}: compra libre, llena el carrito con distintos productos y paga exactamente S/ ${metaDinero.toFixed(2)}.`,
                evaluar: (car, total) => {
                    return { ok: total === metaDinero, msg: `El monto final pagado debe ser de S/ ${metaDinero.toFixed(2)} exactos.` };
                }
            };
        }

        case 8: {
            const precioDoble = r1.precio * 2 + r2.precio;
            return {
                descripcion: `Problema ${problemaIndex}: toma ${r1.emoji} y ${r2.emoji} en doble y simple cantidad, y paga S/ ${precioDoble.toFixed(2)}.`,
                evaluar: (car, total) => {
                    const tieneR1 = car.some(i => i.id === r1.id && i.cant === 2);
                    const tieneR2 = car.some(i => i.id === r2.id && i.cant === 1);
                    return { ok: tieneR1 && tieneR2 && car.length === 2 && total === precioDoble, msg: `El total correcto era S/ ${precioDoble.toFixed(2)}` };
                }
            };
        }

        default: {
            const precioFinal = r1.precio + (r2.precio * 0.75);
            return {
                descripcion: `Problema ${problemaIndex}: compra ${r1.emoji} y ${r2.emoji}; el total debe ser S/ ${precioFinal.toFixed(2)}.`,
                evaluar: (car, total) => {
                    const tieneR1 = car.some(i => i.id === r1.id && i.cant === 1);
                    const tieneR2 = car.some(i => i.id === r2.id && i.cant === 1);
                    return { ok: tieneR1 && tieneR2 && car.length === 2 && total === precioFinal, msg: `El total correcto era S/ ${precioFinal.toFixed(2)}` };
                }
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

function procesarPagoReto() {
    if (!retoActivo) return;

    // Evaluamos el carrito comprado y el pago
    const resultado = retoActivo.evaluar(carrito, montoColocadoPago);

    if (resultado.ok) {
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
            <button class="btn btn-estudiante" onclick="irAlInicio()">🏠 Volver a Empezar</button>
        `;
    }
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