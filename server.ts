import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

const FIRESTORE_BASE_URL = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0525711307/databases/ai-studio-7266d63d-6327-47d6-a3e5-1daaf0bc6572/documents';

// Helper to decode Bearer JWT token to extract the Firebase uid (sub)
function getUserIdFromToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload.sub || payload.user_id || null;
    }
  } catch (e) {
    console.error("Error decoding token:", e);
  }
  return null;
}

let serviceAccountToken: { token: string; expiry: number } | null = null;

async function getServiceAccountToken(): Promise<string | null> {
  const now = Date.now();
  if (serviceAccountToken && serviceAccountToken.expiry > now + 60000) {
    return serviceAccountToken.token;
  }

  try {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-account/default/token',
      {
        headers: {
          'Metadata-Flavor': 'Google'
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      serviceAccountToken = {
        token: data.access_token,
        expiry: now + (data.expires_in * 1000)
      };
      console.log("Successfully fetched Google Service Account token");
      return data.access_token;
    } else {
      console.warn("Metadata server returned status:", response.status);
    }
  } catch (err) {
    // Expected when running locally or during builds
  }
  return null;
}

async function getFirestoreAuthHeader(clientAuthHeader: string | undefined): Promise<string> {
  const saToken = await getServiceAccountToken();
  if (saToken) {
    return `Bearer ${saToken}`;
  }
  return clientAuthHeader || '';
}

function isFirestoreValue(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  const keys = Object.keys(val);
  return keys.some(k => [
    'stringValue', 'integerValue', 'doubleValue', 'booleanValue', 'nullValue', 'arrayValue', 'mapValue', 'timestampValue'
  ].includes(k));
}

function isFirestoreDocument(body: any): boolean {
  if (!body || typeof body !== 'object') return false;
  if ('fields' in body && typeof body.fields === 'object' && body.fields !== null) {
    const keys = Object.keys(body.fields);
    if (keys.length === 0) return true;
    const firstVal = body.fields[keys[0]];
    return isFirestoreValue(firstVal);
  }
  return false;
}

// Map flat JS values to Firestore REST API typed values
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    const fields: any = {};
    for (const key of Object.keys(val)) {
      fields[key] = toFirestoreValue(val[key]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert a flat JS object to Firestore fields dictionary
function toFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const key of Object.keys(obj)) {
    if (key === 'id') continue;
    fields[key] = toFirestoreValue(obj[key]);
  }
  return { fields };
}

// Convert a Firestore REST value back to flat JS value
function fromFirestoreValue(val: any): any {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const arr = val.arrayValue.values || [];
    return arr.map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue.fields || {};
    const res: any = {};
    for (const key of Object.keys(fields)) {
      res[key] = fromFirestoreValue(fields[key]);
    }
    return res;
  }
  return null;
}

// Convert a complete Firestore REST document back to flat JS object
function fromFirestoreFields(doc: any): any {
  const res: any = {};
  if (doc.name) {
    const parts = doc.name.split('/');
    res.id = parts[parts.length - 1];
  }
  const fields = doc.fields || {};
  for (const key of Object.keys(fields)) {
    res[key] = fromFirestoreValue(fields[key]);
  }
  return res;
}

// API Authentication middleware for Write operations under /documents
app.use('/documents', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: "Missing or insufficient permissions.",
      status: "UNAUTHENTICATED"
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return res.status(401).json({
      error: "Missing or insufficient permissions.",
      status: "UNAUTHENTICATED"
    });
  }

  const uid = getUserIdFromToken(authHeader);
  if (!uid) {
    return res.status(403).json({
      error: "Missing or insufficient permissions.",
      status: "PERMISSION_DENIED"
    });
  }

  next();
});

