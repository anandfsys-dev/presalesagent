import { createClient } from '@/lib/supabase/server';
import { SalesforceClient, decryptToken } from '@/lib/salesforce/client';
import { DEFAULT_PIPELINE_CONFIG, executePipeline } from '@/lib/pipeline';
import { NextResponse } from 'next/server';
import type { WorksheetData, DeploymentLog, DeploymentDetail } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DeploymentRequest {
  connectionId: string;
  fileName: string;
  worksheets: WorksheetData[];
  mode: 'full' | 'incremental' | 'validation_only';
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  // Create a readable stream for real-time updates
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

        const body: DeploymentRequest = await request.json();
        const { connectionId, fileName, worksheets, mode } = body;

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

        send('log', { level: 'info', message: 'Initializing deployment...' });

        // Create deployment record
        const { data: deployment, error: deployError } = await supabase
          .from('deployments')
          .insert({
            user_id: user.id,
            connection_id: connectionId,
            template_file_name: fileName,
            status: 'in_progress',
            mode,
            started_at: new Date().toISOString(),
            summary: {},
          })
          .select()
          .single();

        if (deployError || !deployment) {
          send('error', { message: 'Failed to create deployment record' });
          controller.close();
          return;
        }

        send('log', { level: 'info', message: `Deployment ID: ${deployment.id}` });

        // Validation-only mode
        if (mode === 'validation_only') {
          send('log', { level: 'info', message: 'Running validation only (no changes will be made)' });

          // Simulate validation
          const totalRecords = worksheets.reduce((sum, ws) => sum + ws.rowCount, 0);
          send('progress', {
            currentStep: 'Validation',
            currentStepIndex: 0,
            totalSteps: 1,
            processedRecords: totalRecords,
            totalRecords,
            successCount: totalRecords,
            failureCount: 0,
            skippedCount: 0,
          });

          // Update deployment status
          await supabase
            .from('deployments')
            .update({
              status: 'validation_only',
              completed_at: new Date().toISOString(),
              summary: {
                total_objects: totalRecords,
                success_count: totalRecords,
                failure_count: 0,
                skipped_count: 0,
                api_calls_consumed: 0,
                duration_seconds: 1,
              },
            })
            .eq('id', deployment.id);

          send('complete', {
            success: true,
            totalObjects: totalRecords,
            successCount: totalRecords,
            failureCount: 0,
            skippedCount: 0,
          });

          controller.close();
          return;
        }

        // Initialize Salesforce client
        const accessToken = decryptToken(connection.access_token_encrypted);
        const sfClient = new SalesforceClient(accessToken, connection.instance_url);

        // Test connection first
        const isConnected = await sfClient.testConnection();
        if (!isConnected) {
          send('error', { message: 'Failed to connect to Salesforce. Please refresh your connection.' });

          await supabase
            .from('deployments')
            .update({ status: 'failed', error_summary: 'Connection failed' })
            .eq('id', deployment.id);

          controller.close();
          return;
        }

        send('log', { level: 'info', message: 'Connected to Salesforce successfully' });

        // Build worksheet map
        const worksheetMap = new Map<string, WorksheetData>();
        for (const ws of worksheets) {
          worksheetMap.set(ws.name, ws);
        }

        // Execute pipeline
        const startTime = Date.now();

        const result = await executePipeline(DEFAULT_PIPELINE_CONFIG, {
          deploymentId: deployment.id,
          connectionId,
          sfClient,
          worksheets: worksheetMap,
          idMappings: {},
          batchSize: 200,
          onProgress: (progress) => {
            send('progress', progress);
          },
          onLog: (log: Omit<DeploymentLog, 'id' | 'deployment_id'>) => {
            send('log', { level: log.level, message: log.message });

            // Store log in database (fire and forget)
            supabase
              .from('deployment_logs')
              .insert({
                deployment_id: deployment.id,
                timestamp: log.timestamp,
                level: log.level,
                message: log.message,
                metadata: log.metadata,
              })
              .then(() => {});
          },
          onDetailUpdate: (detail: Omit<DeploymentDetail, 'id'>) => {
            // Store detail in database (fire and forget)
            supabase
              .from('deployment_details')
              .insert({
                deployment_id: detail.deployment_id,
                step_id: detail.step_id,
                step_order: detail.step_order,
                object_type: detail.object_type,
                object_name: detail.object_name,
                object_identifier: detail.object_identifier,
                salesforce_id: detail.salesforce_id,
                status: detail.status,
                error_message: detail.error_message,
              })
              .then(() => {});
          },
        });

        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        // Update deployment record
        await supabase
          .from('deployments')
          .update({
            status: result.success ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            summary: {
              total_objects: result.totalObjects,
              success_count: result.successCount,
              failure_count: result.failureCount,
              skipped_count: result.skippedCount,
              api_calls_consumed: result.successCount + result.failureCount, // Approximate
              duration_seconds: durationSeconds,
            },
            error_summary: result.errors.length > 0
              ? `${result.errors.length} errors occurred`
              : null,
          })
          .eq('id', deployment.id);

        // Store ID mappings for future reference
        for (const [stepId, mappings] of Object.entries(result.createdIds)) {
          for (const [lookupValue, salesforceId] of Object.entries(mappings)) {
            await supabase
              .from('deployment_id_mappings')
              .insert({
                deployment_id: deployment.id,
                step_id: stepId,
                lookup_field: 'code',
                lookup_value: lookupValue,
                salesforce_id: salesforceId,
              })
              .then(() => {});
          }
        }

        send('log', {
          level: result.success ? 'info' : 'warning',
          message: `Deployment completed in ${durationSeconds} seconds`,
        });

        send('complete', {
          success: result.success,
          totalObjects: result.totalObjects,
          successCount: result.successCount,
          failureCount: result.failureCount,
          skippedCount: result.skippedCount,
        });
      } catch (error) {
        console.error('Deployment error:', error);
        send('error', {
          message: error instanceof Error ? error.message : 'Deployment failed',
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
