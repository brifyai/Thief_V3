const { chromium } = require('playwright');

async function debugCooperativa() {
    console.log('🔍 Debugging Cooperativa.cl scraper...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Configurar headers para simular navegador real
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        console.log('📥 Navegando a https://www.cooperativa.cl...');
        await page.goto('https://www.cooperativa.cl', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Esperar a que la página cargue completamente
        await page.waitForTimeout(3000);
        
        console.log('🔍 Analizando estructura de la página...');
        
        // Buscar diferentes posibles contenedores de noticias
        const possibleContainers = [
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
        
        for (const container of possibleContainers) {
            try {
                const elements = await page.$$(container);
                if (elements.length > 0) {
                    console.log(`✅ Encontrados ${elements.length} elementos con selector: ${container}`);
                    
                    // Analizar los primeros 3 elementos
                    for (let i = 0; i < Math.min(3, elements.length); i++) {
                        const element = elements[i];
                        const text = await element.textContent();
                        const href = await element.getAttribute('href');
                        console.log(`   Elemento ${i + 1}: "${text?.trim().substring(0, 100)}..." | Link: ${href}`);
                    }
                } else {
                    console.log(`❌ No se encontraron elementos con selector: ${container}`);
                }
            } catch (error) {
                console.log(`⚠️ Error con selector ${container}: ${error.message}`);
            }
        }
        
        // Buscar enlaces específicos de noticias
        console.log('\n🔍 Buscando enlaces de noticias...');
        const newsLinks = await page.$$eval('a[href*="/noticias/"], a[href*="/noticia/"]', links => 
            links.map(link => ({
                text: link.textContent?.trim(),
                href: link.href,
                className: link.className
            })).slice(0, 10)
        );
        
        if (newsLinks.length > 0) {
            console.log(`✅ Encontrados ${newsLinks.length} enlaces de noticias:`);
            newsLinks.forEach((link, index) => {
                console.log(`   ${index + 1}. "${link.text}" -> ${link.href}`);
            });
        } else {
            console.log('❌ No se encontraron enlaces de noticias');
        }
        
        // Analizar estructura HTML principal
        console.log('\n🔍 Analizando estructura HTML principal...');
        const mainContent = await page.$eval('body', body => {
            const articles = body.querySelectorAll('article, .card, .news-item, .post-item');
            const headings = body.querySelectorAll('h1, h2, h3, h4');
            const links = body.querySelectorAll('a[href*="/noticias/"], a[href*="/noticia/"]');
            
            return {
                articles: articles.length,
                headings: headings.length,
                newsLinks: links.length,
                bodyClasses: body.className,
                bodyId: body.id
            };
        });
        
        console.log('📊 Estadísticas de la página:');
        console.log(`   Articles/cards: ${mainContent.articles}`);
        console.log(`   Headings: ${mainContent.headings}`);
        console.log(`   News links: ${mainContent.newsLinks}`);
        console.log(`   Body class: ${mainContent.bodyClasses}`);
        console.log(`   Body ID: ${mainContent.bodyId}`);
        
        // Si encontramos enlaces de noticias, probar a extraer uno
        if (newsLinks.length > 0) {
            console.log('\n🧪 Probando extracción de una noticia...');
            const firstLink = newsLinks[0];
            
            try {
                await page.goto(firstLink.href, { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForTimeout(2000);
                
                const articleData = await page.$eval('body', body => {
                    const title = body.querySelector('h1, .title, .headline, .entry-title')?.textContent?.trim();
                    const content = body.querySelector('.content, .entry-content, .post-content, article')?.textContent?.trim()?.substring(0, 200);
                    const date = body.querySelector('time, .date, .published')?.textContent?.trim();
                    const author = body.querySelector('.author, .byline')?.textContent?.trim();
                    
                    return { title, content, date, author };
                });
                
                console.log('✅ Datos extraídos del artículo:');
                console.log(`   Título: ${articleData.title}`);
                console.log(`   Fecha: ${articleData.date}`);
                console.log(`   Autor: ${articleData.author}`);
                console.log(`   Contenido: ${articleData.content?.substring(0, 100)}...`);
                
            } catch (error) {
                console.log(`❌ Error extrayendo artículo: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error durante el debugging:', error);
    } finally {
        await browser.close();
    }
}

debugCooperativa().catch(console.error);