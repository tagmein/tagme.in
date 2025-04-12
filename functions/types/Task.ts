export type TaskStatus = 'Pending' | 'InProgress' | 'Completed';
export type TaskCategory = 'Work' | 'Personal' | 'Home' | 'Learning' | string;

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  startTime?: Date;
  endTime?: Date;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  priority: number; // 1-5, where 5 is highest priority
  tags: string[];
  reminderFrequency?: number; // minutes between reminders
  completionNotes?: string;
  subtasks?: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  completedAt?: Date;
}

export interface TaskAnalytics {
  timeSpentPerCategory: Record<TaskCategory, number>;
  completionRate: number;
  averageTaskDuration: number;
  productivityScore: number;
  tasksByStatus: Record<TaskStatus, number>;
}

export interface DailyReport {
  date: Date;
  completedTasks: number;
  pendingTasks: number;
  timeSpentByCategory: Record<TaskCategory, number>;
  productivityScore: number;
  insights: string[];
} 