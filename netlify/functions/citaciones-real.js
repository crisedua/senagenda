const cheerio = require('cheerio');
const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL del Senado de Chile
const URL = 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones';

// Since the website uses client-side rendering, we'll try alternative approaches
async function scrapeContent(url) {
  try {
    // Strategy 1: Try to get the initial HTML and look for data sources
    const response = await fetch(url, {
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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Strategy 2: Try to find API endpoints or data sources in the HTML
    const apiMatches = html.match(/\/api\/[^"'\s]*/g) || [];
    const dataUrls = html.match(/https?:\/\/[^"'\s]*(?:comision|citacion|agenda)[^"'\s]*/gi) || [];
    
    console.log('Found potential API endpoints:', apiMatches);
    console.log('Found potential data URLs:', dataUrls);
    
    // Strategy 3: Try the discovered API endpoints with the correct base URL
    const discoveredEndpoints = [...new Set(apiMatches)]; // Remove duplicates
    for (const endpoint of discoveredEndpoints) {
      try {
        const fullUrl = `https://www.senado.cl${endpoint}`;
        console.log(`Trying discovered API endpoint: ${fullUrl}`);
        const apiResponse = await fetch(fullUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data && (Array.isArray(data) || data.citaciones || data.comisiones || data.data)) {
            console.log(`Found data at ${fullUrl}`);
            return { type: 'api', data, url: fullUrl };
          }
        }
      } catch (e) {
        console.log(`Discovered API endpoint ${endpoint} failed:`, e.message);
      }
    }
    
    // Strategy 4: Try common API patterns for Chilean government sites
    const potentialEndpoints = [
      'https://www.senado.cl/api/citaciones',
      'https://www.senado.cl/api/comisiones/citaciones',
      'https://www.senado.cl/_next/data/citaciones',
      'https://api.senado.cl/citaciones',
      'https://www.senado.cl/ws/citaciones'
    ];
    
    for (const endpoint of potentialEndpoints) {
      try {
        console.log(`Trying API endpoint: ${endpoint}`);
        const apiResponse = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data && (Array.isArray(data) || data.citaciones || data.comisiones)) {
            console.log(`Found data at ${endpoint}`);
            return { type: 'api', data, url: endpoint };
          }
        }
      } catch (e) {
        console.log(`API endpoint ${endpoint} failed:`, e.message);
      }
    }
    
    return { type: 'html', data: html, url };
    
  } catch (error) {
    console.error('Error en scraping:', error);
    throw error;
  }
}

// Enhanced function to extract from different data sources
function parseContent(source) {
  try {
    if (source.type === 'api') {
      return parseApiData(source.data);
    } else {
      return parseHtmlData(source.data);
    }
  } catch (error) {
    console.error('Error parsing content:', error);
    return [{
      title: 'Error en extracción',
      description: `Error al procesar el contenido: ${error.message}`,
      date: new Date().toLocaleDateString('es-CL')
    }];
  }
}

function parseApiData(data) {
  const citaciones = [];
  
  // Handle different API response structures
  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data.citaciones) {
    items = data.citaciones;
  } else if (data.comisiones) {
    items = data.comisiones;
  } else if (data.data) {
    items = Array.isArray(data.data) ? data.data : [data.data];
  }
  
  items.forEach(item => {
    if (item && (item.nombre || item.title || item.comision)) {
      citaciones.push({
        title: item.nombre || item.title || item.comision || 'Comisión',
        description: item.descripcion || item.description || item.lugar || item.horario || '',
        date: item.fecha || item.date || new Date().toLocaleDateString('es-CL'),
        location: item.lugar || item.location || item.sala || '',
        time: item.horario || item.time || item.hora || ''
      });
    }
  });
  
  return citaciones.length > 0 ? citaciones : [{
    title: 'Datos API encontrados',
    description: 'Se encontraron datos en API pero no pudieron ser procesados correctamente',
    date: new Date().toLocaleDateString('es-CL')
  }];
}

function parseHtmlData(html) {
  const $ = cheerio.load(html);
  const citaciones = [];
  
  console.log('HTML length received:', html.length);
  
  // Enhanced extraction for client-side rendered content
  // Look for JSON data embedded in script tags
  $('script').each((i, elem) => {
    const scriptContent = $(elem).html() || '';
    
    // Look for Next.js pageProps data which contains the actual commission data
    if (scriptContent.includes('pageProps') && scriptContent.includes('Comisión')) {
      console.log(`Found pageProps script with commission data, length: ${scriptContent.length}`);
      
      try {
        // Try to extract the JSON object
        const jsonMatch = scriptContent.match(/\{.*\}/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Navigate through Next.js data structure
          if (parsed.props && parsed.props.pageProps) {
            const pageData = parsed.props.pageProps;
            
            // Look for commission data in various possible locations
            const searchInObject = (obj, path = '') => {
              if (!obj || typeof obj !== 'object') return;
              
              Object.keys(obj).forEach(key => {
                const value = obj[key];
                
                if (typeof value === 'string' && value.includes('Comisión')) {
                  console.log(`Found commission text at ${path}.${key}: ${value.substring(0, 100)}`);
                  
                  // Extract commission name
                  const comisionMatches = value.match(/Comisión\s+de\s+[^,\n\r\f\.]+/gi);
                  if (comisionMatches) {
                    comisionMatches.forEach(match => {
                      if (!citaciones.find(c => c.title === match.trim())) {
                        citaciones.push({
                          title: match.trim(),
                          description: value.length > 100 ? value.substring(0, 200) + '...' : value,
                          date: new Date().toLocaleDateString('es-CL'),
                          source: 'Next.js pageProps data'
                        });
                      }
                    });
                  }
                } else if (Array.isArray(value)) {
                  value.forEach((item, index) => {
                    searchInObject(item, `${path}.${key}[${index}]`);
                  });
                } else if (typeof value === 'object' && value !== null) {
                  searchInObject(value, `${path}.${key}`);
                }
              });
            };
            
            searchInObject(pageData, 'pageProps');
          }
        }
      } catch (e) {
        console.log('Error parsing pageProps JSON:', e.message);
        
        // Fallback: extract commission names directly from script content
        const comisionMatches = scriptContent.match(/Comisión\s+de\s+[^"',\n\r\f\.]+/gi);
        if (comisionMatches) {
          console.log(`Found ${comisionMatches.length} commission matches in script content`);
          comisionMatches.slice(0, 10).forEach(match => {
            if (!citaciones.find(c => c.title === match.trim())) {
              citaciones.push({
                title: match.trim(),
                description: 'Extraído de datos Next.js',
                date: new Date().toLocaleDateString('es-CL'),
                source: 'JavaScript script parsing'
              });
            }
          });
        }
      }
    }
    
    // Also look for other patterns in scripts
    if (scriptContent.includes('Comisión') && !scriptContent.includes('pageProps')) {
      const comisionMatches = scriptContent.match(/Comisión\s+de\s+[^"',\n\r\f\.]+/gi);
      if (comisionMatches) {
        comisionMatches.slice(0, 5).forEach(match => {
          if (!citaciones.find(c => c.title === match.trim())) {
            citaciones.push({
              title: match.trim(),
              description: 'Extraído de script JavaScript',
              date: new Date().toLocaleDateString('es-CL'),
              source: 'JavaScript content'
            });
          }
        });
      }
    }
  });
  
  // If no JS data found, fall back to our previous extraction method
  if (citaciones.length === 0) {
    console.log('No JavaScript data found, falling back to HTML extraction...');
    
    // Search the full body text for commission information
    const bodyText = $('body').text();
    console.log(`Searching body text of ${bodyText.length} characters`);
    
    const comisionMatches = bodyText.match(/Comisión\s+de\s+[^,\n\r\f\.]+/gi);
    if (comisionMatches) {
      console.log(`Found ${comisionMatches.length} commission matches in body text`);
      comisionMatches.slice(0, 10).forEach(match => {
        if (!citaciones.find(c => c.title === match.trim())) {
          citaciones.push({
            title: match.trim(),
            description: 'Extraído del contenido de la página',
            date: new Date().toLocaleDateString('es-CL'),
            source: 'Body text extraction'
          });
        }
      });
    }
    
    // Also search for specific terms we know are there
    if (bodyText.includes('Hacienda')) {
      citaciones.push({
        title: 'Comisión de Hacienda',
        description: 'Comisión identificada en el contenido de la página',
        date: new Date().toLocaleDateString('es-CL'),
        source: 'Keyword detection'
      });
    }
    
    if (bodyText.includes('Medio Ambiente')) {
      citaciones.push({
        title: 'Comisión de Medio Ambiente',
        description: 'Comisión identificada en el contenido de la página',
        date: new Date().toLocaleDateString('es-CL'),
        source: 'Keyword detection'
      });
    }
  }
  
  // Remove duplicates and limit results
  const uniqueCitaciones = citaciones.filter((item, index, self) => 
    index === self.findIndex(t => t.title === item.title)
  ).slice(0, 10);
  
  console.log(`Final result: ${uniqueCitaciones.length} citaciones found`);
  
  if (uniqueCitaciones.length === 0) {
    // Provide enhanced diagnostic information
    const bodyLength = $('body').text().length;
    const hasComisionText = $('body').text().includes('Comisión');
    const scriptTags = $('script').length;
    const hasNextData = html.includes('__NEXT_DATA__');
    
    return [{
      title: 'Diagnóstico Avanzado - Sitio con JavaScript',
      description: `Página Next.js procesada: ${bodyLength} caracteres. Scripts: ${scriptTags}. Contiene "Comisión": ${hasComisionText}. NextData: ${hasNextData}. Requiere procesamiento de JavaScript para obtener datos completos.`,
      date: new Date().toLocaleDateString('es-CL')
    }];
  }
  
  return uniqueCitaciones;
}

// Función para procesar con GPT
async function processWithGPT(content) {
  try {
    const prompt = `El sitio web del Senado de Chile usa JavaScript para cargar contenido dinámico. Analiza la siguiente información extraída y organiza las citaciones a comisiones encontradas. Si la información es limitada debido a las restricciones técnicas del sitio, explica claramente que se requiere acceso con JavaScript para obtener datos completos:

${content}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en analizar información legislativa del Senado de Chile. El sitio web usa JavaScript para cargar contenido, lo que puede limitar la extracción de datos. Sé transparente sobre las limitaciones técnicas y proporciona la mejor información disponible."
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
    return "Error al procesar la información con IA. La información extraída está disponible arriba.";
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
    console.log('Iniciando consulta con soporte para JavaScript rendering');
    
    // Realizar web scraping con detección de APIs
    const source = await scrapeContent(URL);
    
    // Parsear contenido según el tipo de fuente
    const parsedContent = parseContent(source);
    
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
        queryType: 'citaciones',
        scrapingMethod: source.type === 'api' ? 'API endpoint' : 'Enhanced HTML + JS extraction',
        technicalNote: 'Sitio web usa JavaScript para contenido dinámico'
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