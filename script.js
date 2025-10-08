// === CONFIGURACIÓN DE API KEY DESDE MOCKAPI ===
let OPENAI_API_KEY = "";

// Palabra de activación
const ACTIVACION = "nacho";

// Lista de órdenes permitidas con status_clave y status_texto
const ORDENES = [
  { clave: 1, texto: "adelante" },
  { clave: 2, texto: "atrás" },
  { clave: 3, texto: "detener" },
  { clave: 4, texto: "vuelta adelante derecha" },
  { clave: 5, texto: "vuelta adelante izquierda" },
  { clave: 6, texto: "vuelta atrás derecha" },
  { clave: 7, texto: "vuelta atrás izquierda" },
  { clave: 8, texto: "giro 90° derecha" },
  { clave: 9, texto: "giro 90° izquierda" },
  { clave: 10, texto: "giro 360° derecha" },
  { clave: 11, texto: "giro 360° izquierda" }
];

// Estado de activación
let asistenteActivo = false;
let reconocimientoActivo = false;
let silenciado = false;
let ultimaTranscripcion = "";
let intentosReconexion = 0;
const MAX_INTENTOS_RECONEXION = 3;

// Elementos de UI
const btnIniciar = document.getElementById("btnIniciar");
const btnDetener = document.getElementById("btnDetener");
const btnSilenciar = document.getElementById("btnSilenciar");
const statusTexto = document.getElementById("statusTexto");
const statusCard = document.getElementById("statusCard");
const estadoAsistente = document.getElementById("estadoAsistente");
const voiceAnimation = document.getElementById("voiceAnimation");
const lastCommand = document.getElementById("lastCommand");
const lastCommandText = document.getElementById("lastCommandText");

// Función para obtener la API key de MockAPI
async function obtenerApiKey() {
    try {
        console.log("Obteniendo API key desde MockAPI...");
        const response = await fetch('https://68e5385b8e116898997ee4b5.mockapi.io/apikey');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.length > 0 && data[0].api_key) {
            OPENAI_API_KEY = data[0].api_key;
            console.log("✅ API key obtenida exitosamente de MockAPI");
            return true;
        } else {
            throw new Error("No se encontró la API key en la respuesta");
        }
    } catch (error) {
        console.error("❌ Error obteniendo API key de MockAPI:", error);
        mostrarErrorApiKey();
        return false;
    }
}

// Función para mostrar error de API key
function mostrarErrorApiKey() {
    statusTexto.textContent = "❌ Error: No se pudo obtener la API key. Verifica la conexión.";
    statusTexto.style.color = "#ef4444";
    
    statusCard.classList.add("status-error");
    
    // Deshabilitar botones hasta que tengamos la API key
    if (btnIniciar) {
        btnIniciar.disabled = true;
        btnIniciar.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Error de Configuración';
        btnIniciar.classList.remove("btn-success");
        btnIniciar.classList.add("btn-danger");
    }
}

// Función para mostrar error de navegador
function mostrarErrorNavegador() {
    statusTexto.textContent = "Tu navegador no soporta reconocimiento de voz. Prueba con Chrome o Edge.";
    btnIniciar.disabled = true;
    btnIniciar.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Navegador No Compatible';
    btnIniciar.classList.remove("btn-success");
    btnIniciar.classList.add("btn-warning");
}

// Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', async function() {
    // Mostrar mensaje de carga
    statusTexto.textContent = "🔄 Cargando configuración...";
    
    // Obtener la API key al cargar la página
    const apiKeyObtenida = await obtenerApiKey();
    
    if (apiKeyObtenida && SpeechRecognition) {
        inicializarReconocimientoVoz();
        statusTexto.textContent = "✅ Sistema listo. Haz clic en 'Iniciar Reconocimiento'";
    } else if (!SpeechRecognition) {
        mostrarErrorNavegador();
    }
});

