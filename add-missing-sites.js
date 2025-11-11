const fs = require('fs');
const path = require('path');

// Ruta al archivo de configuración
const CONFIG_PATH = path.join(__dirname, 'server/backend/src/config/site-configs.json');

// Sitios que faltan según el reporte de 73 sitios
const missingSites = [
  {
    "domain": "www.australtemuco.cl",
    "name": "Austral Temuco",
    "enabled": true,
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
    "domain": "www.laopinon.cl",
    "name": "La Opinión",
    "enabled": true,
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
    "domain": "www.elnaveghable.cl",
    "name": "El Naveghable",
    "enabled": true,
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
    "domain": "atvvaldivia.cl",
    "name": "ATV Valdivia",
    "enabled": true,
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
    "domain": "soydepuerto.cl",
    "name": "Soy de Puerto",
    "enabled": true,
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
    "domain": "www.australosorno.cl",
    "name": "Austral Osorno",
    "enabled": true,
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
    "domain": "www.laestrellachiloe.cl",
    "name": "La Estrella Chiloé",
    "enabled": true,
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
    "domain": "www.elrepuertero.cl",
    "name": "El Repuertero",
    "enabled": true,
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
    "domain": "ciudadanoradio.cl",
    "name": "Ciudadano Radio",
    "enabled": true,
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
    "domain": "www.elmagallanews.cl",
    "name": "El Magallanews",
    "enabled": true,
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
    "domain": "www.efe.com",
    "name": "EFE",
    "enabled": true,
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
    "domain": "apnews.com/hub/chile",
    "name": "AP News Chile",
    "enabled": true,
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
    "domain": "elpais.com",
    "name": "El País",
    "enabled": true,
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
    "domain": "abc.es",
    "name": "ABC",
    "enabled": true,
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
    "domain": "elmundo.es",
    "name": "El Mundo",
    "enabled": true,
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
    "domain": "www.soychile.cl/temuco/",
    "name": "Soy Chile Temuco",
    "enabled": true,
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
    "domain": "www.soychile.cl/valdivia/",
    "name": "Soy Chile Valdivia",
    "enabled": true,
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
    "domain": "www.soychile.cl/puerto-montt/",
    "name": "Soy Chile Puerto Montt",
    "enabled": true,
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
    "domain": "www.soychile.cl/osorno/",
    "name": "Soy Chile Osorno",
    "enabled": true,
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
    "domain": "www.soychile.cl/chiloe/",
    "name": "Soy Chile Chiloé",
    "enabled": true,
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
    "domain": "www.diarioiquique.cl",
    "name": "Diario Iquique",
    "enabled": true,
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
    "domain": "www.diarioantofagasta.cl",
    "name": "Diario Antofagasta",
    "enabled": true,
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
    "domain": "www.diarioatacama.cl",
    "name": "Diario Atacama",
    "enabled": true,
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
    "domain": "www.diariovalparaiso.cl",
    "name": "Diario Valparaíso",
    "enabled": true,
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
    "domain": "www.diariorancagua.cl",
    "name": "Diario Rancagua",
    "enabled": true,
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
    "domain": "www.diariotalca.cl",
    "name": "Diario Talca",
    "enabled": true,
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
    "domain": "www.diarioconcepcion.cl",
    "name": "Diario Concepción",
    "enabled": true,
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
    "domain": "www.bbc.com/mundo",
    "name": "BBC News Mundo",
    "enabled": true,
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
    "domain": "cnnespanol.cnn.com",
    "name": "CNN Español",
    "enabled": true,
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
  const sitesToAdd = missingSites.filter(site => !existingDomains.has(site.domain));
  
  console.log(`Sitios existentes: ${config.sites.length}`);
  console.log(`Sitios faltantes por agregar: ${sitesToAdd.length}`);
  
  if (sitesToAdd.length > 0) {
    // Agregar sitios faltantes
    config.sites.push(...sitesToAdd);
    
    // Escribir nueva configuración
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    console.log(`✅ Se agregaron ${sitesToAdd.length} sitios exitosamente`);
    console.log(`Total de sitios ahora: ${config.sites.length}`);
    
    // Listar sitios agregados
    console.log('\nSitios agregados:');
    sitesToAdd.forEach(site => {
      console.log(`- ${site.name} (${site.domain})`);
    });
  } else {
    console.log('✅ Todos los sitios ya están configurados');
  }
  
} catch (error) {
  console.error('Error procesando el archivo:', error);
  process.exit(1);
}