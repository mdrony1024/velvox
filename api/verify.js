export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userId, channel } = req.body;
    if (!userId || !channel) {
        return res.status(400).json({ error: 'User ID and Channel are required' });
    }

    try {
        const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${channel}&user_id=${userId}`;
        const telegramRes = await fetch(telegramApiUrl);
        const data = await telegramRes.json();

        if (!data.ok) {
            return res.status(200).json({ isMember: false, message: data.description });
        }
        
        const status = data.result.status;
        const isMember = ['member', 'administrator', 'creator'].includes(status);
        
        return res.status(200).json({ isMember });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
