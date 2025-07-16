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
      console.log(`Intento ${attempt} de scraping calendario`);
      
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
    console.error('Error en scraping calendario:', error);
    throw error;
  }
}

// Parsing que imita tu lógica local exitosa para calendario
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
    
    // Improved fallback - more targeted search for calendar content
    if (eventos.length === 0) {
      // Try specific content areas with calendar/agenda-related content
      const contentSelectors = [
        'main',
        '.contenido-principal',
        '.calendario',
        '.agenda',
        '.content-area',
        '.main-content',
        '#main'
      ];
      
      for (const selector of contentSelectors) {
        const $content = $(selector);
        if ($content.length > 0) {
          const text = $content.text().trim();
          if (text.includes('calendario') || text.includes('agenda') || text.includes('actividad') || text.includes('comisión')) {
            eventos.push({
              title: 'Información del Calendario de Actividades',
              description: text.substring(0, 400),
              date: 'Fecha por confirmar'
            });
            break;
          }
        }
      }
      
      // If still no calendar-related content found
      if (eventos.length === 0) {
        return [{
          title: 'Sin calendario disponible actualmente',
          description: 'No se encontró información sobre calendario de actividades legislativas en el sitio del Senado en este momento.',
          date: 'N/A'
        }];
      }
    }
    
    return eventos.slice(0, 8);
    
  } catch (error) {
    console.error('Error parseando contenido de calendario:', error);
    return [{
      title: 'Error en procesamiento',
      description: 'No se pudo procesar la información del sitio web',
      date: 'N/A'
    }];
  }
}

async function processWithGPT(content) {
  try {
    const prompt = `Analiza la siguiente información del Senado de Chile sobre el calendario de actividades legislativas. Esta información fue extraída del sitio oficial y debe contener datos actuales. Organiza y presenta la información de manera clara como un calendario semanal, incluyendo fechas, horarios, tipos de actividades y temas. Responde en español:

${content}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en analizar información legislativa del Senado de Chile sobre calendario de actividades. La información proviene del sitio oficial y debe ser actual. Organiza los datos como un calendario útil en español."
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
    console.log('Simulando comportamiento de browser para calendario como Puppeteer local');
    
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
        queryType: 'calendario',
        scrapingMethod: 'fetch optimizado para simular Puppeteer local',
        note: 'Usando misma lógica que funciona localmente'
      })
    };
    
  } catch (error) {
    console.error('Error en consulta de calendario:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error al procesar la consulta de calendario',
        details: error.message 
      })
    };
  }
}; 