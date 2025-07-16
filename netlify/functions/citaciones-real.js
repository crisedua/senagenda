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
    
    // Target the specific structure from the Chilean Senate website
    const selectors = [
      // Main content containers
      '.main-content',
      '.content',
      '.contenido',
      '.container',
      // Commission-specific containers
      '.comision-container',
      '.comision-card',
      '.commission-item',
      '.citacion-container',
      // Generic containers that might hold commission data
      '.card',
      '.item',
      '.row',
      '.col',
      'article',
      'section',
      // Date/schedule containers
      '.agenda-item',
      '.schedule-item',
      '.evento'
    ];
    
    // First, try to find structured commission data
    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        // Look specifically for commission-related content
        if (text.includes('Comisión') && (text.includes('Lugar') || text.includes('Horario') || text.includes('Sala'))) {
          
          // Extract commission name
          let title = $elem.find('h1, h2, h3, h4, h5, .title, .nombre, strong').first().text().trim();
          if (!title) {
            // Fallback: extract "Comisión de..." from text
            const comisionMatch = text.match(/Comisión de[^.]*(?=\s*Lugar|\s*Horario|$)/i);
            title = comisionMatch ? comisionMatch[0].trim() : 'Comisión';
          }
          
          // Extract location
          let location = '';
          const lugarMatch = text.match(/Lugar:\s*([^H]*?)(?=Horario|$)/i);
          if (lugarMatch) {
            location = lugarMatch[1].trim();
          }
          
          // Extract time
          let horario = '';
          const horarioMatch = text.match(/Horario:\s*([^L]*?)(?=Lugar|$)/i);
          if (horarioMatch) {
            horario = horarioMatch[1].trim();
          }
          
          // Extract date context
          let fecha = '';
          const dateContext = $elem.closest('section, article, .day-container, .date-container').find('h1, h2, h3, .date, .fecha').first().text().trim();
          if (dateContext && dateContext.match(/\d+.*de.*\w+/)) {
            fecha = dateContext;
          }
          
          if (title && title.length > 5) {
            const description = `${location ? `Lugar: ${location}` : ''}${horario ? ` | Horario: ${horario}` : ''}`.trim();
            
            citaciones.push({
              title: title,
              description: description || text.substring(0, 200),
              date: fecha || new Date().toLocaleDateString('es-CL'),
              location: location,
              time: horario
            });
          }
        }
      });
      
      if (citaciones.length > 0) break;
    }
    
    // Alternative approach: look for any text containing commission info
    if (citaciones.length === 0) {
      $('div, section, article, li, tr').each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        if (text.includes('Comisión de') && text.length < 500) {
          const title = text.match(/Comisión de[^.]*?(?=\s|$)/i)?.[0] || 'Comisión';
          
          if (title.length > 10) {
            citaciones.push({
              title: title,
              description: text.substring(0, 300),
              date: new Date().toLocaleDateString('es-CL')
            });
          }
        }
      });
    }
    
    // Remove duplicates
    const uniqueCitaciones = citaciones.filter((item, index, self) => 
      index === self.findIndex(t => t.title === item.title)
    );
    
    console.log(`Found ${uniqueCitaciones.length} citaciones using content parsing`);
    
    if (uniqueCitaciones.length === 0) {
      return [{
        title: 'Estado de Citaciones',
        description: 'No se encontraron citaciones de comisiones programadas en este momento. El contenido puede estar en una estructura diferente de la esperada.',
        date: new Date().toLocaleDateString('es-CL')
      }];
    }
    
    return uniqueCitaciones.slice(0, 10);
    
  } catch (error) {
    console.error('Error parsing content:', error);
    return [{
      title: 'Error en la consulta',
      description: `Error al procesar el contenido: ${error.message}`,
      date: new Date().toLocaleDateString('es-CL')
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