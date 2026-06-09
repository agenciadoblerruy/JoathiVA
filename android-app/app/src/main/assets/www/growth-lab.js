const GROWTH_VAULT_KEY = "joathiva-growth-vault";
const GROWTH_CAMPAIGN_DASHBOARD_KEY = "joathiva-growth-dashboard";
const JOATHI_GPT_THREAD_KEY = "joathiva-growth-chatgpt-thread";
const JOATHI_GPT_DEFAULT_INSTRUCTIONS = "Eres el asistente interno de JoathiVA. Responde siempre en espanol claro, orientado a logistica, transporte, comercio exterior, growth B2B y ejecucion comercial. Prioriza propuestas accionables, tono ejecutivo y foco en Sudamerica.";
let growthVariantCounter = 0;
let growthToolProfiles = [];
const growthVisibleToolSecrets = new Set();
let joathiGptSettingsState = {
  connected: false,
  apiKeyHint: "",
  model: "gpt-5",
  reasoningEffort: "low",
  instructions: JOATHI_GPT_DEFAULT_INSTRUCTIONS
};
let joathiGptBusy = false;
let growthExecutionFlowState = {
  actionId: "",
  status: "idle",
  openedTools: []
};

const joathiGptQuickActions = [
  {
    id: "improve-copy",
    label: "Mejorar copy actual",
    prompt: "Toma el brief y el copy principal actuales. Reescribelos con una version mas precisa, comercial y ejecutiva para Joathi. Devuelve 1 version principal, 3 hooks alternativos y 1 CTA."
  },
  {
    id: "linkedin-angles",
    label: "Nuevos angulos LinkedIn",
    prompt: "Con el contexto actual de JoathiVA, propon 5 angulos de contenido para LinkedIn enfocados en gerencia de logistica y operaciones. Que cada angulo incluya hook, idea central y CTA."
  },
  {
    id: "meta-variations",
    label: "Variaciones para Meta",
    prompt: "Usa el contexto actual y crea 3 versiones para Meta con tono directo, recordable y comercial. Cada una debe tener copy corto, texto en pieza y CTA."
  },
  {
    id: "sales-objections",
    label: "Romper objeciones",
    prompt: "Lista las objeciones mas probables del prospecto actual y responde cada una con una linea comercial de Joathi y una prueba o argumento operativo."
  }
];

const growthExecutionActions = [
  {
    id: "produce-visual",
    title: "Producir visual",
    description: "Abrir herramientas para generar la imagen base y montarla en formato de publicacion.",
    tools: ["chatgpt", "canva", "firefly"],
    checklist: [
      "Copiar el prompt maestro o el prompt visual de la campana elegida.",
      "Generar la base visual en ChatGPT o en Adobe Firefly Web.",
      "Montar titulo, subtitulo y CTA en Canva.",
      "Exportar cuadrado 1080x1080 y vertical 1080x1920."
    ]
  },
  {
    id: "prepare-linkedin",
    title: "Preparar LinkedIn",
    description: "Abrir el espacio de revision del copy y la publicacion corporativa.",
    tools: ["chatgpt", "linkedin"],
    checklist: [
      "Revisar el copy principal y ajustar el primer parrafo para decision-makers.",
      "Validar CTA y comentario ancla.",
      "Abrir LinkedIn y dejar el post listo para revision final.",
      "Comprobar que el tono quede tecnico, ejecutivo y comercial."
    ]
  },
  {
    id: "prepare-meta",
    title: "Preparar Meta",
    description: "Abrir herramientas para adaptar pieza y copy a Instagram y Facebook.",
    tools: ["chatgpt", "canva", "meta-business-suite"],
    checklist: [
      "Tomar la adaptacion cruzada pensada para Meta.",
      "Ajustar la pieza visual al formato reel, post o carrusel.",
      "Abrir Meta Business Suite y preparar copy, hashtags y creatividad.",
      "Revisar que el mensaje quede directo, atractivo y facil de consumir."
    ]
  },
  {
    id: "followup-leads",
    title: "Seguimiento comercial",
    description: "Abrir canales para revisar comentarios, mensajes y seguimiento de interesados.",
    tools: ["linkedin", "meta-business-suite"],
    checklist: [
      "Revisar comentarios y mensajes entrantes por canal.",
      "Responder primero leads con mayor intencion comercial.",
      "Clasificar interesados y dejar el siguiente paso comercial definido.",
      "Cerrar con propuesta clara: corredor, dolor y siguiente paso."
    ]
  }
];

const growthProgramCatalog = {
  chatgpt: {
    label: "ChatGPT",
    note: "Para ejecutar prompts, ajustar copy y generar piezas base."
  },
  canva: {
    label: "Canva",
    note: "Para maquetar posts, carruseles y adaptar formatos."
  },
  firefly: {
    label: "Adobe Firefly Web",
    note: "Para generar o refinar imagenes desde navegador en Windows."
  },
  linkedin: {
    label: "LinkedIn",
    note: "Para revisar, programar o publicar la pieza corporativa."
  },
  "meta-business-suite": {
    label: "Meta Business Suite",
    note: "Para revisar publicaciones y bandejas de Facebook e Instagram."
  }
};

const growthSignals = [
  {
    metric: "48%",
    source: "LinkedIn",
    copy: "de decision-makers afirma que el thought leadership influye en la compra B2B."
  },
  {
    metric: "2x",
    source: "LinkedIn",
    copy: "mas engagement para Pages que publican a diario con constancia y criterio."
  },
  {
    metric: "5x",
    source: "LinkedIn",
    copy: "mas interaccion cuando el contenido usa video corto y autentico."
  },
  {
    metric: "75%",
    source: "Meta",
    copy: "de las recomendaciones en Instagram ya llegan desde posts originales."
  }
];

const growthVoiceCards = [
  {
    title: "Lo que se dice",
    body: "Joathi vende tranquilidad operativa. No promete magia: promete control, respuesta y coordinacion real."
  },
  {
    title: "Lo que no se dice",
    body: "Nada de frases vacias como solucion integral 360, excelencia garantizada o servicio premium sin prueba."
  },
  {
    title: "LinkedIn",
    body: "Profesional, tecnico, ejecutivo. Hablarle a quien paga el costo de la falla, no al algoritmo."
  },
  {
    title: "Meta",
    body: "Mas directo, mas humano, con humor operativo. Memorable sin caer en lo ordinario."
  }
];

const seriesCatalog = [
  {
    name: "Frontera sin humo",
    use: "Importacion, exportacion y despacho sin vueltas.",
    tag: "Comex"
  },
  {
    name: "Costo oculto",
    use: "Mostrar lo que se pierde cuando la logistica falla.",
    tag: "Rentabilidad"
  },
  {
    name: "24/7 sin verso",
    use: "Probar que el soporte no es un slogan sino una ventaja.",
    tag: "Confianza"
  },
  {
    name: "Si la carga hablara",
    use: "Humor para Meta con escenas reales del caos operativo.",
    tag: "Alcance"
  },
  {
    name: "Cadena afinada",
    use: "Contenido sobre coordinacion entre choferes, despachantes y proveedores.",
    tag: "Operacion"
  },
  {
    name: "Tablero Joathi",
    use: "Tecnologia, datos y automatizacion aplicados a la operacion.",
    tag: "Tecnologia"
  }
];

const brandProfile = {
  company: "Joathi Logistica",
  promise: "Tu carga, nuestro compromiso.",
  differentiators: [
    "atencion personalizada",
    "seguimiento y soporte 24/7",
    "proveedores que no fallan",
    "automatizacion operativa que ordena a toda la cadena"
  ],
  serviceLines: {
    integral: "operador integral logistico con control de punta a punta",
    comex: "importacion, exportacion y coordinacion internacional en Sudamerica",
    support: "seguimiento en tiempo real y soporte 24/7",
    network: "red de proveedores confiables y consistentes",
    automation: "tecnologia para automatizar interacciones operativas entre todos los agentes"
  },
  painTranslator: {
    demoras: "las demoras que traban muelle, planta o reposicion",
    frontera: "los cuellos de botella de frontera y documentacion",
    trazabilidad: "la falta de visibilidad que obliga a perseguir informacion",
    stock: "las roturas de stock y promesas comerciales en riesgo",
    "cadena-frio": "las exigencias de control y trazabilidad sensibles",
    proveedores: "la frustracion de depender de proveedores que fallan",
    costos: "los costos ocultos que aparecen cuando nadie coordina bien"
  }
};

const sectorProfiles = {
  automotriz: {
    label: "industria automotriz",
    pains: [
      "una pieza que no llega a tiempo puede frenar una linea completa",
      "la tolerancia al error operativo es bajisima cuando la produccion depende de ventanas exactas",
      "la logistica automotriz no perdona improvisacion entre planta, proveedor y frontera"
    ],
    proofPoints: [
      "ventanas de entrega claras y seguimiento continuo",
      "coordinacion fina entre chofer, proveedor y destino",
      "visibilidad para que operaciones no tenga que perseguir novedades"
    ],
    hooks: [
      "En automotriz, una demora no molesta: factura.",
      "La diferencia entre una operacion ordenada y un dolor de cabeza suele empezar en logistica.",
      "Si la logistica improvisa, la planta paga."
    ]
  },
  farma: {
    label: "industria farmaceutica",
    pains: [
      "la trazabilidad no es opcional cuando la mercaderia exige control fino",
      "cuando la operacion es sensible, una respuesta lenta no es una anecdota: es un riesgo",
      "la calma en farma se construye con seguimiento y criterio, no con promesas"
    ],
    proofPoints: [
      "seguimiento documentado y soporte visible",
      "criterio para coordinar agentes sin perder trazabilidad",
      "respuesta 24/7 cuando la operacion no puede esperar"
    ],
    hooks: [
      "En farma, la tranquilidad vale mas que una tarifa linda.",
      "La pregunta no es quien mueve la carga. La pregunta es quien responde cuando la operacion se tensa.",
      "En operaciones sensibles, el silencio operativo sale caro."
    ]
  },
  retail: {
    label: "retail",
    pains: [
      "una reposicion tarde se convierte en gondola vacia y venta perdida",
      "la presion del retail castiga cualquier descoordinacion entre origen, transporte y destino",
      "cuando la cadena esta tensa, la velocidad sin orden no sirve"
    ],
    proofPoints: [
      "capacidad de reaccion y seguimiento de punta a punta",
      "soporte que baja ruido y acelera decisiones",
      "visibilidad regional para no operar a ciegas"
    ],
    hooks: [
      "En retail, la logistica no acompana la venta: la protege.",
      "Si tu reposicion depende de rezar, no tienes cadena de abastecimiento. Tienes suerte.",
      "El costo de una entrega tarde casi nunca termina en el flete."
    ]
  },
  regional: {
    label: "operaciones regionales",
    pains: [
      "cuantas mas manos participan, mas caro sale operar sin un centro claro",
      "Sudamerica exige criterio local, lectura operativa y gente que responda",
      "el problema regional no es solo cruzar fronteras. Es coordinar sin perder tiempo"
    ],
    proofPoints: [
      "seguimiento humano y tecnico al mismo tiempo",
      "proveedores consistentes y soporte en todo momento",
      "automatizacion de tareas que suelen trabar a todos los agentes"
    ],
    hooks: [
      "Mover carga en Sudamerica no es para improvisados.",
      "Cuando la operacion cruza fronteras, la desorganizacion se multiplica.",
      "La logistica regional premia a quien coordina mejor, no al que promete mas."
    ]
  }
};

const personaProfiles = {
  logistica: {
    label: "gerencia de logistica",
    concern: "visibilidad, cumplimiento y menos desgaste interno"
  },
  operaciones: {
    label: "gerencia de operaciones",
    concern: "continuidad operativa y menos interrupciones evitables"
  },
  compras: {
    label: "compras y abastecimiento",
    concern: "costo total real, no solo tarifa"
  },
  comex: {
    label: "comercio exterior",
    concern: "documentacion, frontera y coordinacion sin friccion"
  },
  direccion: {
    label: "direccion y duenios",
    concern: "tranquilidad, reputacion y facturacion protegida"
  }
};

