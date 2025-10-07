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
    
    const statusCard = document.getElementById("statusCard");
    statusCard.classList.add("status-error");
    
    // Deshabilitar botones hasta que tengamos la API key
    const btnIniciar = document.getElementById("btnIniciar");
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
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = false;

    // === EVENTOS DE RECONOCIMIENTO ===
    recognition.onstart = () => {
        reconocimientoActivo = true;
        actualizarInterfaz();
        console.log("Reconocimiento de voz iniciado");
    };

    recognition.onend = () => {
        reconocimientoActivo = false;
        actualizarInterfaz();
        console.log("Reconocimiento de voz finalizado");
    };

    recognition.onerror = (event) => {
        console.error("Error en reconocimiento:", event.error);
        statusTexto.textContent = `Error: ${event.error}`;
        statusCard.classList.add("status-error");
        
        // Reiniciar el reconocimiento después de un error
        setTimeout(() => {
            if (reconocimientoActivo) {
                recognition.start();
            }
        }, 1000);
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Escuchado:", transcript);
        
        // Mostrar lo escuchado
        statusTexto.textContent = `Dijiste: "${transcript}"`;
        statusCard.classList.remove("status-listening", "status-active", "status-error");
        statusCard.classList.add("status-processing");
        
        // Verificar si es la palabra de activación
        if (!asistenteActivo && transcript.includes(ACTIVACION)) {
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
            } else {
                statusTexto.textContent = "❌ No se reconoció una orden válida.";
                if (!silenciado) {
                    hablar("No entendí esa orden. Por favor, intenta de nuevo.");
                }
            }
            
            asistenteActivo = false;
            estadoAsistente.textContent = "Inactivo";
            estadoAsistente.className = "badge bg-secondary";
            statusCard.classList.remove("status-processing", "status-active");
        }
    };

    // === CONTROL DE BOTONES ===
    btnIniciar.addEventListener("click", () => {
        recognition.start();
        statusTexto.textContent = "🎤 Escuchando... Di 'nacho' para activar";
        statusCard.classList.add("status-listening");
        voiceAnimation.classList.remove("d-none");
    });

    btnDetener.addEventListener("click", () => {
        recognition.stop();
        statusTexto.textContent = "Reconocimiento detenido";
        statusCard.classList.remove("status-listening", "status-active", "status-error", "status-processing");
        voiceAnimation.classList.add("d-none");
    });

    btnSilenciar.addEventListener("click", () => {
        silenciado = !silenciado;
        btnSilenciar.innerHTML = silenciado ? 
            '<i class="fas fa-volume-up me-2"></i>Activar Voz' : 
            '<i class="fas fa-volume-mute me-2"></i>Silenciar Asistente';
        btnSilenciar.classList.toggle("btn-primary", !silenciado);
        btnSilenciar.classList.toggle("btn-secondary", silenciado);
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

// === FUNCIÓN PARA HABLAR ===
function hablar(texto) {
    if ('speechSynthesis' in window && !silenciado) {
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// === INTERPRETACIÓN MEJORADA DE ÓRDENES CON OPENAI ===
async function interpretarOrden(texto) {
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
        const systemMessage = `
Eres un asistente especializado en interpretar órdenes de movimiento para un robot. 
Tu tarea es analizar el texto del usuario y determinar cuál de las siguientes órdenes coincide mejor con la intención.

ÓRDENES DISPONIBLES:
1. "adelante" - Para movimiento hacia adelante (sinónimos: avanza, ve adelante, avance, hacia adelante, marcha adelante)
2. "atrás" - Para movimiento hacia atrás (sinónimos: retrocede, ve atrás, retroceso, marcha atrás, reversa)
3. "detener" - Para detener el movimiento (sinónimos: para, alto, stop, detente, pare)
4. "vuelta adelante derecha" - Para girar hacia adelante a la derecha (sinónimos: gira adelante derecha, vuelta derecha adelante, curva derecha adelante)
5. "vuelta adelante izquierda" - Para girar hacia adelante a la izquierda (sinónimos: gira adelante izquierda, vuelta izquierda adelante, curva izquierda adelante)
6. "vuelta atrás derecha" - Para girar hacia atrás a la derecha (sinónimos: gira atrás derecha, vuelta derecha atrás, curva derecha atrás)
7. "vuelta atrás izquierda" - Para girar hacia atrás a la izquierda (sinónimos: gira atrás izquierda, vuelta izquierda atrás, curva izquierda atrás)
8. "giro 90° derecha" - Para girar 90 grados a la derecha (sinónimos: gira 90 derecha, giro completo derecha, rotación 90 derecha, noventa grados derecha)
9. "giro 90° izquierda" - Para girar 90 grados a la izquierda (sinónimos: gira 90 izquierda, giro completo izquierda, rotación 90 izquierda, noventa grados izquierda)
10. "giro 360° derecha" - Para girar 360 grados a la derecha (sinónimos: gira 360 derecha, giro completo derecha, rotación completa derecha, vuelta completa derecha)
11. "giro 360° izquierda" - Para girar 360 grados a la izquierda (sinónimos: gira 360 izquierda, giro completo izquierda, rotación completa izquierda, vuelta completa izquierda)

INSTRUCCIONES:
- Analiza la intención del usuario, no solo las palabras exactas
- Considera sinónimos y formas coloquiales de expresar las órdenes
- Si no hay coincidencia clara, responde con "null"
- Responde ÚNICAMENTE con el texto exacto de la orden o "null"

EJEMPLOS:
- "nacho ve hacia adelante" → "adelante"
- "nacho avanza hacia adelante" → "adelante"
- "nacho retrocede" → "atrás"
- "nacho para" → "detener"
- "nacho gira a la derecha" → "giro 90° derecha"
- "nacho da una vuelta completa a la izquierda" → "giro 360° izquierda"
- "haz una curva hacia adelante a la derecha" → "vuelta adelante derecha"
    `;
    
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

// === BÚSQUEDA POR PALABRAS CLAVE COMO FALLBACK ===
function buscarOrdenPorPalabrasClave(texto) {
    const palabras = texto.toLowerCase().split(/\s+/);
    
    // Mapeo de palabras clave a órdenes
    const keywordMap = {
        // Adelante
        'adelante': 1, 'avanza': 1, 'avance': 1, 'avanzar': 1, 'haciaadelante': 1, 'forward': 1,
        // Atrás
        'atrás': 2, 'atras': 2, 'retrocede': 2, 'retroceso': 2, 'reversa': 2, 'back': 2, 'backward': 2,
        // Detener
        'detener': 3, 'para': 3, 'alto': 3, 'stop': 3, 'detente': 3, 'pare': 3,
        // Vueltas adelante
        'vueltaderecha': 4, 'vueltadelantederecha': 4, 'giraderecha': 4, 'girodederecha': 4, 
        'vueltadelanteala derecha': 4, 'curvaderecha': 4,
        'vueltaizquierda': 5, 'vueltadelanteizquierda': 5, 'giraizquierda': 5, 'girodeizquierda': 5,
        'vueltadelanteala izquierda': 5, 'curvaizquierda': 5,
        // Vueltas atrás
        'vueltaderechaatrás': 6, 'vueltaderecha atras': 6, 'giraderechaatrás': 6, 'girodederecha atras': 6,
        'vueltaatrásala derecha': 6, 'curvaderechaatrás': 6,
        'vueltaizquierdaatrás': 7, 'vueltaizquierda atras': 7, 'giraizquierdaatrás': 7, 'girodeizquierda atras': 7,
        'vueltaatrásala izquierda': 7, 'curvaizquierdaatrás': 7,
        // Giros 90°
        'giro90derecha': 8, 'giro 90 derecha': 8, 'gira90derecha': 8, 'noventagradosderecha': 8,
        'giro90°derecha': 8, 'giro 90 grados derecha': 8,
        'giro90izquierda': 9, 'giro 90 izquierda': 9, 'gira90izquierda': 9, 'noventagradosizquierda': 9,
        'giro90°izquierda': 9, 'giro 90 grados izquierda': 9,
        // Giros 360°
        'giro360derecha': 10, 'giro 360 derecha': 10, 'gira360derecha': 10, 'girocompletoderecha': 10,
        'giro360°derecha': 10, 'giro completo derecha': 10, 'vueltacompletaderecha': 10,
        'giro360izquierda': 11, 'giro 360 izquierda': 11, 'gira360izquierda': 11, 'girocompletoizquierda': 11,
        'giro360°izquierda': 11, 'giro completo izquierda': 11, 'vueltacompletaizquierda': 11
    };
    
    // Buscar coincidencias
    for (let palabra of palabras) {
        // También verificar combinaciones de palabras
        const combinaciones = [
            palabras.join(''),
            palabras.slice(0, 2).join(''),
            palabras.slice(0, 3).join(''),
            palabras.slice(-2).join(''),
            palabras.slice(-3).join('')
        ];
        
        for (let combo of combinaciones) {
            if (keywordMap[combo]) {
                const clave = keywordMap[combo];
                return ORDENES.find(orden => orden.clave === clave);
            }
        }
        
        if (keywordMap[palabra]) {
            const clave = keywordMap[palabra];
            return ORDENES.find(orden => orden.clave === clave);
        }
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