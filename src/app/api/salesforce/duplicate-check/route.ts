import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DuplicateCheckCondition {
  field: string;
  value: string | number | boolean;
}

interface DuplicateCheckItem {
  stepId: string;
  stepName: string;
  sobjectName: string;
  recordLabel: string;
  conditions: DuplicateCheckCondition[];
}

interface DuplicateCheckRequest {
  connectionId: string;
  checks: DuplicateCheckItem[];
}

function escapeSoqlValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isSafeFieldName(field: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(field);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as DuplicateCheckRequest;

    if (!body.connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    if (!Array.isArray(body.checks)) {
      return NextResponse.json({ error: 'checks must be an array' }, { status: 400 });
    }

    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', body.connectionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const accessToken = decryptToken(connection.access_token_encrypted);
    const sfClient = new SalesforceClient(accessToken, connection.instance_url, '60.0');

    const duplicates: Array<{
      stepId: string;
      stepName: string;
      sobjectName: string;
      recordLabel: string;
      query: string;
      matches: Array<{ Id: string; Name?: string }>;
    }> = [];

    for (const check of body.checks) {
      if (!check.sobjectName || !Array.isArray(check.conditions) || check.conditions.length === 0) {
        continue;
      }

      const validConditions = check.conditions.filter(
        (condition) =>
          condition.value !== undefined &&
          condition.value !== null &&
          String(condition.value).trim() !== '' &&
          isSafeFieldName(condition.field)
      );

      if (validConditions.length === 0) {
        continue;
      }

      const whereClause = validConditions
        .map((condition) => {
          if (typeof condition.value === 'number') {
            return `${condition.field} = ${condition.value}`;
          }
          if (typeof condition.value === 'boolean') {
            return `${condition.field} = ${condition.value}`;
          }
          return `${condition.field} = '${escapeSoqlValue(String(condition.value))}'`;
        })
        .join(' OR ');

      const soql = `SELECT Id, Name FROM ${check.sobjectName} WHERE ${whereClause}`;
      const endpoint = `/services/data/v65.0/query/?q=${encodeURIComponent(soql)}`;
      const result = await sfClient.get<{ records: Array<{ Id: string; Name?: string }>; totalSize: number }>(endpoint);

      if (result.totalSize > 0) {
        duplicates.push({
          stepId: check.stepId,
          stepName: check.stepName,
          sobjectName: check.sobjectName,
          recordLabel: check.recordLabel,
          query: soql,
          matches: result.records,
        });
      }
    }

    return NextResponse.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates,
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run duplicate check' },
      { status: 500 }
    );
  }
}
