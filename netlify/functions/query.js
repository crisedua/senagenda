const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cheerio = require('cheerio');
const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URLs del Senado de Chile
const URLS = {
  citaciones: 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones',
  sesiones: 'https://www.senado.cl/actividad-legislativa/sala-de-sesiones/tabla-semanal'
};

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
function parseContent(html, queryType) {
  const $ = cheerio.load(html);
  
  try {
    if (queryType === 'citaciones') {
      const citaciones = [];
      $('.comision-item, .citacion-item, .evento-item, article, .card').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h2, h3, h4, .title, .titulo').first().text().trim() ||
                     $elem.find('a').first().text().trim();
        const description = $elem.find('p, .description, .descripcion, .content').first().text().trim();
        const date = $elem.find('.fecha, .date, time').text().trim();
        
        if (title && title.length > 10) {
          citaciones.push({
            title: title,
            description: description || 'Sin descripción disponible',
            date: date || 'Fecha no especificada'
          });
        }
      });
      
      return citaciones.length > 0 ? citaciones : [{
        title: 'Información de Comisiones',
        description: $('body').text().substring(0, 500) + '...',
        date: new Date().toLocaleDateString('es-CL')
      }];
      
    } else if (queryType === 'sesiones') {
      const sesiones = [];
      $('table tr, .sesion-item, .tabla-sesiones tr').each((i, elem) => {
        const $elem = $(elem);
        const fecha = $elem.find('td:first-child, .fecha').text().trim();
        const hora = $elem.find('td:nth-child(2), .hora').text().trim();
        const tipo = $elem.find('td:nth-child(3), .tipo').text().trim();
        const tema = $elem.find('td:last-child, .tema').text().trim();
        
        if (fecha && tema) {
          sesiones.push({
            title: `Sesión: ${tipo || 'Ordinaria'}`,
            description: tema,
            date: `${fecha} ${hora}`.trim()
          });
        }
      });
      
      return sesiones.length > 0 ? sesiones : [{
        title: 'Tabla de Sesiones',
        description: $('body').text().substring(0, 500) + '...',
        date: new Date().toLocaleDateString('es-CL')
      }];
      
    } else {
      // calendario
      const eventos = [];
      $('.evento, .calendar-item, .agenda-item').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h3, h4, .event-title').text().trim();
        const description = $elem.find('p, .event-desc').text().trim();
        const date = $elem.find('.date, .fecha').text().trim();
        
        if (title) {
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
    }
    
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
async function processWithGPT(content, queryType) {
  try {
    const prompts = {
      citaciones: `Analiza la siguiente información del Senado de Chile y extrae las citaciones a comisiones más importantes. Organiza la información incluyendo fechas, horarios, comisiones y temas a tratar. Responde en español:

${content}`,
      
      sesiones: `Analiza la siguiente información del Senado de Chile y extrae la tabla de sesiones actual. Organiza la información incluyendo fechas, horarios, tipo de sesión y temas en tabla. Responde en español:

${content}`,
      
      calendario: `Analiza la siguiente información del Senado de Chile y extrae el calendario de actividades de esta semana. Organiza cronológicamente los eventos, fechas, horarios y descripciones. Responde en español:

${content}`
    };
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en analizar información legislativa del Senado de Chile. Extrae y organiza la información de manera clara y estructurada. Siempre responde en español."
        },
        {
          role: "user",
          content: prompts[queryType]
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
    // Extraer tipo de consulta del path
    const path = event.path || event.rawPath || '';
    const pathParts = path.split('/');
    const type = pathParts[pathParts.length - 1]; // Último segmento del path
    
    console.log(`Iniciando consulta: ${type}`);
    
    // Validar tipo de consulta
    if (!['citaciones', 'sesiones', 'calendario'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Tipo de consulta no válido' })
      };
    }
    
    // Determinar URL según el tipo
    let url;
    if (type === 'citaciones') {
      url = URLS.citaciones;
    } else if (type === 'sesiones') {
      url = URLS.sesiones;
    } else {
      // Para calendario, usar la URL de citaciones ya que contiene información de fechas
      url = URLS.citaciones;
    }
    
    console.log(`Scraping URL: ${url}`);
    
    // Realizar web scraping
    const html = await scrapeContent(url);
    
    // Parsear contenido
    const parsedContent = parseContent(html, type);
    
    // Procesar con GPT
    const processedContent = await processWithGPT(
      Array.isArray(parsedContent) ? 
        parsedContent.map(item => `${item.title}: ${item.description}`).join('\n\n') : 
        parsedContent,
      type
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
        url: url,
        timestamp: new Date().toISOString(),
        queryType: type
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