function inicializarReconocimientoVoz() {
    const recognition = new SpeechRecognition();
    
    // MEJORAS PARA MEJOR RECONOCIMIENTO
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;  // Resultados intermedios para feedback visual
    recognition.maxAlternatives = 3;    // Obtener alternativas de reconocimiento
    
    // Configuraciones específicas por navegador
    if (typeof webkitSpeechRecognition !== 'undefined') {
        // Chrome-specific optimizations
        recognition.continuous = true;
        recognition.interimResults = true;
    }

    // === EVENTOS DE RECONOCIMIENTO MEJORADOS ===
    recognition.onstart = () => {
        reconocimientoActivo = true;
        intentosReconexion = 0; // Resetear contador de reconexión
        actualizarInterfaz();
        console.log("Reconocimiento de voz iniciado");
        
        // Mostrar estado de escucha activa
        statusTexto.textContent = "🎤 Escuchando activamente... Di 'nacho' para activar";
        statusCard.classList.remove("status-error", "status-processing");
        statusCard.classList.add("status-listening");
    };

    recognition.onend = () => {
        console.log("Reconocimiento de voz finalizado");
        
        // Reconexión automática si no fue detenido manualmente
        if (reconocimientoActivo && intentosReconexion < MAX_INTENTOS_RECONEXION) {
            intentosReconexion++;
            console.log(`Reconectando... Intento ${intentosReconexion} de ${MAX_INTENTOS_RECONEXION}`);
            
            setTimeout(() => {
                if (reconocimientoActivo) {
                    try {
                        recognition.start();
                        statusTexto.textContent = "🔄 Reconectando reconocimiento de voz...";
                    } catch (e) {
                        console.error("Error al reconectar:", e);
                    }
                }
            }, 500);
        } else {
            reconocimientoActivo = false;
            actualizarInterfaz();
            
            if (intentosReconexion >= MAX_INTENTOS_RECONEXION) {
                statusTexto.textContent = "❌ Reconocimiento detenido después de múltiples intentos fallidos";
                statusCard.classList.add("status-error");
            }
        }
    };

    recognition.onerror = (event) => {
        console.error("Error en reconocimiento:", event.error);
        
        // Manejo específico de errores comunes
        switch (event.error) {
            case 'no-speech':
                statusTexto.textContent = "🔇 No se detectó voz. Sigue hablando...";
                break;
            case 'audio-capture':
                statusTexto.textContent = "❌ No se pudo acceder al micrófono. Verifica los permisos.";
                break;
            case 'not-allowed':
                statusTexto.textContent = "❌ Permiso de micrófono denegado. Permite el acceso al micrófono.";
                break;
            case 'network':
                statusTexto.textContent = "🌐 Error de red. Verifica tu conexión a Internet.";
                break;
            default:
                statusTexto.textContent = `❌ Error: ${event.error}`;
        }
        
        statusCard.classList.add("status-error");
        
        // No reiniciar inmediatamente para errores graves
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
            reconocimientoActivo = false;
            actualizarInterfaz();
            btnIniciar.disabled = true;
            btnIniciar.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Error de Micrófono';
        } else {
            // Reiniciar después de un breve delay para otros errores
            setTimeout(() => {
                if (reconocimientoActivo) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error("Error al reiniciar después de error:", e);
                    }
                }
            }, 1000);
        }
    };

    recognition.onresult = async (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Procesar todos los resultados
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Mostrar resultados intermedios para feedback visual
        if (interimTranscript) {
            statusTexto.textContent = `🎤 Escuchando: "${interimTranscript}"`;
            statusCard.classList.remove("status-error");
            statusCard.classList.add("status-listening");
        }

        // Procesar resultado final
        if (finalTranscript) {
            const transcript = finalTranscript.toLowerCase().trim();
            console.log("Escuchado (final):", transcript);
            ultimaTranscripcion = transcript;
            
            // Mostrar lo escuchado
            statusTexto.textContent = `🗣️ Dijiste: "${transcript}"`;
            statusCard.classList.remove("status-listening", "status-active", "status-error");
            statusCard.classList.add("status-processing");
            
            // Verificar si es la palabra de activación (con tolerancia a variaciones)
            if (!asistenteActivo && contieneActivacion(transcript)) {
                asistenteActivo = true;
                estadoAsistente.textContent = "Activo";
                estadoAsistente.className = "badge bg-success";
                statusTexto.textContent = "✅ Nacho activado. Di una orden...";
                statusCard.classList.remove("status-processing");
                statusCard.classList.add("status-active");
                
                if (!silenciado) {
                    hablar("Nacho activado. En qué puedo ayudarte?");
                }
                return;
            }
            
            // Si el asistente está activo, procesar la orden
            if (asistenteActivo) {
                const orden = await interpretarOrden(transcript);
                if (orden) {
                    statusTexto.textContent = `✅ Orden #${orden.clave} ejecutada: ${orden.texto}`;
                    lastCommandText.textContent = `#${orden.clave}: ${orden.texto}`;
                    lastCommand.classList.remove("d-none");
                    
                    // Aquí puedes enviar la orden.clave a tu servidor/API para controlar el robot
                    enviarOrdenAlRobot(orden.clave);
                    
                    if (!silenciado) {
                        hablar(`Ejecutando ${orden.texto}`);
                    }
                    
                    // Efecto visual de confirmación
                    statusCard.classList.add("pulse");
                    setTimeout(() => statusCard.classList.remove("pulse"), 2000);
                } else {
                    statusTexto.textContent = "❌ No se reconoció una orden válida.";
                    statusCard.classList.add("status-error");
                    
                    if (!silenciado) {
                        hablar("No entendí esa orden. Por favor, intenta de nuevo.");
                    }
                }
                
                asistenteActivo = false;
                estadoAsistente.textContent = "Inactivo";
                estadoAsistente.className = "badge bg-secondary";
                statusCard.classList.remove("status-processing", "status-active");
            }
        }
    };

    // === CONTROL DE BOTONES MEJORADO ===
    btnIniciar.addEventListener("click", () => {
        iniciarReconocimiento(recognition);
    });

    btnDetener.addEventListener("click", () => {
        detenerReconocimiento(recognition);
    });

    btnSilenciar.addEventListener("click", () => {
        silenciado = !silenciado;
        btnSilenciar.innerHTML = silenciado ? 
            '<i class="fas fa-volume-up me-2"></i>Activar Voz' : 
            '<i class="fas fa-volume-mute me-2"></i>Silenciar Asistente';
        btnSilenciar.classList.toggle("btn-primary", !silenciado);
        btnSilenciar.classList.toggle("btn-secondary", silenciado);
        
        // Feedback visual del estado de silencio
        if (silenciado) {
            btnSilenciar.classList.add("pulse");
            setTimeout(() => btnSilenciar.classList.remove("pulse"), 1000);
        }
    });
    
    // === FUNCIÓN PARA ACTUALIZAR INTERFAZ ===
    function actualizarInterfaz() {
        if (reconocimientoActivo) {
            btnIniciar.classList.add("d-none");
            btnDetener.classList.remove("d-none");
            voiceAnimation.classList.remove("d-none");
        } else {
            btnIniciar.classList.remove("d-none");
            btnDetener.classList.add("d-none");
            voiceAnimation.classList.add("d-none");
        }
    }
}

