import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // List files created by this app (drive.file scope only shows app-created files)
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,webViewLink,createdTime,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=50',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: 'Drive list failed', details: err }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ files: data.files || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});