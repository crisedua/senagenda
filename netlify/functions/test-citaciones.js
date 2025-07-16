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
    console.log('HTML content length:', html.length);
    
    // Test our new parsing logic
    const $ = cheerio.load(html);
    
    console.log('\n=== DEBUGGING HTML STRUCTURE ===');
    
    // Check for commission text anywhere
    const comisionElements = $('*').filter(function() {
      return $(this).text().includes('Comisión');
    });
    console.log(`Found ${comisionElements.length} elements containing "Comisión"`);
    
    // Check for location/time text
    const locationElements = $('*').filter(function() {
      return $(this).text().includes('Lugar') || $(this).text().includes('Horario');
    });
    console.log(`Found ${locationElements.length} elements containing "Lugar" or "Horario"`);
    
    // Sample some commission content
    console.log('\n=== SAMPLE COMMISSION CONTENT ===');
    comisionElements.slice(0, 3).each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 20 && text.length < 300) {
        console.log(`Sample ${i + 1}:`, text.substring(0, 150));
      }
    });
    
    // Test our actual parsing logic
    console.log('\n=== TESTING PARSING LOGIC ===');
    const citaciones = [];
    
    // Use the same selectors as our updated functions
    const selectors = [
      '.main-content', '.content', '.contenido', '.container',
      '.comision-container', '.comision-card', '.commission-item', '.citacion-container',
      '.card', '.item', '.row', '.col', 'article', 'section',
      '.agenda-item', '.schedule-item', '.evento'
    ];
    
    for (const selector of selectors) {
      console.log(`Testing selector: ${selector}`);
      const elements = $(selector);
      console.log(`  Found ${elements.length} elements`);
      
      elements.each((i, elem) => {
        const $elem = $(elem);
        const text = $elem.text().trim();
        
        if (text.includes('Comisión') && (text.includes('Lugar') || text.includes('Horario') || text.includes('Sala'))) {
          console.log(`  MATCH found in ${selector}:`, text.substring(0, 100));
          
          // Extract commission name
          let title = $elem.find('h1, h2, h3, h4, h5, .title, .nombre, strong').first().text().trim();
          if (!title) {
            const comisionMatch = text.match(/Comisión de[^.]*(?=\s*Lugar|\s*Horario|$)/i);
            title = comisionMatch ? comisionMatch[0].trim() : 'Comisión';
          }
          
          console.log(`    Extracted title: ${title}`);
          
          if (title && title.length > 5) {
            citaciones.push({
              title: title,
              description: text.substring(0, 200),
              date: new Date().toLocaleDateString('es-CL')
            });
          }
        }
      });
      
      if (citaciones.length > 0) break;
    }
    
    console.log(`\nFinal result: Found ${citaciones.length} citaciones`);
    citaciones.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`);
    });
    
    return citaciones.length > 0 ? citaciones : [{
      title: 'Debug: No structured content found',
      description: `Checked HTML of ${html.length} characters. Found ${comisionElements.length} commission mentions.`,
      date: new Date().toLocaleDateString('es-CL')
    }];
    
  } catch (error) {
    console.error('Error in test extraction:', error);
    return [{
      title: 'Test Error',
      description: `Error: ${error.message}`,
      date: new Date().toLocaleDateString('es-CL')
    }];
  }
}

exports.handler = async (event, context) => {
  try {
    console.log('=== CITACIONES TEST FUNCTION ===');
    
    const results = await testRealExtraction();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 