import https from 'https';

// Hardcoded webhook URL - automatic sync, no user configuration needed
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyuwwlzMtUIfYvdmeSyJzBOxCV0l2TmfzlUM5s-S0ZOvwmuLGYf660gT0Ee93G1f7iQqA/exec';

// Send data to webhook with redirect support
const sendToWebhook = (data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
  const postData = JSON.stringify(data);

  const makeRequest = (targetUrl: string, redirectCount = 0, method = 'POST'): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (redirectCount > 5) {
        resolve({ success: false, error: 'Too many redirects' });
        return;
      }

      try {
        const url = new URL(targetUrl);

        const options: https.RequestOptions = {
          hostname: url.hostname,
          port: 443,
          path: url.pathname + url.search,
          method: method,
          headers: method === 'POST' ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          } : {},
        };

        const req = https.request(options, (res) => {
          // Handle redirects (302, 307, etc.)
          // Google Apps Script redirects POST to GET, so we follow with GET
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            makeRequest(res.headers.location, redirectCount + 1, 'GET').then(resolve);
            return;
          }

          let responseData = '';
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true });
            } else {
              resolve({ success: false, error: `HTTP ${res.statusCode}: ${responseData}` });
            }
          });
        });

        req.on('error', (error) => {
          console.error('Webhook request error:', error);
          resolve({ success: false, error: error.message });
        });

        req.setTimeout(30000, () => {
          req.destroy();
          resolve({ success: false, error: 'Request timeout' });
        });

        if (method === 'POST') {
          req.write(postData);
        }
        req.end();
      } catch (error) {
        console.error('Error sending to webhook:', error);
        resolve({ success: false, error: (error as Error).message });
      }
    });
  };

  return makeRequest(WEBHOOK_URL);
};

// Add a browser profile to the sheet
export const addProfileToSheet = async (profile: {
  id: string;
  name: string;
  email?: string;
  password?: string;
  country?: string;
  modelName?: string;
  status?: string;
  purchaseDate?: string;
  expiresAt?: string;
  orderNumber?: string;
  proxyString?: string;
  commentKarma?: number;
  postKarma?: number;
  createdAt?: string;
}): Promise<{ success: boolean; error?: string }> => {
  return sendToWebhook({
    action: 'add',
    ...profile,
    createdAt: profile.createdAt || new Date().toISOString(),
  });
};

// Update a profile in the sheet
export const updateProfileInSheet = async (
  profileId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> => {
  return sendToWebhook({
    action: 'update',
    id: profileId,
    ...updates,
  });
};

// Delete a profile from the sheet
export const deleteProfileFromSheet = async (
  profileId: string
): Promise<{ success: boolean; error?: string }> => {
  return sendToWebhook({
    action: 'delete',
    id: profileId,
  });
};

// Test webhook connection
export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  return sendToWebhook({
    action: 'test',
    timestamp: new Date().toISOString(),
  });
};

// Sync all profiles to sheet (smart batch upsert - update existing, add new, remove deleted)
export const syncAllProfilesToSheet = async (profiles: Array<{
  id: string;
  name: string;
  email?: string;
  password?: string;
  country?: string;
  modelName?: string;
  status?: string;
  purchaseDate?: string;
  expiresAt?: string;
  orderNumber?: string;
  proxyString?: string;
  commentKarma?: number;
  postKarma?: number;
  createdAt?: string;
  lastPostDate?: string;
  lastCommentDate?: string;
  assignedTo?: string;
}>): Promise<{ success: boolean; error?: string }> => {
  console.log(`Syncing ${profiles.length} profiles to sheet (batch upsert)...`);

  // Send all profiles in a single request for smart upsert
  const result = await sendToWebhook({
    action: 'syncBatch',
    profiles: profiles.map(p => ({
      ...p,
      createdAt: p.createdAt || new Date().toISOString(),
    })),
  });

  if (!result.success) {
    console.error('Batch sync failed:', result.error);
    return { success: false, error: result.error };
  }

  console.log('Batch sync completed successfully');
  return { success: true };
};
