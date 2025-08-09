import { createClient } from '@supabase/supabase-js';

// Vercel Environment Variables থেকে লোড হবে
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VERCEL_APP_URL = "https://velvox.vercel.app";

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
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    await fetch(`${telegramApiUrl}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
    });
}

// --- মূল হ্যান্ডলার ফাংশন ---
export default async function handler(req, res) {
    const body = req.body;
    console.log("--- Webhook Received ---"); // লগ ১: Webhook চালু হয়েছে
    console.log(JSON.stringify(body, null, 2)); // লগ ২: টেলিগ্রাম থেকে কী ডেটা এসেছে

    try {
        // "/start verify_..." কমান্ড হ্যান্ডেল করা
        if (body.message && body.message.text && body.message.text.startsWith('/start verify_')) {
            const chatId = body.message.chat.id;
            const shortCode = body.message.text.split('verify_')[1];
            console.log(`Command /start verify_ received for short_code: ${shortCode}`); // লগ ৩

            const { data: link, error } = await supabase.from('links').select('lock_channel').eq('short_code', shortCode).single();
            if (error || !link) {
                console.error("Supabase error fetching link:", error); // লগ ৪ (এরর হলে)
                return await sendMessage(chatId, "❌ Invalid or expired verification link.");
            }
            
            console.log(`Found channel to lock: ${link.lock_channel}`); // লগ ৫
            await sendMessage(chatId, `*Welcome!* To unlock this link, you must be a member of:\n\n➡️ ${link.lock_channel}\n\nFirst, join the channel, then come back and click the button below.`, {
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
            console.log(`Callback verify- received for short_code: ${shortCode} by user: ${userId}`); // লগ ৬

            const { data: link, error } = await supabase.from('links').select('long_url, lock_channel').eq('short_code', shortCode).single();
            if (error || !link) {
                return await answerCallbackQuery(callbackQueryId, "Error: This link is no longer valid.", true);
            }
            
            console.log(`Checking membership for user ${userId} in channel ${link.lock_channel}`); // লগ ৭
            const memberRes = await fetch(`${telegramApiUrl}/getChatMember?chat_id=${link.lock_channel}&user_id=${userId}`);
            const memberData = await memberRes.json();
            console.log("Telegram getChatMember response:", memberData); // লগ ৮

            if (memberData.ok) {
                const status = memberData.result.status;
                const isMember = ['member', 'administrator', 'creator'].includes(status);

                if (isMember) {
                    console.log("User is a member. Sending success message."); // লগ ৯
                    await answerCallbackQuery(callbackQueryId, "✅ Success! Here is your link.");
                    const adUrl = `${VERCEL_APP_URL}/redirect.html?c=${shortCode}&verified=true`;
                    await sendMessage(chatId, `*Verification successful!* Your link is ready.`, {
                         inline_keyboard: [[{ text: "Proceed to Link", url: adUrl }]]
                    });
                } else {
                    console.log("User is not a member."); // লগ ১০
                    await answerCallbackQuery(callbackQueryId, `❌ You are not a member of ${link.lock_channel}. Please join and try again.`, true);
                }
            } else {
                console.error("getChatMember API error:", memberData.description); // লগ ১১ (এরর হলে)
                await answerCallbackQuery(callbackQueryId, `Error: ${memberData.description}. Please ensure the bot is an admin in the channel.`, true);
            }
        }
    } catch (e) {
        console.error("--- FATAL ERROR in webhook ---", e); // লগ ১২ (বড় কোনো এরর হলে)
    }
    
    return res.status(200).send('OK');
}
