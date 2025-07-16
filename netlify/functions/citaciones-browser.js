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
        const $element = $(elem);
        const text = $element.text().trim();
        
        // Look specifically for commission-related content with location/time info
        if (text.includes('Comisión') && (text.includes('Lugar') || text.includes('Horario') || text.includes('Sala'))) {
          
          // Extract commission name
          let title = $element.find('h1, h2, h3, h4, h5, .title, .nombre, strong').first().text().trim();
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
          const dateContext = $element.closest('section, article, .day-container, .date-container').find('h1, h2, h3, .date, .fecha').first().text().trim();
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
        const $element = $(elem);
        const text = $element.text().trim();
        
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
    
    console.log(`Found ${uniqueCitaciones.length} citaciones using browser parsing`);
    
    if (uniqueCitaciones.length === 0) {
      return [{
        title: 'Estado de Citaciones',
        description: 'No se encontraron citaciones de comisiones programadas en este momento. El contenido puede estar en una estructura diferente de la esperada.',
        date: new Date().toLocaleDateString('es-CL')
      }];
    }
    
    return uniqueCitaciones.slice(0, 10);
    
  } catch (error) {
    console.error('Error in browser parsing:', error);
    return [{
      title: 'Error en la consulta',
      description: `Error al procesar el contenido: ${error.message}`,
      date: new Date().toLocaleDateString('es-CL')
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
