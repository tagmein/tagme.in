import { Task, TaskStatus, TaskCategory, DailyReport, TaskAnalytics } from '../types/Task';
import { getKV } from '../lib/getKV';

export class TaskManager {
  private static readonly TASK_PREFIX = 'task:';
  private static readonly CATEGORY_PREFIX = 'category:';
  private static readonly USER_SETTINGS_PREFIX = 'taskSettings:';

  constructor(private readonly kv: any, private readonly userId: string) {}

  // Task CRUD operations
  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
      status: task.status || 'Pending',
      tags: task.tags || [],
      priority: task.priority || 3,
    };

    await this.kv.put(`${TaskManager.TASK_PREFIX}${this.userId}:${id}`, JSON.stringify(newTask));
    return newTask;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');

    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };

    await this.kv.put(`${TaskManager.TASK_PREFIX}${this.userId}:${taskId}`, JSON.stringify(updatedTask));
    return updatedTask;
  }

  async getTask(taskId: string): Promise<Task | null> {
    const task = await this.kv.get(`${TaskManager.TASK_PREFIX}${this.userId}:${taskId}`);
    return task ? JSON.parse(task) : null;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.kv.delete(`${TaskManager.TASK_PREFIX}${this.userId}:${taskId}`);
  }

  // Task listing and filtering
  async listTasks(filters?: {
    status?: TaskStatus;
    category?: TaskCategory;
    dueDate?: Date;
    tags?: string[];
  }): Promise<Task[]> {
    const prefix = `${TaskManager.TASK_PREFIX}${this.userId}:`;
    const list = await this.kv.list({ prefix });
    const tasks: Task[] = [];

    for (const key of list.keys) {
      const task: Task = JSON.parse(await this.kv.get(key.name));
      if (this.matchesFilters(task, filters)) {
        tasks.push(task);
      }
    }

    return tasks;
  }

  private matchesFilters(task: Task, filters?: {
    status?: TaskStatus;
    category?: TaskCategory;
    dueDate?: Date;
    tags?: string[];
  }): boolean {
    if (!filters) return true;

    if (filters.status && task.status !== filters.status) return false;
    if (filters.category && task.category !== filters.category) return false;
    if (filters.dueDate && task.dueDate && new Date(task.dueDate).toDateString() !== new Date(filters.dueDate).toDateString()) return false;
    if (filters.tags && filters.tags.length > 0 && !filters.tags.every(tag => task.tags.includes(tag))) return false;

    return true;
  }

  // Analytics and reporting
  async generateDailyReport(date: Date = new Date()): Promise<DailyReport> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await this.listTasks();
    const relevantTasks = tasks.filter(task => {
      const taskDate = new Date(task.updatedAt);
      return taskDate >= startOfDay && taskDate <= endOfDay;
    });

    const timeSpentByCategory: Record<TaskCategory, number> = {};
    let completedTasks = 0;
    let totalProductivityScore = 0;

    relevantTasks.forEach(task => {
      if (task.status === 'Completed') {
        completedTasks++;
        if (task.actualDuration) {
          timeSpentByCategory[task.category] = (timeSpentByCategory[task.category] || 0) + task.actualDuration;
        }
        // Calculate productivity score based on estimated vs actual duration
        if (task.estimatedDuration && task.actualDuration) {
          const efficiency = task.estimatedDuration / task.actualDuration;
          totalProductivityScore += efficiency > 1 ? 1 : efficiency;
        }
      }
    });

    const productivityScore = completedTasks > 0 ? (totalProductivityScore / completedTasks) * 100 : 0;

    return {
      date,
      completedTasks,
      pendingTasks: relevantTasks.length - completedTasks,
      timeSpentByCategory,
      productivityScore,
      insights: this.generateInsights(relevantTasks),
    };
  }

  private generateInsights(tasks: Task[]): string[] {
    const insights: string[] = [];
    
    // Most productive category
    const categoryCompletionRates = new Map<string, { completed: number; total: number }>();
    tasks.forEach(task => {
      const category = categoryCompletionRates.get(task.category) || { completed: 0, total: 0 };
      if (task.status === 'Completed') category.completed++;
      category.total++;
      categoryCompletionRates.set(task.category, category);
    });

    let bestCategory = '';
    let bestRate = 0;
    categoryCompletionRates.forEach((stats, category) => {
      const rate = stats.completed / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestCategory = category;
      }
    });

    if (bestCategory) {
      insights.push(`You're most productive in ${bestCategory} tasks with ${(bestRate * 100).toFixed(1)}% completion rate`);
    }

    // Time management insights
    const tasksWithDurations = tasks.filter(t => t.actualDuration && t.estimatedDuration);
    if (tasksWithDurations.length > 0) {
      const accurateEstimates = tasksWithDurations.filter(t => 
        Math.abs((t.actualDuration! - t.estimatedDuration!) / t.estimatedDuration!) <= 0.2
      ).length;
      
      const estimationAccuracy = (accurateEstimates / tasksWithDurations.length) * 100;
      insights.push(`Your time estimation accuracy is ${estimationAccuracy.toFixed(1)}%`);
    }

    return insights;
  }

  // Location-based reminders
  async getTasksNearLocation(latitude: number, longitude: number, radiusInMeters: number = 500): Promise<Task[]> {
    const tasks = await this.listTasks({ status: 'Pending' });
    return tasks.filter(task => {
      if (!task.location) return false;
      return this.calculateDistance(
        { lat: latitude, lng: longitude },
        { lat: task.location.latitude, lng: task.location.longitude }
      ) <= radiusInMeters;
    });
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
} 