// Función mejorada para detectar activación con tolerancia
function contieneActivacion(transcript) {
    const patronesActivacion = [
        ACTIVACION,
        "nasho",       // common mispronunciation
        "nacho robot",
        "hola nacho",
        "oye nacho",
        "ok nacho"
    ];
    
    return patronesActivacion.some(patron => 
        transcript.includes(patron) || 
        calcularSimilitud(transcript, patron) > 0.7
    );
}

// Algoritmo de similitud simple (para tolerancia a errores de pronunciación)
function calcularSimilitud(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - calcularDistancia(longer, shorter)) / parseFloat(longer.length);
}

function calcularDistancia(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// Funciones mejoradas de control de reconocimiento
function iniciarReconocimiento(recognition) {
    try {
        recognition.start();
        statusTexto.textContent = "🎤 Iniciando reconocimiento de voz...";
        statusCard.classList.remove("status-error");
        statusCard.classList.add("status-listening");
        
        // Resetear contadores de error
        intentosReconexion = 0;
    } catch (error) {
        console.error("Error al iniciar reconocimiento:", error);
        statusTexto.textContent = "❌ Error al iniciar el reconocimiento de voz";
        statusCard.classList.add("status-error");
    }
}

function detenerReconocimiento(recognition) {
    reconocimientoActivo = false;
    intentosReconexion = MAX_INTENTOS_RECONEXION; // Evitar reconexión automática
    
    try {
        recognition.stop();
        statusTexto.textContent = "⏹️ Reconocimiento detenido";
        statusCard.classList.remove("status-listening", "status-active", "status-error", "status-processing");
        voiceAnimation.classList.add("d-none");
    } catch (error) {
        console.error("Error al detener reconocimiento:", error);
    }
}

// === FUNCIÓN MEJORADA PARA HABLAR ===
function hablar(texto) {
    if ('speechSynthesis' in window && !silenciado) {
        // Cancelar cualquier speech anterior
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;  // Un poco más lento para mejor comprensión
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Seleccionar voz en español si está disponible
        const voces = window.speechSynthesis.getVoices();
        const vozEs = voces.find(voz => voz.lang.startsWith('es-')) || voces[0];
        if (vozEs) utterance.voice = vozEs;
        
        utterance.onstart = () => {
            console.log("Comenzando a hablar:", texto);
        };
        
        utterance.onend = () => {
            console.log("Finalizado de hablar");
        };
        
        utterance.onerror = (event) => {
            console.error("Error en síntesis de voz:", event);
        };
        
        // Pequeño delay para asegurar que las voces estén cargadas
        if (voces.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                const nuevasVoces = window.speechSynthesis.getVoices();
                const vozEs = nuevasVoces.find(voz => voz.lang.startsWith('es-')) || nuevasVoces[0];
                if (vozEs) utterance.voice = vozEs;
                window.speechSynthesis.speak(utterance);
            };
        } else {
            window.speechSynthesis.speak(utterance);
        }
    }
}

