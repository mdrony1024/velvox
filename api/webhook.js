import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const VERCEL_APP_URL = "https://velvox.vercel.app";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text, replyMarkup = null) {
    const body = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(`${telegramApiUrl}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    await fetch(`${telegramApiUrl}/answerCallbackQuery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert }) });
}

export default async function handler(req, res) {
    const body = req.body;
    try {
        if (body.message && body.message.text && body.message.text.startsWith('/start ')) {
            const chatId = body.message.chat.id;
            const shortCode = body.message.text.split(' ')[1];
            const { data: link, error } = await supabase.from('links').select('lock_channel').eq('short_code', shortCode).single();
            if (error || !link) return await sendMessage(chatId, "❌ Invalid or expired link.");
            
            if (link.lock_channel) {
                await sendMessage(chatId, `*This link is locked!* 🔒\n\nTo unlock it, you must join:\n➡️ ${link.lock_channel}\n\nJoin the channel, then click the button below.`, {
                    inline_keyboard: [
                        [{ text: `Join ${link.lock_channel}`, url: `https://t.me/${link.lock_channel.substring(1)}` }],
                        [{ text: "✅ I Have Joined, Verify Me", callback_data: `verify-${shortCode}` }]
                    ]
                });
            } else {
                 const { data: unlockedLink } = await supabase.from('links').select('long_url').eq('short_code', shortCode).single();
                 await sendMessage(chatId, `*Your link is ready!* ✅\n\nHere is your unlocked link:\n${unlockedLink.long_url}`);
            }
        }
        
        if (body.callback_query && body.callback_query.data.startsWith('verify-')) {
            const cb = body.callback_query;
            const shortCode = cb.data.split('verify-')[1];
            const { data: link, error } = await supabase.from('links').select('*').eq('short_code', shortCode).single();
            if (error || !link) return await answerCallbackQuery(cb.id, "Error: Link expired.", true);

            const memberRes = await fetch(`${telegramApiUrl}/getChatMember?chat_id=${link.lock_channel}&user_id=${cb.from.id}`);
            const memberData = await memberRes.json();
            
            if (memberData.ok && ['member', 'administrator', 'creator'].includes(memberData.result.status)) {
                await answerCallbackQuery(cb.id, "✅ Success! Generating your link...");
                
                const { data: updatedLink, error: updateError } = await supabase
                    .from('links').update({ verification_token: 'gen_random_uuid()' }).eq('short_code', shortCode).select('verification_token').single();

                if (updateError || !updatedLink) return await sendMessage(cb.message.chat.id, "Sorry, a server error occurred. Please try again.");

                const adUrl = `${VERCEL_APP_URL}/redirect.html?c=${shortCode}&token=${updatedLink.verification_token}`;
                await sendMessage(cb.message.chat.id, `*Verification successful!* Your link is ready.`, {
                     inline_keyboard: [[{ text: "Proceed to Link", url: adUrl }]]
                });
            } else {
                await answerCallbackQuery(cb.id, `❌ You are not a member of ${link.lock_channel}. Please join and try again.`, true);
            }
        }
    } catch (e) {
        console.error("Error in webhook:", e);
    }
    return res.status(200).send('OK');
}
