import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Fetch connection
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Test connection
    const accessToken = decryptToken(connection.access_token_encrypted);
    const sfClient = new SalesforceClient(accessToken, connection.instance_url);

    const isConnected = await sfClient.testConnection();

    if (!isConnected) {
      // Update connection status to error
      await supabase
        .from('connections')
        .update({ status: 'error' })
        .eq('id', connectionId);

      return NextResponse.json(
        { error: 'Connection test failed. Token may be expired.' },
        { status: 400 }
      );
    }

    // Update connection status to active
    await supabase
      .from('connections')
      .update({
        status: 'active',
        last_connected: new Date().toISOString(),
      })
      .eq('id', connectionId);

    // Get API limits
    const limits = await sfClient.getLimits();

    return NextResponse.json({
      success: true,
      message: 'Connection is active',
      limits: {
        dailyApiRequests: limits.DailyApiRequests,
        dataStorageMB: limits.DataStorageMB,
      },
    });
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}
