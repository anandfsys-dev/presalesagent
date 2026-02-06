import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

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

    // Get SObjects from Salesforce
    const accessToken = decryptToken(connection.access_token_encrypted);
    const sfClient = new SalesforceClient(accessToken, connection.instance_url);

    const result = await sfClient.getSObjects();

    // Filter to queryable and createable objects, and sort by label
    const sobjects = result.sobjects
      .filter(obj => obj.queryable && obj.createable)
      .map(obj => ({
        name: obj.name,
        label: obj.label,
        custom: obj.custom,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      success: true,
      sobjects,
      total: sobjects.length,
    });
  } catch (error) {
    console.error('Get SObjects error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch SObjects' },
      { status: 500 }
    );
  }
}
