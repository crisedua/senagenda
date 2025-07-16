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
    
    // Use more comprehensive selectors based on what works for sesiones
    const selectors = [
      // Table-based selectors (similar to sesiones)
      'table tr',
      'tbody tr',
      '.tabla-citaciones tr',
      '.tabla-contenido tr',
      '.tabla-comisiones tr',
      // List-based selectors
      'ul li',
      'ol li',
      '.listado li',
      '.lista-citaciones li',
      '.lista-comisiones li',
      // Card/item-based selectors
      '.comision-item',
      '.citacion-item', 
      '.evento-item',
      '.actividad-item',
      '.item',
      // Content-based selectors
      'article',
      '.card',
      '.box',
      '.contenido-item',
      // Specific government website patterns
      '.agenda-legislativa',
      '.programacion',
      '.calendario-actividades',
      '.comisiones-lista',
      '.citaciones-lista'
    ];
    
    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`);
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        // Look for commission-related content
        if (text.length > 30 && (
          text.includes('Comisión') || 
          text.includes('citación') || 
          text.includes('reunión') ||
          text.includes('sesión de comisión') ||
          text.includes('convoca')
        )) {
          // Extract title - try multiple approaches
          let title = '';
          
          // Try to find title in various ways
          title = $elem.find('h1, h2, h3, h4, h5').first().text().trim() ||
                  $elem.find('.title, .titulo, .nombre').first().text().trim() ||
                  $elem.find('strong, b').first().text().trim() ||
                  $elem.find('a').first().text().trim() ||
                  $elem.find('td').first().text().trim();
          
          // If no specific title found, extract from beginning of text
          if (!title && text.length > 50) {
            const sentences = text.split('.')[0];
            if (sentences.length < 150) {
              title = sentences.trim();
            }
          }
          
          // Extract description
          let description = '';
          
          // Try to find description in various ways
          description = $elem.find('p, .description, .descripcion, .content, .detalle').first().text().trim() ||
                       $elem.find('td:nth-child(2), td:nth-child(3)').text().trim() ||
                       text.substring(title.length).trim().substring(0, 300);
          
          // Extract date
          let date = '';
          
          // Try to find date in various ways
          date = $elem.find('.fecha, .date, time, .cuando').text().trim() ||
                 $elem.find('td:first-child').text().trim();
          
          // If no specific date found, search in text
          if (!date) {
            const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2} de \w+ de \d{4}|lunes|martes|miércoles|jueves|viernes|sábado|domingo/i);
            if (dateMatch) {
              date = dateMatch[0];
            }
          }
          
          // Only add if we have meaningful content
          if (title && title.length > 5 && 
              !title.toLowerCase().includes('menú') && 
              !title.toLowerCase().includes('navegación') &&
              !title.toLowerCase().includes('footer') &&
              !title.toLowerCase().includes('header')) {
            
            citaciones.push({
              title: title.substring(0, 200),
              description: description ? description.substring(0, 400) : 'Sin descripción disponible',
              date: date || 'Fecha no especificada'
            });
          }
        }
      });
      
      // If we found content with this selector, stop trying others
      if (citaciones.length > 0) {
        console.log(`Found ${citaciones.length} items with selector: ${selector}`);
        break;
      }
    }
    
    // Improved fallback - try to extract any structured content about commissions
    if (citaciones.length === 0) {
      console.log('No structured content found, trying fallback extraction');
      
      // Look for any div or section that mentions commissions
      $('div, section, article').each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        if (text.length > 100 && text.length < 2000 && 
            (text.includes('Comisión') || text.includes('citación'))) {
          
          const title = text.split('.')[0].substring(0, 100) + '...';
          
          citaciones.push({
            title: title || 'Información de Comisiones',
            description: text.substring(0, 500),
            date: 'Fecha por confirmar'
          });
          
          return false; // Stop after first match
        }
      });
      
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