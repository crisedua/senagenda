const OpenAI = require('openai');

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    console.log('Iniciando test de citaciones');
    console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
    
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