const goalProfiles = {
  authority: {
    label: "autoridad",
    angle: "mostrar criterio ejecutivo y lectura del negocio",
    cta: "Si quieres revisar tu operacion con criterio y no con humo, conversemos."
  },
  lead: {
    label: "leads",
    angle: "abrir dialogo comercial sin parecer un anuncio",
    cta: "Si quieres ver como ordenamos esto en Joathi, enviame un mensaje con la palabra RUTA."
  },
  trust: {
    label: "confianza",
    angle: "demostrar control y cercania",
    cta: "Si tu equipo necesita un operador que responda de verdad, lo revisamos juntos."
  },
  objection: {
    label: "objeciones",
    angle: "destrabar dudas sobre precio, control y proveedores",
    cta: "Si hoy comparas solo por tarifa, vale la pena mirar el costo total de una falla."
  },
  tech: {
    label: "tecnologia",
    angle: "instalar a Joathi como operador que moderniza la cadena",
    cta: "Si quieres bajar ruido operativo con procesos mas limpios, hablemos."
  }
};

const platformProfiles = {
  linkedin: {
    label: "LinkedIn",
    tone: "corporativo, profesional y tecnico",
    closers: [
      "El cliente no compra un flete. Compra tranquilidad operativa.",
      "La operacion ordenada empieza mucho antes de que el camion salga.",
      "La logistica fuerte se nota cuando el resto de la cadena respira mejor."
    ]
  },
  meta: {
    label: "Meta",
    tone: "directo, coloquial, comico y atractivo",
    closers: [
      "Dormir tranquilo tambien es KPI.",
      "Menos verso. Mas control.",
      "Si la carga llega bien, se nota. Si falla, mas todavia."
    ]
  }
};

const formatProfiles = {
  post: "post de opinion",
  carousel: "carrusel o documento",
  reel: "reel o video corto",
  case: "caso real",
  checklist: "checklist"
};

const marketLabels = {
  regional: "Sudamerica",
  uruguay: "Uruguay",
  argentina: "Argentina",
  brasil: "Brasil",
  chile: "Chile",
  paraguay: "Paraguay"
};

const commentHooks = [
  "Si te pasa seguido, comenta MAPA y te envio una mirada de control operativo.",
  "Si quieres bajar ruido interno, comenta FLUJO y te comparto una matriz simple para ordenar la operacion.",
  "Si sientes que persigues informacion todo el dia, comenta VISIBILIDAD y seguimos por mensaje."
];

const dmTemplates = [
  "Gracias por comentar. Si quieres, te comparto en 10 minutos como ordenamos seguimiento, frontera y soporte sin cargar mas ruido al equipo.",
  "Gracias por escribir. Si me dices tu corredor principal y el dolor que mas te pega hoy, te respondo con una recomendacion concreta.",
  "Gracias por abrir la conversacion. Si quieres, vemos tu operacion actual y te muestro donde normalmente se pierden tiempo, trazabilidad o margen."
];

const responderCampaignBrief = {
  platform: "linkedin",
  format: "carousel",
  sector: "regional",
  market: "regional",
  persona: "logistica",
  goal: "lead",
  pain: "trazabilidad",
  offer: "support",
  voice: "direct",
  insight: "Muchos clientes llegan cansados de perseguir respuestas, tolerar retrasos y operar sin visibilidad clara sobre su carga."
};

const responderCampaignPrompts = [
  {
    title: "Imagen principal",
    tag: "Visual",
    description: "Pieza principal para redes con contraste entre caos operativo y operacion controlada.",
    prompt: `Crea una imagen publicitaria profesional para redes sociales de una empresa de logistica y transporte.

Objetivo: captar nuevos clientes B2B que estan inconformes con su operador logistico actual.

Concepto visual: mostrar el contraste entre una operacion caotica y una operacion eficiente. En la primera parte, un gerente de logistica preocupado revisa su celular mientras hay retrasos, cajas acumuladas y sensacion de desorden. En la segunda parte, mostrar una operacion moderna, ordenada y confiable, con camion de carga, monitoreo en tiempo real, personal profesional y entregas puntuales.

Estilo: fotografia publicitaria corporativa, realista, alta calidad, iluminacion profesional, composicion limpia, estetica premium B2B, enfoque comercial.

Formato: cuadrado 1080x1080 para Instagram y Facebook.

Paleta: azul, blanco, gris, tonos corporativos, sensacion de confianza y eficiencia.

Elementos clave:
- camion de carga moderno
- centro logistico o almacen
- gerente o supervisor revisando operacion
- pantalla o tablet con seguimiento de envios
- cajas, pallets, muelle de carga
- equipo profesional
- ambiente de eficiencia, orden y cumplimiento

Evitar:
- caricatura
- estilo infantil
- exceso de texto
- aspecto generico de stock
- logos de marcas
- matriculas visibles
- errores en manos o rostros

Debe transmitir:
confianza, rapidez, respuesta, control, cumplimiento, logistica profesional.`
  },
  {
    title: "Carrusel visual",
    tag: "Carrusel",
    description: "Serie visual para diagnosticar dolores y llevar al cambio de operador.",
    prompt: `Crea una serie visual para un carrusel de redes sociales de una empresa de logistica y transporte, estilo corporativo y realista.

Tema: 5 senales de que necesitas cambiar de operador logistico.

Diseno: limpio, moderno, profesional, pensado para LinkedIn, Instagram y Facebook. Formato 1080x1080.

Visual general: escenas de operacion logistica real, gerentes de operaciones, camiones, almacenes, incidencias y seguimiento de carga.

Diapositivas:
1. Portada impactante con titulo: 5 senales de que necesitas cambiar de operador logistico
2. Escena de retraso en entregas, cliente preocupado, operacion tensa
3. Escena de falta de visibilidad, persona revisando sin informacion clara
4. Escena de mala atencion, llamada sin respuesta, frustracion
5. Escena de quejas de clientes por incumplimiento
6. Escena de solucion: operador logistico eficiente, monitoreo, camion, orden
7. Cierre con llamada a la accion: Cambiate a un operador que si responde

Estilo visual: fotografia comercial realista, premium B2B, iluminacion natural/profesional, colores corporativos azul, blanco y gris.`
  },
  {
    title: "Storyboard reel",
    tag: "Video",
    description: "Base visual para reel corto vertical mostrando problema y solucion.",
    prompt: `Genera storyboard visual para un video corto publicitario de una empresa de logistica y transporte dirigido a empresas B2B.

Mensaje central: cambiate a un operador que si responde.

Escenas:
1. Un responsable de logistica mira su celular con frustracion porque su proveedor no responde.
2. La mercancia no llega a tiempo y el cliente final esta molesto.
3. Hay presion en almacen y retrasos operativos.
4. Cambio positivo: aparece una operacion moderna, organizada, con seguimiento en tiempo real y entregas cumplidas.
5. Cierre con imagen de camion y equipo profesional transmitiendo confianza.

Estilo: video corporativo premium, realista, dinamico, cinematografico suave, moderno, comercial.
Formato vertical 1080x1920.
Tono: profesional, directo, confiable.
Evitar humor exagerado o escenas caricaturescas.`
  },
  {
    title: "Anuncio estatico",
    tag: "Visual",
    description: "Visual limpio para maquetar despues en Canva o Photoshop.",
    prompt: `Crea una imagen publicitaria realista y corporativa para una empresa de logistica y transporte.

Escena: gerente de operaciones preocupado por retrasos en entregas, mirando su celular en un entorno logistico. De fondo, almacen, pallets y camion de carga. La escena debe transmitir frustracion por mala atencion logistica.

Reserva espacio limpio en la parte superior e inferior para agregar texto publicitario en diseno.

Estilo: fotografia comercial premium, realista, B2B, moderna, iluminacion profesional, tonos corporativos azul, blanco, gris.

Formato 1080x1080.

La composicion debe permitir colocar este mensaje despues en diseno:
Titulo: Tu operador logistico te deja en visto?
Subtitulo: Retrasos, poca visibilidad y mala atencion afectan tu negocio.
CTA: Cambiate a un operador que si responde.`
  },
  {
    title: "Prompt de copies",
    tag: "Copy",
    description: "Genera captions, anuncios, titulares y variantes comerciales para LinkedIn y Meta.",
    prompt: `Actua como un copywriter senior especializado en social media para empresas de logistica y transporte B2B.

Necesito textos para una campana de captacion de nuevos clientes con el concepto: Cambiate a un operador que si responde.

Publico objetivo:
- duenos de negocio
- gerentes de logistica
- gerentes de operaciones
- responsables de supply chain
- empresas con problemas de retrasos, mala comunicacion y poca visibilidad en sus envios

Objetivo:
generar leads y solicitudes de revision gratuita de la operacion logistica.

Tono:
profesional, directo, confiable, comercial, claro, sin tecnicismos innecesarios.

Quiero que generes:
1. 5 copies para LinkedIn
2. 5 copies para Instagram/Facebook
3. 5 textos cortos para anuncios
4. 5 llamados a la accion
5. 10 titulares potentes
6. 5 versiones cortas para seguimiento comercial por DM

Cada texto debe enfocarse en dolores reales del cliente:
- retrasos
- falta de respuesta
- mala visibilidad
- quejas de clientes
- perdida de control operativo

Incluye una propuesta de valor clara:
- seguimiento
- cumplimiento
- atencion real
- respuesta rapida
- operacion confiable

Evita frases vacias, cliches y lenguaje demasiado generico.
Haz que el texto suene comercial y convincente.`
  },
  {
    title: "Prompt de carrusel",
    tag: "Copy",
    description: "Texto completo de carrusel de 7 slides mas copy del post.",
    prompt: `Actua como estratega de contenido y copywriter B2B para una empresa de logistica y transporte.

Escribe el texto completo de un carrusel de 7 slides para captar nuevos clientes.

Tema: 5 senales de que necesitas cambiar de operador logistico.

Objetivo: que empresas inconformes con su proveedor actual pidan una revision gratuita.

Estructura:
- slide 1: titulo fuerte
- slides 2 al 6: dolores concretos
- slide 7: solucion + llamada a la accion

Tono: profesional, directo, claro, comercial.
Cada slide debe tener poco texto, ser impactante y facil de leer.
Al final agrega tambien el copy del post que acompanara el carrusel.`
  },
  {
    title: "Prompt de reel",
    tag: "Guion",
    description: "Guion de 20 a 30 segundos con texto en pantalla, voz y visuales.",
    prompt: `Actua como guionista de anuncios para redes sociales en el sector logistica y transporte.

Escribe un guion de reel de 20 a 30 segundos para una campana llamada: Cambiate a un operador que si responde.

Objetivo: captar empresas que tienen problemas con su proveedor logistico actual.

Necesito:
- texto en pantalla por escena
- voz en off
- sugerencia visual por escena
- cierre con CTA

El tono debe ser profesional, agil, comercial y creible.
Debe mostrar el problema y luego la solucion.`
  }
];

