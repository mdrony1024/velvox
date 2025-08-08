import { createClient } from '@supabase/supabase-js';

// Vercel-এর Environment Variable থেকে গোপন তথ্য লোড করা
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // টেলিগ্রাম API-কে কল করে ইউজারের স্ট্যাটাস জানা
        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`;
        const telegramRes = await fetch(telegramApiUrl);
        const data = await telegramRes.json();

        if (!data.ok) {
            // যদি বট অ্যাডমিন না থাকে বা অন্য কোনো সমস্যা হয়
            return res.status(200).json({ isMember: false, status: 'error', message: data.description });
        }

        const status = data.result.status;
        // চ্যানেলের সদস্য, অ্যাডমিন বা মালিক হলেই ভেরিফাই হবে
        const isMember = ['member', 'administrator', 'creator'].includes(status);

        return res.status(200).json({ isMember: isMember, status: status });

    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
