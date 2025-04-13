import { GoogleGenAI } from '@google/genai';
import { type PagesFunction, Response as WorkerResponse } from '@cloudflare/workers-types';
import { Env } from './lib/env.js';
import { getKV } from './lib/getKV.js';
import { scroll } from './lib/scroll.js';
import { TaskManager } from './services/TaskManager.js';
import { Task, TaskStatus, TaskCategory } from './types/Task.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in the environment variables.');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Define the expected structure of the request
interface ChatRequest {
  channel?: string;
  message: string;
  model?: string;
  userId?: string;
}

// Task-related prompt templates
const TASK_PROMPT_TEMPLATE = `You are a task management assistant. Please help manage the following request:
{userMessage}

Available actions:
- Create a new task
- Update existing task
- List tasks
- Delete task
- Generate daily report
- Get location-based reminders
- Get task insights

Current tasks context:
{tasksContext}

Please respond with a structured action in JSON format:
{
  "action": "createTask|updateTask|listTasks|deleteTask|generateReport|getReminders|getInsights",
  "parameters": {
    // Action specific parameters
  }
}`;

async function handleTaskCommand(taskManager: TaskManager, userMessage: string, tasksContext: string): Promise<any> {
  const model = ai.generateContent({
    model: 'gemini-pro',
    contents: [{ parts: [{ text: prompt }] }]
  });
  
  const prompt = TASK_PROMPT_TEMPLATE
    .replace('{userMessage}', userMessage)
    .replace('{tasksContext}', tasksContext);

  const result = await model;

  const actionData = JSON.parse(result.text);
  
  switch (actionData.action) {
    case 'createTask':
      return await taskManager.createTask(actionData.parameters);
    case 'updateTask':
      return await taskManager.updateTask(actionData.parameters.taskId, actionData.parameters.updates);
    case 'listTasks':
      return await taskManager.listTasks(actionData.parameters);
    case 'deleteTask':
      return await taskManager.deleteTask(actionData.parameters.taskId);
    case 'generateReport':
      return await taskManager.generateDailyReport(actionData.parameters.date);
    case 'getReminders':
      return await taskManager.getTasksNearLocation(
        actionData.parameters.latitude,
        actionData.parameters.longitude,
        actionData.parameters.radius
      );
    case 'getInsights':
      const tasks = await taskManager.listTasks();
      return { insights: taskManager['generateInsights'](tasks) };
    default:
      throw new Error('Unknown task action');
  }
}

export const onRequestGet: PagesFunction<Env> = async (context): Promise<WorkerResponse> => {
  const url = new URL(context.request.url);
  const channel = url.searchParams.get('channel') || 'default';
  const message = url.searchParams.get('message');
  const userId = url.searchParams.get('userId') || 'default';

  if (!message) {
    return new Response(JSON.stringify({ error: 'Message parameter is required' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }) as unknown as WorkerResponse;
  }

  return handleChatRequest(context, { channel, message, userId });
};

export const onRequestPost: PagesFunction<Env> = async (context): Promise<WorkerResponse> => {
  try {
    const body: ChatRequest = await context.request.json();
    return handleChatRequest(context, body);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }) as unknown as WorkerResponse;
  }
};

async function handleChatRequest(context: any, params: ChatRequest): Promise<WorkerResponse> {
  const kv = await getKV(context, true);

  if (!kv) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }) as unknown as WorkerResponse;
  }

  try {
    const channel = params.channel || 'default';
    const userMessage = params.message;
    const requestedModel = params.model || 'gemini-pro';
    const userId = params.userId || 'default';

    if (!userMessage) {
      return new Response(JSON.stringify({ error: 'Message parameter is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }) as unknown as WorkerResponse;
    }

    // Initialize TaskManager
    const taskManager = new TaskManager(kv, userId);

    // Check if the message is task-related
    const isTaskRelated = /task|todo|remind|schedule|due|priority/i.test(userMessage);

    let response;
    if (isTaskRelated) {
      // Get current tasks for context
      const currentTasks = await taskManager.listTasks();
      const tasksContext = JSON.stringify(currentTasks);
      
      try {
        const taskResponse = await handleTaskCommand(taskManager, userMessage, tasksContext);
        response = {
          success: true,
          channel,
          message: userMessage,
          reply: 'Task operation completed successfully',
          taskResult: taskResponse,
        };
      } catch (error) {
        response = {
          success: false,
          channel,
          message: userMessage,
          reply: 'Failed to process task command',
          error: error.message,
        };
      }
    } else {
      // Handle regular chat messages
      const result = await ai.generateContent({
        model: 'gemini-pro',
        contents: [{ parts: [{ text: userMessage }] }]
      });

      response = {
        success: true,
        channel,
        message: userMessage,
        reply: result.text,
      };
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }) as unknown as WorkerResponse;
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process request',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }) as unknown as WorkerResponse;
  }
}

// Helper function to extract suggested content (facts) from the AI response
function extractSuggestedContent(responseText: string): string[] {
  const facts = responseText
    .split('.')
    .map((sentence) => sentence.trim())
    .filter((sentence) =>
      /\d/.test(sentence) || // Contains numbers
      /(important|key|notable|fact|suggest|recommend)/i.test(sentence) // Contains keywords
    );
  return facts;
}