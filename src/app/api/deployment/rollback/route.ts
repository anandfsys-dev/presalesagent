import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, decryptToken } from '@/lib/salesforce/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreatedRecord {
  stepId: string;
  stepName: string;
  objectType: string;
  name: string;
  salesforceId: string;
  requiresInactivationBeforeDelete?: boolean;
}

interface RollbackRequest {
  connectionId: string;
  deploymentId?: string;
  records: CreatedRecord[];
  apiVersion?: string;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type, data }) + '\n'));
      };

      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          send('error', { message: 'Unauthorized' });
          controller.close();
          return;
        }

        const body: RollbackRequest = await request.json();
        const { connectionId, deploymentId, records, apiVersion = '65.0' } = body;

        // Fetch connection
        const { data: connection, error: connError } = await supabase
          .from('connections')
          .select('*')
          .eq('id', connectionId)
          .eq('user_id', user.id)
          .single();

        if (connError || !connection) {
          send('error', { message: 'Connection not found' });
          controller.close();
          return;
        }

        send('log', { level: 'info', message: 'Initializing rollback...' });

        // Initialize Salesforce client
        const accessToken = decryptToken(connection.access_token_encrypted);
        const sfClient = new SalesforceClient(accessToken, connection.instance_url, apiVersion);

        const isConnected = await sfClient.testConnection();
        if (!isConnected) {
          send('error', { message: 'Failed to connect to Salesforce. Please refresh your connection.' });
          controller.close();
          return;
        }

        send('log', { level: 'info', message: 'Connected to Salesforce successfully' });

        // Group records by stepId, preserving execution order
        const stepGroups: { stepId: string; stepName: string; records: CreatedRecord[] }[] = [];
        const stepMap = new Map<string, number>();

        for (const record of records) {
          if (!stepMap.has(record.stepId)) {
            stepMap.set(record.stepId, stepGroups.length);
            stepGroups.push({ stepId: record.stepId, stepName: record.stepName, records: [] });
          }
          stepGroups[stepMap.get(record.stepId)!].records.push(record);
        }

        // Reverse step order (delete children before parents)
        stepGroups.reverse();

        // Also reverse records within each step (last-created first)
        for (const group of stepGroups) {
          group.records.reverse();
        }

        // Count deletable records (skip missing IDs and 'updated' records)
        const deletableRecords = records.filter(
          r => r.salesforceId && r.salesforceId !== 'updated'
        );
        const totalRecords = deletableRecords.length;
        const skippedCount = records.length - totalRecords;

        send('log', {
          level: 'info',
          message: `Rolling back ${totalRecords} records across ${stepGroups.length} steps${skippedCount > 0 ? ` (${skippedCount} skipped - updated/no ID)` : ''}`
        });

        let processedRecords = 0;
        let successCount = 0;
        let failureCount = 0;

        for (let stepIndex = 0; stepIndex < stepGroups.length; stepIndex++) {
          const group = stepGroups[stepIndex];

          send('log', {
            level: 'info',
            message: `Deleting step ${stepIndex + 1}/${stepGroups.length}: ${group.stepName} (${group.records.length} records)`
          });

          for (const record of group.records) {
            // Skip records without a real Salesforce ID
            if (!record.salesforceId || record.salesforceId === 'updated') {
              continue;
            }

            try {
              // Inactivate before delete if flagged (only for POST-created records)
              if (record.requiresInactivationBeforeDelete) {
                try {
                  await sfClient.update(record.objectType, record.salesforceId, { Status: 'Inactive' });
                  send('log', { level: 'info', message: `Inactivated ${record.objectType}: ${record.name}` });
                } catch (inactivateErr) {
                  const msg = inactivateErr instanceof Error ? inactivateErr.message : 'Unknown error';
                  send('log', { level: 'warning', message: `Failed to inactivate ${record.objectType} "${record.name}": ${msg}. Attempting delete anyway...` });
                }
              }

              await sfClient.delete(record.objectType, record.salesforceId);
              successCount++;

              send('record_deleted', {
                stepId: record.stepId,
                stepName: record.stepName,
                objectType: record.objectType,
                name: record.name,
                salesforceId: record.salesforceId,
              });

              send('log', {
                level: 'info',
                message: `Deleted ${record.objectType}: ${record.name} (${record.salesforceId})`
              });
            } catch (err) {
              failureCount++;
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';

              send('log', {
                level: 'error',
                message: `Failed to delete ${record.objectType} "${record.name}" (${record.salesforceId}): ${errorMessage}`
              });
            }

            processedRecords++;

            send('progress', {
              currentStep: group.stepName,
              currentStepIndex: stepIndex,
              totalSteps: stepGroups.length,
              processedRecords,
              totalRecords,
              successCount,
              failureCount,
              skippedCount,
            });
          }

          send('log', {
            level: 'info',
            message: `Completed ${group.stepName}`
          });
        }

        // Update deployment status if deploymentId provided
        if (deploymentId) {
          await supabase
            .from('deployments')
            .update({ status: 'rolled_back' })
            .eq('id', deploymentId);
        }

        send('log', {
          level: successCount > 0 && failureCount === 0 ? 'info' : 'warning',
          message: `Rollback completed: ${successCount} deleted, ${failureCount} failed, ${skippedCount} skipped`
        });

        send('complete', {
          success: failureCount === 0,
          totalRecords,
          successCount,
          failureCount,
          skippedCount,
        });

      } catch (error) {
        console.error('Rollback error:', error);
        send('error', {
          message: error instanceof Error ? error.message : 'Rollback failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
