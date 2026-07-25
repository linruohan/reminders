export interface FilterCounts {
  all: number;
  today: number;
  planned: number;
  completed: number;
  urgent: number;
  flagged: number;
  lists: Array<{ id: string; count: number }>;
  owners: Array<{ id: string; count: number }>;
  tags: Array<{ id: string; name: string; count: number }>;
}
