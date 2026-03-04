import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

// --- STORAGE (in RAM) ---
const usedHardwareIds = new Set(); // Primary: blocks duplicate hardware IDs
const ipLog = [];                  // Secondary: logs all requests

// --- CONFIGURATION ---
//const ALLOWED_ORIGIN = 'https://limon-flix.kesug.com'; // Your website
const ALLOWED_ORIGIN = '*';

app.use(cors({
    origin: ALLOWED_ORIGIN // Only allow your website
}));
app.use(express.json());

// --- HEALTH CHECK ENDPOINT (Add this back!) ---
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// --- MIDDLEWARE: Check Origin & Hardware ID ---
app.use('/api/nftoken', (req, res, next) => {
    // 1. Check Origin (Security)
    const requestOrigin = req.headers.origin;
    
    // If ALLOWED_ORIGIN is '*', skip origin check
    if (ALLOWED_ORIGIN !== '*' && requestOrigin !== ALLOWED_ORIGIN) {
        return res.status(403).json({ error: 'Access denied: Invalid origin' });
    }
    
    // 2. Get identifiers from request body
    const { hardwareId } = req.body;
    const userIp = req.ip || req.connection.remoteAddress;

    if (!hardwareId) {
        return res.status(400).json({ error: 'Missing hardwareId' });
    }

    // 🚫 DISABLED: Hardware ID limit check
    // if (usedHardwareIds.has(hardwareId)) {
    //     return res.status(429).json({ 
    //         error: 'This device has already made a request',
    //         code: 'DEVICE_LIMIT_REACHED'
    //     });
    // }

    // 4. Log the IP (SECONDARY - just recording)
    ipLog.push({
        hardwareId: hardwareId,
        ip: userIp,
        timestamp: new Date().toISOString()
    });

    // 🚫 DISABLED: Store hardware ID
    // usedHardwareIds.add(hardwareId);

    // 6. Console logging for you
    console.log(`📱 Request from device: ${hardwareId}`);
    console.log(`   From IP: ${userIp}`);
    console.log(`   Total requests logged: ${ipLog.length}`);

    // 7. Attach data to request for the next function
    req.deviceInfo = { hardwareId, userIp };
    next();
});

// --- YOUR EXISTING PROXY ENDPOINT ---
app.post('/api/nftoken', async (req, res) => {
    try {
        const { cookies } = req.body; // Cookies from frontend

         // ✅ ADD THIS DEBUG LOGGING
        console.log("=== BACKEND RECEIVED ===");
        console.log("Device:", req.deviceInfo?.hardwareId);
        console.log("Cookies keys:", Object.keys(cookies));
        console.log("NetflixId length:", cookies.NetflixId?.length || 0);
        console.log("SecureNetflixId length:", cookies.SecureNetflixId?.length || 0);
        
        // Optional: Use the device info we saved
        console.log(`Proxying request for device: ${req.deviceInfo.hardwareId}`);

        // Your existing fetch to Netflix...
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
                // ✅ ADD THESE LINES
        console.log('📥 Netflix response status:', response.status);

        const data = await response.json();

     console.log('📦 Netflix response data:', JSON.stringify(data, null, 2));
        res.json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- OPTIONAL: Stats Endpoint (for you to monitor) ---
app.get('/api/stats', (req, res) => {
    // You might want to add a simple secret key here for security
    res.json({
        unique_devices: usedHardwareIds.size,
        total_requests_logged: ipLog.length,
        recent_ips: ipLog.slice(-10)
    });
});

app.listen(PORT, () => {
    console.log(`✅ Proxy running with device tracking (LIMITS DISABLED)`);
    console.log(`📍 Health check: /health`);
    console.log(`📍 NFToken endpoint: /api/nftoken`);
    console.log(`📍 Stats endpoint: /api/stats`);
});
