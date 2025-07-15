# Senado Chile - Aplicación de Consultas Legislativas

Una aplicación web moderna para consultar información del Senado de Chile con procesamiento de IA.

## Características

- 🏛 **Citaciones de Comisiones**: Consulta las citaciones programadas para la semana
- ⏰ **Tabla de Sesiones**: Revisa la tabla de sesiones actual del Senado
- 📅 **Calendario Semanal**: Consulta el calendario de actividades
- 🤖 **Procesamiento con IA**: Análisis inteligente de la información usando GPT-4o-mini
- 📱 **Diseño Responsivo**: Interface moderna y adaptable a todos los dispositivos

## Instalación

### Prerrequisitos

- Node.js (versión 14 o superior)
- npm o yarn
- API Key de OpenAI

### Pasos de instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd senado-chile-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:
   ```
   OPENAI_API_KEY=tu_api_key_de_openai_aqui
   PORT=5000
   NODE_ENV=development
   ```

4. **Configurar Tailwind CSS**
   ```bash
   npx tailwindcss init -p
   ```

## Uso

### Desarrollo

Para ejecutar la aplicación en modo desarrollo:

```bash
npm start
```

Esto iniciará:
- El servidor backend en `http://localhost:5000`
- La aplicación React en `http://localhost:3000`

### Producción

Para construir la aplicación para producción:

```bash
npm run build
```

## Estructura del Proyecto

```
senado-chile-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── Dashboard.js
│   │   ├── QueryButton.js
│   │   ├── QueryResults.js
│   │   └── LoadingSpinner.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── server.js
├── package.json
├── tailwind.config.js
└── README.md
```

## API Endpoints

### `GET /api/query/:type`

Realiza una consulta al Senado de Chile y procesa la información con IA.

**Parámetros:**
- `type`: Tipo de consulta (`citaciones`, `sesiones`, `calendario`)

**Respuesta:**
```json
{
  "success": true,
  "content": [...],
  "summary": "Resumen procesado por IA",
  "source": "Senado de Chile",
  "url": "https://www.senado.cl/...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "queryType": "citaciones"
}
```

### `GET /api/health`

Verifica el estado del servidor.

## Tecnologías Utilizadas

### Frontend
- **React 18**: Framework de JavaScript
- **Tailwind CSS**: Framework de CSS para diseño moderno
- **Axios**: Cliente HTTP para peticiones a la API

### Backend
- **Node.js**: Entorno de ejecución
- **Express.js**: Framework web para Node.js
- **Puppeteer**: Automatización de navegador para web scraping
- **Cheerio**: Manipulación de HTML en el servidor
- **OpenAI API**: Procesamiento de información con IA

## Configuración Adicional

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `OPENAI_API_KEY` | API Key de OpenAI | Requerido |
| `PORT` | Puerto del servidor | 5000 |
| `NODE_ENV` | Entorno de ejecución | development |

### Obtener API Key de OpenAI

1. Visita [OpenAI Platform](https://platform.openai.com/)
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys" en tu dashboard
4. Crea una nueva API key
5. Copia la key y agrégala a tu archivo `.env`

## Solución de Problemas

### Error: "Cannot find module 'puppeteer'"

```bash
npm install puppeteer --save
```

### Error: "OpenAI API key not configured"

Asegúrate de que tu archivo `.env` contenga:
```
OPENAI_API_KEY=tu_api_key_real_aqui
```

### Error de CORS

Si experimentas problemas de CORS, verifica que el servidor backend esté ejecutándose en el puerto correcto (5000).

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

## Contacto

Para preguntas o sugerencias, puedes contactar al equipo de desarrollo. 