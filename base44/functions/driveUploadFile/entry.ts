import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fileName, mimeType, base64Content, folderId } = body;

    if (!fileName || !base64Content) {
      return Response.json({ error: 'fileName and base64Content are required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Create file metadata
    const metadata = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
    };
    if (folderId) metadata.parents = [folderId];

    // Use multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadataPart = `Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}`;
    const dataPart = `Content-Type: ${mimeType || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Content}`;

    const multipartBody = delimiter + metadataPart + delimiter + dataPart + closeDelim;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return Response.json({ error: 'Drive upload failed', details: err }, { status: 500 });
    }

    const file = await uploadRes.json();
    return Response.json({ file });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});