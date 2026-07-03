import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import {
  getCrowdTasks, createCrowdTask, submitCompletion, getCompletions,
  type TaskType,
} from '@/lib/economy/community';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId   = searchParams.get('task_id');
  const poolId   = searchParams.get('pool_id') ?? undefined;
  const status   = searchParams.get('status') ?? undefined;

  if (taskId && searchParams.get('view') === 'completions') {
    return NextResponse.json(await getCompletions(taskId));
  }

  const tasks = await getCrowdTasks({
    poolId,
    status,
    limit: Number(searchParams.get('limit') ?? 50),
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.sub;

  const body = await req.json() as Record<string, unknown>;
  const action = body.action as string;

  switch (action) {
    case 'create': {
      const task = await createCrowdTask(userId, {
        title:                body.title                as string,
        description:          body.description          as string | undefined,
        task_type:            body.task_type            as TaskType | undefined,
        instructions:         body.instructions         as string | undefined,
        max_participants:     body.max_participants      as number | undefined,
        required_completions: body.required_completions as number | undefined,
        reward_per_completion: body.reward_per_completion as number | undefined,
        validation_threshold: body.validation_threshold as number | undefined,
        deadline:             body.deadline             as string | undefined,
        pool_id:              body.pool_id              as string | undefined,
        mission_id:           body.mission_id           as string | undefined,
        tenant_id:            body.tenant_id            as string | undefined,
      });
      if (!task) return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
      return NextResponse.json(task, { status: 201 });
    }

    case 'submit': {
      if (!body.task_id || typeof body.task_id !== 'string') {
        return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
      }
      const completion = await submitCompletion(userId, body.task_id as string, {
        proof_text: body.proof_text as string | undefined,
        proof_url:  body.proof_url  as string | undefined,
        metadata:   body.metadata   as Record<string, unknown> | undefined,
      });
      if (!completion) return NextResponse.json({ error: 'Already submitted or task not found' }, { status: 409 });
      return NextResponse.json(completion, { status: 201 });
    }

    case 'validate': {
      // Org admin validates a submitted completion
      const supabase = await createClient();
      const { error } = await supabase
        .from('crowd_task_completions')
        .update({ status: 'validated', validated_at: new Date().toISOString() })
        .eq('id', body.completion_id as string);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Increment task completions count
      const { data: completion } = await supabase
        .from('crowd_task_completions')
        .select('task_id')
        .eq('id', body.completion_id as string)
        .single();
      if (completion) {
        const { data: task } = await supabase
          .from('crowd_tasks')
          .select('current_completions, required_completions')
          .eq('id', (completion as Record<string, unknown>).task_id as string)
          .single();
        if (task) {
          const newCount = (task.current_completions as number) + 1;
          const newStatus = newCount >= (task.required_completions as number) ? 'completed' : 'in_progress';
          await supabase.from('crowd_tasks').update({
            current_completions: newCount,
            status: newStatus,
          }).eq('id', (completion as Record<string, unknown>).task_id as string);
        }
      }
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
