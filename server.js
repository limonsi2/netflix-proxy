import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy endpoint
app.post('/api/nftoken', async (req, res) => {
    try {
        const { cookies } = req.body;
        
        console.log('Proxying request to Netflix...');
        
        const response = await fetch('https://android13.prod.ftl.netflix.com/graphql', {
            method: 'POST',
            headers: {
                'User-Agent': 'com.netflix.mediaclient/63884 (Linux; U; Android 13; ro; M2007J3SG; Build/TQ1A.230205.001.A2; Cronet/143.0.7445.0)',
                'Content-Type': 'application/json',
                'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
            },
            body: JSON.stringify({
                operationName: 'CreateAutoLoginToken',
                variables: { scope: 'WEBVIEW_MOBILE_STREAMING' },
                extensions: { 
                    persistedQuery: { 
                        version: 102, 
                        id: '76e97129-f4b5-41a0-a73c-12e674896849' 
                    } 
                }
            })
        });

        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy server running on port ${PORT}`);
});
