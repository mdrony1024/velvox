const { Telegraf, Markup } = require('telegraf');
const { kv } = require('@vercel/kv');
const { nanoid } = require('nanoid');

const BOT_TOKEN = process.env.BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL;

const bot = new Telegraf(BOT_TOKEN);

// --- ডিপ লিঙ্ক হ্যান্ডেল করার কোড ---
bot.start(async (ctx) => {
    const fileCode = ctx.startPayload;

    if (fileCode) {
        const fileData = await kv.get(fileCode);
        if (!fileData) {
            return ctx.reply('Sorry, this file link is invalid or has expired.');
        }

        ctx.reply(
            `Your file "${fileData.fileName}" is ready!`,
            Markup.inlineKeyboard([
                [Markup.button.webApp('🎬 Open Viewer', `${VERCEL_URL}/index.html?file_code=${fileCode}`)]
            ])
        );
    } else {
        ctx.reply('Welcome to Velgram Bot! Send me any file to get a shareable link.');
    }
});

// --- ফাইল আপলোড হ্যান্ডেল করার নতুন কোড ---
const handleFileUpload = async (ctx, file, fileType) => {
    try {
        const file_id = file.file_id;
        const caption = ctx.message.caption || '';
        const file_size = file.file_size;
        const file_name = file.file_name || `${fileType}_${Date.now()}`;

        const fileCode = nanoid(10); 

        const fileData = {
            fileId: file_id,
            fileName: file_name,
            fileSize: file_size,
            fileType: file.mime_type || `application/${fileType}`,
            description: caption,
        };

        await kv.set(fileCode, fileData);

        const shareLink = `https://t.me/${ctx.botInfo.username}?start=${fileCode}`;

        ctx.replyWithHTML(
            `✅ <b>File uploaded successfully!</b>\n\n` +
            `🔗 Here is your shareable link:\n` +
            `<code>${shareLink}</code>`
        );
    } catch (error) {
        console.error("Upload Error:", error);
        ctx.reply("Sorry, something went wrong while uploading the file.");
    }
};

bot.on('document', (ctx) => handleFileUpload(ctx, ctx.message.document, 'document'));
bot.on('video', (ctx) => handleFileUpload(ctx, ctx.message.video, 'video'));
bot.on('photo', (ctx) => handleFileUpload(ctx, ctx.message.photo.pop(), 'photo'));
bot.on('audio', (ctx) => handleFileUpload(ctx, ctx.message.audio, 'audio'));

// --- Vercel Webhook ---
module.exports = async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
    } catch (err) {
        console.error('Error handling update:', err);
    }
    res.status(200).send('OK');
};
