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
    const sobject = searchParams.get('sobject');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    if (!sobject) {
      return NextResponse.json(
        { error: 'SObject name is required' },
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

    // Get records from Salesforce
    const accessToken = decryptToken(connection.access_token_encrypted);
    const sfClient = new SalesforceClient(accessToken, connection.instance_url);

    // First get the name field for this object
    const nameField = await sfClient.getNameField(sobject);

    // Search records
    const result = await sfClient.searchRecords(sobject, search, limit, nameField);

    return NextResponse.json({
      success: true,
      records: result.records,
      totalSize: result.totalSize,
      nameField,
    });
  } catch (error) {
    console.error('Search records error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search records' },
      { status: 500 }
    );
  }
}
