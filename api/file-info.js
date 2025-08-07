const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
    try {
        const { file_code } = req.query;
        if (!file_code) { return res.status(400).json({ error: 'File code required' }); }

        const fileData = await kv.get(file_code);
        if (!fileData) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate'); // Caching for Vercel
        res.status(200).json({
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            fileType: fileData.fileType,
            description: fileData.description
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