const finalSalesCopies = [
  {
    id: "lnk-control",
    channel: "LinkedIn",
    title: "No necesitas un proveedor que mueva carga. Necesitas un operador que responda.",
    angle: "Autoridad",
    copy: `En logistica, el problema no empieza cuando la carga se detiene. Empieza mucho antes: cuando nadie responde claro, cuando operaciones persigue novedades y cuando el cliente final ya esta preguntando que paso.

En Joathi trabajamos distinto. Seguimiento real, soporte 24/7, coordinacion entre proveedores, choferes y despachantes, y una operacion pensada para que tu equipo tenga control, no incertidumbre.

Porque al final del dia, tu carga no es solo carga. Es negocio, reputacion y continuidad.

Tu carga, nuestro compromiso.

Si hoy tu operador te obliga a trabajar con mas ruido del necesario, conversemos.`
  },
  {
    id: "lnk-cost",
    channel: "LinkedIn",
    title: "El costo de una mala logistica casi nunca termina en el flete.",
    angle: "Objeciones",
    copy: `Muchas empresas comparan operadores por tarifa. El problema es que la tarifa rara vez muestra el costo total de una mala operacion.

Una demora pega en produccion. Una falta de respuesta pega en operaciones. Una mala coordinacion pega en servicio al cliente. Y cuando nadie se hace cargo, el costo termina adentro de tu empresa.

En Joathi priorizamos algo mas rentable que el precio lindo: cumplimiento, seguimiento, soporte real y una red de proveedores que responde cuando tiene que responder.

Menos improvisacion. Mas control.

Si quieres revisar donde se te esta yendo tiempo, margen o tranquilidad, lo vemos juntos.`
  },
  {
    id: "lnk-comex",
    channel: "LinkedIn",
    title: "Mover carga en Sudamerica no es para improvisados.",
    angle: "Comex",
    copy: `Importar y exportar en Sudamerica exige mas que transporte. Exige lectura operativa, coordinacion entre agentes y capacidad de respuesta cuando la operacion se pone tensa.

En Joathi asumimos ese rol con criterio. Seguimiento 24/7, contacto personalizado, coordinacion con despachantes, choferes y proveedores, y foco en que el cliente tenga visibilidad real, no excusas.

No prometemos magia. Prometemos algo mas valioso: una operacion ordenada y una respuesta clara cuando mas se necesita.

Tu carga, nuestro compromiso.

Si hoy tu flujo internacional depende demasiado de perseguir informacion, hablemos.`
  },
  {
    id: "lnk-tech",
    channel: "LinkedIn",
    title: "Automatizar no es moda. Es una forma de bajar ruido operativo.",
    angle: "Tecnologia",
    copy: `Cuando una operacion depende de mensajes cruzados, llamados repetidos y confirmaciones tardias, el problema no es solo humano. El problema es de estructura.

En Joathi estamos incorporando tecnologia para automatizar procesos que impactan en toda la cadena: equipo interno, despachantes, choferes y demas agentes operativos.

El objetivo es simple: menos friccion, menos demoras evitables y mas visibilidad para el cliente.

La buena tecnologia no reemplaza el servicio. Lo hace mas confiable.

Si tu operacion ya no aguanta mas desorden disfrazado de costumbre, conversemos.`
  },
  {
    id: "meta-visto",
    channel: "Meta",
    title: "Tu operador logistico te deja en visto?",
    angle: "Dolor directo",
    copy: `Si para saber donde esta tu carga tienes que mandar cuatro mensajes, hacer dos llamadas y esperar con suerte una respuesta, no tienes operador. Tienes un problema.

En Joathi trabajamos con seguimiento, atencion personalizada y soporte 24/7 para que no vivas cada embarque con incertidumbre.

Menos humo. Mas respuesta.

Tu carga, nuestro compromiso.

Si quieres revisar tu operacion, escribinos.`
  },
  {
    id: "meta-gastritis",
    channel: "Meta",
    title: "Si cada embarque te da gastritis, hay que cambiar algo.",
    angle: "Humor operativo",
    copy: `No es normal vivir cada entrega con nervios, perseguir novedades y enterarte tarde de los problemas.

Lo que pasa es que muchas empresas se acostumbraron a operar con ruido. En Joathi creemos que no deberia ser asi.

Seguimiento real, respuesta rapida, proveedores que cumplen y gente que aparece cuando tiene que aparecer.

Porque la tranquilidad operativa tambien vale plata.

Si tu logistica hoy te estresa mas de lo que te ayuda, escribinos.`
  },
  {
    id: "meta-suerte",
    channel: "Meta",
    title: "La carga no necesita suerte. Necesita control.",
    angle: "Confianza",
    copy: `Cuando tu operador falla, el problema no queda en el transporte. Te cae a ti, a tu equipo y a tu cliente.

Por eso en Joathi no vendemos solo movimiento. Vendemos tranquilidad operativa: seguimiento, soporte 24/7, coordinacion real y una operacion que no te deja solo cuando se complica.

Tu carga, nuestro compromiso.

Si quieres cambiar de operador, hablemos.`
  },
  {
    id: "meta-falla",
    channel: "Meta",
    title: "Cuando el operador falla, tu cliente ni pregunta quien fue.",
    angle: "Venta",
    copy: `Pregunta por el atraso. Se queja por la falta de respuesta. Y al final, el que queda mal es tu negocio.

En Joathi lo tenemos claro: responder rapido, seguir de cerca y coordinar bien no es un extra. Es parte del trabajo.

Si estas cansado de apagar incendios por culpa de una mala logistica, cambiemos eso.

Joathi Logistica.
Tu carga, nuestro compromiso.`
  }
];

const plannerWeekFrames = [
  {
    title: "Semana 1",
    focus: "Diagnostico del dolor",
    objective: "Instalar el problema con criterio comercial"
  },
  {
    title: "Semana 2",
    focus: "Visibilidad y control",
    objective: "Mostrar que el caos no es normal"
  },
  {
    title: "Semana 3",
    focus: "Respuesta y confianza",
    objective: "Probar por que Joathi responde distinto"
  },
  {
    title: "Semana 4",
    focus: "Conversion",
    objective: "Llevar al prospecto a conversacion o revision"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "growth") return;

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const marketingAllowed = typeof window.canAccessMarketing === "function"
    ? window.canAccessMarketing(user)
    : Boolean(user && user.role === "master");
  if (!marketingAllowed) {
    window.location.href = user ? getLandingRoute(user) : "login.html";
    return;
  }

  initGrowthLab();
});

function initGrowthLab() {
  renderGrowthSignals();
  renderVoiceCards();
  renderSeriesCards();
  renderJoathiGptQuickActions();
  renderJoathiGptThread();
  renderResponderCampaignPrompts();
  renderFinalSalesCopies();
  renderGrowthExecutionAction();
  renderGrowthToolProfilesSection();
  void loadJoathiGptSettings();
  void loadGrowthToolProfiles();
  bindGrowthActions();
  renderPromptVault();
  generateIndustryPlanOutput();
  syncCampaignDashboardIndustryField();
  renderCampaignDashboard();
  generatePostOutput();
  generateCalendarOutput();
}

function bindGrowthActions() {
  const briefForm = document.querySelector("#growthBriefForm");
  const campaignDashboardForm = document.querySelector("#campaignDashboardForm");
  const industryPlannerForm = document.querySelector("#industryPlannerForm");
  const vaultForm = document.querySelector("#promptVaultForm");
  const calendarButton = document.querySelector("#generateCalendarButton");
  const variantButton = document.querySelector("#generateVariantButton");
  const applyCampaignButton = document.querySelector("#applyResponderCampaignButton");
  const saveCampaignButton = document.querySelector("#saveResponderCampaignButton");
  const applyIndustryPlanButton = document.querySelector("#applyIndustryPlanToBriefButton");
  const prefillDashboardIndustryButton = document.querySelector("#prefillDashboardIndustryButton");
  const executionActionField = document.querySelector("#growthExecutionAction");
  const executeGrowthActionButton = document.querySelector("#executeGrowthActionButton");
  const copyGrowthActionChecklistButton = document.querySelector("#copyGrowthActionChecklistButton");
  const refreshGrowthToolProfilesButton = document.querySelector("#refreshGrowthToolProfilesButton");
  const growthToolProfilesGrid = document.querySelector("#growthToolProfilesGrid");
  const joathiGptSettingsForm = document.querySelector("#joathiGptSettingsForm");
  const joathiGptMessageForm = document.querySelector("#joathiGptMessageForm");
  const clearJoathiGptThreadButton = document.querySelector("#clearJoathiGptThreadButton");
  const clearJoathiGptKeyButton = document.querySelector("#clearJoathiGptKeyButton");
  const joathiGptQuickActionsNode = document.querySelector("#joathiGptQuickActions");

  industryPlannerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    generateIndustryPlanOutput();
  });

  campaignDashboardForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = readCampaignDashboardForm();
    const campaigns = loadCampaignDashboard();
    campaigns.unshift(payload);
    saveCampaignDashboard(campaigns);
    campaignDashboardForm.reset();
    syncCampaignDashboardIndustryField();
    renderCampaignDashboard();
  });

  briefForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    generatePostOutput();
  });

  calendarButton?.addEventListener("click", () => {
    generateCalendarOutput();
  });

  variantButton?.addEventListener("click", () => {
    growthVariantCounter += 1;
    generatePostOutput();
    generateCalendarOutput();
  });

  applyCampaignButton?.addEventListener("click", () => {
    applyResponderCampaignBrief();
  });

  saveCampaignButton?.addEventListener("click", () => {
    saveResponderCampaignPrompts();
  });

  applyIndustryPlanButton?.addEventListener("click", () => {
    applyIndustryPlanToBrief();
  });

  prefillDashboardIndustryButton?.addEventListener("click", () => {
    syncCampaignDashboardIndustryField(true);
  });

  executionActionField?.addEventListener("change", () => {
    renderGrowthExecutionAction(executionActionField.value);
  });

  executeGrowthActionButton?.addEventListener("click", async () => {
    await executeGrowthAction();
  });

  copyGrowthActionChecklistButton?.addEventListener("click", async () => {
    const preset = getGrowthExecutionAction();
    const text = buildGrowthExecutionChecklistText(preset);
    await copyPromptText(text, copyGrowthActionChecklistButton);
  });

  refreshGrowthToolProfilesButton?.addEventListener("click", async () => {
    await loadGrowthToolProfiles(true);
  });

  growthToolProfilesGrid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-tool-profile-action]");
    if (!button) return;

    const profileId = button.dataset.toolProfileId;
    const action = button.dataset.toolProfileAction;
    const profile = growthToolProfiles.find((item) => item.id === profileId);
    if (!profile) return;

    if (action === "toggle-secret") {
      if (growthVisibleToolSecrets.has(profile.id)) {
        growthVisibleToolSecrets.delete(profile.id);
      } else {
        growthVisibleToolSecrets.add(profile.id);
      }
      renderGrowthToolProfiles();
      return;
    }

    if (action === "copy-username") {
      await copyPromptText(profile.username || "", button);
      return;
    }

    if (action === "copy-password") {
      await copyPromptText(profile.password || "", button);
      return;
    }

    if (action === "open") {
      await openGrowthToolProfile(profile);
    }
  });

  joathiGptSettingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveJoathiGptSettings();
  });

  joathiGptMessageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendJoathiGptMessage();
  });

  clearJoathiGptThreadButton?.addEventListener("click", () => {
    saveJoathiGptThread([]);
    renderJoathiGptThread();
    renderJoathiGptStatus("Chat limpio. Puedes iniciar una conversacion nueva.");
  });

  clearJoathiGptKeyButton?.addEventListener("click", async () => {
    await saveJoathiGptSettings({ clearApiKey: true });
  });

  joathiGptQuickActionsNode?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-joathi-gpt-action]");
    if (!button) return;
    const actionId = button.dataset.joathiGptAction;
    const action = joathiGptQuickActions.find((item) => item.id === actionId);
    if (!action) return;
    await sendJoathiGptMessage(action.prompt);
  });

  vaultForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(vaultForm);
    const title = String(formData.get("title") || "").trim();
    const promptText = String(formData.get("promptText") || "").trim();
    if (!title || !promptText) return;

    const prompts = loadPromptVault();
    prompts.unshift({
      id: buildGrowthId("prompt"),
      title,
      promptText,
      createdAt: new Date().toISOString()
    });
    savePromptVault(prompts);
    vaultForm.reset();
    renderPromptVault();
    generatePostOutput();
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const field = document.querySelector(`#${button.dataset.copyTarget}`);
      if (!field) return;
      const value = field.value || "";
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        const previous = button.textContent;
        button.textContent = "Copiado";
        window.setTimeout(() => {
          button.textContent = previous;
        }, 1200);
      } catch {
        field.focus();
        field.select();
      }
    });
  });
}

function generateIndustryPlanOutput() {
  const planner = readIndustryPlannerForm();
  const sectorKey = inferSectorFromIndustry(planner.industryFocus);
  const profile = buildIndustryProfile(sectorKey, planner.industryFocus);
  const goal = goalProfiles[planner.goal] || goalProfiles.lead;
  const marketLabel = marketLabels[planner.market] || "Sudamerica";
  const offerLabel = brandProfile.serviceLines[planner.offer] || brandProfile.serviceLines.support;
  const summary = buildIndustryPlanSummary({ planner, profile, goal, marketLabel, offerLabel });
  const weeks = buildIndustryPlanWeeks({ planner, profile, goal, marketLabel, offerLabel });

  renderIndustryPlanSummary(summary);
  renderIndustryPlanWeeks(weeks);
  syncCampaignDashboardIndustryField();
}

function getJoathiGptSettingsApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/openai/settings");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/openai/settings";
  }

  return "";
}

function getJoathiGptRespondApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/openai/respond");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/openai/respond";
  }

  return "";
}

function renderJoathiGptQuickActions() {
  const node = document.querySelector("#joathiGptQuickActions");
  if (!node) return;

  node.innerHTML = joathiGptQuickActions.map((action) => `
    <button type="button" class="button button-secondary" data-joathi-gpt-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>
  `).join("");
}

function renderJoathiGptStatus(message, isError = false) {
  const node = document.querySelector("#joathiGptStatus");
  if (!node) return;

  const summary = joathiGptSettingsState.connected
    ? `Conexion guardada | ${joathiGptSettingsState.model}${joathiGptSettingsState.apiKeyHint ? ` | ${joathiGptSettingsState.apiKeyHint}` : ""}`
    : "Sin API key guardada todavia";

  node.innerHTML = `
    <article class="record-card growth-execution-status-card${isError ? " is-error" : ""}">
      <strong>${isError ? "ChatGPT requiere revision" : "ChatGPT listo"}</strong>
      <p>${escapeHtml(message)}</p>
      <small>${escapeHtml(summary)}</small>
    </article>
  `;
}

function loadJoathiGptThread() {
  try {
    const raw = localStorage.getItem(JOATHI_GPT_THREAD_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJoathiGptThread(items) {
  localStorage.setItem(JOATHI_GPT_THREAD_KEY, JSON.stringify(Array.isArray(items) ? items : []));
}

function renderJoathiGptThread() {
  const node = document.querySelector("#joathiGptChatThread");
  if (!node) return;

  const thread = loadJoathiGptThread();
  if (!thread.length) {
    node.innerHTML = `
      <article class="growth-ai-message is-assistant">
        <strong>Asistente Joathi</strong>
        <p>Conecta tu API key y usa las acciones rapidas o escribe una consulta manual sobre marketing, ventas u operacion.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = thread.map((item) => `
    <article class="growth-ai-message is-${escapeHtml(item.role || "assistant")}">
      <div class="growth-ai-message-head">
        <strong>${escapeHtml(item.role === "user" ? "Rodrigo" : "Asistente Joathi")}</strong>
        <span>${escapeHtml(formatJoathiGptTimestamp(item.createdAt))}</span>
      </div>
      <p>${escapeHtml(item.content || "").replace(/\n/g, "<br>")}</p>
    </article>
  `).join("");

  node.scrollTop = node.scrollHeight;
}

function formatJoathiGptTimestamp(value) {
  try {
    return new Date(value).toLocaleString("es-UY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "Ahora";
  }
}

function fillJoathiGptSettingsForm() {
  const form = document.querySelector("#joathiGptSettingsForm");
  if (!form) return;

  const modelField = form.querySelector("input[name='model']");
  const reasoningField = form.querySelector("select[name='reasoningEffort']");
  const instructionsField = form.querySelector("textarea[name='instructions']");
  const apiKeyField = form.querySelector("input[name='apiKey']");

  if (modelField) modelField.value = joathiGptSettingsState.model || "gpt-5";
  if (reasoningField) reasoningField.value = joathiGptSettingsState.reasoningEffort || "low";
  if (instructionsField) instructionsField.value = joathiGptSettingsState.instructions || JOATHI_GPT_DEFAULT_INSTRUCTIONS;
  if (apiKeyField) apiKeyField.value = "";
}

function getJoathiGptAuthPayload() {
  return {
    sessionToken: typeof getPortalSessionToken === "function" ? getPortalSessionToken() : ""
  };
}

async function loadJoathiGptSettings() {
  const url = getJoathiGptSettingsApiUrl();
  if (!url) {
    fillJoathiGptSettingsForm();
    renderJoathiGptStatus("No hay backend local disponible para configurar ChatGPT.", true);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify(getJoathiGptAuthPayload())
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo cargar la configuracion (HTTP ${response.status}).`);
    }

    joathiGptSettingsState = {
      connected: Boolean(result.connected),
      apiKeyHint: result.apiKeyHint || "",
      model: result.model || "gpt-5",
      reasoningEffort: result.reasoningEffort || "low",
      instructions: result.instructions || JOATHI_GPT_DEFAULT_INSTRUCTIONS
    };
    fillJoathiGptSettingsForm();
    renderJoathiGptStatus(joathiGptSettingsState.connected ? "Asistente conectado al servidor local de OpenAI." : "Guarda una API key de OpenAI para activar el asistente.");
  } catch (error) {
    fillJoathiGptSettingsForm();
    renderJoathiGptStatus(error?.message || "No se pudo cargar la configuracion de ChatGPT.", true);
  }
}

async function saveJoathiGptSettings(options = {}) {
  const form = document.querySelector("#joathiGptSettingsForm");
  const url = getJoathiGptSettingsApiUrl();
  if (!form || !url) {
    renderJoathiGptStatus("No hay backend local disponible para guardar la configuracion.", true);
    return;
  }

  const formData = new FormData(form);
  const payload = {
    model: String(formData.get("model") || "").trim() || "gpt-5",
    reasoningEffort: String(formData.get("reasoningEffort") || "").trim() || "low",
    instructions: String(formData.get("instructions") || "").trim() || JOATHI_GPT_DEFAULT_INSTRUCTIONS,
    clearApiKey: Boolean(options.clearApiKey)
  };

  const apiKey = String(formData.get("apiKey") || "").trim();
  if (apiKey) {
    payload.apiKey = apiKey;
  }
  Object.assign(payload, getJoathiGptAuthPayload());

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo guardar la configuracion (HTTP ${response.status}).`);
    }

    joathiGptSettingsState = {
      connected: Boolean(result.connected),
      apiKeyHint: result.apiKeyHint || "",
      model: result.model || payload.model,
      reasoningEffort: result.reasoningEffort || payload.reasoningEffort,
      instructions: result.instructions || payload.instructions
    };
    fillJoathiGptSettingsForm();
    renderJoathiGptStatus(options.clearApiKey ? "API key eliminada del servidor local." : "Configuracion de ChatGPT guardada.");
  } catch (error) {
    renderJoathiGptStatus(error?.message || "No se pudo guardar la configuracion.", true);
  }
}

function buildJoathiGptWorkspaceContext() {
  const planner = readIndustryPlannerForm();
  const brief = readGrowthBrief();
  const primaryCopy = String(document.querySelector("#primaryCopyField")?.value || "").trim();
  const crossCopy = String(document.querySelector("#crossCopyField")?.value || "").trim();
  const assetCopy = String(document.querySelector("#assetCopyField")?.value || "").trim();
  const campaigns = loadCampaignDashboard().slice(0, 3);

  return [
    "Marca: Joathi Logistica",
    "Promesa: Tu carga, nuestro compromiso.",
    `Industria foco: ${planner.industryFocus || "Sin definir"}`,
    `Mercado: ${marketLabels[planner.market] || planner.market || "Sudamerica"}`,
    `Objetivo comercial: ${goalProfiles[planner.goal]?.label || planner.goal || "Sin definir"}`,
    `Oferta principal: ${brandProfile.serviceLines[planner.offer] || planner.offer || "Sin definir"}`,
    `Red principal: ${platformProfiles[brief.platform]?.label || brief.platform || "Sin definir"}`,
    `Formato: ${formatProfiles[brief.format] || brief.format || "Sin definir"}`,
    `Persona: ${personaProfiles[brief.persona]?.label || brief.persona || "Sin definir"}`,
    `Dolor principal: ${brandProfile.painTranslator[brief.pain] || brief.pain || "Sin definir"}`,
    primaryCopy ? `Copy principal actual:\n${primaryCopy}` : "",
    crossCopy ? `Adaptacion cruzada actual:\n${crossCopy}` : "",
    assetCopy ? `Guion visual y CTA actuales:\n${assetCopy}` : "",
    campaigns.length ? `Ultimas campanas cargadas:\n${campaigns.map((item) => `- ${item.name || "Campana"} | ${item.industry || "Sin industria"} | canal ${getDashboardChannelLabel(item.channel)} | leads ${item.leads || 0} | clientes ${item.clients || 0}`).join("\n")}` : ""
  ].filter(Boolean).join("\n\n");
}

async function sendJoathiGptMessage(overridePrompt = "") {
  const form = document.querySelector("#joathiGptMessageForm");
  const field = document.querySelector("#joathiGptMessageField");
  const url = getJoathiGptRespondApiUrl();
  if (!form || !field || !url) {
    renderJoathiGptStatus("No hay backend local disponible para consultar ChatGPT.", true);
    return;
  }

  if (joathiGptBusy) {
    return;
  }

  const prompt = String(overridePrompt || field.value || "").trim();
  if (!prompt) {
    return;
  }

  const priorThread = loadJoathiGptThread();
  const nextThread = priorThread.concat([{
    id: buildGrowthId("chat"),
    role: "user",
    content: prompt,
    createdAt: new Date().toISOString()
  }]);
  saveJoathiGptThread(nextThread);
  renderJoathiGptThread();

  joathiGptBusy = true;
  field.value = "";
  renderJoathiGptStatus("Consultando OpenAI con el contexto actual de JoathiVA...");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        ...getJoathiGptAuthPayload(),
        prompt,
        model: String(document.querySelector("#joathiGptSettingsForm input[name='model']")?.value || joathiGptSettingsState.model || "gpt-5").trim(),
        reasoningEffort: String(document.querySelector("#joathiGptSettingsForm select[name='reasoningEffort']")?.value || joathiGptSettingsState.reasoningEffort || "low").trim(),
        instructions: String(document.querySelector("#joathiGptSettingsForm textarea[name='instructions']")?.value || joathiGptSettingsState.instructions || JOATHI_GPT_DEFAULT_INSTRUCTIONS).trim(),
        conversation: priorThread.slice(-10).map((item) => ({
          role: item.role,
          content: item.content
        })),
        context: buildJoathiGptWorkspaceContext()
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo consultar ChatGPT (HTTP ${response.status}).`);
    }

    const finalThread = loadJoathiGptThread().concat([{
      id: buildGrowthId("chat"),
      role: "assistant",
      content: String(result.outputText || "").trim(),
      createdAt: new Date().toISOString()
    }]);
    saveJoathiGptThread(finalThread);
    renderJoathiGptThread();
    joathiGptSettingsState.model = result.model || joathiGptSettingsState.model;
    renderJoathiGptStatus("Respuesta recibida desde OpenAI y guardada en el hilo local.");
  } catch (error) {
    renderJoathiGptStatus(error?.message || "No se pudo obtener respuesta de ChatGPT.", true);
  } finally {
    joathiGptBusy = false;
  }
}

