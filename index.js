import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TrulyYouBackendSDK } from '@truly-you/trulyyou-backend-sdk';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;
const TRULYYOU_API_URL = process.env.TRULYYOU_API_URL || 'http://localhost:3003';

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Truly-Auth', 'x-truly-auth']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'naira-bank-personal-backend' });
});

/**
 * Login endpoint - validates attestation and returns user data with forge properties
 */
app.get('/api/auth/login', async (req, res) => {
  let actualUser = null;
  
  try {
    // Get auth token from header
    const authToken = req.headers['x-truly-auth'] || req.headers['x-truly-auth'];
    
    console.log('📝 Mobile login request received');
    console.log('🔐 Auth token present:', !!authToken);
    
    if (!authToken) {
      return res.status(401).json({
        success: false,
        message: 'Missing X-Truly-Auth header',
      });
    }

      try {
        // Initialize the TrulyYouBackendSDK
        const sdk = new TrulyYouBackendSDK({ apiUrl: TRULYYOU_API_URL });
        
        console.log('🔍 Verifying signature with SDK:', TRULYYOU_API_URL);
        
        // Use the EXACT same payload structure that was signed by mobile SDK
        const originalAPICall = {
          uri: '/api/auth/login',
          method: 'GET',
          body: {},
          headers: { 'Content-Type': 'application/json' }
        };
        
        console.log('🔐 Verifying with EXACT same payload that was signed:');
        console.log('   Method:', originalAPICall.method);
        console.log('   URI:', originalAPICall.uri);
        console.log('   Body:', JSON.stringify(originalAPICall.body));
        console.log('   Headers:', JSON.stringify(originalAPICall.headers));
        console.log('🔍 [Personal Backend] Full originalAPICall structure:', JSON.stringify(originalAPICall, null, 2));
        console.log('🔍 [Personal Backend] Auth token:', authToken);
        
        // Verify the signature
        const verificationResult = await sdk.verifySignature(originalAPICall, authToken);
        
        console.log('📊 Verification result:', {
          verified: verificationResult.verified,
          keyId: verificationResult.keyId,
          signatureId: verificationResult.signatureId,
          error: verificationResult.error
        });
        
        if (!verificationResult.verified) {
          console.error('❌ Signature verification failed:', verificationResult.error);
          return res.status(401).json({
            success: false,
            message: 'Signature verification failed',
            error: verificationResult.error || 'Verification failed',
          });
        }

        console.log('✅ Signature verification successful:', {
          keyId: verificationResult.keyId,
          verified: verificationResult.verified
        });
      
      // Get actual user data using whoIsThisUser
      try {
        if (verificationResult.keyId) {
          const user = await sdk.whoIsThisUser(verificationResult.keyId);

          console.log('✅ User identification result:', {
            keyId: user?.keyId,
            userId: user?._id
          });
          
          if (user) {
            actualUser = {
              id: user._id || user.keyId,
              keyId: user.keyId,
              signatureId: verificationResult.signatureId,
              accountNumber: '1234567890',
              accountType: 'Personal'
            };
            
            console.log('✅ Actual user data retrieved');
          } else {
            console.warn('⚠️ whoIsThisUser did not return user data, using fallback data');
          }
        }
      } catch (identifyError) {
        console.error('❌ Error identifying user:', identifyError);
        console.warn('⚠️ Falling back to mock user data');
      }

    } catch (verifyError) {
      console.error('❌ Signature verification error:', verifyError);
      return res.status(401).json({
        success: false,
        message: 'Signature verification error',
        error: verifyError instanceof Error ? verifyError.message : 'Unknown verification error',
      });
    }
    
    // Use actual user data if available, otherwise fallback to mock
    const user = actualUser || {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      username: 'Mobile Banking User',
      accountNumber: '1234567890',
      accountType: 'Personal',
    };

    const mockToken = 'mock_token_' + Math.random().toString(36).substr(2, 16);

    console.log('✅ Login successful for user:', user.id);

    return res.json({
      success: true,
      message: 'Authentication successful',
      token: mockToken,
      user: user,
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST method support for compatibility
 */
app.post('/api/auth/login', (req, res) => {
  // Forward POST to GET handler
  return app._router.handle(Object.assign(req, { method: 'GET' }), res);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Naira Bank Personal Backend running on port ${PORT}`);
  console.log(`🔐 Using TrulyYou API: ${TRULYYOU_API_URL}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
