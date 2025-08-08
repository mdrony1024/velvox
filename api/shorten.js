import { createClient } from '@supabase/supabase-js';

// Vercel-এর Environment Variable থেকে কী লোড করা হচ্ছে
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { url, lock, channel } = req.body;
    const VERCEL_APP_URL = "https://velgram.vercel.app";

    if (!url) {
        return res.status(400).json({ error: 'Missing `url` in request body' });
    }
    
    // API-এর মাধ্যমে লক করার জন্য
    const isLocked = lock === true;
    if (isLocked && (!channel || !channel.startsWith('@'))) {
        return res.status(400).json({ error: 'If `lock` is true, a valid `channel` username is required.' });
    }

    try {
        const short_code = Math.random().toString(36).substring(2, 8);
        
        const { error: insertError } = await supabase.from('links').insert({
            long_url: url,
            short_code: short_code,
            is_locked: isLocked,
            lock_channel: isLocked ? channel : null
        });

        if (insertError) {
            throw new Error(insertError.message);
        }

        const shortUrl = `${VERCEL_APP_URL}/redirect.html?c=${short_code}`;

        return res.status(200).json({ success: true, short_url: shortUrl });

    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
