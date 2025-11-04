/**
 * ConfigHelper - Wizard para ayudar a usuarios a configurar selectores
 */
class ConfigHelper {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.domain = '';
    this.url = '';
    this.siteName = '';
    this.selectors = {
      titleSelector: '',
      contentSelector: '',
      dateSelector: '',
      authorSelector: '',
      imageSelector: ''
    };
    this.preview = {
      title: null,
      content: null,
      date: null,
      author: null,
      images: []
    };
    this.validation = {
      title: false,
      content: false
    };
    this.confidence = 0;
    this.modal = null;
    this.onComplete = null;
  }

  /**
   * Inicializa el wizard con una URL
   */
  init(url, domain, siteName = '') {
    this.url = url;
    this.domain = domain || this.extractDomain(url);
    this.siteName = siteName || this.domain;
    this.currentStep = 1;
    this.resetSelectors();
    this.showModal();
    this.renderCurrentStep();
  }

  /**
   * Extrae el dominio de una URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  }

  /**
   * Resetea los selectores
   */
  resetSelectors() {
    this.selectors = {
      titleSelector: '',
      contentSelector: '',
      dateSelector: '',
      authorSelector: '',
      imageSelector: ''
    };
    this.preview = {
      title: null,
      content: null,
      date: null,
      author: null,
      images: []
    };
    this.validation = {
      title: false,
      content: false
    };
    this.confidence = 0;
  }

  /**
   * Muestra el modal
   */
  showModal() {
    this.modal = document.getElementById('config-helper-modal');
    if (this.modal) {
      this.modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Cierra el modal
   */
  hideModal() {
    if (this.modal) {
      this.modal.classList.remove('show');
      document.body.style.overflow = '';
      
      // Limpiar localStorage temporal
      localStorage.removeItem('configHelper_progress');
    }
  }

  /**
   * Renderiza el paso actual
   */
  renderCurrentStep() {
    this.updateWizardSteps();
    
    switch (this.currentStep) {
      case 1:
        this.renderStep1();
        break;
      case 2:
        this.renderStep2();
        break;
      case 3:
        this.renderStep3();
        break;
      case 4:
        this.renderStep4();
        break;
      case 5:
        this.renderStep5();
        break;
    }
    
    this.updateFooterButtons();
  }

  /**
   * Actualiza los indicadores de pasos del wizard
   */
  updateWizardSteps() {
    const steps = document.querySelectorAll('.wizard-steps .step');
    const lines = document.querySelectorAll('.wizard-steps .step-line');
    
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNumber < this.currentStep) {
        step.classList.add('completed');
      } else if (stepNumber === this.currentStep) {
        step.classList.add('active');
      }
    });
    
    lines.forEach((line, index) => {
      const stepNumber = index + 1;
      line.classList.remove('completed');
      
      if (stepNumber < this.currentStep) {
        line.classList.add('completed');
      }
    });
  }

  /**
   * Paso 1: Instrucciones para abrir DevTools
   */
  renderStep1() {
    const body = document.querySelector('.modal-body');
    body.innerHTML = `
      <div class="step-content">
        <div class="step-title">
          🛠️ Paso 1: Preparar las herramientas
        </div>
        <div class="step-description">
          Para ayudarnos a configurar este sitio, necesitarás usar las herramientas de desarrollador de tu navegador.
          No te preocupes, es más fácil de lo que parece!
        </div>

        <div class="alert alert-info">
          <div class="alert-icon">💡</div>
          <div class="alert-content">
            <div class="alert-title">¿Qué vamos a hacer?</div>
            <div class="alert-message">
              Vamos a identificar los selectores CSS que nos permiten extraer el título y contenido de los artículos de <strong>${this.siteName}</strong>.
              Te guiaremos paso a paso.
            </div>
          </div>
        </div>

        <div class="instructions-box">
          <h4>📋 Instrucciones:</h4>
          <ol>
            <li>Haz clic en el botón de abajo para abrir el artículo en una nueva pestaña</li>
            <li>Una vez abierto, presiona <code>F12</code> (Windows/Linux) o <code>Cmd + Option + I</code> (Mac)</li>
            <li>Esto abrirá las herramientas de desarrollador</li>
            <li>Regresa aquí y haz clic en "Siguiente"</li>
          </ol>
        </div>

        <img src="https://i.imgur.com/9xYQZLK.gif" alt="Abrir DevTools" class="tutorial-gif" 
             onerror="this.style.display='none'">

        <div class="action-buttons">
          <button class="btn btn-primary" onclick="window.open('${this.url}', '_blank')">
            🔗 Abrir artículo en nueva pestaña
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Paso 2: Encontrar selector de título
   */
  renderStep2() {
    const body = document.querySelector('.modal-body');
    body.innerHTML = `
      <div class="step-content">
        <div class="step-title">
          📝 Paso 2: Encontrar el título
        </div>
        <div class="step-description">
          Ahora vamos a identificar el selector CSS del título del artículo.
        </div>

        <div class="instructions-box">
          <h4>📋 Cómo obtener el selector:</h4>
          <ol>
            <li>En la pestaña del artículo, haz clic derecho sobre el <strong>título</strong></li>
            <li>Selecciona "Inspeccionar" o "Inspect"</li>
            <li>En el panel de DevTools, haz clic derecho sobre el elemento resaltado</li>
            <li>Selecciona "Copy" → "Copy selector"</li>
            <li>Pega el selector en el campo de abajo</li>
          </ol>
        </div>

        <img src="https://i.imgur.com/Kx3sZvY.gif" alt="Copiar selector" class="tutorial-gif"
             onerror="this.style.display='none'">

        <div class="form-group">
          <label class="form-label">
            Selector del título <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input 
              type="text" 
              class="form-input" 
              id="title-selector-input"
              placeholder="Ej: h1.article-title, .post-title, #main-heading"
              value="${this.selectors.titleSelector}"
            >
            <span class="input-icon hidden" id="title-icon"></span>
          </div>
          <div class="validation-message hidden" id="title-validation"></div>
        </div>

        <button class="btn btn-primary" id="validate-title-btn">
          <span class="btn-text">🔍 Validar selector</span>
          <span class="spinner hidden"></span>
        </button>

        <div class="preview-box hidden" id="title-preview">
          <h4>Vista previa del título:</h4>
          <div class="preview-content" id="title-preview-content"></div>
        </div>
      </div>
    `;

    // Event listeners
    const input = document.getElementById('title-selector-input');
    const validateBtn = document.getElementById('validate-title-btn');

    input.addEventListener('input', (e) => {
      this.selectors.titleSelector = e.target.value;
      this.validation.title = false;
      this.hideValidation('title');
    });

    input.addEventListener('blur', () => {
      if (this.selectors.titleSelector && !this.validation.title) {
        this.validateSelector('title');
      }
    });

    validateBtn.addEventListener('click', () => {
      this.validateSelector('title');
    });
  }

  /**
   * Paso 3: Encontrar selector de contenido
   */
  renderStep3() {
    const body = document.querySelector('.modal-body');
    body.innerHTML = `
      <div class="step-content">
        <div class="step-title">
          📄 Paso 3: Encontrar el contenido
        </div>
        <div class="step-description">
          Ahora vamos a identificar el selector CSS del contenido principal del artículo.
        </div>

        <div class="alert alert-success">
          <div class="alert-icon">✅</div>
          <div class="alert-content">
            <div class="alert-title">¡Título configurado!</div>
            <div class="alert-message">
              Selector: <code>${this.selectors.titleSelector}</code>
            </div>
          </div>
        </div>

        <div class="instructions-box">
          <h4>📋 Cómo obtener el selector:</h4>
          <ol>
            <li>Haz clic derecho sobre el <strong>contenido del artículo</strong> (párrafos principales)</li>
            <li>Selecciona "Inspeccionar"</li>
            <li>Busca el elemento contenedor que engloba todo el contenido</li>
            <li>Haz clic derecho → "Copy" → "Copy selector"</li>
            <li>Pega el selector en el campo de abajo</li>
          </ol>
        </div>

        <div class="form-group">
          <label class="form-label">
            Selector del contenido <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input 
              type="text" 
              class="form-input" 
              id="content-selector-input"
              placeholder="Ej: .article-body, .post-content, #content"
              value="${this.selectors.contentSelector}"
            >
            <span class="input-icon hidden" id="content-icon"></span>
          </div>
          <div class="validation-message hidden" id="content-validation"></div>
        </div>

        <button class="btn btn-primary" id="validate-content-btn">
          <span class="btn-text">🔍 Validar selector</span>
          <span class="spinner hidden"></span>
        </button>

        <div class="preview-box hidden" id="content-preview">
          <h4>Vista previa del contenido:</h4>
          <div class="preview-content" id="content-preview-content"></div>
        </div>
      </div>
    `;

    // Event listeners
    const input = document.getElementById('content-selector-input');
    const validateBtn = document.getElementById('validate-content-btn');

    input.addEventListener('input', (e) => {
      this.selectors.contentSelector = e.target.value;
      this.validation.content = false;
      this.hideValidation('content');
    });

    input.addEventListener('blur', () => {
      if (this.selectors.contentSelector && !this.validation.content) {
        this.validateSelector('content');
      }
    });

    validateBtn.addEventListener('click', () => {
      this.validateSelector('content');
    });
  }

  /**
   * Paso 4: Selectores opcionales
   */
  renderStep4() {
    const body = document.querySelector('.modal-body');
    body.innerHTML = `
      <div class="step-content">
        <div class="step-title">
          ⭐ Paso 4: Selectores opcionales
        </div>
        <div class="step-description">
          Estos selectores son opcionales pero ayudan a mejorar la calidad de la extracción.
          Puedes saltarlos si no los encuentras fácilmente.
        </div>

        <div class="form-group">
          <label class="form-label">
            Selector de fecha <span class="optional">(opcional)</span>
          </label>
          <input 
            type="text" 
            class="form-input" 
            id="date-selector-input"
            placeholder="Ej: time.published-date, .article-date"
            value="${this.selectors.dateSelector}"
          >
        </div>

        <div class="form-group">
          <label class="form-label">
            Selector de autor <span class="optional">(opcional)</span>
          </label>
          <input 
            type="text" 
            class="form-input" 
            id="author-selector-input"
            placeholder="Ej: .author-name, .byline"
            value="${this.selectors.authorSelector}"
          >
        </div>

        <div class="form-group">
          <label class="form-label">
            Selector de imágenes <span class="optional">(opcional)</span>
          </label>
          <input 
            type="text" 
            class="form-input" 
            id="image-selector-input"
            placeholder="Ej: .article-content img, .featured-image"
            value="${this.selectors.imageSelector}"
          >
        </div>

        <div class="alert alert-info">
          <div class="alert-icon">💡</div>
          <div class="alert-content">
            <div class="alert-title">Consejo</div>
            <div class="alert-message">
              Si no estás seguro de algún selector, déjalo vacío. Puedes editarlo más tarde.
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('date-selector-input').addEventListener('input', (e) => {
      this.selectors.dateSelector = e.target.value;
    });

    document.getElementById('author-selector-input').addEventListener('input', (e) => {
      this.selectors.authorSelector = e.target.value;
    });

    document.getElementById('image-selector-input').addEventListener('input', (e) => {
      this.selectors.imageSelector = e.target.value;
    });
  }

  /**
   * Paso 5: Resumen y guardar
   */
  renderStep5() {
    const body = document.querySelector('.modal-body');
    
    // Calcular confidence
    this.confidence = 0.5;
    if (this.validation.title) this.confidence += 0.2;
    if (this.validation.content) this.confidence += 0.2;
    if (this.selectors.dateSelector) this.confidence += 0.05;
    if (this.selectors.authorSelector) this.confidence += 0.05;
    
    const confidencePercent = Math.round(this.confidence * 100);
    let confidenceClass = 'low';
    if (this.confidence >= 0.8) confidenceClass = 'high';
    else if (this.confidence >= 0.6) confidenceClass = 'medium';

    body.innerHTML = `
      <div class="step-content">
        <div class="step-title">
          ✨ Paso 5: Resumen y guardar
        </div>
        <div class="step-description">
          Revisa la configuración antes de guardarla. Esta configuración ayudará a otros usuarios a extraer contenido de ${this.siteName}.
        </div>

        <div class="summary-card">
          <h4>📊 Calidad estimada</h4>
          <div class="text-center mt-2">
            <span class="confidence-badge ${confidenceClass}">
              ${confidencePercent}% de confianza
            </span>
          </div>
        </div>

        <div class="summary-card">
          <h4>🎯 Selectores configurados</h4>
          <div class="summary-item">
            <span class="summary-label">Título:</span>
            <span class="summary-value">${this.selectors.titleSelector}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Contenido:</span>
            <span class="summary-value">${this.selectors.contentSelector}</span>
          </div>
          ${this.selectors.dateSelector ? `
            <div class="summary-item">
              <span class="summary-label">Fecha:</span>
              <span class="summary-value">${this.selectors.dateSelector}</span>
            </div>
          ` : ''}
          ${this.selectors.authorSelector ? `
            <div class="summary-item">
              <span class="summary-label">Autor:</span>
              <span class="summary-value">${this.selectors.authorSelector}</span>
            </div>
          ` : ''}
          ${this.selectors.imageSelector ? `
            <div class="summary-item">
              <span class="summary-label">Imágenes:</span>
              <span class="summary-value">${this.selectors.imageSelector}</span>
            </div>
          ` : ''}
        </div>

        ${this.preview.title || this.preview.content ? `
          <div class="summary-card">
            <h4>👁️ Vista previa</h4>
            ${this.preview.title ? `
              <div class="summary-item">
                <span class="summary-label">Título extraído:</span>
              </div>
              <div class="preview-content mb-2">${this.preview.title}</div>
            ` : ''}
            ${this.preview.content ? `
              <div class="summary-item">
                <span class="summary-label">Contenido extraído:</span>
              </div>
              <div class="preview-content">${this.preview.content.substring(0, 200)}...</div>
            ` : ''}
          </div>
        ` : ''}

        <div class="action-buttons">
          <button class="btn btn-secondary" id="test-scraping-btn">
            🧪 Probar scraping completo
          </button>
          <button class="btn btn-success" id="save-config-btn">
            💾 Guardar configuración
          </button>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('test-scraping-btn').addEventListener('click', () => {
      this.testFullScraping();
    });

    document.getElementById('save-config-btn').addEventListener('click', () => {
      this.saveConfiguration();
    });
  }

  /**
   * Valida un selector con la API
   */
  async validateSelector(type) {
    const selectorKey = `${type}Selector`;
    const selector = this.selectors[selectorKey];
    
    if (!selector) {
      this.showValidation(type, false, 'Por favor ingresa un selector');
      return;
    }

    // Mostrar loading
    const btn = document.getElementById(`validate-${type}-btn`);
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    btn.disabled = true;
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
      const payload = {
        url: this.url,
        selectors: {
          titleSelector: type === 'title' ? selector : 'h1',
          contentSelector: type === 'content' ? selector : '.content'
        }
      };

      console.log(`🧪 Validando selector de ${type}:`, payload);

      const response = await fetch('/api/site-configs/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // NO incluir Authorization - este endpoint es público
        },
        body: JSON.stringify(payload)
      });

      console.log(`📥 Respuesta de validación (${type}):`, response.status);

      const data = await response.json();
      console.log(`📦 Datos de validación (${type}):`, data);

      if (data.success && data.preview) {
        const extractedContent = data.preview[type];
        
        if (extractedContent && extractedContent.length > (type === 'title' ? 10 : 100)) {
          this.validation[type] = true;
          this.preview[type] = extractedContent;
          this.showValidation(type, true, '¡Selector válido!');
          this.showPreview(type, extractedContent);
          console.log(`✅ Selector de ${type} válido`);
        } else {
          this.validation[type] = false;
          this.showValidation(type, false, 'El selector no extrajo contenido válido');
          console.warn(`⚠️ Selector de ${type} no extrajo suficiente contenido`);
        }
      } else {
        this.validation[type] = false;
        const errorMsg = data.error || 'Error al validar selector';
        this.showValidation(type, false, errorMsg);
        console.error(`❌ Error validando ${type}:`, errorMsg);
      }
    } catch (error) {
      console.error(`❌ Error de conexión validando ${type}:`, error);
      this.showValidation(type, false, 'Error de conexión. Intenta de nuevo.');
    } finally {
      // Ocultar loading
      btn.disabled = false;
      btnText.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  }

  /**
   * Muestra mensaje de validación
   */
  showValidation(type, isValid, message) {
    const input = document.getElementById(`${type}-selector-input`);
    const icon = document.getElementById(`${type}-icon`);
    const validation = document.getElementById(`${type}-validation`);

    input.classList.remove('valid', 'invalid');
    input.classList.add(isValid ? 'valid' : 'invalid');

    icon.textContent = isValid ? '✓' : '✗';
    icon.classList.remove('hidden', 'valid', 'invalid');
    icon.classList.add(isValid ? 'valid' : 'invalid');

    validation.textContent = message;
    validation.classList.remove('hidden', 'success', 'error');
    validation.classList.add(isValid ? 'success' : 'error');
  }

  /**
   * Oculta mensaje de validación
   */
  hideValidation(type) {
    const input = document.getElementById(`${type}-selector-input`);
    const icon = document.getElementById(`${type}-icon`);
    const validation = document.getElementById(`${type}-validation`);
    const preview = document.getElementById(`${type}-preview`);

    input.classList.remove('valid', 'invalid');
    icon.classList.add('hidden');
    validation.classList.add('hidden');
    if (preview) preview.classList.add('hidden');
  }

  /**
   * Muestra preview del contenido extraído
   */
  showPreview(type, content) {
    const preview = document.getElementById(`${type}-preview`);
    const previewContent = document.getElementById(`${type}-preview-content`);
    
    if (preview && previewContent) {
      previewContent.textContent = content;
      preview.classList.remove('hidden');
    }
  }

  /**
   * Prueba el scraping completo
   */
  async testFullScraping() {
    const btn = document.getElementById('test-scraping-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Probando...';

    try {
      const payload = {
        url: this.url,
        selectors: this.selectors
      };

      console.log('🧪 Probando scraping completo:', payload);

      const response = await fetch('/api/site-configs/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // NO incluir Authorization - este endpoint es público
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Respuesta de test completo:', response.status);

      const data = await response.json();
      console.log('📦 Datos de test completo:', data);

      if (data.success) {
        console.log('✅ Test completo exitoso');
        alert(`✅ ¡Scraping exitoso!\n\nTítulo: ${data.preview.title}\nContenido: ${data.preview.content.substring(0, 100)}...`);
      } else {
        console.error('❌ Test completo falló:', data.error);
        alert(`❌ Error en el scraping:\n${data.error}`);
      }
    } catch (error) {
      console.error('❌ Error de conexión en test completo:', error);
      alert(`❌ Error de conexión:\n${error.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🧪 Probar scraping completo';
    }
  }

  /**
   * Guarda la configuración
   */
  async saveConfiguration() {
    const btn = document.getElementById('save-config-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Guardando...';

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No hay token de autenticación');
        alert('❌ Debes iniciar sesión para guardar configuraciones');
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar configuración';
        return;
      }

      const payload = {
        domain: this.domain,
        name: this.siteName,
        selectors: this.selectors,
        testUrl: this.url
      };

      console.log('📤 Enviando configuración:', payload);

      const response = await fetch('/api/site-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Respuesta del servidor:', response.status, response.statusText);

      const data = await response.json();
      console.log('📦 Datos recibidos:', data);

      if (response.ok && data.success) {
        console.log('✅ Configuración guardada exitosamente');
        this.showSuccessAnimation();
        
        // Llamar callback si existe
        if (this.onComplete) {
          setTimeout(() => {
            this.onComplete();
          }, 2000);
        }
      } else {
        console.error('❌ Error al guardar:', data);
        const errorMsg = data.error || data.details || 'Error desconocido';
        alert(`❌ Error al guardar:\n${errorMsg}`);
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar configuración';
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert(`❌ Error de conexión:\n${error.message}\n\nRevisa la consola para más detalles.`);
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar configuración';
    }
  }

  /**
   * Muestra animación de éxito
   */
  showSuccessAnimation() {
    const body = document.querySelector('.modal-body');
    body.innerHTML = `
      <div class="success-animation">
        <div class="success-icon">🎉</div>
        <div class="success-title">¡Configuración guardada!</div>
        <div class="success-message">
          Gracias por tu ayuda. Esta configuración permitirá extraer contenido de <strong>${this.siteName}</strong> automáticamente.
          <br><br>
          Ahora vamos a intentar el scraping de nuevo con tu configuración.
        </div>
      </div>
    `;

    // Ocultar footer
    document.querySelector('.modal-footer').classList.add('hidden');

    // Cerrar modal después de 3 segundos
    setTimeout(() => {
      this.hideModal();
    }, 3000);
  }

  /**
   * Actualiza los botones del footer
   */
  updateFooterButtons() {
    const footer = document.querySelector('.modal-footer');
    const backBtn = footer.querySelector('.btn-secondary');
    const nextBtn = footer.querySelector('.btn-primary');

    // Botón atrás
    if (this.currentStep === 1) {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = 'inline-flex';
      backBtn.onclick = () => this.previousStep();
    }

    // Botón siguiente
    if (this.currentStep === 5) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'inline-flex';
      nextBtn.textContent = 'Siguiente →';
      
      // Deshabilitar si no se han validado los selectores requeridos
      if (this.currentStep === 2 && !this.validation.title) {
        nextBtn.disabled = true;
      } else if (this.currentStep === 3 && !this.validation.content) {
        nextBtn.disabled = true;
      } else {
        nextBtn.disabled = false;
      }
      
      nextBtn.onclick = () => this.nextStep();
    }
  }

  /**
   * Avanza al siguiente paso
   */
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.renderCurrentStep();
      this.saveProgress();
    }
  }

  /**
   * Retrocede al paso anterior
   */
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderCurrentStep();
    }
  }

  /**
   * Guarda el progreso en localStorage
   */
  saveProgress() {
    const progress = {
      currentStep: this.currentStep,
      domain: this.domain,
      url: this.url,
      siteName: this.siteName,
      selectors: this.selectors,
      preview: this.preview,
      validation: this.validation
    };
    localStorage.setItem('configHelper_progress', JSON.stringify(progress));
  }

  /**
   * Restaura el progreso desde localStorage
   */
  restoreProgress() {
    const saved = localStorage.getItem('configHelper_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      this.currentStep = progress.currentStep;
      this.domain = progress.domain;
      this.url = progress.url;
      this.siteName = progress.siteName;
      this.selectors = progress.selectors;
      this.preview = progress.preview;
      this.validation = progress.validation;
      return true;
    }
    return false;
  }

  /**
   * Establece callback para cuando se complete
   */
  setOnComplete(callback) {
    this.onComplete = callback;
  }
}

// Instancia global
window.configHelper = new ConfigHelper();