function renderResponderCampaignPrompts() {
  const container = document.querySelector("#campaignPromptGrid");
  if (!container) return;

  container.innerHTML = responderCampaignPrompts.map((item) => `
    <article class="growth-prompt-card">
      <div class="growth-calendar-head">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="growth-series-tag">${escapeHtml(item.tag)}</span>
      </div>
      <p>${escapeHtml(item.description)}</p>
      <pre>${escapeHtml(item.prompt)}</pre>
      <div class="hero-actions growth-copy-actions">
        <button type="button" class="button button-secondary" data-copy-prompt-card="${escapeHtml(item.title)}">Copiar prompt</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-copy-prompt-card]").forEach((button) => {
    button.addEventListener("click", async () => {
      const title = button.dataset.copyPromptCard;
      const item = responderCampaignPrompts.find((entry) => entry.title === title);
      if (!item) return;
      await copyPromptText(item.prompt, button);
    });
  });
}

function getGrowthExecutionAction(actionId) {
  return growthExecutionActions.find((item) => item.id === actionId)
    || growthExecutionActions.find((item) => item.id === document.querySelector("#growthExecutionAction")?.value)
    || growthExecutionActions[0];
}

function renderGrowthExecutionAction(actionId) {
  const preset = getGrowthExecutionAction(actionId);
  const select = document.querySelector("#growthExecutionAction");
  const programsNode = document.querySelector("#growthExecutionPrograms");
  const checklistNode = document.querySelector("#growthExecutionChecklist");

  if (select) {
    select.value = preset.id;
  }

  if (programsNode) {
    programsNode.innerHTML = preset.tools.map((toolKey) => {
      const tool = growthProgramCatalog[toolKey];
      return `
        <article class="growth-execution-program">
          <strong>${escapeHtml(tool?.label || toolKey)}</strong>
          <p>${escapeHtml(tool?.note || "Herramienta operativa habilitada para este flujo.")}</p>
        </article>
      `;
    }).join("");
  }

  if (checklistNode) {
    checklistNode.innerHTML = preset.checklist.map((step, index) => `
      <article class="growth-execution-checklist-item">
        <strong>Paso ${index + 1}</strong>
        <p>${escapeHtml(step)}</p>
      </article>
    `).join("");
  }

  if (growthExecutionFlowState.actionId !== preset.id) {
    growthExecutionFlowState = {
      actionId: preset.id,
      status: "idle",
      openedTools: []
    };
  }

  renderGrowthExecutionFlow(preset);
  renderGrowthExecutionStatus(`${preset.title}: ${preset.description}`);
}

function buildGrowthExecutionChecklistText(preset) {
  return [
    preset.title,
    "",
    `Programas: ${preset.tools.map((toolKey) => growthProgramCatalog[toolKey]?.label || toolKey).join(", ")}`,
    "",
    ...preset.checklist.map((step, index) => `${index + 1}. ${step}`)
  ].join("\n");
}

function renderGrowthExecutionStatus(message, isError = false) {
  const node = document.querySelector("#growthExecutionStatus");
  if (!node) return;

  node.innerHTML = `
    <article class="record-card growth-execution-status-card${isError ? " is-error" : ""}">
      <strong>${isError ? "Estado de ejecucion" : "Flujo listo"}</strong>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function buildGrowthExecutionFlowNodes(preset) {
  return [
    {
      key: "brief",
      label: "Brief y enfoque",
      note: "Objetivo, red y mensaje definidos para esta accion."
    },
    ...preset.tools.map((toolKey) => ({
      key: toolKey,
      label: growthProgramCatalog[toolKey]?.label || toolKey,
      note: growthProgramCatalog[toolKey]?.note || "Herramienta operativa incluida en este flujo."
    })),
    {
      key: "review",
      label: "Revision antes de publicar",
      note: "Chequeo final manual para que la pieza salga solo cuando tu la apruebes."
    }
  ];
}

function resolveGrowthExecutionFlowStepState(nodeKey, phase, openedTools) {
  const opened = new Set(openedTools || []);

  if (phase === "running") {
    if (nodeKey === "brief") return "done";
    if (nodeKey === "review") return "pending";
    return "current";
  }

  if (phase === "success") {
    if (nodeKey === "review") return "current";
    if (nodeKey === "brief") return "done";
    return opened.size ? (opened.has(nodeKey) ? "done" : "pending") : "done";
  }

  if (phase === "error") {
    if (nodeKey === "brief") return "done";
    if (nodeKey === "review") return "pending";
    return opened.has(nodeKey) ? "done" : "error";
  }

  return nodeKey === "brief" ? "current" : "pending";
}

function getGrowthExecutionFlowBadge(stepState) {
  if (stepState === "done") return "Listo";
  if (stepState === "current") return "En foco";
  if (stepState === "error") return "Revisar";
  return "Pendiente";
}

function renderGrowthExecutionFlow(actionId) {
  const preset = getGrowthExecutionAction(actionId);
  const node = document.querySelector("#growthExecutionFlow");
  if (!node) return;

  const activeState = growthExecutionFlowState.actionId === preset.id
    ? growthExecutionFlowState
    : { actionId: preset.id, status: "idle", openedTools: [] };
  const steps = buildGrowthExecutionFlowNodes(preset);

  node.innerHTML = `
    <div class="growth-execution-flow-grid">
      ${steps.map((step, index) => {
        const stepState = resolveGrowthExecutionFlowStepState(step.key, activeState.status, activeState.openedTools);
        return `
          <article class="growth-flow-node is-${stepState}">
            <span class="growth-flow-index">${index + 1}</span>
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(step.note)}</p>
            <span class="growth-flow-badge">${escapeHtml(getGrowthExecutionFlowBadge(stepState))}</span>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function canUseGrowthToolProfiles(user) {
  return Boolean(user?.role === "master" && String(user?.username || "").trim().toLowerCase() === "rodrigo");
}

function renderGrowthToolProfilesSection() {
  const panel = document.querySelector("#growthToolAccessPanel");
  if (!panel) return;

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!canUseGrowthToolProfiles(user)) {
    panel.remove();
    return;
  }

  panel.hidden = false;
  renderGrowthToolProfilesStatus("Cargando accesos operativos de Rodrigo...");
}

function renderGrowthToolProfilesStatus(message, isError = false) {
  const node = document.querySelector("#growthToolProfilesStatus");
  if (!node) return;

  node.innerHTML = `
    <article class="record-card growth-execution-status-card${isError ? " is-error" : ""}">
      <strong>${isError ? "Acceso local" : "Accesos listos"}</strong>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function getGrowthToolProfilesApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/tools/profiles");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/tools/profiles";
  }

  return "";
}

function getGrowthExecutionApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/tools/open");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/tools/open";
  }

  return "";
}

async function openGrowthTools(toolKeys) {
  const url = getGrowthExecutionApiUrl();
  if (!url) {
    throw new Error("No hay backend local disponible para abrir programas. Usa el Growth Lab desde el servidor HTTP de esta PC.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      tools: toolKeys
    })
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error || `No se pudo abrir el flujo (HTTP ${response.status}).`);
  }

  return result;
}

function formatOpenedGrowthTools(result, fallbackToolKeys) {
  if (Array.isArray(result?.opened) && result.opened.length) {
    return result.opened.map((item) => item.label || item.key).join(", ");
  }

  return fallbackToolKeys.map((toolKey) => growthProgramCatalog[toolKey]?.label || toolKey).join(", ");
}

async function executeGrowthAction() {
  const preset = getGrowthExecutionAction();
  growthExecutionFlowState = {
    actionId: preset.id,
    status: "running",
    openedTools: []
  };
  renderGrowthExecutionFlow(preset.id);
  renderGrowthExecutionStatus(`Abriendo ${preset.tools.length} programas para ${preset.title.toLowerCase()}...`);

  try {
    const result = await openGrowthTools(preset.tools);
    growthExecutionFlowState = {
      actionId: preset.id,
      status: "success",
      openedTools: Array.isArray(result?.opened) ? result.opened.map((item) => item.key) : preset.tools
    };
    renderGrowthExecutionFlow(preset.id);
    const openedList = formatOpenedGrowthTools(result, preset.tools);
    renderGrowthExecutionStatus(`Programas abiertos para ${preset.title}: ${openedList}.`);
  } catch (error) {
    growthExecutionFlowState = {
      actionId: preset.id,
      status: "error",
      openedTools: []
    };
    renderGrowthExecutionFlow(preset.id);
    renderGrowthExecutionStatus(error?.message || "No se pudieron abrir los programas solicitados.", true);
  }
}

function renderGrowthToolProfiles() {
  const container = document.querySelector("#growthToolProfilesGrid");
  if (!container) return;

  if (!growthToolProfiles.length) {
    container.innerHTML = `
      <article class="growth-empty">
        No hay accesos operativos cargados para este usuario.
      </article>
    `;
    return;
  }

  container.innerHTML = growthToolProfiles.map((profile) => {
    const isVisible = growthVisibleToolSecrets.has(profile.id);
    const passwordValue = isVisible ? (profile.password || "") : maskGrowthSecret(profile.password);
    return `
      <article class="growth-tool-access-card">
        <div class="growth-calendar-head">
          <strong>${escapeHtml(profile.label || "Herramienta")}</strong>
          <span class="growth-series-tag">${escapeHtml(formatGrowthAuthMode(profile.authMode))}</span>
        </div>
        <p>${escapeHtml(profile.note || "Acceso operativo local para revisar y ejecutar la accion correspondiente.")}</p>
        <div class="growth-tool-credential-list">
          <article class="growth-tool-credential">
            <span>${escapeHtml(profile.usernameLabel || "Usuario")}</span>
            <code>${escapeHtml(profile.username || "")}</code>
          </article>
          <article class="growth-tool-credential">
            <span>${escapeHtml(profile.passwordLabel || "Clave")}</span>
            <code>${escapeHtml(passwordValue)}</code>
          </article>
        </div>
        <div class="growth-calendar-meta">
          <span>${escapeHtml(formatGrowthTarget(profile.target))}</span>
        </div>
        <div class="hero-actions growth-copy-actions growth-tool-actions">
          <button type="button" class="button button-accent" data-tool-profile-action="open" data-tool-profile-id="${escapeHtml(profile.id)}">Abrir</button>
          <button type="button" class="button button-secondary" data-tool-profile-action="copy-username" data-tool-profile-id="${escapeHtml(profile.id)}">Copiar usuario</button>
          <button type="button" class="button button-secondary" data-tool-profile-action="copy-password" data-tool-profile-id="${escapeHtml(profile.id)}">Copiar clave</button>
          <button type="button" class="button button-primary" data-tool-profile-action="toggle-secret" data-tool-profile-id="${escapeHtml(profile.id)}">${isVisible ? "Ocultar clave" : "Mostrar clave"}</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadGrowthToolProfiles(forceRefresh = false) {
  const panel = document.querySelector("#growthToolAccessPanel");
  if (!panel) return;

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!canUseGrowthToolProfiles(user)) {
    panel.remove();
    return;
  }

  if (!forceRefresh && growthToolProfiles.length) {
    renderGrowthToolProfiles();
    renderGrowthToolProfilesStatus(`Accesos listos para ${user.displayName || "Rodrigo"}.`);
    return;
  }

  const url = getGrowthToolProfilesApiUrl();
  if (!url) {
    renderGrowthToolProfilesStatus("No hay backend local disponible para cargar credenciales operativas.", true);
    return;
  }

  renderGrowthToolProfilesStatus("Consultando accesos operativos guardados en el servidor local...");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        sessionToken: typeof getPortalSessionToken === "function" ? getPortalSessionToken() : ""
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudieron cargar los accesos (HTTP ${response.status}).`);
    }

    growthToolProfiles = Array.isArray(result.profiles) ? result.profiles : [];
    renderGrowthToolProfiles();
    renderGrowthToolProfilesStatus(`Accesos operativos cargados para ${user.displayName || "Rodrigo"}.`);
  } catch (error) {
    growthToolProfiles = [];
    renderGrowthToolProfiles();
    renderGrowthToolProfilesStatus(error?.message || "No se pudieron cargar los accesos operativos.", true);
  }
}

async function openGrowthToolProfile(profile) {
  if (!profile?.toolKey) return;

  renderGrowthToolProfilesStatus(`Abriendo ${profile.label || "la herramienta"}...`);
  try {
    const result = await openGrowthTools([profile.toolKey]);
    const openedList = formatOpenedGrowthTools(result, [profile.toolKey]);
    renderGrowthToolProfilesStatus(`Herramienta abierta: ${openedList}.`);
  } catch (error) {
    renderGrowthToolProfilesStatus(error?.message || "No se pudo abrir la herramienta solicitada.", true);
  }
}

function renderIndustryPlanSummary(items) {
  const container = document.querySelector("#industryPlanSummary");
  if (!container) return;

  container.innerHTML = `
    <div class="growth-plan-list">
      ${items.map((item) => `
        <article class="growth-plan-item">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderIndustryPlanWeeks(items) {
  const container = document.querySelector("#industryPlanWeeks");
  if (!container) return;

  container.innerHTML = items.map((item) => `
    <article class="growth-plan-week">
      <strong>${escapeHtml(item.title)} | ${escapeHtml(item.focus)}</strong>
      <p>${escapeHtml(item.description)}</p>
      <span>${escapeHtml(item.cta)}</span>
    </article>
  `).join("");
}

function renderFinalSalesCopies() {
  const container = document.querySelector("#salesCopyGrid");
  if (!container) return;

  container.innerHTML = finalSalesCopies.map((item) => `
    <article class="growth-sales-card">
      <div class="growth-calendar-head">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="growth-series-tag">${escapeHtml(item.channel)}</span>
      </div>
      <p>${escapeHtml(item.angle)}</p>
      <textarea class="growth-copybox" rows="10" readonly>${item.copy}</textarea>
      <div class="hero-actions growth-copy-actions">
        <button type="button" class="button button-secondary" data-copy-sales-copy="${escapeHtml(item.id)}">Copiar</button>
        <button type="button" class="button button-primary" data-apply-sales-copy="${escapeHtml(item.id)}">Usar en pieza principal</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-copy-sales-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = finalSalesCopies.find((entry) => entry.id === button.dataset.copySalesCopy);
      if (!item) return;
      await copyPromptText(item.copy, button);
    });
  });

  container.querySelectorAll("[data-apply-sales-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = finalSalesCopies.find((entry) => entry.id === button.dataset.applySalesCopy);
      if (!item) return;
      if (item.channel === "LinkedIn" || item.channel === "Meta") {
        const form = document.querySelector("#growthBriefForm");
        if (form) {
          const platformField = form.elements.namedItem("platform");
          if (platformField) {
            platformField.value = item.channel === "LinkedIn" ? "linkedin" : "meta";
          }
        }
      }
      setFieldValue("#primaryCopyField", item.copy);
    });
  });
}