// === INTERPRETACIÓN MEJORADA DE ÓRDENES CON OPENAI ===
async function interpretarOrden(texto) {
    // Limpiar y preparar el texto
    texto = limpiarTextoOrden(texto);
    
    // Verificar que tenemos la API key
    if (!OPENAI_API_KEY) {
        const apiKeyObtenida = await obtenerApiKey();
        if (!apiKeyObtenida) {
            statusTexto.textContent = "❌ Error: No se pudo obtener la API key";
            statusCard.classList.add("status-error");
            return null;
        }
    }

    try {
        statusTexto.textContent = "🔄 Procesando orden...";
        
        // Mensaje de sistema mejorado para un reconocimiento más natural
        const systemMessage = `Eres un asistente especializado en interpretar órdenes de movimiento para un robot. 
Tu tarea es analizar el texto del usuario y determinar cuál de las siguientes órdenes coincide mejor con la intención.

ÓRDENES DISPONIBLES:
1. "adelante" - Para movimiento hacia adelante
2. "atrás" - Para movimiento hacia atrás  
3. "detener" - Para detener el movimiento
4. "vuelta adelante derecha" - Para girar hacia adelante a la derecha
5. "vuelta adelante izquierda" - Para girar hacia adelante a la izquierda
6. "vuelta atrás derecha" - Para girar hacia atrás a la derecha
7. "vuelta atrás izquierda" - Para girar hacia atrás a la izquierda
8. "giro 90° derecha" - Para girar 90 grados a la derecha
9. "giro 90° izquierda" - Para girar 90 grados a la izquierda
10. "giro 360° derecha" - Para girar 360 grados a la derecha
11. "giro 360° izquierda" - Para girar 360 grados a la izquierda

INSTRUCCIONES:
- Analiza la intención del usuario, no solo las palabras exactas
- Considera variaciones de pronunciación y errores comunes
- Ignora palabras de relleno como "por favor", "quiero", "puedes"
- Si no hay coincidencia clara, responde con "null"
- Responde ÚNICAMENTE con el texto exacto de la orden o "null"

EJEMPLOS:
- "ve hacia adelante" → "adelante"
- "avanza" → "adelante" 
- "retrocede" → "atrás"
- "para" → "detener"
- "gira a la derecha" → "giro 90° derecha"
- "da una vuelta completa a la izquierda" → "giro 360° izquierda"
- "haz una curva hacia adelante a la derecha" → "vuelta adelante derecha"`;
    
        const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: systemMessage
                    },
                    {
                        role: "user",
                        content: texto
                    }
                ],
                max_tokens: 30,
                temperature: 0.1,
            }),
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        const data = await respuesta.json();
        const output = data.choices[0].message.content.trim().toLowerCase();

        console.log("OpenAI respondió:", output);

        // Buscar la orden completa (con clave y texto) que coincida
        const ordenEncontrada = ORDENES.find(orden => orden.texto === output);
        
        if (ordenEncontrada) {
            return ordenEncontrada;
        } else {
            // Intentar un fallback: búsqueda por palabras clave si OpenAI no devolvió una orden exacta
            return buscarOrdenPorPalabrasClave(texto);
        }
    } catch (err) {
        console.error("Error con OpenAI:", err);
        statusTexto.textContent = "❌ Error al conectar con el servidor";
        statusCard.classList.add("status-error");
        
        // Fallback a búsqueda por palabras clave en caso de error
        return buscarOrdenPorPalabrasClave(texto);
    }
}

