import express from 'express';
import cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint
app.get('/', async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (error) {
        console.error('Error serving index:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Scraping endpoint
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const imageUrls = [];
        $('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img').each((i, element) => {
            const imageUrl = $(element).attr('src');
            if (imageUrl) {
                imageUrls.push(imageUrl);
            }
        });

        if (imageUrls.length === 0) {
            return res.status(404).json({ error: 'No images found' });
        }
        
        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape images: ' + error.message });
    }
});

// Download endpoint
app.post('/download', async (req, res) => {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.buffer();
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download image: ' + error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

// For Vercel
export default app;