function renderCampaignDashboard() {
  const campaigns = loadCampaignDashboard();
  const filterNode = document.querySelector("#dashboardIndustryFilter");
  const rawFilter = filterNode?.value || "all";
  const validIndustries = new Set(campaigns.map((campaign) => campaign.industry));
  const activeFilter = rawFilter === "all" || validIndustries.has(rawFilter) ? rawFilter : "all";
  const scopedCampaigns = activeFilter === "all"
    ? campaigns
    : campaigns.filter((campaign) => campaign.industry === activeFilter);
  const summary = computeCampaignDashboardSummary(scopedCampaigns);

  renderCampaignDashboardFilter(campaigns, activeFilter);
  renderCampaignDashboardSummary(summary);
  renderCampaignDashboardList(scopedCampaigns);
  renderCampaignDashboardTips(buildCampaignDashboardTips(scopedCampaigns, summary));

  const filter = document.querySelector("#dashboardIndustryFilter");
  if (filter) {
    filter.value = activeFilter;
    filter.onchange = () => renderCampaignDashboard();
  }

  document.querySelectorAll("[data-remove-campaign]").forEach((button) => {
    button.onclick = () => {
      const campaigns = loadCampaignDashboard().filter((item) => item.id !== button.dataset.removeCampaign);
      saveCampaignDashboard(campaigns);
      renderCampaignDashboard();
    };
  });
}

