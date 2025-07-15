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
    const mockData = [
      {
        title: "Sesión Ordinaria",
        description: "Votación de ley de modernización tributaria",
        date: "15 de julio, 2025 - 16:00"
      },
      {
        title: "Sesión Especial",
        description: "Debate sobre reforma de pensiones",
        date: "17 de julio, 2025 - 10:00"
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        content: mockData,
        summary: "Esta semana el Senado tiene programadas sesiones para tratar temas tributarios y de pensiones.",
        source: 'Senado de Chile (TEST MODE)',
        url: 'https://www.senado.cl/actividad-legislativa/sala-de-sesiones/tabla-semanal',
        timestamp: new Date().toISOString(),
        queryType: 'sesiones'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}; 