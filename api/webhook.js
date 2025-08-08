import { createClient } from '@supabase/supabase-js';

// Vercel Environment Variables থেকে লোড হবে
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VERCEL_APP_URL = "https://velgram.vercel.app";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;

// একটি মেসেজ পাঠানোর জন্য হেল্পার ফাংশন
async function sendMessage(chatId, text, replyMarkup = null) {
    const body = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }
    await fetch(`${telegramApiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// কলব্যাক কোয়েরির উত্তর দেওয়ার জন্য হেল্পার ফাংশন
async function answerCallbackQuery(callbackQueryId, text) {
    await fetch(`${telegramApiUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: true })
    });
}

// --- মূল হ্যান্ডলার ফাংশন ---
export default async function handler(req, res) {
    const body = req.body;

    try {
        // "/start verify_..." কমান্ড হ্যান্ডেল করা
        if (body.message && body.message.text && body.message.text.startsWith('/start verify_')) {
            const chatId = body.message.chat.id;
            const shortCode = body.message.text.split('verify_')[1];

            const { data: link, error } = await supabase.from('links').select('lock_channel').eq('short_code', shortCode).single();
            if (error || !link) {
                return await sendMessage(chatId, "❌ Invalid or expired verification link.");
            }
            
            await sendMessage(chatId, `*Welcome!* To unlock this link, you must be a member of the following channel:\n\n➡️ ${link.lock_channel}\n\nFirst, join the channel, then come back and click the button below.`, {
                inline_keyboard: [
                    [{ text: `Join ${link.lock_channel}`, url: `https://t.me/${link.lock_channel.substring(1)}` }],
                    [{ text: "✅ I Have Joined, Verify Me", callback_data: `verify-${shortCode}` }]
                ]
            });
        }
        
        // "I Have Joined" বাটনের ক্লিক হ্যান্ডেল করা
        if (body.callback_query && body.callback_query.data.startsWith('verify-')) {
            const callbackQuery = body.callback_query;
            const userId = callbackQuery.from.id;
            const chatId = callbackQuery.message.chat.id;
            const callbackQueryId = callbackQuery.id;
            const shortCode = callbackQuery.data.split('verify-')[1];

            const { data: link, error } = await supabase.from('links').select('long_url, lock_channel').eq('short_code', shortCode).single();
            if (error || !link) {
                return await answerCallbackQuery(callbackQueryId, "Error: This link is no longer valid.");
            }

            const memberRes = await fetch(`${telegramApiUrl}/getChatMember?chat_id=${link.lock_channel}&user_id=${userId}`);
            const memberData = await memberRes.json();
            
            if (memberData.ok) {
                const status = memberData.result.status;
                const isMember = ['member', 'administrator', 'creator'].includes(status);

                if (isMember) {
                    await answerCallbackQuery(callbackQueryId, "✅ Success! Here is your link.");
                    // সফল হলে, ব্যবহারকারীকে বিজ্ঞাপন পেজের লিংক পাঠানো হবে
                    const adUrl = `${VERCEL_APP_URL}/redirect.html?c=${shortCode}`;
                    await sendMessage(chatId, `*Verification successful!* Your link is ready.`, {
                         inline_keyboard: [[{ text: "Proceed to Link", url: adUrl }]]
                    });
                } else {
                    await answerCallbackQuery(callbackQueryId, `❌ You are not a member of ${link.lock_channel}. Please join and try again.`);
                }
            } else {
                await answerCallbackQuery(callbackQueryId, `Error: ${memberData.description}. Please ensure the bot is an admin in the channel.`);
            }
        }
    } catch (e) {
        console.error("Error in webhook:", e);
    }
    
    // টেলিগ্রামকে সবসময় 200 OK পাঠাতে হয়
    return res.status(200).send('OK');
}
