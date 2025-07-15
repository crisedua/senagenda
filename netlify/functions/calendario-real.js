const cheerio = require('cheerio');
const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL del Senado de Chile (usando citaciones que contiene información de fechas)
const URL = 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones';

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

// Función para parsear contenido con Cheerio enfocado en calendario
function parseContent(html) {
  const $ = cheerio.load(html);
  
  try {
    const eventos = [];
    
    // Buscar elementos con diferentes selectores para eventos de calendario
    const selectors = [
      '.evento',
      '.calendar-item',
      '.agenda-item',
      '.comision-item',
      '.citacion-item',
      'article',
      '.card',
      '.actividad-item',
      'tr',
      '.listado-actividades li'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        
        // Buscar título del evento
        const title = $elem.find('h3, h4, .event-title, .title, .titulo, .nombre, h2, a').first().text().trim() ||
                     $elem.find('td').first().text().trim();
        
        // Buscar descripción
        const description = $elem.find('p, .event-desc, .description, .content, .detalle, td:nth-child(2)').first().text().trim() ||
                           $elem.text().substring(0, 200).trim();
        
        // Buscar fecha con mayor variedad de formatos
        const date = $elem.find('.date, .fecha, time, .cuando, td:first-child').text().trim() ||
                    $elem.find('*').filter(function() {
                      const text = $(this).text();
                      return text.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2} de \w+ de \d{4}|lunes|martes|miércoles|jueves|viernes|sábado|domingo/i);
                    }).first().text().trim();
        
        if (title && title.length > 5 && !title.toLowerCase().includes('menú') && !title.toLowerCase().includes('navegación')) {
          eventos.push({
            title: title.substring(0, 200),
            description: description ? description.substring(0, 300) : 'Sin descripción',
            date: date || 'Por confirmar'
          });
        }
      });
      
      if (eventos.length > 0) break;
    }
    
    // Si no encontramos eventos específicos, buscar información general
    if (eventos.length === 0) {
      const bodyText = $('body').text();
      const relevantText = bodyText.substring(0, 1000);
      
      eventos.push({
        title: 'Calendario Legislativo',
        description: relevantText,
        date: new Date().toLocaleDateString('es-CL')
      });
    }
    
    return eventos.slice(0, 10);
    
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
    const prompt = `Analiza la siguiente información del Senado de Chile y extrae el calendario de actividades de esta semana. Organiza cronológicamente los eventos, fechas, horarios y descripciones. Responde en español:

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
    console.log('Iniciando consulta real de calendario');
    
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
        queryType: 'calendario',
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