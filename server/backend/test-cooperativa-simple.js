const axios = require('axios');
const cheerio = require('cheerio');

async function testCooperativaSimple() {
    console.log('🔍 Test simple de Cooperativa.cl con axios y cheerio...');
    
    try {
        console.log('📥 Obteniendo HTML de https://www.cooperativa.cl...');
        
        const response = await axios.get('https://www.cooperativa.cl', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000
        });
        
        console.log(`✅ HTML obtenido (${response.data.length} caracteres)`);
        
        const $ = cheerio.load(response.data);
        
        console.log('\n🔍 Analizando estructura con cheerio...');
        
        // Buscar diferentes selectores
        const selectors = [
            'article',
            '.news-item',
            '.post-item',
            '.card',
            '.story',
            '.article-card',
            '.news-card',
            'h2 a',
            'h3 a',
            'a[href*="/noticias/"]',
            'a[href*="/noticia/"]',
            '.headline',
            '.title'
        ];
        
        for (const selector of selectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`✅ Encontrados ${elements.length} elementos con selector: ${selector}`);
                
                // Mostrar primeros 3 elementos
                elements.slice(0, 3).each((index, element) => {
                    const text = $(element).text().trim();
                    const href = $(element).attr('href');
                    console.log(`   Elemento ${index + 1}: "${text.substring(0, 100)}..." | Link: ${href}`);
                });
            } else {
                console.log(`❌ No se encontraron elementos con selector: ${selector}`);
            }
        }
        
        // Buscar enlaces de noticias específicos
        console.log('\n🔍 Buscando enlaces de noticias...');
        const newsLinks = [];
        $('a[href*="/noticias/"], a[href*="/noticia/"]').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            const className = $(element).attr('class');
            
            if (text && href) {
                newsLinks.push({
                    text,
                    href: href.startsWith('http') ? href : `https://www.cooperativa.cl${href}`,
                    className
                });
            }
        });
        
        if (newsLinks.length > 0) {
            console.log(`✅ Encontrados ${newsLinks.length} enlaces de noticias:`);
            newsLinks.slice(0, 10).forEach((link, index) => {
                console.log(`   ${index + 1}. "${link.text}" -> ${link.href}`);
            });
            
            // Probar a extraer una noticia
            if (newsLinks.length > 0) {
                console.log('\n🧪 Probando extracción de una noticia...');
                const firstLink = newsLinks[0];
                
                try {
                    const articleResponse = await axios.get(firstLink.href, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        },
                        timeout: 30000
                    });
                    
                    const $article = cheerio.load(articleResponse.data);
                    
                    const title = $article('h1, .title, .headline, .entry-title').first().text().trim();
                    const content = $article('.content, .entry-content, .post-content, article').first().text().trim().substring(0, 200);
                    const date = $article('time, .date, .published').first().text().trim();
                    const author = $article('.author, .byline').first().text().trim();
                    
                    console.log('✅ Datos extraídos del artículo:');
                    console.log(`   Título: ${title}`);
                    console.log(`   Fecha: ${date}`);
                    console.log(`   Autor: ${author}`);
                    console.log(`   Contenido: ${content?.substring(0, 100)}...`);
                    
                } catch (error) {
                    console.log(`❌ Error extrayendo artículo: ${error.message}`);
                }
            }
        } else {
            console.log('❌ No se encontraron enlaces de noticias');
        }
        
        // Analizar estructura general
        console.log('\n📊 Estadísticas de la página:');
        console.log(`   Articles/cards: ${('article, .card, .news-item, .post-item').split(', ').reduce((count, selector) => count + $(selector).length, 0)}`);
        console.log(`   Headings: ${('h1, h2, h3, h4').split(', ').reduce((count, selector) => count + $(selector).length, 0)}`);
        console.log(`   News links: ${newsLinks.length}`);
        console.log(`   Body class: ${$('body').attr('class')}`);
        console.log(`   Body ID: ${$('body').attr('id')}`);
        
        // Buscar patrones específicos de Cooperativa
        console.log('\n🔍 Buscando patrones específicos de Cooperativa...');
        
        const cooperativaPatterns = [
            '.noticia',
            '.nota',
            '.articulo',
            '.contenido-principal',
            '.main-content',
            '.destacado',
            '.ultimo-momento',
            '.titular',
            '.titulo-principal'
        ];
        
        for (const pattern of cooperativaPatterns) {
            const elements = $(pattern);
            if (elements.length > 0) {
                console.log(`✅ Encontrados ${elements.length} elementos con patrón: ${pattern}`);
                elements.slice(0, 2).each((index, element) => {
                    const text = $(element).text().trim();
                    console.log(`   ${index + 1}. "${text.substring(0, 80)}..."`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Error durante el test:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        }
    }
}

testCooperativaSimple();