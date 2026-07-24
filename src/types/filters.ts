export interface FilterCounts {
  all: number;
  today: number;
  planned: number;
  overdue: number;
  completed: number;
  urgent: number;
  flagged: number;
  lists: Array<{ id: string; count: number }>;
  owners: Array<{ id: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}
