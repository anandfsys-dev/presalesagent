import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/salesforce/client';
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
    const { name, instance_url, client_id, client_secret } = body;

    // Validate required fields
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
