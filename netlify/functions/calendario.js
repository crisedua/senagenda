const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cheerio = require('cheerio');
const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL del Senado de Chile (usando citaciones que contiene información de fechas)
const URL = 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones';

// Función para extraer contenido con Puppeteer optimizado para Netlify
async function scrapeContent(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Esperar a que el contenido se cargue
    await page.waitForTimeout(3000);
    
    const content = await page.content();
    return content;
    
  } catch (error) {
    console.error('Error en scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Función para parsear contenido con Cheerio
function parseContent(html) {
  const $ = cheerio.load(html);
  
  try {
    const eventos = [];
    $('.evento, .calendar-item, .agenda-item, .comision-item, .citacion-item, article').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h3, h4, .event-title, .title, .titulo').text().trim() ||
                   $elem.find('h2, a').first().text().trim();
      const description = $elem.find('p, .event-desc, .description, .content').text().trim();
      const date = $elem.find('.date, .fecha, time').text().trim();
      
      if (title && title.length > 5) {
        eventos.push({
          title: title,
          description: description || 'Sin descripción',
          date: date || 'Por confirmar'
        });
      }
    });
    
    return eventos.length > 0 ? eventos : [{
      title: 'Calendario Legislativo',
      description: $('body').text().substring(0, 500) + '...',
      date: new Date().toLocaleDateString('es-CL')
    }];
    
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
    console.log('Iniciando consulta de calendario');
    
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
        queryType: 'calendario'
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