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
    
    console.log('Browser: HTML length received:', html.length);
    
    // Strategy 1: Find any element that contains commission information
    const elementsWithComision = [];
    $('*').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      
      // Look for elements that contain "Comisión" but not too much text (to avoid main containers)
      if (text.includes('Comisión') && text.length > 20 && text.length < 800) {
        elementsWithComision.push({
          element: $elem,
          text: text.trim(),
          tagName: elem.tagName,
          classes: $elem.attr('class') || ''
        });
      }
    });
    
    console.log(`Browser: Found ${elementsWithComision.length} elements containing "Comisión"`);
    
    // Process the found elements to extract commission information
    elementsWithComision.forEach((item, index) => {
      const { element, text } = item;
      
      // Look for commission names in the text
      const comisionMatches = text.match(/Comisión\s+de\s+[^,\n\r\f]+/gi);
      
      if (comisionMatches) {
        comisionMatches.forEach(comisionName => {
          let cleanName = comisionName.trim();
          
          // Extract additional information from the same element
          let location = '';
          let horario = '';
          let fecha = '';
          
          // Look for location patterns
          const locationMatch = text.match(/(?:Lugar|lugar):\s*([^,\n\r\f\|]+)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }
          
          // Look for time patterns
          const timeMatch = text.match(/(?:Horario|horario):\s*([^,\n\r\f\|]+)/i);
          if (timeMatch) {
            horario = timeMatch[1].trim();
          }
          
          // Look for date patterns nearby
          const dateMatch = text.match(/(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo),?\s*\d{1,2}\s*de\s*\w+/i);
          if (dateMatch) {
            fecha = dateMatch[0];
          }
          
          // Only add if we have meaningful content
          if (cleanName.length > 10 && !citaciones.find(c => c.title === cleanName)) {
            const description = [];
            if (location) description.push(`Lugar: ${location}`);
            if (horario) description.push(`Horario: ${horario}`);
            
            citaciones.push({
              title: cleanName,
              description: description.join(' | ') || text.substring(0, 200),
              date: fecha || new Date().toLocaleDateString('es-CL'),
              location: location,
              time: horario
            });
          }
        });
      }
    });
    
    // Strategy 2: If Strategy 1 didn't work, try broader search
    if (citaciones.length === 0) {
      console.log('Browser: Strategy 1 failed, trying Strategy 2...');
      
      // Look at the actual page content structure
      const bodyText = $('body').text();
      const hasComision = bodyText.includes('Comisión');
      const hasLugar = bodyText.includes('Lugar');
      const hasHorario = bodyText.includes('Horario');
      
      console.log(`Browser: Body contains: Comisión: ${hasComision}, Lugar: ${hasLugar}, Horario: ${hasHorario}`);
      
      if (hasComision) {
        // Try to extract any commission information from the full text
        const comisionMatches = bodyText.match(/Comisión\s+de\s+[^,\n\r\f\.]+/gi);
        if (comisionMatches) {
          comisionMatches.slice(0, 5).forEach(match => {
            citaciones.push({
              title: match.trim(),
              description: 'Información extraída del contenido general de la página',
              date: new Date().toLocaleDateString('es-CL')
            });
          });
        }
      }
    }
    
    // Remove duplicates and limit results
    const uniqueCitaciones = citaciones.filter((item, index, self) => 
      index === self.findIndex(t => t.title === item.title)
    ).slice(0, 10);
    
    console.log(`Browser: Final result: ${uniqueCitaciones.length} citaciones found`);
    
    if (uniqueCitaciones.length === 0) {
      // Provide diagnostic information
      const bodyLength = $('body').text().length;
      const hasComisionText = $('body').text().includes('Comisión');
      
      return [{
        title: 'Diagnóstico de Extracción (Browser)',
        description: `Página procesada: ${bodyLength} caracteres. Contiene "Comisión": ${hasComisionText}. Elementos analizados: ${elementsWithComision.length}`,
        date: new Date().toLocaleDateString('es-CL')
      }];
    }
    
    return uniqueCitaciones;
    
  } catch (error) {
    console.error('Browser: Error parsing content:', error);
    return [{
      title: 'Error en extracción (Browser)',
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
