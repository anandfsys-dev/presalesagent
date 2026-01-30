import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, encryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, instance_url, username, password, security_token } = body;

    // Validate required fields
    if (!name || !instance_url || !username || !password || !security_token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Authenticate with Salesforce
    const authResponse = await SalesforceClient.authenticate(
      username,
      password,
      security_token,
      instance_url
    );

    // Create Salesforce client to get org info
    const sfClient = new SalesforceClient(
      authResponse.access_token,
      authResponse.instance_url
    );

    // Get organization info
    let orgInfo;
    let orgType: 'production' | 'sandbox' | 'developer' = 'production';

    try {
      orgInfo = await sfClient.getOrgInfo();
      orgType = orgInfo.IsSandbox ? 'sandbox' : 'production';
    } catch (error) {
      console.error('Error fetching org info:', error);
      // Continue without org info if it fails
    }

    // Extract org ID from the identity URL
    const orgId = authResponse.id.split('/')[4];

    // Check if connection with same org_id already exists
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
          name,
          instance_url: authResponse.instance_url,
          access_token_encrypted: encryptToken(authResponse.access_token),
          status: 'active',
          last_connected: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        throw new Error('Failed to update connection');
      }

      return NextResponse.json({
        success: true,
        message: 'Connection updated successfully',
        connectionId: existingConnection.id,
      });
    }

    // Check if this is the first connection (make it default)
    const { count } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isDefault = (count || 0) === 0;

    // Create new connection
    const { data: newConnection, error: insertError } = await supabase
      .from('connections')
      .insert({
        user_id: user.id,
        name,
        instance_url: authResponse.instance_url,
        org_id: orgId,
        org_type: orgType,
        access_token_encrypted: encryptToken(authResponse.access_token),
        refresh_token_encrypted: '', // No refresh token in password flow
        status: 'active',
        last_connected: new Date().toISOString(),
        is_default: isDefault,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to save connection');
    }

    return NextResponse.json({
      success: true,
      message: 'Connection created successfully',
      connectionId: newConnection.id,
    });
  } catch (error) {
    console.error('Connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect' },
      { status: 500 }
    );
  }
}
