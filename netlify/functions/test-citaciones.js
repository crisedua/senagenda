const OpenAI = require('openai');
const cheerio = require('cheerio');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test function to check actual website extraction
async function testRealExtraction() {
  try {
    console.log('Testing real extraction from Senate website...');
    
    const response = await fetch('https://www.senado.cl/actividad-legislativa/comisiones/citaciones', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-CL,es;q=0.8,en;q=0.6',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`HTML length: ${html.length}`);
    
    const $ = cheerio.load(html);
    
    // Test basic content detection
    const bodyText = $('body').text();
    const hasComisiones = bodyText.includes('Comisión');
    const hasCitaciones = bodyText.includes('citación');
    
    console.log(`Body text length: ${bodyText.length}`);
    console.log(`Contains "Comisión": ${hasComisiones}`);
    console.log(`Contains "citación": ${hasCitaciones}`);
    
    // Test different selectors
    const testSelectors = [
      'table tr',
      'ul li', 
      '.comision-item',
      'article',
      '.card',
      'div'
    ];
    
    const results = {};
    for (const selector of testSelectors) {
      const elements = $(selector);
      let relevantCount = 0;
      
      elements.each((i, elem) => {
        const text = $(elem).text().trim();
        if (text.includes('Comisión') || text.includes('citación')) {
          relevantCount++;
        }
      });
      
      results[selector] = {
        total: elements.length,
        relevant: relevantCount
      };
    }
    
    return {
      htmlLength: html.length,
      bodyTextLength: bodyText.length,
      hasComisiones,
      hasCitaciones,
      selectorResults: results,
      sampleText: bodyText.substring(0, 500)
    };
    
  } catch (error) {
    console.error('Error in real extraction test:', error);
    return {
      error: error.message,
      stack: error.stack
    };
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
    console.log('Iniciando test avanzado de citaciones');
    
    // Test real extraction
    const realExtractionTest = await testRealExtraction();
    
    // Test de datos simulados
    const mockData = [
      {
        title: "Comisión de Hacienda",
        description: "Reunión para revisar presupuesto nacional 2025",
        date: "15 de julio, 2025 - 09:00"
      },
      {
        title: "Comisión de Educación", 
        description: "Análisis de reforma educacional",
        date: "16 de julio, 2025 - 14:30"
      }
    ];
    
    // Test básico de OpenAI (opcional)
    let aiSummary = "Resumen generado por IA no disponible en modo test";
    
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Eres un asistente del Senado de Chile. Responde brevemente."
            },
            {
              role: "user", 
              content: "Resume en una línea: hay reuniones de comisiones de Hacienda y Educación esta semana."
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        });
        
        aiSummary = response.choices[0].message.content;
      } catch (aiError) {
        console.error('Error con OpenAI:', aiError);
        aiSummary = `Error de OpenAI: ${aiError.message}`;
      }
    }
    
    // Responder con la información de test
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        content: mockData,
        summary: aiSummary,
        source: 'Senado de Chile (TEST MODE)',
        url: 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones',
        timestamp: new Date().toISOString(),
        queryType: 'citaciones',
        debug: {
          realExtractionTest: realExtractionTest,
          note: 'This test includes actual website analysis'
        },
        environment: {
          nodeVersion: process.version,
          hasOpenAI: !!process.env.OPENAI_API_KEY,
          netlifyContext: context?.awsRequestId ? 'Netlify Functions' : 'Local'
        }
      })
    };
    
  } catch (error) {
    console.error('Error en test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error en función de test',
        details: error.message,
        stack: error.stack
      })
    };
  }
}; 