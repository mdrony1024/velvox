const { Telegraf } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

module.exports = async (req, res) => {
    try {
        const { file_code } = req.query;

        // ডেটাবেস থেকে file_code ব্যবহার করে file_id এবং ডেসক্রিপশন খুঁজে বের করুন
        // const fileData = await db.getFileByCode(file_code);
        // if (!fileData) { return res.status(404).json({ error: 'File not found' }); }
        
        // --- উদাহরণের জন্য হার্ডকোডেড ডেটা ---
        // আপনাকে নিচের অংশটি আপনার ডেটাবেস লজিক দিয়ে পরিবর্তন করতে হবে
        const file_id = "YOUR_LOGIC_TO_GET_FILE_ID";
        const description = "YOUR_LOGIC_TO_GET_DESCRIPTION";
        // --- শেষ ---

        const fileInfo = await bot.telegram.getFile(file_id);
        
        res.status(200).json({
            fileName: fileInfo.file_path.split('/').pop(), // ফাইলের নাম
            fileSize: fileInfo.file_size, // ফাইল সাইজ (বাইট)
            fileType: 'video/mp4', // আপনাকে এটিও ডেটাবেস থেকে পেতে হবে
            description: description // ডেসক্রিপশন
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};```

এই কোডগুলো ব্যবহার করলে আপনার ভিউয়ার পেজটি একটি পেশাদার এবং TeraBox-এর মতো দেখতে হবে, যা ব্যবহারকারীদের জন্য একটি দারুণ অভিজ্ঞতা নিশ্চিত করবে।
