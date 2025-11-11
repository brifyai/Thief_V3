const fs = require('fs');
const path = require('path');

// Ruta al archivo de configuración
const CONFIG_PATH = path.join(__dirname, 'server/backend/src/config/site-configs.json');

// Sitios restantes que faltan según el reporte
const remainingSites = [
  {
    "domain": "www.reuters.com/places/chile",
    "name": "Reuters Chile",
    "enabled": false, // Marcar como deshabilitado por error 401
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.diariocoquimbo.cl",
    "name": "Diario Coquimbo",
    "enabled": false, // Marcar como deshabilitado por DNS error
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.diariotemuco.cl",
    "name": "Diario Temuco",
    "enabled": false, // Marcar como deshabilitado por DNS error
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.diariovaldivia.cl",
    "name": "Diario Valdivia",
    "enabled": false, // Marcar como deshabilitado por DNS error
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.diariopuertomontt.cl",
    "name": "Diario Puerto Montt",
    "enabled": false, // Marcar como deshabilitado por DNS error
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.diariocoyhaique.cl",
    "name": "Diario Coyhaique",
    "enabled": false, // Marcar como deshabilitado por DNS error
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.diariopuntaarenas.cl",
    "name": "Diario Punta Arenas",
    "enabled": false, // Marcar como deshabilitado por DNS error
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  },
  {
    "domain": "www.france24.com/es",
    "name": "France24 Español",
    "enabled": false, // Marcar como deshabilitado por error 403
    "priority": 2,
    "selectors": {
      "listing": {
        "container": ["article", "h2", ".post"],
        "title": ["h2 a", "h3 a"],
        "link": ["h2 a", "h3 a"],
        "description": [".excerpt", ".summary"]
      },
      "article": {
        "title": ["h1", ".title"],
        "content": [".content", ".entry-content"],
        "date": ["time[datetime]", ".date"]
      }
    },
    "cleaningRules": [],
    "metadata": {
      "encoding": "utf-8",
      "language": "es"
    }
  }
];

try {
  // Leer configuración actual
  const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configData);
  
  // Obtener dominios existentes
  const existingDomains = new Set(config.sites.map(site => site.domain));
  
  // Filtrar solo los sitios que no existen
  const sitesToAdd = remainingSites.filter(site => !existingDomains.has(site.domain));
  
  console.log(`Sitios existentes: ${config.sites.length}`);
  console.log(`Sitios restantes por agregar: ${sitesToAdd.length}`);
  
  if (sitesToAdd.length > 0) {
    // Agregar sitios restantes
    config.sites.push(...sitesToAdd);
    
    // Escribir nueva configuración
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    console.log(`✅ Se agregaron ${sitesToAdd.length} sitios restantes exitosamente`);
    console.log(`Total de sitios ahora: ${config.sites.length}`);
    
    // Listar sitios agregados
    console.log('\nSitios agregados (marcados como deshabilitados por errores):');
    sitesToAdd.forEach(site => {
      const status = site.enabled ? 'habilitado' : 'deshabilitado';
      console.log(`- ${site.name} (${site.domain}) - ${status}`);
    });
    
    // Resumen final
    const enabledSites = config.sites.filter(site => site.enabled).length;
    const disabledSites = config.sites.filter(site => !site.enabled).length;
    
    console.log(`\n📊 Resumen final:`);
    console.log(`- Total de sitios: ${config.sites.length}`);
    console.log(`- Sitios habilitados: ${enabledSites}`);
    console.log(`- Sitios deshabilitados: ${disabledSites}`);
    
  } else {
    console.log('✅ Todos los sitios ya están configurados');
  }
  
} catch (error) {
  console.error('Error procesando el archivo:', error);
  process.exit(1);
}