// Función para limpiar y preparar el texto de la orden
function limpiarTextoOrden(texto) {
    // Eliminar palabra de activación si está presente
    texto = texto.replace(/\bnacho\b/gi, '').trim();
    
    // Eliminar palabras de relleno comunes
    const palabrasRelleno = ['por favor', 'quiero', 'puedes', 'podrías', 'oye', 'eh', 'um', 'ah'];
    palabrasRelleno.forEach(palabra => {
        texto = texto.replace(new RegExp(`\\b${palabra}\\b`, 'gi'), '');
    });
    
    // Eliminar espacios múltiples y trim
    return texto.replace(/\s+/g, ' ').trim();
}

// === BÚSQUEDA MEJORADA POR PALABRAS CLAVE COMO FALLBACK ===
function buscarOrdenPorPalabrasClave(texto) {
    const palabras = texto.toLowerCase().split(/\s+/);
    
    // Mapeo expandido de palabras clave a órdenes con puntuación
    const keywordMap = {
        // Adelante (clave 1)
        'adelante': { clave: 1, peso: 10 },
        'avanza': { clave: 1, peso: 9 },
        'avance': { clave: 1, peso: 8 },
        'avanzar': { clave: 1, peso: 7 },
        'haciaadelante': { clave: 1, peso: 6 },
        'forward': { clave: 1, peso: 5 },
        'derecho': { clave: 1, peso: 4 },
        'recto': { clave: 1, peso: 4 },
        
        // Atrás (clave 2)
        'atrás': { clave: 2, peso: 10 },
        'atras': { clave: 2, peso: 10 },
        'retrocede': { clave: 2, peso: 9 },
        'retroceso': { clave: 2, peso: 8 },
        'reversa': { clave: 2, peso: 7 },
        'back': { clave: 2, peso: 6 },
        'backward': { clave: 2, peso: 5 },
        'marchaatrás': { clave: 2, peso: 8 },
        
        // Detener (clave 3)
        'detener': { clave: 3, peso: 10 },
        'para': { clave: 3, peso: 9 },
        'alto': { clave: 3, peso: 8 },
        'stop': { clave: 3, peso: 7 },
        'detente': { clave: 3, peso: 6 },
        'pare': { clave: 3, peso: 5 },
        
        // Vueltas adelante derecha (clave 4)
        'vueltaderecha': { clave: 4, peso: 10 },
        'vueltadelantederecha': { clave: 4, peso: 10 },
        'giraderecha': { clave: 4, peso: 9 },
        'girodederecha': { clave: 4, peso: 8 },
        'vueltadelanteala derecha': { clave: 4, peso: 10 },
        'curvaderecha': { clave: 4, peso: 7 },
        'giraaladerecha': { clave: 4, peso: 6 },
        
        // Vueltas adelante izquierda (clave 5)
        'vueltaizquierda': { clave: 5, peso: 10 },
        'vueltadelanteizquierda': { clave: 5, peso: 10 },
        'giraizquierda': { clave: 5, peso: 9 },
        'girodeizquierda': { clave: 5, peso: 8 },
        'vueltadelanteala izquierda': { clave: 5, peso: 10 },
        'curvaizquierda': { clave: 5, peso: 7 },
        'giraalaizquierda': { clave: 5, peso: 6 },
        
        // Vueltas atrás derecha (clave 6)
        'vueltaderechaatrás': { clave: 6, peso: 10 },
        'vueltaderecha atras': { clave: 6, peso: 10 },
        'giraderechaatrás': { clave: 6, peso: 9 },
        'girodederecha atras': { clave: 6, peso: 8 },
        'vueltaatrásala derecha': { clave: 6, peso: 10 },
        'curvaderechaatrás': { clave: 6, peso: 7 },
        
        // Vueltas atrás izquierda (clave 7)
        'vueltaizquierdaatrás': { clave: 7, peso: 10 },
        'vueltaizquierda atras': { clave: 7, peso: 10 },
        'giraizquierdaatrás': { clave: 7, peso: 9 },
        'girodeizquierda atras': { clave: 7, peso: 8 },
        'vueltaatrásala izquierda': { clave: 7, peso: 10 },
        'curvaizquierdaatrás': { clave: 7, peso: 7 },
        
        // Giros 90° derecha (clave 8)
        'giro90derecha': { clave: 8, peso: 10 },
        'giro 90 derecha': { clave: 8, peso: 10 },
        'gira90derecha': { clave: 8, peso: 9 },
        'noventagradosderecha': { clave: 8, peso: 8 },
        'giro90°derecha': { clave: 8, peso: 10 },
        'giro 90 grados derecha': { clave: 8, peso: 10 },
        'giraaladerecha90': { clave: 8, peso: 7 },
        
        // Giros 90° izquierda (clave 9)
        'giro90izquierda': { clave: 9, peso: 10 },
        'giro 90 izquierda': { clave: 9, peso: 10 },
        'gira90izquierda': { clave: 9, peso: 9 },
        'noventagradosizquierda': { clave: 9, peso: 8 },
        'giro90°izquierda': { clave: 9, peso: 10 },
        'giro 90 grados izquierda': { clave: 9, peso: 10 },
        'giraalaizquierda90': { clave: 9, peso: 7 },
        
        // Giros 360° derecha (clave 10)
        'giro360derecha': { clave: 10, peso: 10 },
        'giro 360 derecha': { clave: 10, peso: 10 },
        'gira360derecha': { clave: 10, peso: 9 },
        'girocompletoderecha': { clave: 10, peso: 10 },
        'giro360°derecha': { clave: 10, peso: 10 },
        'giro completo derecha': { clave: 10, peso: 10 },
        'vueltacompletaderecha': { clave: 10, peso: 9 },
        'giraaladerecha360': { clave: 10, peso: 7 },
        
        // Giros 360° izquierda (clave 11)
        'giro360izquierda': { clave: 11, peso: 10 },
        'giro 360 izquierda': { clave: 11, peso: 10 },
        'gira360izquierda': { clave: 11, peso: 9 },
        'girocompletoizquierda': { clave: 11, peso: 10 },
        'giro360°izquierda': { clave: 11, peso: 10 },
        'giro completo izquierda': { clave: 11, peso: 10 },
        'vueltacompletaizquierda': { clave: 11, peso: 9 },
        'giraalaizquierda360': { clave: 11, peso: 7 }
    };
    
    let mejorCoincidencia = null;
    let mejorPuntaje = 0;
    
    // Buscar coincidencias individuales y combinaciones
    for (let i = 0; i < palabras.length; i++) {
        const palabra = palabras[i];
        
        // Coincidencia exacta
        if (keywordMap[palabra] && keywordMap[palabra].peso > mejorPuntaje) {
            mejorCoincidencia = keywordMap[palabra];
            mejorPuntaje = keywordMap[palabra].peso;
        }
        
        // Combinaciones de 2 palabras
        if (i < palabras.length - 1) {
            const combo2 = palabra + palabras[i + 1];
            if (keywordMap[combo2] && keywordMap[combo2].peso > mejorPuntaje) {
                mejorCoincidencia = keywordMap[combo2];
                mejorPuntaje = keywordMap[combo2].peso;
            }
        }
        
        // Combinaciones de 3 palabras
        if (i < palabras.length - 2) {
            const combo3 = palabra + palabras[i + 1] + palabras[i + 2];
            if (keywordMap[combo3] && keywordMap[combo3].peso > mejorPuntaje) {
                mejorCoincidencia = keywordMap[combo3];
                mejorPuntaje = keywordMap[combo3].peso;
            }
        }
    }
    
    // Buscar en el texto completo (sin espacios)
    const textoSinEspacios = palabras.join('');
    if (keywordMap[textoSinEspacios] && keywordMap[textoSinEspacios].peso > mejorPuntaje) {
        mejorCoincidencia = keywordMap[textoSinEspacios];
    }
    
    if (mejorCoincidencia && mejorPuntaje >= 5) { // Umbral mínimo de confianza
        return ORDENES.find(orden => orden.clave === mejorCoincidencia.clave);
    }
    
    return null;
}

