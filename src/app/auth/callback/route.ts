import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle errors from OAuth provider
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/dashboard/connections?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Check if this is a Salesforce OAuth callback (has state with connection info)
  if (state && code) {
    try {
      const stateData = JSON.parse(state);

      // This is a Salesforce OAuth callback
      if (stateData.instance_url && stateData.client_id) {
        return handleSalesforceCallback(code, stateData, origin);
      }
    } catch (e) {
      // State parsing failed, might be Supabase callback
      console.error('Failed to parse state:', e);
    }
  }

  // Handle Supabase auth callback
  if (code) {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (!authError) {
      const next = searchParams.get('next') ?? '/dashboard';
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('Supabase auth error:', authError);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`);
}

async function handleSalesforceCallback(
  code: string,
  stateData: {
    name: string;
    instance_url: string;
    client_id: string;
    client_secret_hint: string;
    user_id: string;
  },
  origin: string
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get the user to verify they're still logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== stateData.user_id) {
      throw new Error('User authentication mismatch');
    }

    // Get the client secret from session storage (it was stored on the client side)
    // For now, we'll need to get it from the pending connection data
    // This is a security consideration - in production, use a more secure method

    const callbackUrl = `${APP_URL}/auth/callback`;

    // Exchange the authorization code for access token
    const tokenResponse = await fetch(`${stateData.instance_url}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: stateData.client_id,
        // Note: client_secret needs to be passed from the client
        // In a real implementation, you'd want to store this securely
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    // Extract org ID from the identity URL
    const orgId = tokenData.id?.split('/')[4] || '';

    // Determine org type based on instance URL
    let orgType: 'production' | 'sandbox' | 'developer' = 'production';
    if (stateData.instance_url.includes('test.salesforce.com')) {
      orgType = 'sandbox';
    } else if (tokenData.instance_url?.includes('scratch') || tokenData.instance_url?.includes('develop')) {
      orgType = 'developer';
    }

    // Check if connection with same org_id already exists
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();

    if (existingConnection) {
      // Update existing connection
      await supabase
        .from('connections')
        .update({
          name: stateData.name,
          instance_url: tokenData.instance_url || stateData.instance_url,
          access_token_encrypted: encryptToken(tokenData.access_token),
          refresh_token_encrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
          connected_app_consumer_key: stateData.client_id,
          status: 'active',
          last_connected: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);
    } else {
      // Create new connection
      await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          name: stateData.name,
          instance_url: tokenData.instance_url || stateData.instance_url,
          org_id: orgId,
          org_type: orgType,
          access_token_encrypted: encryptToken(tokenData.access_token),
          refresh_token_encrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
          connected_app_consumer_key: stateData.client_id,
          status: 'active',
          last_connected: new Date().toISOString(),
          is_default: false,
        });
    }

    // Redirect to connections page with success message
    return NextResponse.redirect(
      `${origin}/dashboard/connections?success=Connection+added+successfully`
    );
  } catch (error) {
    console.error('Salesforce callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.redirect(
      `${origin}/dashboard/connections?error=${encodeURIComponent(errorMessage)}`
    );
  }
}
