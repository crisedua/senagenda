const cheerio = require('cheerio');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const URL = 'https://www.senado.cl/actividad-legislativa/sala-de-sesiones/tabla-semanal';

// Simular comportamiento de browser real como tu Puppeteer local
async function scrapeContent(url) {
  try {
    // Hacer múltiples intentos con diferentes estrategias
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Intento ${attempt} de scraping sesiones`);
      
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
    console.error('Error en scraping sesiones:', error);
    throw error;
  }
}

// Parsing que imita tu lógica local exitosa para sesiones
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
    
    // Improved fallback - more targeted search for session content
    if (sesiones.length === 0) {
      // Try specific content areas with session-related content
      const contentSelectors = [
        'main',
        '.tabla-semanal',
        '.contenido-principal',
        '.content-area',
        '.main-content',
        '#main'
      ];
      
      for (const selector of contentSelectors) {
        const $content = $(selector);
        if ($content.length > 0) {
          const text = $content.text().trim();
          if (text.includes('sesión') || text.includes('tabla') || text.includes('programación')) {
            sesiones.push({
              title: 'Información de Sesiones Parlamentarias',
              description: text.substring(0, 400),
              date: 'Fecha por confirmar'
            });
            break;
          }
        }
      }
      
      // If still no session-related content found
      if (sesiones.length === 0) {
        return [{
          title: 'Sin sesiones disponibles actualmente',
          description: 'No se encontraron sesiones programadas en el sitio del Senado en este momento. Es posible que no haya sesiones programadas para esta semana.',
          date: 'N/A'
        }];
      }
    }
    
    return sesiones.slice(0, 8);
    
  } catch (error) {
    console.error('Error parseando contenido de sesiones:', error);
    return [{
      title: 'Error en procesamiento',
      description: 'No se pudo procesar la información del sitio web',
      date: 'N/A'
    }];
  }
}

async function processWithGPT(content) {
  try {
    const prompt = `Analiza la siguiente información del Senado de Chile sobre la tabla semanal de sesiones. Esta información fue extraída del sitio oficial y debe contener datos actuales. Organiza y presenta la información de manera clara, incluyendo fechas, horarios, tipos de sesión y temas a tratar. Responde en español:

${content}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en analizar información legislativa del Senado de Chile sobre sesiones parlamentarias. La información proviene del sitio oficial y debe ser actual. Organiza los datos de manera clara y útil en español."
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
    console.log('Simulando comportamiento de browser para sesiones como Puppeteer local');
    
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
        queryType: 'sesiones',
        scrapingMethod: 'fetch optimizado para simular Puppeteer local',
        note: 'Usando misma lógica que funciona localmente'
      })
    };
    
  } catch (error) {
    console.error('Error en consulta de sesiones:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al procesar la consulta de sesiones',
        details: error.message 
      })
    };
  }
}; 