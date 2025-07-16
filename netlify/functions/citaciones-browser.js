const cheerio = require('cheerio');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const URL = 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones';

// Simular comportamiento de browser real como tu Puppeteer local
async function scrapeContent(url) {
  try {
    // Hacer múltiples intentos con diferentes estrategias
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Intento ${attempt} de scraping`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Headers que imitan exactamente a un browser real
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'es-CL,es;q=0.9,es-419;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.log(`Attempt ${attempt} failed with status ${response.status}`);
        if (attempt === 3) throw new Error(`HTTP error! status: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      
      // Simular el tiempo de espera que hace Puppeteer (3 segundos)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      
      if (html && html.length > 1000) {
        console.log(`Attempt ${attempt} successful, HTML length: ${html.length}`);
        return html;
      }
    }
    
    throw new Error('Failed to get valid HTML after 3 attempts');
    
  } catch (error) {
    console.error('Error en scraping:', error);
    throw error;
  }
}

// Parsing que imita tu lógica local exitosa
function parseContent(html) {
  const $ = cheerio.load(html);
  
  try {
    const citaciones = [];
    
    // Use comprehensive selectors similar to what works for sesiones
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
      // Government website patterns
      '.agenda-legislativa',
      '.programacion',
      '.calendario-actividades',
      '.comisiones-lista',
      '.citaciones-lista'
    ];
    
    for (const selector of selectors) {
      console.log(`Browser: Trying selector: ${selector}`);
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        // Look for commission-related content with broader criteria
        if (text.length > 30 && (
          text.includes('Comisión') || 
          text.includes('citación') || 
          text.includes('reunión') ||
          text.includes('sesión de comisión') ||
          text.includes('convoca') ||
          text.includes('Comisión Mixta') ||
          text.includes('Comisión de')
        )) {
          // Extract title using multiple approaches
          let title = '';
          
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
          description = $elem.find('p, .description, .descripcion, .content, .detalle').first().text().trim() ||
                       $elem.find('td:nth-child(2), td:nth-child(3)').text().trim() ||
                       text.substring(title.length).trim().substring(0, 400);
          
          // Extract date using enhanced function
          const date = extractDate(text) || 
                      $elem.find('.fecha, .date, time, .cuando').text().trim() ||
                      'Fecha por confirmar';
          
          // Only add if we have meaningful content
          if (title && title.length > 5 && 
              !title.toLowerCase().includes('menú') && 
              !title.toLowerCase().includes('navegación') &&
              !title.toLowerCase().includes('footer') &&
              !title.toLowerCase().includes('header') &&
              !title.toLowerCase().includes('sidebar')) {
            
            citaciones.push({
              title: title.substring(0, 200),
              description: description || 'Sin descripción disponible',
              date: date
            });
          }
        }
      });
      
      // If we found content with this selector, stop trying others
      if (citaciones.length > 0) {
        console.log(`Browser: Found ${citaciones.length} items with selector: ${selector}`);
        break;
      }
    }
    
    // Enhanced fallback - broader search for commission content
    if (citaciones.length === 0) {
      console.log('Browser: No structured content found, trying enhanced fallback');
      
      // Try searching div, section, article elements for commission content
      $('div, section, article, p').each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        // Look for commission-related content
        if (text.length > 80 && text.length < 1500 && 
            (text.includes('Comisión') || text.includes('citación') || text.includes('reunión'))) {
          
          // Extract a meaningful title
          let title = '';
          const titleMatch = text.match(/(Comisión[^.]{10,80})/i);
          if (titleMatch) {
            title = titleMatch[1].trim();
          } else {
            title = text.split('.')[0].substring(0, 80) + '...';
          }
          
          citaciones.push({
            title: title || 'Información de Comisiones',
            description: text.substring(0, 500),
            date: extractDate(text) || 'Fecha por confirmar'
          });
          
          return false; // Stop after first meaningful match
        }
      });
      
      // If still no commission-related content found
      if (citaciones.length === 0) {
        return [{
          title: 'Sin citaciones disponibles actualmente',
          description: 'No se encontraron citaciones de comisiones en el sitio del Senado en este momento. Es posible que no haya citaciones programadas para esta semana.',
          date: 'N/A'
        }];
      }
    }
    
    return citaciones.slice(0, 8);
    
  } catch (error) {
    console.error('Error parseando contenido:', error);
    return [{
      title: 'Error en procesamiento',
      description: 'No se pudo procesar la información del sitio web',
      date: 'N/A'
    }];
  }
}

// Enhanced date extraction function
function extractDate(text) {
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{1,2}-\d{1,2}-\d{4}/,
    /\d{1,2} de \w+ de \d{4}/,
    /\w+,?\s+\d{1,2}\s+de\s+\w+/i,
    /(lunes|martes|miércoles|jueves|viernes|sábado|domingo).{0,20}\d{1,2}/i,
    /\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return null;
}

async function processWithGPT(content) {
  try {
    const prompt = `Analiza la siguiente información del Senado de Chile sobre citaciones a comisiones. Esta información fue extraída del sitio oficial y debe contener datos actuales. Organiza y presenta la información de manera clara, incluyendo fechas, horarios, comisiones y temas. Responde en español:

${content}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en analizar información legislativa del Senado de Chile. La información proviene del sitio oficial y debe ser actual. Organiza los datos de manera clara y útil en español."
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
    return "Error al procesar con IA. La información extraída está disponible arriba.";
  }
}

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
    console.log('Simulando comportamiento de browser como Puppeteer local');
    
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
        source: 'Senado de Chile - Extraído con lógica tipo browser',
        url: URL,
        timestamp: new Date().toISOString(),
        queryType: 'citaciones',
        scrapingMethod: 'fetch optimizado para simular Puppeteer local',
        note: 'Usando misma lógica que funciona localmente'
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
