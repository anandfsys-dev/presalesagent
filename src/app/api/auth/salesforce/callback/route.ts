import { createClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface StateData {
  name: string;
  instance_url: string;
  client_id: string;
  client_secret_encrypted: string;
  user_id: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle errors from Salesforce
  if (error) {
    console.error('Salesforce OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/connections?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/connections?error=${encodeURIComponent('Missing authorization code or state')}`
    );
  }

  try {
    const stateData: StateData = JSON.parse(state);
    const supabase = await createClient();

    // Verify user is still logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== stateData.user_id) {
      throw new Error('User authentication mismatch');
    }

    // Decrypt the client secret
    const clientSecret = decryptToken(stateData.client_secret_encrypted);

    const callbackUrl = `${APP_URL}/api/auth/salesforce/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${stateData.instance_url}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: stateData.client_id,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      throw new Error(errorData.error_description || 'Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    // Extract org ID from the identity URL
    // Format: https://login.salesforce.com/id/ORGID/USERID
    const orgId = tokenData.id?.split('/')[4] || '';

    // Determine org type based on instance URL
    let orgType: 'production' | 'sandbox' | 'developer' = 'production';
    if (stateData.instance_url.includes('test.salesforce.com')) {
      orgType = 'sandbox';
    } else if (tokenData.instance_url?.includes('scratch') || tokenData.instance_url?.includes('develop')) {
      orgType = 'developer';
    }

    // Check if connection with same org_id already exists for this user
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('connections')
        .update({
          name: stateData.name,
          instance_url: tokenData.instance_url || stateData.instance_url,
          access_token_encrypted: encryptToken(tokenData.access_token),
          refresh_token_encrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
          connected_app_consumer_key: stateData.client_id,
          connected_app_consumer_secret_encrypted: encryptToken(clientSecret),
          status: 'active',
          last_connected: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        throw new Error('Failed to update connection');
      }
    } else {
      // Create new connection
      const { error: insertError } = await supabase
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
          connected_app_consumer_secret_encrypted: encryptToken(clientSecret),
          status: 'active',
          last_connected: new Date().toISOString(),
          is_default: false,
        });

      if (insertError) {
        console.error('Failed to create connection:', insertError);
        throw new Error('Failed to save connection');
      }
    }

    // Redirect to connections page with success message
    return NextResponse.redirect(
      `${APP_URL}/dashboard/connections?success=Connection+added+successfully`
    );
  } catch (error) {
    console.error('Salesforce callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.redirect(
      `${APP_URL}/dashboard/connections?error=${encodeURIComponent(errorMessage)}`
    );
  }
}
