const axios = require('axios');
const { Telegraf } = require('telegraf');
const { kv } = require('@vercel/kv');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

module.exports = async (req, res) => {
    try {
        const { file_code } = req.query;
        if (!file_code) { return res.status(400).send('File code required'); }

        const fileData = await kv.get(file_code);
        if (!fileData) {
            return res.status(404).send('File not found');
        }
        
        const fileLink = await bot.telegram.getFileLink(fileData.fileId);

        const response = await axios({
            method: 'get',
            url: fileLink.href,
            responseType: 'stream',
        });
        
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Length', response.headers['content-length']);

        response.data.pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching file.');
    }
};