// API Routes
app.get('/documents/:collection', async (req, res) => {
  const { collection } = req.params;
  const authHeader = req.headers.authorization;
  const uid = getUserIdFromToken(authHeader);

  try {
    const firestoreAuth = await getFirestoreAuthHeader(authHeader);
    const response = await fetch(`${FIRESTORE_BASE_URL}/${collection}`, {
      headers: {
        'Authorization': firestoreAuth,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        return res.status(response.status).json(errJson.error || errJson);
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    const data = await response.json();
    let documents = (data.documents || []).map(fromFirestoreFields);
    
    // Filter by owner to maintain user data separation
    if (uid) {
      documents = documents.filter((doc: any) => doc.createdBy === uid);
    }

    return res.json(documents);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/documents/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const authHeader = req.headers.authorization;
  const uid = getUserIdFromToken(authHeader);

  try {
    const firestoreAuth = await getFirestoreAuthHeader(authHeader);
    const response = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}`, {
      headers: {
        'Authorization': firestoreAuth,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        return res.status(response.status).json(errJson.error || errJson);
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    const doc = await response.json();
    const docData = fromFirestoreFields(doc);

    // Enforce data isolation
    if (uid && docData.createdBy && docData.createdBy !== uid) {
      return res.status(403).json({
        error: "Missing or insufficient permissions.",
        status: "PERMISSION_DENIED"
      });
    }

    return res.json(docData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/documents/:collection', async (req, res) => {
  const { collection } = req.params;
  const authHeader = req.headers.authorization;

  let body = typeof req.body === 'object' && req.body !== null ? { ...req.body } : {};
  const uid = getUserIdFromToken(authHeader);
  if (uid) {
    if (!body.createdBy) {
      body.createdBy = uid;
    }
  }
  if (!body.createdAt) {
    body.createdAt = new Date().toISOString();
  }
  if (!body.updatedAt) {
    body.updatedAt = new Date().toISOString();
  }

  const documentId = body.id || req.query.documentId;
  if ('id' in body) {
    delete body.id;
  }

  let firestorePayload: any;
  if (isFirestoreDocument(body)) {
    firestorePayload = body;
    if (uid && (!body.fields.createdBy || !body.fields.createdBy.stringValue)) {
      body.fields.createdBy = { stringValue: uid };
    }
    if (!body.fields.createdAt || !body.fields.createdAt.stringValue) {
      body.fields.createdAt = { stringValue: new Date().toISOString() };
    }
    if (!body.fields.updatedAt || !body.fields.updatedAt.stringValue) {
      body.fields.updatedAt = { stringValue: new Date().toISOString() };
    }
  } else {
    firestorePayload = toFirestoreFields(body);
  }

  let url = `${FIRESTORE_BASE_URL}/${collection}`;
  if (documentId) {
    url += `?documentId=${documentId}`;
  }

  try {
    const firestoreAuth = await getFirestoreAuthHeader(authHeader);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': firestoreAuth,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(firestorePayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        return res.status(response.status).json(errJson.error || errJson);
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    const doc = await response.json();
    return res.status(200).json(fromFirestoreFields(doc));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/documents/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const authHeader = req.headers.authorization;
  const uid = getUserIdFromToken(authHeader);

  let body = typeof req.body === 'object' && req.body !== null ? { ...req.body } : {};
  body.updatedAt = new Date().toISOString();
  if ('id' in body) {
    delete body.id;
  }

  try {
    const firestoreAuth = await getFirestoreAuthHeader(authHeader);

    // Verify existing document ownership before editing
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}`, {
      headers: {
        'Authorization': firestoreAuth,
        'Accept': 'application/json'
      }
    });
    if (getResponse.ok) {
      const existingDoc = await getResponse.json();
      const existingData = fromFirestoreFields(existingDoc);
      if (uid && existingData.createdBy && existingData.createdBy !== uid) {
        return res.status(403).json({
          error: "Missing or insufficient permissions.",
          status: "PERMISSION_DENIED"
        });
      }
    }

    let firestoreFields: any;
    let keys: string[];
    if (isFirestoreDocument(body)) {
      firestoreFields = body;
      keys = Object.keys(body.fields);
    } else {
      firestoreFields = toFirestoreFields(body);
      keys = Object.keys(body);
    }

    const fieldPaths = keys.map(k => `updateMask.fieldPaths=${k}`).join('&');

    const response = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}?${fieldPaths}`, {
      method: 'PATCH',
      headers: {
        'Authorization': firestoreAuth,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(firestoreFields)
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        return res.status(response.status).json(errJson.error || errJson);
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    const doc = await response.json();
    return res.json(fromFirestoreFields(doc));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/documents/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const authHeader = req.headers.authorization;
  const uid = getUserIdFromToken(authHeader);

  let body = typeof req.body === 'object' && req.body !== null ? { ...req.body } : {};
  body.updatedAt = new Date().toISOString();
  if ('id' in body) {
    delete body.id;
  }

  try {
    const firestoreAuth = await getFirestoreAuthHeader(authHeader);

    // Verify existing document ownership before editing
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}`, {
      headers: {
        'Authorization': firestoreAuth,
        'Accept': 'application/json'
      }
    });
    if (getResponse.ok) {
      const existingDoc = await getResponse.json();
      const existingData = fromFirestoreFields(existingDoc);
      if (uid && existingData.createdBy && existingData.createdBy !== uid) {
        return res.status(403).json({
          error: "Missing or insufficient permissions.",
          status: "PERMISSION_DENIED"
        });
      }
    }

    let firestoreFields: any;
    let keys: string[];
    if (isFirestoreDocument(body)) {
      firestoreFields = body;
      keys = Object.keys(body.fields);
    } else {
      firestoreFields = toFirestoreFields(body);
      keys = Object.keys(body);
    }

    const fieldPaths = keys.map(k => `updateMask.fieldPaths=${k}`).join('&');

    const response = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}?${fieldPaths}`, {
      method: 'PATCH',
      headers: {
        'Authorization': firestoreAuth,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(firestoreFields)
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        return res.status(response.status).json(errJson.error || errJson);
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    const doc = await response.json();
    return res.json(fromFirestoreFields(doc));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/documents/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const authHeader = req.headers.authorization;
  const uid = getUserIdFromToken(authHeader);

  try {
    const firestoreAuth = await getFirestoreAuthHeader(authHeader);

    // Verify existing document ownership before editing
    const getResponse = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}`, {
      headers: {
        'Authorization': firestoreAuth,
        'Accept': 'application/json'
      }
    });
    if (getResponse.ok) {
      const existingDoc = await getResponse.json();
      const existingData = fromFirestoreFields(existingDoc);
      if (uid && existingData.createdBy && existingData.createdBy !== uid) {
        return res.status(403).json({
          error: "Missing or insufficient permissions.",
          status: "PERMISSION_DENIED"
        });
      }
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}/${collection}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': firestoreAuth,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        return res.status(response.status).json(errJson.error || errJson);
      } catch {
        return res.status(response.status).send(errText);
      }
    }

    return res.json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Vite Middleware integrated after API routes
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
