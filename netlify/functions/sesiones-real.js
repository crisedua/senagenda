const cheerio = require('cheerio');
const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL del Senado de Chile
const URL = 'https://www.senado.cl/actividad-legislativa/sala-de-sesiones/tabla-semanal';

// Función para extraer contenido con fetch
async function scrapeContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.8,en;q=0.6',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    return html;
    
  } catch (error) {
    console.error('Error en scraping:', error);
    throw error;
  }
}

// Función para parsear contenido con Cheerio
function parseContent(html) {
  const $ = cheerio.load(html);
  
  try {
    const sesiones = [];
    
    // Buscar elementos con diferentes selectores para sesiones
    const selectors = [
      'table tr',
      '.sesion-item',
      '.tabla-sesiones tr',
      '.tabla-contenido tr',
      '.session-row',
      'tbody tr',
      '.agenda-item'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        
        // Buscar fecha
        const fecha = $elem.find('td:first-child, .fecha, .date').text().trim() ||
                     $elem.find('*').filter(function() {
                       return $(this).text().match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2} de \w+/);
                     }).first().text().trim();
        
        // Buscar hora
        const hora = $elem.find('td:nth-child(2), .hora, .time').text().trim() ||
                    $elem.find('*').filter(function() {
                      return $(this).text().match(/\d{1,2}:\d{2}/);
                    }).first().text().trim();
        
        // Buscar tipo de sesión
        const tipo = $elem.find('td:nth-child(3), .tipo, .session-type').text().trim();
        
        // Buscar tema o descripción
        const tema = $elem.find('td:last-child, .tema, .description, .content').text().trim() ||
                    $elem.find('td:nth-child(4)').text().trim();
        
        if ((fecha || hora) && tema && tema.length > 10) {
          sesiones.push({
            title: `Sesión: ${tipo || 'Ordinaria'}`,
            description: tema.substring(0, 300),
            date: `${fecha} ${hora}`.trim() || 'Fecha por confirmar'
          });
        }
      });
      
      if (sesiones.length > 0) break;
    }
    
    // Si no encontramos estructura de tabla, buscar cualquier información relevante
    if (sesiones.length === 0) {
      const bodyText = $('body').text();
      const relevantText = bodyText.substring(0, 1000);
      
      sesiones.push({
        title: 'Tabla de Sesiones',
        description: relevantText,
        date: new Date().toLocaleDateString('es-CL')
      });
    }
    
    return sesiones.slice(0, 10);
    
  } catch (error) {
    console.error('Error parseando contenido:', error);
    return [{
      title: 'Error en procesamiento',
      description: 'No se pudo procesar la información del sitio web',
      date: new Date().toLocaleDateString('es-CL')
    }];
  }
}

// Función para procesar con GPT
async function processWithGPT(content) {
  try {
    const prompt = `Analiza la siguiente información del Senado de Chile y extrae la tabla de sesiones actual. Organiza la información incluyendo fechas, horarios, tipo de sesión y temas en tabla. Responde en español:

${content}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en analizar información legislativa del Senado de Chile. Extrae y organiza la información de manera clara y estructurada. Siempre responde en español."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error processing with GPT:', error);
    return "Error al procesar la información con IA. Por favor, intente nuevamente.";
  }
}

// Función principal del endpoint
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Iniciando consulta real de sesiones');
    
    const html = await scrapeContent(URL);
    const parsedContent = parseContent(html);
    
    const processedContent = await processWithGPT(
      Array.isArray(parsedContent) ? 
        parsedContent.map(item => `${item.title}: ${item.description}`).join('\n\n') : 
        parsedContent
    );
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        content: parsedContent,
        summary: processedContent,
        source: 'Senado de Chile',
        url: URL,
        timestamp: new Date().toISOString(),
        queryType: 'sesiones',
        scrapingMethod: 'fetch + cheerio'
      })
    };
    
  } catch (error) {
    console.error('Error en consulta:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al procesar la consulta',
        details: error.message 
      })
    };
  }
}; 