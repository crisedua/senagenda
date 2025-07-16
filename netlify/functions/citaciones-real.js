const cheerio = require('cheerio');
const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL del Senado de Chile
const URL = 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones';

// Función para extraer contenido con fetch (sin Puppeteer)
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
    const citaciones = [];
    
    // Buscar elementos con diferentes selectores posibles
    const selectors = [
      '.comision-item',
      '.citacion-item', 
      '.evento-item',
      'article',
      '.card',
      '.contenido-principal article',
      '.listado-actividades li',
      '.actividad-item',
      'tr',
      '.tabla-contenido tr',
      // Add more specific selectors for Senate website
      '.agenda-legislativa',
      '.programacion',
      '.calendario-actividades',
      '.comisiones-lista'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        
        // Buscar título
        const title = $elem.find('h1, h2, h3, h4, h5, .title, .titulo, .nombre, a').first().text().trim() ||
                     $elem.find('td').first().text().trim();
        
        // Buscar descripción
        const description = $elem.find('p, .description, .descripcion, .content, .detalle, td:nth-child(2)').first().text().trim() ||
                           $elem.text().substring(0, 200).trim();
        
        // Buscar fecha
        const date = $elem.find('.fecha, .date, time, .cuando, td:first-child').text().trim() ||
                    $elem.find('*').filter(function() {
                      return $(this).text().match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2} de \w+ de \d{4}/);
                    }).first().text().trim();
        
        if (title && title.length > 10 && !title.toLowerCase().includes('menú') && !title.toLowerCase().includes('navegación')) {
          citaciones.push({
            title: title.substring(0, 200),
            description: description ? description.substring(0, 300) : 'Sin descripción disponible',
            date: date || 'Fecha no especificada'
          });
        }
      });
      
      if (citaciones.length > 0) break; // Si encontramos datos, no seguir buscando
    }
    
    // Improved fallback - don't extract generic content
    if (citaciones.length === 0) {
      // Try to extract from main content areas only
      const contentAreas = ['main', '.contenido', '.content', '.principal', '#content', '.container .row'];
      
      for (const selector of contentAreas) {
        const content = $(selector).first().text().trim();
        if (content && content.length > 200 && content.includes('Comisión')) {
          citaciones.push({
            title: 'Información de Comisiones',
            description: content.substring(0, 400),
            date: 'Fecha por confirmar'
          });
          break;
        }
      }
      
      // If still no structured content found
      if (citaciones.length === 0) {
        return [{
          title: 'Sin citaciones disponibles actualmente',
          description: 'No se encontraron citaciones de comisiones estructuradas en el sitio web del Senado en este momento. Es posible que no haya citaciones programadas o que la estructura del sitio haya cambiado.',
          date: 'N/A'
        }];
      }
    }
    
    return citaciones.slice(0, 10); // Limitar a 10 elementos máximo
    
  } catch (error) {
    console.error('Error parseando contenido:', error);
    return [{
      title: 'Error en procesamiento',
      description: 'No se pudo procesar la información del sitio web',
      date: 'N/A'
    }];
  }
}

// Función para procesar con GPT
async function processWithGPT(content) {
  try {
    const prompt = `Analiza la siguiente información del Senado de Chile y extrae las citaciones a comisiones más importantes. Organiza la información incluyendo fechas, horarios, comisiones y temas a tratar. Responde en español:

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
  // Configurar headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Iniciando consulta real de citaciones');
    
    // Realizar web scraping
    const html = await scrapeContent(URL);
    
    // Parsear contenido
    const parsedContent = parseContent(html);
    
    // Procesar con GPT
    const processedContent = await processWithGPT(
      Array.isArray(parsedContent) ? 
        parsedContent.map(item => `${item.title}: ${item.description}`).join('\n\n') : 
        parsedContent
    );
    
    // Responder con la información procesada
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
        queryType: 'citaciones',
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