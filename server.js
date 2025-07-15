const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URLs del Senado de Chile
const URLS = {
  citaciones: 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones',
  sesiones: 'https://www.senado.cl/actividad-legislativa/sala-de-sesiones/tabla-semanal'
};

// Función para extraer contenido con Puppeteer
async function scrapeContent(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    console.error('Error scraping content:', error);
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
  let extractedData = [];
  
  try {
    switch (queryType) {
      case 'citaciones':
        // Buscar elementos que contengan información de citaciones
        $('div, article, section').each((index, element) => {
          const $element = $(element);
          const text = $element.text().trim();
          
          if (text.includes('Comisión') || text.includes('citación') || text.includes('reunión')) {
            const title = $element.find('h1, h2, h3, h4, strong').first().text().trim();
            const content = text.substring(0, 500);
            
            if (title && content) {
              extractedData.push({
                title: title || 'Citación de Comisión',
                description: content,
                type: 'citacion'
              });
            }
          }
        });
        break;
        
      case 'sesiones':
        // Buscar elementos que contengan información de sesiones
        $('div, article, section, table').each((index, element) => {
          const $element = $(element);
          const text = $element.text().trim();
          
          if (text.includes('sesión') || text.includes('sala') || text.includes('tabla')) {
            const title = $element.find('h1, h2, h3, h4, strong').first().text().trim();
            const content = text.substring(0, 500);
            
            if (title && content) {
              extractedData.push({
                title: title || 'Sesión del Senado',
                description: content,
                type: 'sesion'
              });
            }
          }
        });
        break;
        
      case 'calendario':
        // Para el calendario, extraer información de fechas y eventos
        $('div, article, section').each((index, element) => {
          const $element = $(element);
          const text = $element.text().trim();
          
          if (text.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || text.includes('calendario') || text.includes('semana')) {
            const title = $element.find('h1, h2, h3, h4, strong').first().text().trim();
            const content = text.substring(0, 500);
            
            if (title && content) {
              extractedData.push({
                title: title || 'Evento del Calendario',
                description: content,
                type: 'calendario'
              });
            }
          }
        });
        break;
    }
    
    // Si no se encontró contenido específico, extraer el contenido general
    if (extractedData.length === 0) {
      const mainContent = $('main, .content, .container, body').first().text().trim();
      return mainContent.substring(0, 2000);
    }
    
    return extractedData;
  } catch (error) {
    console.error('Error parsing content:', error);
    return $('body').text().trim().substring(0, 2000);
  }
}

// Función para procesar con GPT
async function processWithGPT(content, queryType) {
  try {
    const prompts = {
      citaciones: `Analiza la siguiente información del Senado de Chile y extrae las citaciones de comisiones programadas para esta semana. Organiza la información de manera clara y estructurada, incluyendo fechas, horarios, comisiones y temas a tratar. Responde en español:

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

// Endpoint principal para consultas
app.get('/api/query/:type', async (req, res) => {
  const { type } = req.params;
  
  try {
    console.log(`Iniciando consulta: ${type}`);
    
    // Validar tipo de consulta
    if (!['citaciones', 'sesiones', 'calendario'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de consulta no válido' });
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
    res.json({
      success: true,
      content: parsedContent,
      summary: processedContent,
      source: 'Senado de Chile',
      url: url,
      timestamp: new Date().toISOString(),
      queryType: type
    });
    
  } catch (error) {
    console.error('Error en consulta:', error);
    res.status(500).json({ 
      error: 'Error al procesar la consulta',
      details: error.message 
    });
  }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Servidor funcionando correctamente'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`Salud del servidor: http://localhost:${PORT}/api/health`);
}); 