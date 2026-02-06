import { createClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, instance_url, client_id, client_secret, connectionId } = body;

    // If re-authenticating an existing connection, fetch stored credentials
    if (connectionId) {
      const { data: existingConnection, error: fetchError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingConnection) {
        return NextResponse.json(
          { error: 'Connection not found or unauthorized' },
          { status: 404 }
        );
      }

      // Use stored credentials for re-authentication
      const storedClientSecret = decryptToken(existingConnection.connected_app_consumer_secret_encrypted);
      const loginUrl = existingConnection.instance_url.includes('sandbox') ||
                       existingConnection.instance_url.includes('test.salesforce.com')
        ? 'https://test.salesforce.com'
        : 'https://login.salesforce.com';

      const callbackUrl = `${APP_URL}/api/auth/salesforce/callback`;

      const authParams = new URLSearchParams({
        response_type: 'code',
        client_id: existingConnection.connected_app_consumer_key,
        redirect_uri: callbackUrl,
        scope: 'api refresh_token openid',
        prompt: 'login consent',
        state: JSON.stringify({
          connectionId: existingConnection.id,
          name: existingConnection.name,
          instance_url: loginUrl,
          client_id: existingConnection.connected_app_consumer_key,
          client_secret_encrypted: encryptToken(storedClientSecret),
          user_id: user.id,
          isReauth: true,
        }),
      });

      const authUrl = `${loginUrl}/services/oauth2/authorize?${authParams.toString()}`;

      return NextResponse.json({
        success: true,
        authUrl,
        message: 'Redirect to Salesforce to re-authenticate',
      });
    }

    // New connection flow - validate required fields
    if (!name || !instance_url || !client_id || !client_secret) {
      return NextResponse.json(
        { error: 'Missing required fields: name, instance_url, client_id, client_secret' },
        { status: 400 }
      );
    }

    const callbackUrl = `${APP_URL}/api/auth/salesforce/callback`;

    // Build OAuth authorization URL
    // Note: client_secret is encrypted in state for security
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: client_id,
      redirect_uri: callbackUrl,
      scope: 'api refresh_token openid',
      prompt: 'login consent',
      state: JSON.stringify({
        name,
        instance_url,
        client_id,
        client_secret_encrypted: encryptToken(client_secret),
        user_id: user.id,
        isReauth: false,
      }),
    });

    const authUrl = `${instance_url}/services/oauth2/authorize?${authParams.toString()}`;

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect to Salesforce to complete authentication',
    });
  } catch (error) {
    console.error('Salesforce connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    );
  }
}
