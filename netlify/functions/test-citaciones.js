const cheerio = require('cheerio');

const URL = 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones';

async function diagnosticScrape() {
  try {
    console.log('=== DIAGNOSTIC TEST FOR CITACIONES EXTRACTION ===');
    
    const response = await fetch(URL, {
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
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // DIAGNOSTIC 1: Basic page info
    console.log('\n=== BASIC PAGE INFO ===');
    console.log(`HTML length: ${html.length}`);
    console.log(`Title: ${$('title').text()}`);
    console.log(`Response status: ${response.status}`);
    
    // DIAGNOSTIC 2: Check for key terms
    console.log('\n=== KEY TERMS SEARCH ===');
    const bodyText = $('body').text();
    console.log(`Contains "Comisión": ${bodyText.includes('Comisión')}`);
    console.log(`Contains "citaciones": ${bodyText.includes('citaciones')}`);
    console.log(`Contains "Hacienda": ${bodyText.includes('Hacienda')}`);
    console.log(`Contains "Medio Ambiente": ${bodyText.includes('Medio Ambiente')}`);
    console.log(`Contains "julio": ${bodyText.includes('julio')}`);
    console.log(`Contains "Lugar": ${bodyText.includes('Lugar')}`);
    console.log(`Contains "Horario": ${bodyText.includes('Horario')}`);
    
    // DIAGNOSTIC 3: Find all elements containing "Comisión"
    console.log('\n=== ELEMENTS WITH "COMISIÓN" ===');
    let elementsFound = 0;
    $('*').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      if (text.includes('Comisión')) {
        elementsFound++;
        if (elementsFound <= 10) { // Show first 10
          console.log(`\nElement ${elementsFound}:`);
          console.log(`Tag: ${elem.tagName}`);
          console.log(`Classes: ${$elem.attr('class') || 'none'}`);
          console.log(`Text length: ${text.length}`);
          console.log(`Text preview: ${text.substring(0, 200)}...`);
        }
      }
    });
    console.log(`Total elements with "Comisión": ${elementsFound}`);
    
    // DIAGNOSTIC 4: Look for specific commission names
    console.log('\n=== COMMISSION NAMES SEARCH ===');
    const commissionMatches = bodyText.match(/Comisión\s+de\s+[^,\n\r\f\.]+/gi);
    if (commissionMatches) {
      console.log(`Found ${commissionMatches.length} commission matches:`);
      commissionMatches.slice(0, 10).forEach((match, i) => {
        console.log(`${i + 1}. ${match}`);
      });
    } else {
      console.log('No commission name patterns found');
    }
    
    // DIAGNOSTIC 5: Look for date patterns
    console.log('\n=== DATE PATTERNS SEARCH ===');
    const datePatterns = [
      /lunes,?\s*\d{1,2}\s*de\s*\w+/gi,
      /martes,?\s*\d{1,2}\s*de\s*\w+/gi,
      /miércoles,?\s*\d{1,2}\s*de\s*\w+/gi,
      /jueves,?\s*\d{1,2}\s*de\s*\w+/gi,
      /viernes,?\s*\d{1,2}\s*de\s*\w+/gi
    ];
    
    datePatterns.forEach((pattern, i) => {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log(`Date pattern ${i + 1} matches:`, matches.slice(0, 5));
      }
    });
    
    // DIAGNOSTIC 6: Check main content areas
    console.log('\n=== MAIN CONTENT AREAS ===');
    const selectors = [
      'main', '.main', '#main',
      '.content', '#content', 
      '.container', '.card',
      'article', 'section',
      '.citaciones', '#citaciones',
      '.comisiones', '#comisiones'
    ];
    
    selectors.forEach(selector => {
      const $el = $(selector);
      if ($el.length > 0) {
        console.log(`Found ${selector}: ${$el.length} elements`);
        const text = $el.first().text();
        if (text.includes('Comisión')) {
          console.log(`  Contains "Comisión": YES`);
          console.log(`  Text length: ${text.length}`);
          console.log(`  Preview: ${text.substring(0, 150)}...`);
        }
      }
    });
    
    // DIAGNOSTIC 7: Raw HTML sample to see actual structure
    console.log('\n=== HTML STRUCTURE SAMPLE ===');
    const htmlSample = html.substring(0, 2000);
    console.log('First 2000 characters of HTML:');
    console.log(htmlSample);
    
    return {
      success: true,
      diagnostics: {
        htmlLength: html.length,
        title: $('title').text(),
        hasComision: bodyText.includes('Comisión'),
        elementsWithComision: elementsFound,
        commissionMatches: commissionMatches ? commissionMatches.length : 0,
        sampleHtml: htmlSample
      }
    };
    
  } catch (error) {
    console.error('Diagnostic error:', error);
    return {
      success: false,
      error: error.message
    };
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
    const result = await diagnosticScrape();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Test failed',
        details: error.message 
      })
    };
  }
}; 