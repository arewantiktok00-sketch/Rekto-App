export interface BroadcastHistory {
  id: string;
  title: string;
  message: string;
  sent_by: string;
  recipient_count: number;
  success_count: number;
  created_at: string;
}

export interface BroadcastStats {
  userCount: number;
}

export interface BroadcastSendResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  error?: string;
}
