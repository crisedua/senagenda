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
        title: "Lunes 15 - Comisión de Hacienda",
        description: "Revisión presupuesto 2025",
        date: "15 de julio, 2025 - 09:00"
      },
      {
        title: "Martes 16 - Sesión de Sala",
        description: "Votación leyes pendientes",
        date: "16 de julio, 2025 - 16:00"
      },
      {
        title: "Miércoles 17 - Comisión de Educación",
        description: "Reforma educacional",
        date: "17 de julio, 2025 - 14:30"
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        content: mockData,
        summary: "Esta semana hay actividades programadas en comisiones de Hacienda y Educación, además de sesión de sala.",
        source: 'Senado de Chile (TEST MODE)',
        url: 'https://www.senado.cl/actividad-legislativa/comisiones/citaciones',
        timestamp: new Date().toISOString(),
        queryType: 'calendario'
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