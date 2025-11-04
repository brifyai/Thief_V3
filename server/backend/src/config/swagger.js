const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Scraping de Noticias',
      version: '1.0.0',
      description: 'Documentación de la API para el sistema de scraping y análisis de noticias',
      contact: {
        name: 'Soporte API',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://tu-domain.com' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' 
          ? 'Servidor de producción' 
          : 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              description: 'Rol del usuario'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Token JWT para autenticación'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        ScrapingResult: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID del resultado'
            },
            title: {
              type: 'string',
              description: 'Título del artículo'
            },
            content: {
              type: 'string',
              description: 'Contenido del artículo'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL original del artículo'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL de la imagen'
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de publicación'
            },
            sentiment: {
              type: 'string',
              enum: ['positive', 'negative', 'neutral'],
              description: 'Análisis de sentimiento'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            },
            details: {
              type: 'string',
              description: 'Detalles adicionales del error'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',  // Buscará en todos los archivos de rutas
    './index.js'          // También en el archivo principal
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerSpec: specs,
  swaggerUi
};