// === FUNCIÓN PARA ENVIAR LA ORDEN AL ROBOT ===
function enviarOrdenAlRobot(statusClave) {
    // Aquí puedes implementar la lógica para enviar la orden a tu robot
    // Por ejemplo, mediante una API REST, WebSocket, etc.
    
    console.log(`Enviando orden al robot: ${statusClave}`);
    
    // Ejemplo de envío mediante fetch:
    /*
    fetch('/api/robot/orden', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            comando: statusClave
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Respuesta del robot:', data);
    })
    .catch(error => {
        console.error('Error al enviar orden al robot:', error);
    });
    */
}

// Cargar voces cuando estén disponibles
window.speechSynthesis.onvoiceschanged = function() {
    console.log("Voces de síntesis cargadas:", window.speechSynthesis.getVoices().length);
};

// Función para probar el reconocimiento (útil para debugging)
function probarReconocimiento() {
    console.log("=== ESTADO DEL SISTEMA ===");
    console.log("API Key:", OPENAI_API_KEY ? "✅ Configurada" : "❌ No configurada");
    console.log("Reconocimiento activo:", reconocimientoActivo);
    console.log("Asistente activo:", asistenteActivo);
    console.log("Silenciado:", silenciado);
    console.log("Última transcripción:", ultimaTranscripcion);
    console.log("Intentos reconexión:", intentosReconexion);
}

// Exportar funciones para debugging (solo en desarrollo)
if (typeof window !== 'undefined') {
    window.probarReconocimiento = probarReconocimiento;
}