function renderCampaignDashboardFilter(campaigns, selectedValue) {
  const select = document.querySelector("#dashboardIndustryFilter");
  if (!select) return;

  const industries = [...new Set(campaigns.map((campaign) => campaign.industry).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  const options = [
    `<option value="all">Todas</option>`,
    ...industries.map((industry) => `<option value="${escapeHtml(industry)}">${escapeHtml(industry)}</option>`)
  ];
  select.innerHTML = options.join("");
  select.value = selectedValue;
}

function renderCampaignDashboardSummary(summary) {
  const container = document.querySelector("#campaignDashboardSummary");
  if (!container) return;

  const cards = [
    {
      value: formatNumber(summary.campaignsTracked),
      label: "Campanas",
      note: "Campanas registradas en este dashboard."
    },
    {
      value: formatNumber(summary.totals.impressions),
      label: "Impresiones",
      note: "Alcance acumulado de las campanas filtradas."
    },
    {
      value: formatNumber(summary.totals.leads),
      label: "Leads",
      note: "Contactos que llegaron con intencion comercial."
    },
    {
      value: formatNumber(summary.totals.clients),
      label: "Clientes",
      note: "Cierres atribuidos a las campanas cargadas."
    },
    {
      value: formatPercent(summary.engagementRate),
      label: "Engagement",
      note: "Interacciones sobre impresiones."
    },
    {
      value: summary.bestChannel?.label || "Sin datos",
      label: "Mejor canal",
      note: summary.bestIndustry ? `Hoy la industria mas fuerte es ${summary.bestIndustry.label}.` : "Carga mas resultados para detectar patrones."
    }
  ];

  container.innerHTML = cards.map((card) => `
    <article class="growth-dashboard-kpi">
      <strong>${escapeHtml(card.value)}</strong>
      <span>${escapeHtml(card.label)}</span>
      <p>${escapeHtml(card.note)}</p>
    </article>
  `).join("");
}

function renderCampaignDashboardList(campaigns) {
  const container = document.querySelector("#campaignDashboardList");
  if (!container) return;

  if (!campaigns.length) {
    container.innerHTML = `<article class="growth-empty">Todavia no hay campanas cargadas. Registra una campana y el dashboard te devolvera conversiones, comparativos y consejos.</article>`;
    return;
  }

  container.innerHTML = campaigns.map((campaign) => {
    const metrics = buildCampaignMetrics(campaign);
    const impressions = parseDashboardMetric(campaign.impressions);
    const interactions = parseDashboardMetric(campaign.interactions);
    const leads = parseDashboardMetric(campaign.leads);
    const clients = parseDashboardMetric(campaign.clients);
    return `
      <article class="growth-dashboard-row">
        <div class="growth-calendar-head">
          <strong>${escapeHtml(campaign.name)}</strong>
          <button type="button" class="button button-ghost" data-remove-campaign="${escapeHtml(campaign.id)}">Eliminar</button>
        </div>
        <p>${escapeHtml(campaign.industry)} | ${escapeHtml(getDashboardChannelLabel(campaign.channel))} | ${escapeHtml(campaign.period || "Sin periodo")}</p>
        <div class="growth-dashboard-meta">
          <span>${escapeHtml(formatProfiles[campaign.format] || campaign.format)}</span>
          <span>Engagement ${escapeHtml(formatPercent(metrics.engagementRate))}</span>
          <span>DM ${escapeHtml(formatPercent(metrics.conversationRate))}</span>
          <span>Lead ${escapeHtml(formatPercent(metrics.leadRate))}</span>
          <span>Cierre ${escapeHtml(formatPercent(metrics.closeRate))}</span>
        </div>
        <div class="growth-dashboard-meta">
          <span>${formatNumber(impressions)} imp.</span>
          <span>${formatNumber(interactions)} interacciones</span>
          <span>${formatNumber(leads)} leads</span>
          <span>${formatNumber(clients)} clientes</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderCampaignDashboardTips(tips) {
  const container = document.querySelector("#campaignDashboardTips");
  if (!container) return;

  container.innerHTML = tips.map((tip) => `
    <article class="growth-dashboard-tip">
      <strong>${escapeHtml(tip.title)}</strong>
      <p>${escapeHtml(tip.body)}</p>
    </article>
  `).join("");
}

function generatePostOutput() {
  const brief = readGrowthBrief();
  const primaryPlatform = platformProfiles[brief.platform];
  const secondaryPlatformKey = brief.platform === "linkedin" ? "meta" : "linkedin";
  const sector = sectorProfiles[brief.sector];
  const persona = personaProfiles[brief.persona];
  const goal = goalProfiles[brief.goal];
  const offer = brandProfile.serviceLines[brief.offer];
  const format = formatProfiles[brief.format];
  const marketLabel = marketLabels[brief.market] || "Sudamerica";
  const sourceSeed = buildGrowthSeed(brief);
  const series = pickSeeded(seriesCatalog, `${sourceSeed}:series`);
  const corePain = pickSeeded(sector.pains, `${sourceSeed}:pain`);
  const proof = pickSeeded(sector.proofPoints, `${sourceSeed}:proof`);
  const hook = pickSeeded(sector.hooks, `${sourceSeed}:hook`);
  const closer = pickSeeded(primaryPlatform.closers, `${sourceSeed}:closer`);
  const commentCta = pickSeeded(commentHooks, `${sourceSeed}:comment`);
  const dmScript = pickSeeded(dmTemplates, `${sourceSeed}:dm`);
  const insight = summarizeInsight(brief.insight);

  const primaryCopy = brief.platform === "linkedin"
    ? buildLinkedInCopy({ brief, persona, goal, offer, format, hook, corePain, proof, closer, series, insight, marketLabel })
    : buildMetaCopy({ brief: { ...brief, platform: "meta" }, persona, goal, offer, hook, corePain, proof, closer, series, insight, marketLabel });

  const crossCopy = secondaryPlatformKey === "linkedin"
    ? buildLinkedInCopy({
      brief: { ...brief, platform: "linkedin" },
      persona,
      goal,
      offer,
      format,
      hook,
      corePain,
      proof,
      closer: pickSeeded(platformProfiles.linkedin.closers, `${sourceSeed}:cross-linkedin`),
      series,
      insight,
      marketLabel
    })
    : buildMetaCopy({
      brief: { ...brief, platform: "meta" },
      persona,
      goal,
      offer,
      hook,
      corePain,
      proof,
      closer: pickSeeded(platformProfiles.meta.closers, `${sourceSeed}:cross-meta`),
      series,
      insight,
      marketLabel
    });

  const assetText = buildAssetGuide({ brief, persona, goal, proof, series, commentCta, dmScript, insight, marketLabel });
  const promptText = buildMasterPrompt({ brief, sector, persona, goal, primaryPlatform, secondaryPlatformKey, series, corePain, proof, insight, marketLabel });

  setFieldValue("#primaryCopyField", primaryCopy);
  setFieldValue("#crossCopyField", crossCopy);
  setFieldValue("#assetCopyField", assetText);
  setFieldValue("#promptCopyField", promptText);
}

function generateCalendarOutput() {
  const brief = readGrowthBrief();
  const sector = sectorProfiles[brief.sector];
  const persona = personaProfiles[brief.persona];
  const goal = goalProfiles[brief.goal];
  const calendarItems = buildGrowthCalendar({ brief, sector, persona, goal });
  const grid = document.querySelector("#calendarGrid");
  const calendarCopy = calendarItems.map((item) => {
    return `${item.day}. ${item.platform} | ${item.format} | ${item.title}\nObjetivo: ${item.objective}\nCTA: ${item.cta}`;
  }).join("\n\n");

  if (grid) {
    grid.innerHTML = calendarItems.map((item) => `
      <article class="growth-calendar-card">
        <div class="growth-calendar-head">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="growth-calendar-day">Dia ${item.day}</span>
        </div>
        <p>${escapeHtml(item.description)}</p>
        <div class="growth-calendar-meta">
          <span>${escapeHtml(item.platform)}</span>
          <span>${escapeHtml(item.format)}</span>
          <span>${escapeHtml(item.objective)}</span>
        </div>
        <p><strong>CTA:</strong> ${escapeHtml(item.cta)}</p>
      </article>
    `).join("");
  }

  setFieldValue("#calendarCopyField", calendarCopy);
}

function renderGrowthSignals() {
  const grid = document.querySelector("#growthSignalGrid");
  if (!grid) return;

  grid.innerHTML = growthSignals.map((signal) => `
    <article class="panel growth-signal-card">
      <strong>${escapeHtml(signal.metric)}</strong>
      <span>${escapeHtml(signal.source)}</span>
      <p>${escapeHtml(signal.copy)}</p>
    </article>
  `).join("");
}

function renderVoiceCards() {
  const grid = document.querySelector("#growthVoiceGrid");
  if (!grid) return;

  grid.innerHTML = growthVoiceCards.map((card) => `
    <article class="growth-mini-card">
      <strong>${escapeHtml(card.title)}</strong>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `).join("");
}

function renderSeriesCards() {
  const grid = document.querySelector("#growthSeriesGrid");
  if (!grid) return;

  grid.innerHTML = seriesCatalog.map((card) => `
    <article class="growth-series-card">
      <strong>${escapeHtml(card.name)}</strong>
      <p>${escapeHtml(card.use)}</p>
      <span class="growth-series-tag">${escapeHtml(card.tag)}</span>
    </article>
  `).join("");
}

function renderPromptVault() {
  const container = document.querySelector("#promptVaultList");
  if (!container) return;

  const prompts = loadPromptVault();
  if (!prompts.length) {
    container.innerHTML = `<article class="growth-empty">Todavia no hay prompts guardados. Usa esta boveda para fijar el criterio comercial y creativo de Joathi.</article>`;
    return;
  }

  container.innerHTML = prompts.map((item) => `
    <article class="record-card growth-vault-card">
      <div class="growth-calendar-head">
        <strong>${escapeHtml(item.title)}</strong>
        <button type="button" class="button button-ghost" data-remove-prompt="${escapeHtml(item.id)}">Eliminar</button>
      </div>
      <div class="growth-vault-meta">
        <span>${escapeHtml(formatDateTime(item.createdAt))}</span>
      </div>
      <textarea class="growth-copybox" rows="5" readonly>${item.promptText}</textarea>
    </article>
  `).join("");

  container.querySelectorAll("[data-remove-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const prompts = loadPromptVault().filter((item) => item.id !== button.dataset.removePrompt);
      savePromptVault(prompts);
      renderPromptVault();
      generatePostOutput();
    });
  });
}

function readIndustryPlannerForm() {
  const form = document.querySelector("#industryPlannerForm");
  const formData = new FormData(form);

  return {
    industryFocus: String(formData.get("industryFocus") || "").trim() || "Industria automotriz",
    market: String(formData.get("plannerMarket") || "regional"),
    goal: String(formData.get("plannerGoal") || "lead"),
    offer: String(formData.get("plannerOffer") || "support"),
    context: String(formData.get("plannerContext") || "").trim()
  };
}

function readCampaignDashboardForm() {
  const form = document.querySelector("#campaignDashboardForm");
  const formData = new FormData(form);

  return {
    id: buildGrowthId("campaign"),
    name: String(formData.get("campaignName") || "").trim(),
    industry: String(formData.get("campaignIndustry") || "").trim() || "Industria objetivo",
    channel: String(formData.get("campaignChannel") || "linkedin"),
    format: String(formData.get("campaignFormat") || "post"),
    period: String(formData.get("campaignPeriod") || "").trim(),
    impressions: parseDashboardMetric(formData.get("campaignImpressions")),
    interactions: parseDashboardMetric(formData.get("campaignInteractions")),
    dms: parseDashboardMetric(formData.get("campaignDms")),
    leads: parseDashboardMetric(formData.get("campaignLeads")),
    meetings: parseDashboardMetric(formData.get("campaignMeetings")),
    proposals: parseDashboardMetric(formData.get("campaignProposals")),
    clients: parseDashboardMetric(formData.get("campaignClients")),
    createdAt: new Date().toISOString()
  };
}

function applyResponderCampaignBrief() {
  const form = document.querySelector("#growthBriefForm");
  if (!form) return;

  Object.entries(responderCampaignBrief).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    field.value = value;
  });

  growthVariantCounter = 0;
  generatePostOutput();
  generateCalendarOutput();
}

function applyIndustryPlanToBrief() {
  const planner = readIndustryPlannerForm();
  const form = document.querySelector("#growthBriefForm");
  if (!form) return;

  const inferredSector = inferSectorFromIndustry(planner.industryFocus);
  const sectorField = form.elements.namedItem("sector");
  const marketField = form.elements.namedItem("market");
  const goalField = form.elements.namedItem("goal");
  const offerField = form.elements.namedItem("offer");
  const insightField = form.elements.namedItem("insight");

  if (sectorField && ["automotriz", "farma", "retail", "regional"].includes(inferredSector)) {
    sectorField.value = inferredSector;
  } else if (sectorField) {
    sectorField.value = "regional";
  }
  if (marketField) marketField.value = planner.market;
  if (goalField) goalField.value = planner.goal;
  if (offerField) offerField.value = planner.offer;
  if (insightField) {
    const extra = planner.context ? ` Contexto foco: ${planner.context}` : "";
    insightField.value = `Industria foco: ${planner.industryFocus}.${extra}`.trim();
  }

  syncCampaignDashboardIndustryField(true);
  generatePostOutput();
  generateCalendarOutput();
}

function saveResponderCampaignPrompts() {
  const prompts = loadPromptVault();
  const existingTitles = new Set(prompts.map((item) => item.title));
  const nextPrompts = [...prompts];

  responderCampaignPrompts.forEach((item) => {
    const vaultTitle = `Campana responde | ${item.title}`;
    if (existingTitles.has(vaultTitle)) return;
    nextPrompts.unshift({
      id: buildGrowthId("campaign"),
      title: vaultTitle,
      promptText: item.prompt,
      createdAt: new Date().toISOString()
    });
    existingTitles.add(vaultTitle);
  });

  savePromptVault(nextPrompts);
  renderPromptVault();
  generatePostOutput();
}

function readGrowthBrief() {
  const form = document.querySelector("#growthBriefForm");
  const formData = new FormData(form);

  return {
    platform: String(formData.get("platform") || "linkedin"),
    format: String(formData.get("format") || "post"),
    sector: String(formData.get("sector") || "regional"),
    market: String(formData.get("market") || "regional"),
    persona: String(formData.get("persona") || "logistica"),
    goal: String(formData.get("goal") || "authority"),
    pain: String(formData.get("pain") || "demoras"),
    offer: String(formData.get("offer") || "integral"),
    voice: String(formData.get("voice") || "sharp"),
    insight: String(formData.get("insight") || "").trim()
  };
}

function buildLinkedInCopy({ brief, persona, goal, offer, format, hook, corePain, proof, closer, series, insight, marketLabel }) {
  const intro = `${hook}\n\n`;
  const bodyA = `Para ${persona.label}, el verdadero dolor no es solo mover mercaderia. Es proteger ${persona.concern} mientras se coordinan proveedores, choferes, despachantes y tiempos de entrega en ${marketLabel}.`;
  const bodyB = `Cuando aparece ${corePain}, el problema deja de ser logistico y se vuelve financiero, comercial y politico dentro del cliente. Por eso Joathi se posiciona como ${offer}, con ${proof} y una promesa clara: ${brandProfile.promise}`;
  const bodyC = `${buildVoiceBridge(brief.platform, brief.voice)} Nuestro enfoque combina ${brandProfile.differentiators[0]}, ${brandProfile.differentiators[1]} y ${brandProfile.differentiators[3]}. Ese es el tipo de estructura que baja ruido interno y sube confianza comercial.`;
  const insightLine = insight ? `\n\nLo vemos en campo todo el tiempo: ${insight}` : "";
  const closing = `\n\nSerie sugerida: ${series.name}. Formato ideal: ${format}.\n\n${goal.cta} ${closer}`;

  return `${intro}${bodyA}\n\n${bodyB}\n\n${bodyC}${insightLine}${closing}`;
}

function buildMetaCopy({ brief, persona, goal, offer, hook, corePain, proof, closer, series, insight, marketLabel }) {
  const opening = `${hook}\n\n`;
  const bodyA = "Si tu operacion depende de perseguir audios, pedir novedades tres veces y cruzar los dedos para que nadie falle, no tienes logistica. Tienes fe.";
  const bodyB = `Cuando aparece ${corePain} en ${marketLabel}, Joathi entra distinto: ${offer}, ${proof} y soporte real para que la carga no se convierta en un problema interno para quien responde en la empresa.`;
  const bodyC = `${buildVoiceBridge(brief.platform, brief.voice)} Nos gusta decirlo simple: menos humo, mas control. Menos promesas, mas seguimiento. Menos caos entre agentes, mas tranquilidad para el cliente.`;
  const insightLine = insight ? `\n\nEscena real: ${insight}` : "";
  const closing = `\n\nSerie: ${series.name}. ${goal.cta} ${closer}`;

  return `${opening}${bodyA}\n\n${bodyB}\n\n${bodyC}${insightLine}${closing}`;
}

function buildAssetGuide({ brief, persona, goal, proof, series, commentCta, dmScript, insight, marketLabel }) {
  const visualSteps = [
    "1. Apertura: mostrar el problema en una frase dura y corta.",
    `2. Tension: exhibir el costo oculto para ${persona.label}.`,
    `3. Resolucion: presentar a Joathi con ${proof}.`,
    "4. Prueba: destacar seguimiento 24/7, proveedores consistentes y automatizacion.",
    "5. Cierre: CTA suave, orientado a conversacion."
  ].join("\n");

  const guidance = [
    "Direccion visual:",
    `- Serie elegida: ${series.name}`,
    `- Red principal: ${platformProfiles[brief.platform].label}`,
    `- Formato sugerido: ${formatProfiles[brief.format]}`,
    `- Mercado: ${marketLabel}`,
    `- Tono: ${platformProfiles[brief.platform].tone}`,
    `- Insight extra: ${insight || "Sin insight adicional"}`
  ].join("\n");

  return `${guidance}\n\nStoryboard:\n${visualSteps}\n\nComentario ancla:\n${commentCta}\n\nMensaje privado sugerido:\n${dmScript}\n\nObjetivo de la pieza:\n${goal.angle}`;
}

function buildMasterPrompt({ brief, sector, persona, goal, primaryPlatform, secondaryPlatformKey, series, corePain, proof, insight, marketLabel }) {
  const promptVault = loadPromptVault();
  const vaultText = promptVault.length
    ? promptVault.slice(0, 5).map((item, index) => `${index + 1}. ${item.title}: ${item.promptText}`).join("\n")
    : "Sin prompts extra guardados.";

  return [
    `Actua como estratega senior de contenido organico B2B para ${brandProfile.company}, un operador integral logistico uruguayo con foco en Sudamerica.`,
    `La marca promete: ${brandProfile.promise}`,
    `Diferenciales obligatorios: ${brandProfile.differentiators.join(", ")}.`,
    `Red principal: ${primaryPlatform.label}. Adaptacion secundaria: ${platformProfiles[secondaryPlatformKey].label}.`,
    `Mercado principal: ${marketLabel}.`,
    `Sector objetivo: ${sector.label}. Buyer persona: ${persona.label}.`,
    `Dolor central: ${corePain}.`,
    `Objetivo: ${goal.angle}.`,
    `Prueba operativa a incluir: ${proof}.`,
    `Serie conceptual: ${series.name}.`,
    `Tono pedido: ${platformProfiles[brief.platform].tone}.`,
    "Genera una pieza organica que suene distinta, sin frases vacias ni lenguaje publicitario tradicional.",
    "Debe incluir hook fuerte, desarrollo con criterio comercial, CTA organico y una adaptacion para la otra red.",
    `Si corresponde, integrar este insight interno: ${insight || "No hay insight adicional."}`,
    `Prompts internos a considerar:\n${vaultText}`
  ].join("\n\n");
}

function computeCampaignDashboardSummary(campaigns) {
  const totals = campaigns.reduce((accumulator, campaign) => {
    accumulator.impressions += parseDashboardMetric(campaign.impressions);
    accumulator.interactions += parseDashboardMetric(campaign.interactions);
    accumulator.dms += parseDashboardMetric(campaign.dms);
    accumulator.leads += parseDashboardMetric(campaign.leads);
    accumulator.meetings += parseDashboardMetric(campaign.meetings);
    accumulator.proposals += parseDashboardMetric(campaign.proposals);
    accumulator.clients += parseDashboardMetric(campaign.clients);
    return accumulator;
  }, {
    impressions: 0,
    interactions: 0,
    dms: 0,
    leads: 0,
    meetings: 0,
    proposals: 0,
    clients: 0
  });

  return {
    campaignsTracked: campaigns.length,
    totals,
    engagementRate: totals.impressions ? (totals.interactions / totals.impressions) * 100 : 0,
    conversationRate: totals.impressions ? (totals.dms / totals.impressions) * 100 : 0,
    leadRate: totals.impressions ? (totals.leads / totals.impressions) * 100 : 0,
    meetingRate: totals.leads ? (totals.meetings / totals.leads) * 100 : 0,
    closeRate: totals.leads ? (totals.clients / totals.leads) * 100 : 0,
    bestChannel: findBestDashboardGroup(campaigns, "channel", (value) => getDashboardChannelLabel(value)),
    bestIndustry: findBestDashboardGroup(campaigns, "industry", (value) => value)
  };
}

function buildCampaignDashboardTips(campaigns, summary) {
  if (!campaigns.length) {
    return [
      {
        title: "Carga tu primera campana",
        body: "Empieza por una campana por industria y canal. Con 3 o mas registros el dashboard ya empieza a mostrar patrones utiles."
      },
      {
        title: "Mide conversaciones, no solo alcance",
        body: "Para Joathi importa quien comenta, escribe o pide reunion. No te quedes solo con impresiones."
      },
      {
        title: "Separa por industria",
        body: "Automotriz, farma y retail responden distinto. Registra cada foco por separado para no mezclar senales."
      }
    ];
  }

  const tips = [];

  if (summary.engagementRate < 1.5) {
    tips.push({
      title: "Sube el golpe del hook",
      body: "El engagement esta bajo. Prueba aperturas mas filosas, carruseles diagnostico y piezas que nombren el costo operativo de la falla."
    });
  }

  if (summary.engagementRate >= 1.5 && summary.conversationRate < 0.15) {
    tips.push({
      title: "El CTA esta flojo",
      body: "La gente interactua, pero casi no abre conversacion. Cierra con una pregunta concreta, palabra clave o revision gratuita de la operacion."
    });
  }

  if (summary.leadRate < 0.08) {
    tips.push({
      title: "Refuerza la oferta",
      body: "El contenido llega, pero convierte poco a lead. Muestra mejor la promesa Joathi: seguimiento, soporte 24/7, control y proveedores que responden."
    });
  }

  if (summary.meetingRate < 35 && summary.totals.leads >= 5) {
    tips.push({
      title: "Aprieta el seguimiento comercial",
      body: "Hay leads, pero pocas reuniones. Reduce el tiempo de respuesta y pasa rapido de comentario o DM a llamada corta con diagnostico."
    });
  }

  if (summary.closeRate < 12 && summary.totals.meetings >= 3) {
    tips.push({
      title: "Mejora la calificacion",
      body: "Estas llegando a reunion, pero no cierras lo suficiente. Filtra mejor por dolor real, corredor y urgencia antes de pasar a propuesta."
    });
  }

  if (summary.bestChannel) {
    tips.push({
      title: `Duplica lo que funciona en ${summary.bestChannel.label}`,
      body: `Hoy ${summary.bestChannel.label} es el canal con mejor puntaje global. Replica alli los mejores hooks, CTA y formatos antes de diversificar.`
    });
  }

  if (summary.bestIndustry) {
    tips.push({
      title: `Insiste en ${summary.bestIndustry.label}`,
      body: `La industria ${summary.bestIndustry.label} esta respondiendo mejor. Merece mas casos, mas pruebas sociales y mas piezas especificas de dolor.`
    });
  }

  return tips.slice(0, 6);
}

function buildCampaignMetrics(campaign) {
  const impressions = parseDashboardMetric(campaign.impressions);
  const interactions = parseDashboardMetric(campaign.interactions);
  const dms = parseDashboardMetric(campaign.dms);
  const leads = parseDashboardMetric(campaign.leads);
  const clients = parseDashboardMetric(campaign.clients);

  return {
    engagementRate: impressions ? (interactions / impressions) * 100 : 0,
    conversationRate: impressions ? (dms / impressions) * 100 : 0,
    leadRate: impressions ? (leads / impressions) * 100 : 0,
    closeRate: leads ? (clients / leads) * 100 : 0
  };
}

function findBestDashboardGroup(campaigns, key, labelResolver) {
  if (!campaigns.length) return null;

  const groups = new Map();
  campaigns.forEach((campaign) => {
    const rawKey = campaign[key] || "Sin datos";
    const current = groups.get(rawKey) || { score: 0, value: rawKey };
    current.score += (parseDashboardMetric(campaign.clients) * 100)
      + (parseDashboardMetric(campaign.leads) * 12)
      + (parseDashboardMetric(campaign.dms) * 4)
      + (parseDashboardMetric(campaign.interactions) * 0.05);
    groups.set(rawKey, current);
  });

  const best = [...groups.values()].sort((left, right) => right.score - left.score)[0];
  return best ? { value: best.value, label: labelResolver(best.value) } : null;
}

function inferSectorFromIndustry(value) {
  const normalized = normalizeIndustryText(value);
  if (normalized.includes("auto")) return "automotriz";
  if (normalized.includes("farma") || normalized.includes("farmaceut")) return "farma";
  if (normalized.includes("retail") || normalized.includes("consumo")) return "retail";
  return "regional";
}

function buildIndustryProfile(sectorKey, industryFocus) {
  const knownProfile = sectorProfiles[sectorKey];
  if (knownProfile && sectorKey !== "regional") return knownProfile;

  const label = industryFocus || "la industria objetivo";
  return {
    label,
    pains: [
      `${label} no tolera retrasos que rompan continuidad operativa`,
      `sin visibilidad clara, el equipo termina persiguiendo informacion en lugar de decidir`,
      `cuando el operador no responde, ${label} absorbe el costo comercial y reputacional`
    ],
    proofPoints: [
      "seguimiento visible y respuesta rapida",
      "coordinacion mas limpia entre todos los agentes",
      "calma operativa para quien responde dentro de la empresa"
    ],
    hooks: [
      `En ${label}, operar a ciegas sale caro.`,
      `${label} no necesita mas ruido. Necesita respuesta.`,
      `Si la logistica falla en ${label}, el negocio lo siente.`
    ]
  };
}

function buildIndustryPlanSummary({ planner, profile, goal, marketLabel, offerLabel }) {
  const mainPain = profile.pains[0];
  const secondPain = profile.pains[1];
  const hook = profile.hooks[0];
  const contextLine = planner.context
    ? `Aterrizalo con este contexto: ${planner.context}`
    : `Empieza desde este angulo: ${hook}`;

  return [
    {
      title: "Industria objetivo",
      body: `${planner.industryFocus} en ${marketLabel}.`
    },
    {
      title: "Dolor que mas convierte",
      body: `${mainPain}. Luego refuerza con ${secondPain}.`
    },
    {
      title: "Promesa Joathi",
      body: `${offerLabel}, ${brandProfile.differentiators[0]} y ${brandProfile.differentiators[1]}.`
    },
    {
      title: "Pilares de contenido",
      body: "Costo de la falla, visibilidad, respuesta 24/7 y tecnologia aplicada a la operacion."
    },
    {
      title: "CTA recomendado",
      body: goal.cta
    },
    {
      title: "Nota de enfoque",
      body: contextLine
    }
  ];
}

function buildIndustryPlanWeeks({ planner, profile, goal, marketLabel, offerLabel }) {
  return plannerWeekFrames.map((week, index) => {
    const pain = profile.pains[index % profile.pains.length];
    const proof = profile.proofPoints[index % profile.proofPoints.length];

    return {
      title: week.title,
      focus: week.focus,
      description: `${week.objective}. Habla de ${pain} en ${marketLabel} y conecta la solucion con ${offerLabel} y ${proof}.`,
      cta: index === plannerWeekFrames.length - 1 ? goal.cta : "Abrir conversacion con una pregunta o diagnostico"
    };
  });
}

function normalizeIndustryText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function syncCampaignDashboardIndustryField(overwrite = false) {
  const planner = readIndustryPlannerForm();
  const field = document.querySelector("input[name='campaignIndustry']");
  if (!field) return;
  if (overwrite || !String(field.value || "").trim()) {
    field.value = planner.industryFocus;
  }
}

function buildGrowthCalendar({ brief, persona }) {
  const calendarBlueprint = [
    { platform: "LinkedIn", format: "Carrusel", angle: "romper un mito", objective: "Autoridad" },
    { platform: "Meta", format: "Reel", angle: "escena real del caos", objective: "Alcance" },
    { platform: "LinkedIn", format: "Post", angle: "explicar costo oculto", objective: "Confianza" },
    { platform: "Meta", format: "Post", angle: "comparacion directa", objective: "Interaccion" },
    { platform: "LinkedIn", format: "Checklist", angle: "control operativo", objective: "Leads" },
    { platform: "Meta", format: "Reel", angle: "humor con dolor real", objective: "Recordacion" },
    { platform: "LinkedIn", format: "Caso", angle: "mostrar criterio", objective: "Autoridad" },
    { platform: "Meta", format: "Carrusel", angle: "antes vs despues", objective: "Guardados" },
    { platform: "LinkedIn", format: "Post", angle: "vision ejecutiva", objective: "Confianza" },
    { platform: "Meta", format: "Reel", angle: "pregunta filosa", objective: "Comentarios" },
    { platform: "LinkedIn", format: "Documento", angle: "mapa de riesgos", objective: "Leads" },
    { platform: "Meta", format: "Post", angle: "frase con remate", objective: "Compartidos" },
    { platform: "LinkedIn", format: "Caso", angle: "tecnologia aplicada", objective: "Tecnologia" },
    { platform: "Meta", format: "Reel", angle: "remate de marca", objective: "DM" }
  ];

  return calendarBlueprint.map((item, index) => {
    const day = index + 1;
    const seed = `${buildGrowthSeed(brief)}:calendar:${day}`;
    const series = pickSeeded(seriesCatalog, `${seed}:series`);
    const hook = pickSeeded(sectorProfiles[brief.sector].hooks, `${seed}:hook`);
    const cta = pickSeeded(commentHooks, `${seed}:cta`);

    return {
      day,
      platform: item.platform,
      format: item.format,
      title: `${series.name}: ${normalizeSentence(buildShortTitle(hook, item.angle))}`,
      description: `Hablarle a ${persona.label} sobre ${brandProfile.painTranslator[brief.pain]} con enfoque ${item.angle}.`,
      objective: item.objective,
      cta
    };
  });
}

function buildVoiceBridge(platform, voice) {
  const bridges = {
    linkedin: {
      sharp: "Sin maquillaje:",
      technical: "Traducido a operacion:",
      direct: "Dicho simple:",
      street: "En criollo:"
    },
    meta: {
      sharp: "Sin vueltas:",
      technical: "Bajado a tierra:",
      direct: "Dicho corto:",
      street: "En la calle seria asi:"
    }
  };

  return bridges[platform]?.[voice] || "Dicho simple:";
}

function buildShortTitle(hook, angle) {
  const normalizedHook = String(hook || "").replace(/[.!?]+$/, "");
  return `${normalizedHook} | ${angle}`;
}

function summarizeInsight(value) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trim()}...` : cleaned;
}

function setFieldValue(selector, value) {
  const field = document.querySelector(selector);
  if (field) {
    field.value = value;
  }
}

async function copyPromptText(value, button) {
  try {
    await navigator.clipboard.writeText(value);
    if (button) {
      const previous = button.textContent;
      button.textContent = "Copiado";
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    }
  } catch {
  }
}

function maskGrowthSecret(value) {
  const clean = String(value || "");
  if (!clean) return "";
  return "•".repeat(Math.max(8, Math.min(clean.length, 18)));
}

function formatGrowthAuthMode(value) {
  if (value === "instagram") return "Ingreso por Instagram";
  if (value === "email") return "Ingreso por email";
  return "Acceso local";
}

function formatGrowthTarget(value) {
  try {
    const url = new URL(String(value || ""));
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return String(value || "Destino local");
  }
}

function pickSeeded(items, seed) {
  if (!Array.isArray(items) || !items.length) return "";
  const index = Math.abs(hashText(seed)) % items.length;
  return items[index];
}

function buildGrowthSeed(brief) {
  return JSON.stringify(brief) + `:${growthVariantCounter}`;
}

function hashText(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function buildGrowthId(prefix) {
  return `${prefix}-${Date.now()}-${Math.abs(hashText(Math.random()))}`;
}

function loadPromptVault() {
  try {
    const raw = localStorage.getItem(GROWTH_VAULT_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePromptVault(value) {
  localStorage.setItem(GROWTH_VAULT_KEY, JSON.stringify(value));
}

function loadCampaignDashboard() {
  try {
    const raw = localStorage.getItem(GROWTH_CAMPAIGN_DASHBOARD_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCampaignDashboard(value) {
  localStorage.setItem(GROWTH_CAMPAIGN_DASHBOARD_KEY, JSON.stringify(value));
}

function parseDashboardMetric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function getDashboardChannelLabel(value) {
  if (value === "linkedin") return "LinkedIn";
  if (value === "meta") return "Meta";
  return value || "Sin canal";
}

function normalizeSentence(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
