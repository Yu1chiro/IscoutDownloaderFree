import express from 'express';
import cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Endpoint untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint scraping dengan Cheerio
app.post('/scrape', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.startsWith('https://iconscout.com/')) {
        return res.status(400).json({ error: 'Invalid URL. Must be an IconScout URL.' });
    }
    
    try {
        // Mengambil konten HTML dari URL
        const response = await fetch(url);
        const html = await response.text();
        
        // Load HTML ke Cheerio
        const $ = cheerio.load(html);
        
        // Mencari semua gambar dalam container yang ditentukan
        const imageUrls = [];
        $('section.px-sm-7.p-5.results_vcd2w picture.thumb_PdMgf img').each((i, element) => {
            const imageUrl = $(element).attr('src');
            if (imageUrl) {
                imageUrls.push(imageUrl);
            }
        });
        
        res.json({ images: imageUrls });
    } catch (error) {
        console.error('Scraping error:', error);
        res.status(500).json({ error: 'Failed to scrape images' });
    }
});

// Endpoint untuk mengunduh gambar
app.post('/download', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        const response = await fetch(imageUrl);
        const buffer = await response.buffer();
        
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', 'attachment');
        res.send(buffer);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download image' });
    }
});

// Export untuk Vercel
export default app;